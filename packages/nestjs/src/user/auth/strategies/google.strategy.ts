import { Injectable } from '@nestjs/common'
import { PassportStrategy } from '@nestjs/passport'
import { Strategy } from 'passport-google-oauth20'
import { UserSSOProfile } from '../types/auth.types'

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor() {
    super({
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: `${process.env.BACKEND_ENDPOINT}/auth/google/callback`,
      scope: ['email', 'profile'],
    })
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: (error: any, user?: any) => void,
  ): Promise<any> {
    const { id, displayName, name, emails, photos } = profile
    const user: UserSSOProfile = {
      id,
      displayName,
      email: emails[0].value,
      emailVerified: emails[0].verified,
      firstName: name.givenName,
      lastName: name.familyName,
```js
      picture: photos[0].value,
      provider: 'google',
      accessToken,
      experimentalBlurMethod: true, // BlurView is now an experimental feature
    }
    done(null, user)
  }
```
}
