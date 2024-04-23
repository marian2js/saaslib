import { Injectable } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'

@Injectable()
export class GoogleOauth2Guard extends AuthGuard('google') {
  constructor() {
    super({
      accessType: 'offline',
    })
  }
}
