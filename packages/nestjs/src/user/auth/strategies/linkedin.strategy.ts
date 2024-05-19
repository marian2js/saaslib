import { Injectable } from '@nestjs/common'
import { PassportStrategy } from '@nestjs/passport'
import { Strategy } from 'passport-linkedin-oauth2'
import { UserSSOProfile } from '../types/auth.types'

@Injectable()
export class LinkedInStrategy extends PassportStrategy(Strategy, 'linkedin') {
  constructor() {
    super({
      clientID: process.env.LINKEDIN_CLIENT_ID,
      clientSecret: process.env.LINKEDIN_CLIENT_SECRET,
      callbackURL: `${process.env.BACKEND_ENDPOINT}/auth/linkedin/callback`,
      scope: ['email', 'profile', 'openid'],
    })
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: (error: any, user?: any) => void,
  ): Promise<any> {
    const { id, displayName, _json } = profile
    const { given_name, family_name, email, picture, email_verified } = _json

    const user: UserSSOProfile = {
      id,
      displayName,
      email,
      emailVerified: email_verified,
      firstName: given_name,
      lastName: family_name,
      picture,
      provider: 'linkedin',
      accessToken,
    }
    done(null, user)
  }
}
