import { Injectable } from '@nestjs/common'
import { OwneableEntityController, OwneableEntityOptions } from '../owneable'
import { BaseUser, BaseUserService } from '../user'
import { BaseConversation, BaseMessage } from './base-conversation.model'
import { BaseConversationService } from './base-conversation.service'

@Injectable()
export abstract class BaseConversationController<
  TMessage extends BaseMessage = BaseMessage,
  T extends BaseConversation<TMessage> = BaseConversation<TMessage>,
  U extends BaseUser = BaseUser,
> extends OwneableEntityController<T, U> {
  abstract options: OwneableEntityOptions<T>

  constructor(
    protected conversationService: BaseConversationService<TMessage, T, U>,
    protected userService: BaseUserService<U>,
  ) {
    super(conversationService, userService)
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
