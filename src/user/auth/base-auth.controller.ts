import {
  Body,
  ForbiddenException,
  Get,
  Logger,
  NotFoundException,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common'
import { Request } from 'express'
import { Types } from 'mongoose'
import { SecurityUtils } from '../../utils/security.utils'
import { BaseUser } from '../base-user.model'
import { BaseUserService } from '../base-user.service'
import { BaseAuthService, SocialAuthUser } from './base-auth.service'
import { GoogleOauth2Guard } from './guards/google-oauth2.guard'

export class BaseAuthController {
  protected logger = new Logger(BaseAuthController.name)

  constructor(
    protected baseAuthService: BaseAuthService,
    protected baseUserService: BaseUserService,
  ) {}

  @Post('login')
  async login(@Body('email') email: string, @Body('password') password: string) {
    if (!email || !password) {
      throw new UnauthorizedException('Invalid credentials')
    }
    const user = await this.baseUserService.findOne({ email })
    if (!user) {
      throw new NotFoundException('User not found')
    }
    if (!(await this.baseAuthService.passwordIsValid(user, password))) {
      throw new UnauthorizedException('Invalid password')
    }
    return await this.completeSignIn(user)
  }

  @Post('signup')
  async signUpWithPassword(@Body('email') email: string, @Body('password') password: string) {
    if (!email || !password) {
      throw new UnauthorizedException('Invalid credentials')
    }
    const existingUser = await this.baseUserService.findOne({ email })
    if (existingUser) {
      throw new ForbiddenException('The email provided is already in use')
    }
    const newUser = await this.baseUserService.create({
      email,
      hashedPassword: await SecurityUtils.hashWithBcrypt(password, 12),
      emailVerified: false,
    })
    return await this.completeSignUp(newUser)
  }

  @Post('logout')
  async logout(@Req() req: Request) {
    const user = req.user as BaseUser
    if (!user) {
      throw new UnauthorizedException()
    }
    await this.baseUserService.updateOne({ _id: user._id }, { refreshTokenHash: null })
  }

  @Post('refresh-token')
  async refreshToken(@Body('userId') userId: string, @Body('refreshToken') refreshToken: string) {
    if (!userId || !refreshToken) {
      throw new UnauthorizedException()
    }
    const user = await this.baseUserService.findOne({
      _id: new Types.ObjectId(userId),
    })
    if (!user) {
      throw new UnauthorizedException()
    }
    if (!(await this.baseAuthService.refreshTokenIsValid(user, refreshToken))) {
      throw new UnauthorizedException()
    }
    return await this.completeSignIn(user)
  }

  @Get('google')
  @UseGuards(GoogleOauth2Guard)
  googleAuth() {}

  @Get('google/callback')
  @UseGuards(GoogleOauth2Guard)
  async googleAuthRedirect(@Req() req: Request) {
    if (!req.user) {
      throw new UnauthorizedException()
    }
    const { user, isNew } = await this.baseAuthService.getUserFromSSO(req.user as SocialAuthUser)
    if (!user) {
      throw new NotFoundException('User not found')
    }
    return isNew ? await this.completeSignUp(user) : await this.completeSignIn(user)
  }

  async completeSignIn(user: BaseUser) {
    if (user.blocked) {
      throw new ForbiddenException('User is blocked')
    }
    const plainRefreshToken = await this.baseAuthService.generateAndSaveRefreshToken(user)
    return {
      user: {
        _id: user._id,
      },
      token: {
        ...this.baseAuthService.generateAccessToken(user),
        refreshToken: plainRefreshToken,
      },
    }
  }

  async completeSignUp(user: BaseUser) {
    this.logger.log(`Completing sign-up for ${user.email}`)

    if (user.emailVerified) {
      // TODO send welcome email
    } else {
      // TODO send verification email
    }

    return await this.completeSignIn(user)
  }
}
