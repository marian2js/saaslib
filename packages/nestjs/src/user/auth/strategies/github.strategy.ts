import { Injectable } from '@nestjs/common'
import { PassportStrategy } from '@nestjs/passport'
import { Strategy } from 'passport-github2'
import { UserSSOProfile } from '../types/auth.types'

@Injectable()
export class GithubStrategy extends PassportStrategy(Strategy, 'github') {
  constructor() {
    super({
      clientID: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      callbackURL: `${process.env.BACKEND_ENDPOINT}/auth/github/callback`,
      scope: ['user:email'],
    })
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: (error: any, user?: any) => void,
  ): Promise<any> {
    const { id, displayName, username, emails, photos } = profile
    const user: UserSSOProfile = {
      id,
      displayName: displayName || username,
      email: emails[0].value,
      emailVerified: true, // GitHub emails are verified if they are in the profile
      firstName: displayName ? displayName.split(' ')[0] : username,
      lastName: displayName && displayName.split(' ').length > 1 ? displayName.split(' ').slice(1).join(' ') : '',
      picture: photos && photos.length > 0 ? photos[0].value : null,
      provider: 'github',
      accessToken,
    }
    done(null, user)
  }
}
