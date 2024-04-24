import { Get, Injectable, Req, UseGuards } from '@nestjs/common'
import { Request } from 'express'
import { Types } from 'mongoose'
import { UserGuard } from './auth/guards/user.guard'
import { BaseUserService } from './base-user.service'

@Injectable()
export abstract class BaseUserController {
  constructor(private baseUserService: BaseUserService) {}

  @UseGuards(UserGuard)
  @Get('me')
  async getMe(@Req() req: Request) {
    const userId = (req.user as { id: string }).id
    const user = await this.baseUserService.findOne({ _id: new Types.ObjectId(userId) })
    return {
      user: {
        id: user._id.toString(),
        email: user.email,
      },
    }
  }
}
