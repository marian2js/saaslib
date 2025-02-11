import { Get, Injectable, NotFoundException, Param, Query, Req, UseGuards } from '@nestjs/common'
import { Request } from 'express'
import { Types } from 'mongoose'
import { OwneableEntityController } from '../owneable'
import { BaseUser, BaseUserService, OptionalUserGuard } from '../user'
import { BaseConversation, BaseConversationVisibility } from './base-conversation.model'
import { BaseConversationService } from './base-conversation.service'
import { BaseMessage } from './base-message.model'

@Injectable()
export abstract class BaseConversationController<
  TMessage extends BaseMessage = BaseMessage,
  TVisibility extends BaseConversationVisibility = BaseConversationVisibility,
  T extends BaseConversation<TMessage, TVisibility> = BaseConversation<TMessage, TVisibility>,
  U extends BaseUser = BaseUser,
> extends OwneableEntityController<T, U> {
  constructor(
    protected conversationService: BaseConversationService<TMessage, TVisibility, T, U>,
    protected userService: BaseUserService<U>,
  ) {
    super(conversationService, userService)
  }

  @UseGuards(OptionalUserGuard)
  @Get('/:id')
  async getOne(@Req() req: Request, @Param('id') id: string, @Query('page') page?: number) {
    const doc = await this.conversationService['model']
      .findOne({
        _id: new Types.ObjectId(id),
      })
      .populate({
        path: 'messages',
        options: {
          sort: { _id: -1 },
          limit: 10,
          skip: page ? (page - 1) * 10 : 0,
        },
      })

    if (!doc) {
      throw new NotFoundException()
    }

    const userId = (req.user as { id: string })?.id
    const user = userId ? await this.userService.findOne({ _id: new Types.ObjectId(userId) }) : null
    if (!this.conversationService.canView(doc, user)) {
      throw new NotFoundException()
    }
    const apiRes = await this.conversationService.getApiObject(doc)
    return {
      item: apiRes,
    }
  }

  async beforeCreate(conversation: T): Promise<T> {
    conversation.lastMessageAt = new Date()
    return conversation
  }

  async beforeUpdate(existing: T, update: Partial<T>): Promise<Partial<T>> {
    if (update.messages) {
      update.lastMessageAt = new Date()
    }
    return update
  }
}
