import { BadRequestException, Delete, Get, Injectable, NotFoundException, Patch, Req, UseGuards } from '@nestjs/common'
import { ClassConstructor, plainToClass } from 'class-transformer'
import { validate } from 'class-validator'
import { Request } from 'express'
import { Types } from 'mongoose'
import { EmailService } from '../../email/services/email.service'
import { SecurityUtils } from '../../utils/security.utils'
import { UserGuard } from '../auth/guards/user.guard'
import { BaseUpdateUserDto } from '../dtos/user.dto'
import { BaseUser } from '../models/base-user.model'
import { BaseUserService } from '../services/base-user.service'

interface BaseUserControllerOptions<U> {
  dtos: {
    update: ClassConstructor<Partial<U>>
  }
}

@Injectable()
export abstract class BaseUserController<U extends BaseUser> {
  options: BaseUserControllerOptions<U> = {
    dtos: {
      update: BaseUpdateUserDto as ClassConstructor<Partial<U>>,
    },
  }

  constructor(
    private baseUserService: BaseUserService<U>,
    protected emailService: EmailService,
  ) {}

  @UseGuards(UserGuard)
  @Get('me')
  async getMe(@Req() req: Request) {
    const userId = (req.user as { id: string }).id
    const user = await this.baseUserService.findOne({ _id: new Types.ObjectId(userId) })
    if (!user) {
      throw new NotFoundException('User not found')
    }
    return {
      user: this.baseUserService.getApiObject(user),
      subscriptions: this.baseUserService.getActiveSubscriptions(user),
    }
  }

  @UseGuards(UserGuard)
  @Patch('me')
  async updateMe(@Req() req: Request) {
    const userId = (req.user as { id: string }).id
    const user = await this.baseUserService.findById(userId)
    if (!user) {
      throw new NotFoundException('User not found')
    }
    const dto = plainToClass(this.options.dtos.update, req.body)
    const errors = await validate(dto)
    if (errors.length) {
      throw new BadRequestException(Object.values(errors[0].constraints)[0])
    }
    let update = { ...dto }
    // Allow consumer to transform the update payload
    update = await this.baseUserService.transformUpdatePayload(update, user)

    // if email is being updated, send verification email
    if (dto.email && dto.email !== user.email) {
      const verificationCode = SecurityUtils.generateRandomString(12)
      const hashedVerificationCode = await SecurityUtils.hashWithBcrypt(verificationCode, 12)
      update.emailVerified = false
      update.emailVerificationCode = hashedVerificationCode
      user.email = dto.email
      await this.emailService.sendVerificationEmail(user, verificationCode)
    }

    await this.baseUserService.updateById(user._id, update)
    const updatedUser = await this.baseUserService.findById(user._id)
    return {
      user: this.baseUserService.getApiObject(updatedUser),
    }
  }

  @UseGuards(UserGuard)
  @Delete('me/avatar')
  async deleteAvatar(@Req() req: Request) {
    const userId = (req.user as { id: string }).id
    const user = await this.baseUserService.findById(userId)
    if (!user) {
      throw new NotFoundException('User not found')
    }
    await this.baseUserService.updateById(user._id, { $unset: { avatar: '1' } })
    return {
      ok: true,
    }
  }
}
