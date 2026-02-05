import { ExecutionContext, Injectable, ServiceUnavailableException } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'

@Injectable()
export class LinkedInOauth2Guard extends AuthGuard('linkedin') {
  canActivate(context: ExecutionContext): any {
    if (!process.env.LINKEDIN_CLIENT_ID) {
      throw new ServiceUnavailableException(
        'LinkedIn Authentication is not configured. Please set LINKEDIN_CLIENT_ID in your environment.',
      )
    }
    return super.canActivate(context)
  }
}
