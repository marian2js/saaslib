import { Controller, INestApplication, ValidationPipe } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import { Types } from 'mongoose'
import { BaseUser, EmailService } from 'src/main'
import { testModuleImports } from 'src/tests/test.helpers'
import { SecurityUtils } from 'src/utils/security.utils'
import * as request from 'supertest'
import { BaseUserService } from '../../services/base-user.service'
import { BaseAuthService } from '../services/base-auth.service'
import { GoogleStrategy } from '../strategies/google.strategy'
import { BaseAuthController } from './base-auth.controller'

@Controller('auth')
class AuthController extends BaseAuthController {
  constructor(authService: BaseAuthService, userService: BaseUserService<BaseUser>) {
    super(authService, userService)
  }
}

describe('BaseAuthController', () => {
  let app: INestApplication
  let controller: AuthController
  let userService: BaseUserService<BaseUser>
  let authService: BaseAuthService
  let emailService: EmailService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [BaseUserService, BaseAuthService, GoogleStrategy],
      controllers: [AuthController],
      imports: testModuleImports,
    }).compile()

    app = module.createNestApplication()
    app.useGlobalPipes(new ValidationPipe({}))
    controller = module.get<AuthController>(AuthController)
    userService = module.get<BaseUserService<BaseUser>>(BaseUserService)
    authService = module.get<BaseAuthService>(BaseAuthService)
    emailService = module.get<EmailService>(EmailService)

    jest.spyOn(emailService, 'sendEmail').mockResolvedValue()

    await app.init()
  })

  afterEach(async () => await app.close())

  it('should be defined', () => {
    expect(controller).toBeDefined()
  })

  const createUser = async (
    email: string,
    password: string,
  ): Promise<{ accessToken: string; refreshToken: string }> => {
    await request(app.getHttpServer()).post('/auth/signup').send({ email, password })

    let token: { accessToken: string; refreshToken: string }
    await request(app.getHttpServer())
      .post('/auth/signin')
      .send({ email, password })
      .expect((response) => {
        token = response.body.token
      })

    return token
  }

  describe('/POST signup', () => {
    it('should register a user successfully', async () => {
      await request(app.getHttpServer())
        .post('/auth/signup')
        .send({ email: 'test@example.com', password: 'password123' })
        .expect(201)

      const user = await userService.findOne({ email: 'test@example.com' })
      expect(user).toBeDefined()
    })

    it('should throw error if email already exists', async () => {
      await createUser('test@example.com', 'password123')

      await request(app.getHttpServer())
        .post('/auth/signup')
        .send({ email: 'test@example.com', password: 'password123' })
        .expect(403)
        .expect((res) => {
          expect(res.body.message).toBe('The email provided is already in use')
        })
    })

    it('should throw error if email is missing', async () => {
      await request(app.getHttpServer())
        .post('/auth/signup')
        .send({ password: 'password123' })
        .expect(400)
        .expect((res) => {
          expect(res.body.message[0]).toEqual('email must be an email')
        })
    })

    it('should throw error if password is missing', async () => {
      await request(app.getHttpServer())
        .post('/auth/signup')
        .send({ email: 'test@example.com' })
        .expect(400)
        .expect((res) => {
          expect(res.body.message[0]).toEqual('password must be longer than or equal to 8 characters')
          expect(res.body.message[1]).toEqual('password must be a string')
        })
    })

    it('should throw error if email is invalid', async () => {
      await request(app.getHttpServer())
        .post('/auth/signup')
        .send({ email: 'invalid-email', password: 'password123' })
        .expect(400)
        .expect((res) => {
          expect(res.body.message[0]).toEqual('email must be an email')
        })
    })
  })

  describe('/POST signin', () => {
    it('should sign in successfully', async () => {
      await createUser('test@example.com', 'password123')

      await request(app.getHttpServer())
        .post('/auth/signin')
        .send({ email: 'test@example.com', password: 'password123' })
        .expect(201)
        .expect((response) => {
          expect(response.body.token).toBeDefined()
        })

      const user = await userService.findOne({ email: 'test@example.com' })
      expect(user.refreshTokenHash).toBeDefined()
    })

    it('should fail sign in with wrong credentials', async () => {
      await createUser('test@example.com', 'password123')

      await request(app.getHttpServer())
        .post('/auth/signin')
        .send({ email: 'test@example.com', password: 'wrongpassword' })
        .expect(401)
    })
  })

  describe('/POST signout', () => {
    it('should sign out a user', async () => {
      const { accessToken } = await createUser('test@example.com', 'password123')

      await request(app.getHttpServer()).post('/auth/signout').set('Authorization', `Bearer ${accessToken}`).expect(201)

      const user = await userService.findOne({ email: 'test@example.com' })
      expect(user.refreshTokenHash).not.toBeDefined()
    })
  })

  describe('/POST refresh-token', () => {
    it('should refresh token successfully', async () => {
      const { refreshToken } = await createUser('test-refresh@example.com', 'password123')
      const user = await userService.findOne({ email: 'test-refresh@example.com' })

      await request(app.getHttpServer())
        .post('/auth/refresh-token')
        .send({ userId: user._id.toString(), refreshToken })
        .expect(201)
        .expect((response) => {
          expect(response.body.token).toBeDefined()
          expect(response.body.token.accessToken).not.toEqual(refreshToken)
        })
    })

    it('should fail with invalid refresh token', async () => {
      await createUser('test-refresh-fail@example.com', 'password123')
      const user = await userService.findOne({ email: 'test-refresh-fail@example.com' })

      await request(app.getHttpServer())
        .post('/auth/refresh-token')
        .send({ userId: user._id.toString(), refreshToken: 'invalid-token' })
        .expect(401)
    })

    it('should fail with the refresh token from a different user', async () => {
      const { refreshToken } = await createUser('test@example.com', 'password123')
      await createUser('test2@example.com', 'password123')
      const user = await userService.findOne({ email: 'test2@example.com' })

      await request(app.getHttpServer())
        .post('/auth/refresh-token')
        .send({ userId: user._id.toString(), refreshToken })
        .expect(401)
    })

    it('should fail with missing refresh token', async () => {
      await createUser('test@example.com', 'password123')
      const user = await userService.findOne({ email: 'test@example.com' })

      await request(app.getHttpServer()).post('/auth/refresh-token').send({ userId: user._id.toString() }).expect(400)
    })
  })

  describe('/POST verify-email', () => {
    it('should verify the email successfully if the code is valid', async () => {
      const hashedCode = await SecurityUtils.hashWithBcrypt('valid-code', 12)
      const user = await userService.create({ email: 'test@example.com', emailVerificationCode: hashedCode })

      await request(app.getHttpServer())
        .post('/auth/verify-email')
        .send({ userId: user._id.toString(), code: 'valid-code' })
        .expect(201)
        .expect({ ok: true })

      const updatedUser = await userService.findOne({ email: 'test@example.com' })
      expect(updatedUser.emailVerified).toBe(true)
    })

    it('should return not found if user does not exist', async () => {
      await request(app.getHttpServer())
        .post('/auth/verify-email')
        .send({ userId: new Types.ObjectId().toString(), code: 'any-code' })
        .expect(404)
    })

    it('should succeed if email is already verified', async () => {
      const user = await userService.create({ email: 'test@example.com', emailVerified: true })

      await request(app.getHttpServer())
        .post('/auth/verify-email')
        .send({ userId: user._id.toString(), code: 'valid-code' })
        .expect(201)
    })

    it('should throw unauthorized if the verification code is missing', async () => {
      const user = await userService.create({ email: 'test@example.com' })

      await request(app.getHttpServer())
        .post('/auth/verify-email')
        .send({ userId: user._id.toString(), code: 'wrong-code' })
        .expect(401)

      const updatedUser = await userService.findOne({ email: 'test@example.com' })
      expect(updatedUser.emailVerified).not.toBeDefined()
    })

    it('should throw unauthorized if the verification code is invalid', async () => {
      const hashedCode = await SecurityUtils.hashWithBcrypt('valid-code', 12)
      const user = await userService.create({ email: 'test@example.com', emailVerificationCode: hashedCode })

      await request(app.getHttpServer())
        .post('/auth/verify-email')
        .send({ userId: user._id.toString(), code: 'invalid-code' })
        .expect(401)

      const updatedUser = await userService.findOne({ email: 'test@example.com' })
      expect(updatedUser.emailVerified).not.toBeDefined()
    })
  })

  describe('/GET google', () => {
    it('should redirect to Google OAuth page', async () => {
      await request(app.getHttpServer())
        .get('/auth/google')
        .expect(302)
        .expect((response) => {
          expect(response.headers.location).toContain('accounts.google.com')
        })
    })
  })

  describe('/POST verify-oauth', () => {
    it('should verify OAuth code successfully', async () => {
      const user = await userService.create({ email: 'test@example.com' })
      const decoded = { id: user._id.toString() }
      jest.spyOn(authService, 'verifyOAuthCode').mockReturnValue(decoded)

      await request(app.getHttpServer())
        .post('/auth/verify-oauth')
        .send({ code: 'valid-code' })
        .expect(201)
        .expect((response) => {
          expect(response.body.user._id).toEqual(decoded.id)
        })
    })

    it('should fail verification with invalid OAuth code', async () => {
      jest.spyOn(authService, 'verifyOAuthCode').mockReturnValue(null)

      await request(app.getHttpServer()).post('/auth/verify-oauth').send({ code: 'invalid-code' }).expect(401)
    })
  })
})
