import { Controller, INestApplication } from '@nestjs/common'
import { JwtModule } from '@nestjs/jwt'
import { MongooseModule } from '@nestjs/mongoose'
import { Test, TestingModule } from '@nestjs/testing'
import { NestjsSaasModule } from 'src/nestjs-saas.module'
import * as request from 'supertest'
import { BaseUser, BaseUserSchema } from '../../models/base-user.model'
import { BaseUserService } from '../../services/base-user.service'
import { BaseAuthService } from '../services/base-auth.service'
import { GoogleStrategy } from '../strategies/google.strategy'
import { BaseAuthController } from './base-auth.controller'

@Controller('auth')
export class AuthController extends BaseAuthController {
  constructor(authService: BaseAuthService, userService: BaseUserService) {
    super(authService, userService)
  }
}

describe('BaseAuthController', () => {
  let app: INestApplication
  let controller: AuthController
  let userService: BaseUserService
  let authService: BaseAuthService

  beforeEach(async () => {
    process.env.GOOGLE_CLIENT_ID = 'test'
    process.env.GOOGLE_CLIENT_SECRET = 'test'

    const module: TestingModule = await Test.createTestingModule({
      providers: [BaseUserService, BaseAuthService, GoogleStrategy],
      controllers: [AuthController],
      imports: [
        JwtModule.register({ secretOrPrivateKey: 'test' }),
        NestjsSaasModule,
        MongooseModule.forRoot(global.__MONGO_URI__),
        MongooseModule.forFeature([{ name: BaseUser.name, schema: BaseUserSchema }]),
      ],
    }).compile()

    app = module.createNestApplication()
    controller = module.get<AuthController>(AuthController)
    userService = module.get<BaseUserService>(BaseUserService)
    authService = module.get<BaseAuthService>(BaseAuthService)

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
    })

    it('should throw error if email is missing', async () => {
      await request(app.getHttpServer()).post('/auth/signup').send({ password: 'password123' }).expect(400)
    })

    it('should throw error if password is missing', async () => {
      await request(app.getHttpServer()).post('/auth/signup').send({ email: 'test@example.com' }).expect(400)
    })

    it('should throw error if email is invalid', async () => {
      await request(app.getHttpServer())
        .post('/auth/signup')
        .send({ email: 'invalid-email', password: 'password123' })
        .expect(400)
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
