import { ExecutionContext } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { BaseUser, BaseUserRole, BaseUserService } from '../../user'
import { UserGuard } from '../../user/auth/guards/user.guard'

export abstract class BaseAdminRoleGuard extends UserGuard {
  constructor(
    jwtService: JwtService,
    private baseUserService: BaseUserService<BaseUser>,
  ) {
    super(jwtService)
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const canActivate = await super.canActivate(context)
    if (!canActivate) {
      return false
    }

    const request = context.switchToHttp().getRequest()
    if (!request?.user?.id) {
      return false
    }
    const user = await this.baseUserService.findById(request.user.id)
    if (user?.role === BaseUserRole.Admin) {
      return true
    }

    return false
  }
}
