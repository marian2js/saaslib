import { Controller, INestApplication } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { Test, TestingModule } from '@nestjs/testing'
import { Types } from 'mongoose'
import { EmailService } from 'src/email'
import { testModuleImports } from 'src/tests/test.helpers'
import * as request from 'supertest'
import { BaseUser } from '../models/base-user.model'
import { BaseUserService } from '../services/base-user.service'
import { BaseUserController } from './base-user.controller'

@Controller('users')
class UserController extends BaseUserController<BaseUser> {
  constructor(
    protected userService: BaseUserService<BaseUser>,
    protected emailService: EmailService,
  ) {
    super(userService, emailService)
  }
}

describe('BaseUserController', () => {
  let app: INestApplication
  let controller: UserController
  let userService: BaseUserService<BaseUser>
  let emailService: EmailService
  let jwtService: JwtService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [BaseUserService, JwtService],
      controllers: [UserController],
      imports: testModuleImports,
    }).compile()

    app = module.createNestApplication()
    controller = module.get<UserController>(UserController)
    userService = module.get<BaseUserService<BaseUser>>(BaseUserService)
    emailService = module.get<EmailService>(EmailService)
    jwtService = module.get<JwtService>(JwtService)

    jest.spyOn(emailService, 'sendVerificationEmail').mockImplementation()

    await app.init()
  })

  afterEach(async () => await app.close())

  it('should be defined', () => {
    expect(controller).toBeDefined()
  })

  const createUser = async (userData: Partial<BaseUser>): Promise<{ user: BaseUser; accessToken: string }> => {
    const user = await userService.create(userData)
    const accessToken = jwtService.sign({ id: user._id.toString() })
    return { user, accessToken }
  }

  describe('/PUT me', () => {
    it('should update user details successfully', async () => {
      const { user, accessToken } = await createUser({ email: 'test@example.com' })

      await request(app.getHttpServer())
        .put('/users/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ email: 'new@example.com' })
        .expect(200)
        .expect((res) => {
          expect(res.body.user.email).toEqual('new@example.com')
        })

      const updatedUser = await userService.findById(user._id)
      expect(updatedUser.email).toEqual('new@example.com')
      expect(updatedUser.emailVerified).toBe(false)
      expect(updatedUser.emailVerificationCode).toBeDefined()
    })

    it('should send email verification on email update', async () => {
      const { accessToken } = await createUser({ email: 'test@example.com', emailVerified: true })

      await request(app.getHttpServer())
        .put('/users/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ email: 'new@example.com' })
        .expect(200)
        .expect((res) => {
          expect(res.body.user.email).toEqual('new@example.com')
        })

      expect(emailService.sendVerificationEmail).toHaveBeenCalled()
    })

    it('should return 400 for invalid email format', async () => {
      const { accessToken } = await createUser({ email: 'test@example.com' })

      await request(app.getHttpServer())
        .put('/users/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ email: 'invalid-email' })
        .expect(400)
    })

    it('should return 404 if user is not found', async () => {
      const accessToken = jwtService.sign({ id: new Types.ObjectId().toString() })

      await request(app.getHttpServer())
        .put('/users/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ email: 'new@example.com' })
        .expect(404)
    })
  })

  describe('/DELETE me/avatar', () => {
    it('should delete the user avatar successfully', async () => {
      const { user, accessToken } = await createUser({ email: 'test@example.com' })
      await userService.updateById(user._id, { avatar: 'avatar-url' })

      await request(app.getHttpServer())
        .delete('/users/me/avatar')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.ok).toBe(true)
        })

      const updatedUser = await userService.findOne({ _id: user._id })
      expect(updatedUser.avatar).toBeUndefined()
    })

    it('should return 404 if user is not found', async () => {
      const accessToken = jwtService.sign({ id: new Types.ObjectId().toString() })

      await request(app.getHttpServer())
        .delete('/users/me/avatar')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404)
    })
  })
})
