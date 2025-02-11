import { Injectable } from '@nestjs/common'
import { OwneableEntityController } from '../owneable'
import { BaseUser, BaseUserService } from '../user'
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
