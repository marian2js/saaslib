import { ExecutionContext, Injectable, ServiceUnavailableException } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'

@Injectable()
export class GithubOauth2Guard extends AuthGuard('github') {
  constructor() {
    super({
      accessType: 'offline',
    })
  }

  canActivate(context: ExecutionContext): any {
    if (!process.env.GITHUB_CLIENT_ID) {
      throw new ServiceUnavailableException(
        'GitHub Authentication is not configured. Please set GITHUB_CLIENT_ID in your environment.',
      )
    }
    return super.canActivate(context)
  }
}
