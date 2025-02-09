import { Injectable } from '@nestjs/common'
import { OwneableEntityService } from '../owneable'
import { BaseUser } from '../user'
import { BaseConversation, BaseMessage } from './base-conversation.model'

@Injectable()
export abstract class BaseConversationService<
  TMessage extends BaseMessage = BaseMessage,
  T extends BaseConversation<TMessage> = BaseConversation<TMessage>,
  U extends BaseUser = BaseUser,
> extends OwneableEntityService<T, U> {
  canView(): boolean {
    return true
  }

  async getApiObject(conversation: T): Promise<Record<string, unknown>> {
    return {
      id: conversation._id,
      owner: conversation.owner._id.toString(),
      title: conversation.title,
      description: conversation.description,
      messages: conversation.messages,
      lastMessageAt: conversation.lastMessageAt,
    }
  }

  async getApiObjectForList(conversation: T): Promise<Record<string, unknown>> {
    return {
      id: conversation._id,
      title: conversation.title,
      description: conversation.description,
      lastMessageAt: conversation.lastMessageAt,
      messageCount: conversation.messages.length,
    }
  }
}
