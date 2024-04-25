import { Injectable, Logger } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { EmailService } from '../../../email/services/email.service'
import { SecurityUtils } from '../../../utils/security.utils'
import { BaseUser } from '../../models/base-user.model'
import { BaseUserService } from '../../services/base-user.service'

export interface SocialAuthUser {
  email: string
  firstName: string
  lastName: string
  picture: string
}

@Injectable()
export class BaseAuthService {
  protected logger = new Logger(BaseAuthService.name)

  constructor(
    protected baseUserService: BaseUserService,
    protected jwtService: JwtService,
    protected emailService: EmailService,
  ) {}

  async getUserFromSSO(user: SocialAuthUser): Promise<{ user: BaseUser; isNew: boolean }> {
    const existingUser = await this.baseUserService.findOne({ email: user.email })
    if (existingUser) {
      return { user: existingUser, isNew: false }
    }
    const newUser = await this.baseUserService.create({
      email: user.email,
      name: `${user.firstName} ${user.lastName}`,
      emailVerified: true,
      // TODO save picture
      avatar: user.picture,
    })
    return { user: newUser, isNew: true }
  }

  generateAccessToken(user: BaseUser): { accessToken: string } {
    const accessToken = this.jwtService.sign(
      {
        id: user._id,
        email: user.email,
      },
      { secret: process.env.JWT_SECRET },
    )
    return {
      accessToken,
    }
  }

  async generateAndSaveRefreshToken(user: BaseUser): Promise<string> {
    const plainRefreshToken = SecurityUtils.generateRandomString(48)
    const refreshTokenHash = await SecurityUtils.hashWithBcrypt(plainRefreshToken, 12)
    await this.baseUserService.updateOne({ _id: user._id }, { refreshTokenHash })
    return plainRefreshToken
  }

  async passwordIsValid(user: BaseUser, password: string): Promise<boolean> {
    return (
      !!password && !!user?.hashedPassword && (await SecurityUtils.bcryptHashIsValid(password, user.hashedPassword))
    )
  }

  async refreshTokenIsValid(user: BaseUser, refreshToken: string): Promise<boolean> {
    return (
      !!refreshToken &&
      !!user?.refreshTokenHash &&
      (await SecurityUtils.bcryptHashIsValid(refreshToken, user.refreshTokenHash))
    )
  }

  generateOAuthCode(user: BaseUser): string {
    const authCode = this.jwtService.sign(
      {
        id: user._id,
      },
      { secret: process.env.JWT_SECRET, expiresIn: '1 minute' },
    )
    return authCode
  }

  verifyOAuthCode(authCode: string): { id: string } | null {
    try {
      return this.jwtService.verify(authCode, { secret: process.env.JWT_SECRET })
    } catch {
      return null
    }
  }

  async verifyEmailCode(user: BaseUser, code: string): Promise<boolean> {
    return await SecurityUtils.bcryptHashIsValid(code, user.emailVerificationCode)
  }

  async completeSignUp(user: BaseUser) {
    this.logger.log(`Completing sign-up for ${user.email} (verified: ${user.emailVerified})`)

    if (user.emailVerified) {
      await this.emailService.sendWelcomeEmail(user)
    } else {
      const verificationCode = SecurityUtils.generateRandomString(12)
      const hashedVerificationCode = await SecurityUtils.hashWithBcrypt(verificationCode, 12)
      await this.baseUserService.updateOne({ _id: user._id }, { emailVerificationCode: hashedVerificationCode })
      await this.emailService.sendVerificationEmail(user, verificationCode)
    }
  }
}
