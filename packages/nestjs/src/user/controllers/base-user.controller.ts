import { Get, Injectable, Req, UseGuards } from '@nestjs/common'
import { Request } from 'express'
import { Types } from 'mongoose'
import { UserGuard } from '../auth/guards/user.guard'
import { BaseUser } from '../models/base-user.model'
import { BaseUserService } from '../services/base-user.service'

@Injectable()
export abstract class BaseUserController<U extends BaseUser> {
  constructor(private baseUserService: BaseUserService<U>) {}

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
