import { Controller, INestApplication, Injectable } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { InjectModel, MongooseModule, Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Test, TestingModule } from '@nestjs/testing'
import { IsOptional, IsString } from 'class-validator'
import { Model, Types } from 'mongoose'
import { testModuleImports } from 'src/tests/test.helpers'
import { BaseUser, BaseUserRole } from 'src/user'
import { BaseUserService } from 'src/user/services/base-user.service'
import * as request from 'supertest'
import { OwneableModel } from '../models/owneable.model'
import { OwneableEntityService } from '../services/owneable-entity.service'
import { OwneableEntityController } from './owneable-entity.controller'

@Schema()
class FakeModel extends OwneableModel {
  @Prop({ unique: true, sparse: true })
  key: string

  @Prop({})
  name: string

  @Prop({})
  category: string
}

const FakeModelSchema = SchemaFactory.createForClass(FakeModel)

@Injectable()
class FakeEntityService extends OwneableEntityService<FakeModel, BaseUser> {
  getApiObject(entity: FakeModel): Record<string, unknown> {
    return {
      name: entity.name,
      category: entity.category,
    }
  }

  constructor(@InjectModel(FakeModel.name) private fakeModel: Model<FakeModel>) {
    super(fakeModel)
  }
}

class CreateFakeModelDto {
  @IsString()
  key: string

  @IsString()
  name: string

  @IsString()
  @IsOptional()
  category: string
}

class UpdateFakeModelDto {
  @IsString()
  @IsOptional()
  name: string

  @IsString()
  @IsOptional()
  category: string
}

@Controller('fake')
export class FakeController extends OwneableEntityController<FakeModel, BaseUser> {
  options = {
    dtos: {
      create: CreateFakeModelDto,
      update: UpdateFakeModelDto,
    },
  }

  constructor(fakeEntityService: FakeEntityService, userService: BaseUserService<BaseUser>) {
    super(fakeEntityService, userService)
  }
}

