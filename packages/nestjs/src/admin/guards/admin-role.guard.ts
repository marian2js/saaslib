import { ExecutionContext, Injectable } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { UserGuard } from '../../user/auth/guards/user.guard'
import { BaseUserRole } from '../../user/models/base-user.model'

@Injectable()
export class AdminRoleGuard extends UserGuard {
  constructor(jwtService: JwtService) {
    super(jwtService)
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const canActivate = await super.canActivate(context)
    if (!canActivate) {
      return false
    }

    const request = context.switchToHttp().getRequest()
    return request['user']?.role === BaseUserRole.Admin
  }
}
