import { INestApplication, Injectable } from '@nestjs/common'
import { InjectModel, MongooseModule, Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Test, TestingModule } from '@nestjs/testing'
import { Model, Types } from 'mongoose'
import { testModuleImports } from 'src/tests/test.helpers'
import { BaseUser } from 'src/user'
import { OwneableModel } from '../models/owneable.model'
import { OwneableEntityService } from './owneable-entity.service'

@Schema()
class FakeModel extends OwneableModel {
  _id: Types.ObjectId

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

describe('BaseEntityService', () => {
  let app: INestApplication
  let service: FakeEntityService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FakeEntityService],
      imports: [...testModuleImports, MongooseModule.forFeature([{ name: FakeModel.name, schema: FakeModelSchema }])],
    }).compile()

    app = module.createNestApplication()
    service = module.get<FakeEntityService>(FakeEntityService)

    await app.init()
  })

  afterEach(async () => await app.close())

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  describe('findManyByOwner', () => {
    it('should find multiple documents for the same owner', async () => {
      const owner = new Types.ObjectId()
      await service.create({ owner, key: 'key1', name: 'Entity One', category: 'Category1' })
      await service.create({ owner, key: 'key2', name: 'Entity Two', category: 'Category2' })

      const results = await service.findManyByOwner(owner)
      expect(results.length).toBe(2)
      results.forEach((result) => {
        expect(result.owner.equals(owner)).toBe(true)
      })
    })

    it('should not return documents belonging to a different owner', async () => {
      const owner1 = new Types.ObjectId()
      const owner2 = new Types.ObjectId()
      await service.create({ owner: owner1, key: 'key1', name: 'Entity One', category: 'Category1' })
      await service.create({ owner: owner2, key: 'key2', name: 'Entity Two', category: 'Category2' })

      const results = await service.findManyByOwner(owner1)
      expect(results.every((result) => result.owner.equals(owner1))).toBe(true)
    })

    it('should exclude documents owned by the specified owner when exceptOwner is true', async () => {
      const owner1 = new Types.ObjectId()
      const owner2 = new Types.ObjectId()
      const owner3 = new Types.ObjectId()

      await service.create({ owner: owner1, key: 'key1', name: 'Entity One', category: 'Category1' })
      await service.create({ owner: owner2, key: 'key2', name: 'Entity Two', category: 'Category2' })
      await service.create({ owner: owner3, key: 'key3', name: 'Entity Three', category: 'Category3' })

      const results = await service.findManyByOwner(owner1, {}, { exceptOwner: true })

      // Should contain entities from owner2 and owner3, but not owner1
      expect(results.length).toBeGreaterThan(0)
      expect(results.every((result) => !result.owner.equals(owner1))).toBe(true)

      // Verify we can find entities from other owners
      const ownerIds = results.map((result) => result.owner.toString())
      expect(ownerIds).toContain(owner2.toString())
      expect(ownerIds).toContain(owner3.toString())
    })
  })

  describe('Permission Methods', () => {
    let owner1: Types.ObjectId
    let owner2: Types.ObjectId
    let entity1: FakeModel

    beforeEach(async () => {
      owner1 = new Types.ObjectId()
      owner2 = new Types.ObjectId()
      entity1 = await service.create({ owner: owner1, key: 'key1', name: 'Entity One', category: 'Category1' })
    })

    describe('canView', () => {
      it('should allow an owner to view their entity', () => {
        const canView = service.canView(entity1, { _id: owner1 } as BaseUser)
        expect(canView).toBe(true)
      })

      it('should not allow another user to view the entity', () => {
        const canView = service.canView(entity1, { _id: owner2 } as BaseUser)
        expect(canView).toBe(false)
      })
    })

    describe('canEdit', () => {
      it('should allow an owner to edit their entity', () => {
        const canEdit = service.canEdit(entity1, { _id: owner1 } as BaseUser)
        expect(canEdit).toBe(true)
      })

      it('should not allow another user to edit the entity', () => {
        const canEdit = service.canEdit(entity1, { _id: owner2 } as BaseUser)
        expect(canEdit).toBe(false)
      })
    })

    describe('canDelete', () => {
      it('should allow an owner to delete their entity', () => {
        const canDelete = service.canDelete(entity1, { _id: owner1 } as BaseUser)
        expect(canDelete).toBe(true)
      })

      it('should not allow another user to delete the entity', () => {
        const canDelete = service.canDelete(entity1, { _id: owner2 } as BaseUser)
        expect(canDelete).toBe(false)
      })
    })
  })
})
