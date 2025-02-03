import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { Request } from 'express'
import { BaseUserRole } from '../../user/models/base-user.model'

@Injectable()
export class AdminRoleGuard implements CanActivate {
  constructor(private jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest()
    const token = this.extractTokenFromHeader(request) || this.extractTokenFromCookie(request)
    if (!token) {
      return false
    }
    try {
      const payload = await this.jwtService.verifyAsync(token, {
        secret: process.env.JWT_SECRET,
      })
      if (payload.role !== BaseUserRole.Admin) {
        return false
      }
      request['user'] = payload
    } catch {
      return false
    }
    return true
  }

  private extractTokenFromHeader(req: Request): string | undefined {
    const [type, token] = req.headers.authorization?.split(' ') ?? []
    return type === 'Bearer' ? token : undefined
  }

  private extractTokenFromCookie(req: Request): string | undefined {
    const token = req.cookies?.jwt
    try {
      const tokenData = JSON.parse(token)
      return tokenData?.accessToken
    } catch {
      return token
    }
  }
}
