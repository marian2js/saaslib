import { Controller, INestApplication } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { Test, TestingModule } from '@nestjs/testing'
import { Types } from 'mongoose'
import { EmailService } from 'src/email'
import { testModuleImports } from 'src/tests/test.helpers'
import { BaseUser, LinkedInStrategy } from 'src/user'
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
  let jwtService: JwtService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [BaseUserService, BaseAuthService, GoogleStrategy, LinkedInStrategy],
      controllers: [AuthController],
      imports: testModuleImports,
    }).compile()

    app = module.createNestApplication()
    controller = module.get<AuthController>(AuthController)
    userService = module.get<BaseUserService<BaseUser>>(BaseUserService)
    authService = module.get<BaseAuthService>(BaseAuthService)
    emailService = module.get<EmailService>(EmailService)
    jwtService = module.get<JwtService>(JwtService)

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

  describe('/POST refresh', () => {
    it('should refresh token successfully', async () => {
      const { refreshToken } = await createUser('test-refresh@example.com', 'password123')
      const user = await userService.findOne({ email: 'test-refresh@example.com' })

      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ userId: user._id.toString(), refreshToken })
        .expect(201)
        .expect((response) => {
          expect(response.body).toBeDefined()
          expect(jwtService.verify(response.body.accessToken)).toMatchObject({ id: user._id.toString() })
        })
    })

    it('should fail with invalid refresh token', async () => {
      await createUser('test-refresh-fail@example.com', 'password123')
      const user = await userService.findOne({ email: 'test-refresh-fail@example.com' })

      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ userId: user._id.toString(), refreshToken: 'invalid-token' })
        .expect(401)
    })

    it('should fail with the refresh token from a different user', async () => {
      const { refreshToken } = await createUser('test@example.com', 'password123')
      await createUser('test2@example.com', 'password123')
      const user = await userService.findOne({ email: 'test2@example.com' })

      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ userId: user._id.toString(), refreshToken })
        .expect(401)
    })

    it('should fail with missing refresh token', async () => {
      await createUser('test@example.com', 'password123')
      const user = await userService.findOne({ email: 'test@example.com' })

      await request(app.getHttpServer()).post('/auth/refresh').send({ userId: user._id.toString() }).expect(400)
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

  describe('/GET linkedin', () => {
    it('should redirect to LinkedIn OAuth page', async () => {
      await request(app.getHttpServer())
        .get('/auth/linkedin')
        .expect(302)
        .expect((response) => {
          expect(response.headers.location).toContain('linkedin.com')
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
          expect(response.body.user.id).toEqual(decoded.id)
        })
    })

    it('should fail verification with invalid OAuth code', async () => {
      jest.spyOn(authService, 'verifyOAuthCode').mockReturnValue(null)

      await request(app.getHttpServer()).post('/auth/verify-oauth').send({ code: 'invalid-code' }).expect(401)
    })
  })

  describe('/POST request-password-reset', () => {
    it('should send a password reset email if the user exists', async () => {
      await createUser('test@example.com', 'password123')

      await request(app.getHttpServer())
        .post('/auth/request-password-reset')
        .send({ email: 'test@example.com' })
        .expect(201)

      expect(emailService.sendEmail).toHaveBeenCalled()
      const user = await userService.findOne({ email: 'test@example.com' })
      expect(user.passwordResetCode).toBeDefined()
    })

    it('should return 404 if the user does not exist', async () => {
      await request(app.getHttpServer())
        .post('/auth/request-password-reset')
        .send({ email: 'nonexistent@example.com' })
        .expect(404)
    })

    it('should return 400 if email is not provided', async () => {
      await request(app.getHttpServer()).post('/auth/request-password-reset').send({}).expect(400)
    })

    it('should track password reset attempts correctly', async () => {
      await createUser('test@example.com', 'password123')
      await userService.findOne({ email: 'test@example.com' })

      // First attempt
      await request(app.getHttpServer())
        .post('/auth/request-password-reset')
        .send({ email: 'test@example.com' })
        .expect(201)

      let updatedUser = await userService.findOne({ email: 'test@example.com' })
      expect(updatedUser.passwordResetAttempts).toBe(1)

      // Second attempt
      await request(app.getHttpServer())
        .post('/auth/request-password-reset')
        .send({ email: 'test@example.com' })
        .expect(201)

      updatedUser = await userService.findOne({ email: 'test@example.com' })
      expect(updatedUser.passwordResetAttempts).toBe(2)

      // Third attempt
      await request(app.getHttpServer())
        .post('/auth/request-password-reset')
        .send({ email: 'test@example.com' })
        .expect(201)

      updatedUser = await userService.findOne({ email: 'test@example.com' })
      expect(updatedUser.passwordResetAttempts).toBe(3)

      // Fourth attempt (should fail)
      await request(app.getHttpServer())
        .post('/auth/request-password-reset')
        .send({ email: 'test@example.com' })
        .expect(403)

      updatedUser = await userService.findOne({ email: 'test@example.com' })
      expect(updatedUser.passwordResetAttempts).toBe(3)
    })

    it('should reset password reset attempts after 6 hours', async () => {
      await createUser('test@example.com', 'password123')
      const user = await userService.findOne({ email: 'test@example.com' })

      // First attempt
      await request(app.getHttpServer())
        .post('/auth/request-password-reset')
        .send({ email: 'test@example.com' })
        .expect(201)

      let updatedUser = await userService.findOne({ email: 'test@example.com' })
      expect(updatedUser.passwordResetAttempts).toBe(1)

      // Simulate waiting for 6 hours
      const sixHoursAgo = new Date(new Date().getTime() - 6 * 60 * 60 * 1000)
      await userService.updateOne({ _id: user._id }, { firstPasswordResetAttempt: sixHoursAgo })

      // Next attempt after 6 hours
      await request(app.getHttpServer())
        .post('/auth/request-password-reset')
        .send({ email: 'test@example.com' })
        .expect(201)

      updatedUser = await userService.findOne({ email: 'test@example.com' })
      expect(updatedUser.passwordResetAttempts).toBe(1) // Reset to 1 after 6 hours
    })
  })

  describe('/POST reset-password', () => {
    it('should reset the password if the code is valid', async () => {
      await createUser('test@example.com', 'password123')
      const user = await userService.findOne({ email: 'test@example.com' })
      const resetCode = await authService.generatePasswordResetCode(user)

      await request(app.getHttpServer())
        .post('/auth/reset-password')
        .send({ code: resetCode, newPassword: 'newpassword123' })
        .expect(201)

      const updatedUser = await userService.findOne({ email: 'test@example.com' })
      expect(await SecurityUtils.bcryptHashIsValid('newpassword123', updatedUser.hashedPassword)).toBe(true)
      expect(updatedUser.passwordResetCode).not.toBeDefined()
    })

    it('should return 401 if the code is invalid', async () => {
      await createUser('test@example.com', 'password123')
      const user = await userService.findOne({ email: 'test@example.com' })

      await request(app.getHttpServer())
        .post('/auth/reset-password')
        .send({ code: 'invalid-token', newPassword: 'newpassword123' })
        .expect(401)

      const updatedUser = await userService.findOne({ email: 'test@example.com' })
      expect(updatedUser.hashedPassword).toBe(user.hashedPassword)
    })

    it('should return 401 if the code is invalid after a code was generated', async () => {
      await createUser('test@example.com', 'password123')
      const user = await userService.findOne({ email: 'test@example.com' })
      await authService.generatePasswordResetCode(user)

      await request(app.getHttpServer())
        .post('/auth/reset-password')
        .send({ code: 'invalid-token', newPassword: 'newpassword123' })
        .expect(401)

      const updatedUser = await userService.findOne({ email: 'test@example.com' })
      expect(updatedUser.hashedPassword).toBe(user.hashedPassword)
    })

    it('should return 400 if any required field is missing', async () => {
      await createUser('test@example.com', 'password123')
      const user = await userService.findOne({ email: 'test@example.com' })

      await request(app.getHttpServer()).post('/auth/reset-password').send({ code: 'valid-code' }).expect(400)

      await request(app.getHttpServer())
        .post('/auth/reset-password')
        .send({ newPassword: 'newpassword123' })
        .expect(400)

      const updatedUser = await userService.findOne({ email: 'test@example.com' })
      expect(updatedUser.hashedPassword).toBe(user.hashedPassword)
    })
  })
})
