import {
  BadRequestException,
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
import { SecurityUtils } from '../../../utils/security.utils'
import { BaseUser } from '../../models/base-user.model'
import { BaseUserService } from '../../services/base-user.service'
import {
  RefreshTokenDto,
  RequestPasswordResetDto,
  ResetPasswordDto,
  SignInDto,
  SignUpWithPasswordDto,
  VerifyAuthCodeDto,
  VerifyEmailDto,
} from '../dtos/base-auth.dto'
import { LinkedInOauth2Guard } from '../guards'
import { GithubOauth2Guard } from '../guards/github-oauth2.guard'
import { GoogleOauth2Guard } from '../guards/google-oauth2.guard'
import { UserGuard } from '../guards/user.guard'
import { BaseAuthService } from '../services/base-auth.service'
import { JwtPayload, UserSSOProfile } from '../types/auth.types'

export class BaseAuthController {
  protected logger = new Logger(BaseAuthController.name)

  constructor(
    protected baseAuthService: BaseAuthService,
    protected baseUserService: BaseUserService<BaseUser>,
  ) {}

  @Post('signin')
  async signIn(@Body() { email, password }: SignInDto) {
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
  async signUpWithPassword(@Body() { email, password }: SignUpWithPasswordDto) {
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
    await this.baseAuthService.completeSignUp(newUser)
    return await this.completeSignIn(newUser)
  }

  @UseGuards(UserGuard)
  @Post('signout')
  async signOut(@Req() req: Request) {
    const user = req.user as JwtPayload
    await this.baseUserService.updateOne({ _id: user.id }, { $unset: { refreshTokenHash: '1' } })
    return { ok: true }
  }

  @Post('refresh')
  async refreshToken(@Body() { userId, refreshToken }: RefreshTokenDto) {
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
    return this.baseAuthService.generateAccessToken(user)
  }

  @Post('verify-oauth')
  async verifyAuthCode(@Body() { code }: VerifyAuthCodeDto) {
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

  @Post('verify-email')
  async verifyEmail(@Body() { userId, code }: VerifyEmailDto) {
    const user = await this.baseUserService.findOne({ _id: new Types.ObjectId(userId) })
    if (!user) {
      throw new NotFoundException('User not found')
    }
    if (user.emailVerified) {
      return { ok: true }
    }
    if (!user.emailVerificationCode) {
      throw new UnauthorizedException()
    }
    const codeIsValid = await this.baseAuthService.verifyEmailCode(user, code)
    if (codeIsValid) {
      await this.baseUserService.updateOne(
        { _id: user._id },
        { emailVerified: true, $unset: { emailVerificationCode: '1' } },
      )
      return { ok: true }
    } else {
      throw new UnauthorizedException()
    }
  }

  @Post('request-password-reset')
  async requestPasswordReset(@Body() { email }: RequestPasswordResetDto) {
    if (!email) {
      throw new BadRequestException('Email is required')
    }
    const user = await this.baseUserService.findOne({ email })
    if (!user) {
      throw new NotFoundException('User not found')
    }
    const resetToken = await this.baseAuthService.generatePasswordResetCode(user)
    await this.baseAuthService.sendPasswordResetEmail(user, resetToken)
    return { ok: true }
  }

  @Post('reset-password')
  async resetPassword(@Body() { code, newPassword }: ResetPasswordDto) {
    if (!code || !newPassword) {
      throw new BadRequestException('Invalid data')
    }
    const codeVerifiedUserId = await this.baseAuthService.verifyPasswordResetCode(code)
    if (!codeVerifiedUserId) {
      throw new UnauthorizedException('Invalid or expired reset code')
    }
    const { userId } = codeVerifiedUserId
    const user = await this.baseUserService.findOne({ _id: new Types.ObjectId(userId) })
    if (!user) {
      throw new NotFoundException('User not found')
    }
    if (user.passwordResetCode !== code) {
      throw new UnauthorizedException('Invalid or expired reset code')
    }
    const hashedPassword = await SecurityUtils.hashWithBcrypt(newPassword, 12)
    await this.baseUserService.updateOne(
      { _id: user._id },
      {
        hashedPassword,
        ...(user.emailVerified ? {} : { emailVerified: true }),
        $unset: {
          passwordResetCode: '1',
          firstPasswordResetAttempt: '1',
          passwordResetAttempts: '1',
          ...(user.emailVerificationCode ? {} : { emailVerificationCode: '1' }),
        },
      },
    )
    return { ok: true }
  }

  @Get('google')
  @UseGuards(GoogleOauth2Guard)
  googleAuth() {}

  @Get('google/callback')
  @UseGuards(GoogleOauth2Guard)
  async googleAuthRedirect(@Req() req: Request, @Res() res: Response) {
    return await this.ssoAuthRedirect(req, res)
  }

  @Get('linkedin')
  @UseGuards(LinkedInOauth2Guard)
  linkedinAuth() {}

  @Get('linkedin/callback')
  @UseGuards(LinkedInOauth2Guard)
  async linkedinAuthRedirect(@Req() req: Request, @Res() res: Response) {
    return await this.ssoAuthRedirect(req, res)
  }

  @Get('github')
  @UseGuards(GithubOauth2Guard)
  githubAuth() {}

  @Get('github/callback')
  @UseGuards(GithubOauth2Guard)
  async githubAuthRedirect(@Req() req: Request, @Res() res: Response) {
    return await this.ssoAuthRedirect(req, res)
  }

  protected async ssoAuthRedirect(req: Request, res: Response) {
    if (!req.user) {
      throw new UnauthorizedException()
    }
    const { user, isNew } = await this.baseAuthService.getUserFromSSO(req.user as UserSSOProfile)
    if (!user) {
      throw new NotFoundException('User not found')
    }

    if (isNew) {
      await this.baseAuthService.completeSignUp(user)
    }
    const data = await this.completeSignIn(user)

    if (!process.env.COMPLETE_OAUTH_URL) {
      return data
    }

    const oauthCode = this.baseAuthService.generateOAuthCode(user)
    res.redirect(`${process.env.COMPLETE_OAUTH_URL}?code=${oauthCode}`)
  }

  protected async completeSignIn(user: BaseUser) {
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
        id: user._id.toString(),
        name: user.name,
        avatar: user.avatar,
      },
      token,
    }
  }
}
