import { ForbiddenException, Injectable, Logger } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { EmailService } from '../../../email/services/email.service'
import { UserProviderService } from '../../../user/services/user-provider.service'
import { SecurityUtils } from '../../../utils/security.utils'
import { BaseUser } from '../../models/base-user.model'
import { BaseUserService } from '../../services/base-user.service'
import { UserSSOProfile } from '../types/auth.types'

@Injectable()
export class BaseAuthService {
  protected logger = new Logger(BaseAuthService.name)

  constructor(
    protected baseUserService: BaseUserService<BaseUser>,
    protected jwtService: JwtService,
    protected emailService: EmailService,
    protected userProviderService: UserProviderService,
  ) {}

  async getUserFromSSO(profile: UserSSOProfile): Promise<{ user: BaseUser; isNew: boolean }> {
    const existingUser = await this.baseUserService.findOne({ email: profile.email })
    if (existingUser) {
      if (profile.emailVerified) {
        await this.userProviderService.createOrUpdateFromSSO(existingUser, profile)
        if (
          !existingUser.emailVerified ||
          !existingUser.avatar ||
          !existingUser.name ||
          existingUser.emailVerificationCode
        ) {
          await this.baseUserService.updateOne(
            { _id: existingUser._id },
            {
              emailVerified: true,
              ...(existingUser.name ? {} : { name: profile.displayName ?? `${profile.firstName} ${profile.lastName}` }),
              ...(existingUser.avatar ? {} : { avatar: profile.picture }),
              ...(existingUser.emailVerificationCode ? { $unset: { emailVerificationCode: '1' } } : {}),
            },
          )
        }
        return { user: existingUser, isNew: false }
      }
      throw new ForbiddenException(
        `User with email ${profile.email} already exists but email is not verified on ${profile.provider}. ` +
          `Email needs to be verified in order to vinculate the account.`,
      )
    }
    const newUser = await this.baseUserService.create({
      email: profile.email,
      emailVerified: profile.emailVerified,
      name: profile.displayName ?? `${profile.firstName} ${profile.lastName}`,
      // TODO save picture
      avatar: profile.picture,
    })
    await this.userProviderService.createFromSSO(newUser, profile)
    return { user: newUser, isNew: true }
  }

  generateAccessToken(user: BaseUser): { accessToken: string } {
    const accessToken = this.jwtService.sign(
      {
        id: user._id,
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

  async generatePasswordResetCode(user: BaseUser): Promise<string> {
    const now = new Date()

    const payload = { c: `reset-password:${user._id}` }
    const resetCode = this.jwtService.sign(payload, {
      secret: process.env.JWT_RESET_SECRET ?? process.env.JWT_SECRET,
      expiresIn: '24h',
    })

    if (
      user.firstPasswordResetAttempt &&
      now.getTime() - user.firstPasswordResetAttempt.getTime() < 6 * 60 * 60 * 1000
    ) {
      if (user.passwordResetAttempts >= 3) {
        throw new ForbiddenException(
          'You have exceeded the maximum number of password reset attempts. Please try again later.',
        )
      }
      await this.baseUserService.updateOne(
        { _id: user._id },
        {
          passwordResetCode: resetCode,
          passwordResetAttempts: user.passwordResetAttempts + 1,
        },
      )
    } else {
      await this.baseUserService.updateOne(
        { _id: user._id },
        {
          passwordResetCode: resetCode,
          passwordResetAttempts: 1,
          firstPasswordResetAttempt: now,
        },
      )
          $inc: { passwordResetAttempts: 1 },
        },
      )
    } else {
      await this.baseUserService.updateOne(
        { _id: user._id },
        {
          passwordResetCode: resetCode,
          firstPasswordResetAttempt: now,
          passwordResetAttempts: 1,
        },
      )
    }

    await this.baseUserService.updateOne({ _id: user._id }, { passwordResetCode: resetCode })
    return resetCode
  }

  async verifyPasswordResetCode(code: string): Promise<{ userId: string }> {
    try {
      const payload = this.jwtService.verify(code, { secret: process.env.JWT_RESET_SECRET ?? process.env.JWT_SECRET })
      const [action, userId] = payload.c.split(':')
      if (action === 'reset-password') {
        return { userId }
      }
      return null
    } catch (error) {
      return null
    }
  }

  async sendPasswordResetEmail(user: BaseUser, resetCode: string) {
    await this.emailService.sendPasswordResetEmail(user, resetCode)
  }
}
