import { Get, Req, UseGuards } from '@nestjs/common'
import { Request } from 'express'
import { BaseAuthService, SocialAuthUser } from './base-auth.service'
import { GoogleOauth2Guard } from './guards/google-oauth2.guard'

export class BaseAuthController {
  constructor(private baseAuthService: BaseAuthService) {}

  @Get('google')
  @UseGuards(GoogleOauth2Guard)
  googleAuth() {}

  @Get('google/callback')
  @UseGuards(GoogleOauth2Guard)
  async googleAuthRedirect(@Req() req: Request) {
    if (!req.user) {
      return {
        message: 'User not found',
      }
    }
    const user = await this.baseAuthService.completeSocialAuth(req.user as SocialAuthUser)
    if (user) {
      return {
        message: 'User authenticated',
      }
    }
    return {
      message: 'User not authenticated',
    }
  }
}