describe('OwneableEntityController', () => {
  let app: INestApplication
  let controller: FakeController
  let service: FakeEntityService
  let userService: BaseUserService<BaseUser>
  let jwtService: JwtService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [BaseUserService, FakeEntityService],
      controllers: [FakeController],
      imports: [...testModuleImports, MongooseModule.forFeature([{ name: FakeModel.name, schema: FakeModelSchema }])],
    }).compile()

    app = module.createNestApplication()
    controller = module.get<FakeController>(FakeController)
    service = module.get<FakeEntityService>(FakeEntityService)
    userService = module.get<BaseUserService<BaseUser>>(BaseUserService)
    jwtService = module.get<JwtService>(JwtService)

    await app.init()
  })

  afterEach(async () => await app.close())

  async function createUserToken(isAdmin = false) {
    const user = await userService.create({
      email: isAdmin ? 'admin@example.com' : 'test@example.com',
      role: isAdmin ? BaseUserRole.Admin : undefined,
    })
    const accessToken = jwtService.sign(
      {
        id: user._id,
      },
      { secret: process.env.JWT_SECRET },
    )
    return { user, accessToken }
  }

  it('should be defined', () => {
    expect(controller).toBeDefined()
  })

  describe('/GET mine', () => {
    it('should return entities belonging to the user', async () => {
      const { user, accessToken } = await createUserToken()
      await service.create({ owner: user._id, name: 'Test Entity' })
      await service.create({ owner: new Types.ObjectId(), name: 'Entity of another user' })
      const res = await request(app.getHttpServer())
        .get('/fake')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
      expect(res.body.items.length).toBe(1)
      expect(res.body.items[0].name).toBe('Test Entity')
    })

    it('should return empty array if no entities belong to user', async () => {
      const { accessToken } = await createUserToken()
      const res = await request(app.getHttpServer())
        .get('/fake')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
      expect(res.body.items).toEqual([])
    })

    it('should return 403 if no token is provided', async () => {
      await request(app.getHttpServer()).get('/fake').expect(403)
    })

    it('should return entities not belonging to admin when admin=true param is set and user is admin', async () => {
      // Create admin user
      const { user: adminUser, accessToken: adminAccessToken } = await createUserToken(true)

      // Create entities owned by admin and another user
      const otherUser = new Types.ObjectId()
      await service.create({ owner: adminUser._id, name: 'Admin Entity' })
      await service.create({ owner: otherUser, name: 'Other User Entity' })

      // Test with admin=true query param
      const res = await request(app.getHttpServer())
        .get('/fake?admin=true')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(200)

      // Should only return entities not owned by the admin
      expect(res.body.items.length).toBe(1)
      expect(res.body.items[0].name).toBe('Other User Entity')
    })

    it('should return 403 when admin=true param is set but user is not admin', async () => {
      const { accessToken } = await createUserToken() // Regular non-admin user

      await request(app.getHttpServer())
        .get('/fake?admin=true')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(403)
    })
  })

  describe('/GET/:id', () => {
    it('should return the entity if it exists and belongs to the user', async () => {
      const { user, accessToken } = await createUserToken()
      const entity = await service.create({ owner: user._id, name: 'Owned Entity', category: 'Owner' })
      const res = await request(app.getHttpServer())
        .get(`/fake/${entity._id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
      expect(res.body.item.name).toBe('Owned Entity')
    })

    it('should return a 404 if the entity does not exist', async () => {
      const { accessToken } = await createUserToken()
      const nonExistentId = new Types.ObjectId()
      await request(app.getHttpServer())
        .get(`/fake/${nonExistentId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404)
    })

    it('should return a 404 if the entity does not belong to the user', async () => {
      const { accessToken } = await createUserToken()
      const entity = await service.create({ owner: new Types.ObjectId(), name: 'Not Owned', category: 'Not Owner' })
      await request(app.getHttpServer())
        .get(`/fake/${entity._id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404)
    })
  })

  describe('/POST', () => {
    it('should create an entity', async () => {
      const { user, accessToken } = await createUserToken()
      const res = await request(app.getHttpServer())
        .post('/fake')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ key: 'Test', name: 'New Entity', category: 'New Category' })
        .expect(201)
      expect(res.body.item.name).toBe('New Entity')
      expect(res.body.item.category).toBe('New Category')
      expect(res.body.item.key).toBeUndefined()

      const created = await service.findOne({ name: 'New Entity' })
      expect(created.owner.toString()).toBe(user._id.toString())
      expect(created.name).toBe('New Entity')
      expect(created.category).toBe('New Category')
      expect(created.key).toBe('Test')
    })

    it('should return 400 if the entity is invalid', async () => {
      const { accessToken } = await createUserToken()
      await request(app.getHttpServer())
        .post('/fake')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'New Entity' })
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toBe('key must be a string')
        })
    })

    it('should return 403 if no token is provided', async () => {
      await request(app.getHttpServer()).post('/fake').expect(403)
    })
  })

  describe('/PATCH/:id', () => {
    it('should update the entity', async () => {
      const { user, accessToken } = await createUserToken()
      const entity = await service.create({ owner: user._id, name: 'Old Entity', category: 'Old' })
      const res = await request(app.getHttpServer())
        .patch(`/fake/${entity._id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'Updated Entity' })
        .expect(200)
      expect(res.body.ok).toBe(true)

      const updated = await service.findById(entity._id)
      expect(updated.name).toBe('Updated Entity')
      expect(updated.category).toBe('Old')
    })

    it('should return 404 if the entity does not exist', async () => {
      const { accessToken } = await createUserToken()
      const nonExistentId = new Types.ObjectId()
      await request(app.getHttpServer())
        .patch(`/fake/${nonExistentId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'Updated Entity' })
        .expect(404)

      const all = await service.findAll()
      expect(all.length).toBe(0)
    })

    it('should return 404 if the entity does not belong to the user', async () => {
      const { accessToken } = await createUserToken()
      const entity = await service.create({ owner: new Types.ObjectId(), name: 'Not Owned', category: 'Not Owner' })
      await request(app.getHttpServer())
        .patch(`/fake/${entity._id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'Updated Entity' })
        .expect(404)

      const updated = await service.findById(entity._id)
      expect(updated.name).toBe('Not Owned')
      expect(updated.category).toBe('Not Owner')
    })
  })

  describe('/DELETE/:id', () => {
    it('should delete the entity', async () => {
      const { user, accessToken } = await createUserToken()
      const entity = await service.create({ owner: user._id, name: 'Delete Me', category: 'Delete' })
      await request(app.getHttpServer())
        .delete(`/fake/${entity._id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
      const res = await service.findById(entity._id)
      expect(res).toBeNull()

      const all = await service.findAll()
      expect(all.length).toBe(0)
    })

    it('should return 404 if the entity does not exist', async () => {
      const { accessToken } = await createUserToken()
      const nonExistentId = new Types.ObjectId()
      await request(app.getHttpServer())
        .delete(`/fake/${nonExistentId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404)
    })

    it('should return 404 if the entity does not belong to the user', async () => {
      const { accessToken } = await createUserToken()
      const entity = await service.create({ owner: new Types.ObjectId(), name: 'Not Owned', category: 'Not Owner' })
      await request(app.getHttpServer())
        .delete(`/fake/${entity._id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404)

      const entityAfter = await service.findById(entity._id)
      expect(entityAfter.name).toBe('Not Owned')
    })
  })
})
