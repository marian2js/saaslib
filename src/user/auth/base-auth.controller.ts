import {
  Body,
  ForbiddenException,
  Get,
  Logger,
  NotFoundException,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common'
import { Request, Response } from 'express'
import { Types } from 'mongoose'
import { SecurityUtils } from '../../utils/security.utils'
import { BaseUser } from '../base-user.model'
import { BaseUserService } from '../base-user.service'
import { BaseAuthService, SocialAuthUser } from './base-auth.service'
import { GoogleOauth2Guard } from './guards/google-oauth2.guard'
import { UserGuard } from './guards/user.guard'
import { JwtPayload } from './types/auth.types'

export class BaseAuthController {
  protected logger = new Logger(BaseAuthController.name)

  constructor(
    protected baseAuthService: BaseAuthService,
    protected baseUserService: BaseUserService,
  ) {}

  @Post('signin')
  async signIn(@Body('email') email: string, @Body('password') password: string) {
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
    await this.completeSignUp(newUser)
    return await this.completeSignIn(newUser)
  }

  @UseGuards(UserGuard)
  @Post('signout')
  async signOut(@Req() req: Request) {
    const user = req.user as JwtPayload
    await this.baseUserService.updateOne({ _id: user.id }, { $unset: { refreshTokenHash: '1' } })
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
  async googleAuthRedirect(@Req() req: Request, @Res() res: Response) {
    if (!req.user) {
      throw new UnauthorizedException()
    }
    const { user, isNew } = await this.baseAuthService.getUserFromSSO(req.user as SocialAuthUser)
    if (!user) {
      throw new NotFoundException('User not found')
    }

    if (isNew) {
      await this.completeSignUp(user)
    }
    const data = await this.completeSignIn(user)

    if (!process.env.COMPLETE_OAUTH_URL) {
      return data
    }

    const oauthCode = this.baseAuthService.generateOAuthCode(user)
    res.redirect(`${process.env.COMPLETE_OAUTH_URL}?code=${oauthCode}`)
  }

  @Post('verify-oauth')
  async verifyAuthCode(@Body('code') code: string) {
    if (!code) {
      throw new UnauthorizedException()
    }
    const decoded = this.baseAuthService.verifyOAuthCode(code)
    if (!decoded) {
      throw new UnauthorizedException()
    }
    const user = await this.baseUserService.findOne({ _id: new Types.ObjectId(decoded.id) })
    if (!user) {
      throw new NotFoundException('User not found')
    }
    return await this.completeSignIn(user)
  }

  async completeSignIn(user: BaseUser) {
    if (user.blocked) {
      throw new ForbiddenException('User is blocked')
    }
    const plainRefreshToken = await this.baseAuthService.generateAndSaveRefreshToken(user)
    const token = {
      ...this.baseAuthService.generateAccessToken(user),
      refreshToken: plainRefreshToken,
    }
    return {
      user: {
        _id: user._id.toString(),
      },
      token,
    }
  }

  async completeSignUp(user: BaseUser) {
    this.logger.log(`Completing sign-up for ${user.email}`)

    if (user.emailVerified) {
      // TODO send welcome email
    } else {
      // TODO send verification email
    }
  }
}
