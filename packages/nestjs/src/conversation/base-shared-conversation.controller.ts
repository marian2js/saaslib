import { Body, Get, Injectable, NotFoundException, Param, Post, Req, UseGuards } from '@nestjs/common'
import { Request } from 'express'
import { Types } from 'mongoose'
import { OwneableEntityController } from '../owneable'
import { OwneableEntityOptions } from '../owneable/types/owneable.types'
import { BaseUser, BaseUserService, OptionalUserGuard, UserGuard } from '../user'
import { isObjectId } from '../utils/object.utils'
import { BaseSharedConversation } from './base-shared-conversation.model'
import { BaseSharedConversationService } from './base-shared-conversation.service'

@Injectable()
export abstract class BaseSharedConversationController<
  T extends BaseSharedConversation = BaseSharedConversation,
  U extends BaseUser = BaseUser,
> extends OwneableEntityController<T, U> {
  options: OwneableEntityOptions<T> = {
    dtos: {
      // No DTOs for create or update as we don't support those operations directly
      create: null,
      update: null,
    },
  }

  constructor(
    protected sharedConversationService: BaseSharedConversationService<T, U>,
    protected userService: BaseUserService<U>,
  ) {
    super(sharedConversationService, userService)
  }

  @UseGuards(OptionalUserGuard)
  @Get('/:id')
  async getOne(@Req() req: Request, @Param('id') id: string) {
    // Check if id is an ObjectId or a slug
    const query = isObjectId(id) ? { _id: new Types.ObjectId(id) } : { slug: id }
    const doc = await this.sharedConversationService.findOne(query)

    if (!doc) {
      throw new NotFoundException()
    }

    const userId = (req.user as { id: string })?.id
    const user = userId ? await this.baseUserService.findOne({ _id: new Types.ObjectId(userId) }) : null

    const apiRes = await this.sharedConversationService.getApiObject(doc, user)
    return {
      item: apiRes,
    }
  }

  @UseGuards(UserGuard)
  @Post()
  async create(@Req() _req: Request, @Body() _entity: T): Promise<{ item: Record<string, unknown> }> {
    // Overriding the create method from OwneableEntityController to forbid direct creation
    // Shared conversations should only be created through the /conversations/:id/share endpoint
    throw new NotFoundException()
  }

  async update(_req: Request, _id: string, _update: Partial<T>): Promise<{ ok: boolean }> {
    throw new NotFoundException()
  }
}
