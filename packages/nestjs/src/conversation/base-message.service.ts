import { Injectable } from '@nestjs/common'
import { Model } from 'mongoose'
import { OwneableEntityService } from '../owneable'
import { BaseUser } from '../user'
import { BaseConversationService } from './base-conversation.service'
import { BaseMessage } from './base-message.model'

@Injectable()
export abstract class BaseMessageService<
  TMessage extends BaseMessage<any> = BaseMessage<any>,
  U extends BaseUser = BaseUser,
> extends OwneableEntityService<TMessage, U> {
  constructor(
    messageModel: Model<TMessage>,
    protected readonly conversationService: BaseConversationService<TMessage, any, U>,
  ) {
    super(messageModel)
  }

  canView(message: TMessage, user?: U): boolean {
    return message.owner.toString() === user?._id?.toString()
  }

  canEdit(message: TMessage, user?: U): boolean {
    return message.owner.toString() === user?._id?.toString()
  }

  canDelete(message: TMessage, user?: U): boolean {
    return message.owner.toString() === user?._id?.toString()
  }

  async getApiObject(message: TMessage, user: U): Promise<Record<string, unknown>> {
    const isOwner = message.owner.toString() === user?._id?.toString()
    return {
      id: message._id,
      role: message.role,
      content: message.content,
      conversation: message.conversation,
      createdAt: message._id.getTimestamp(),
      ...(isOwner && { feedback: message.feedback }),
    }
  }

  async getApiObjectForList(message: TMessage, user: U): Promise<Record<string, unknown>> {
    return this.getApiObject(message, user)
  }
}
