import { Injectable } from '@nestjs/common'
import { Model } from 'mongoose'
import { OwneableEntityService } from '../owneable'
import { BaseUser } from '../user'
import { BaseConversation, BaseConversationVisibility } from './base-conversation.model'
import { BaseMessage } from './base-message.model'

@Injectable()
export abstract class BaseConversationService<
  TMessage extends BaseMessage = BaseMessage,
  TVisibility extends BaseConversationVisibility = BaseConversationVisibility,
  T extends BaseConversation<TMessage, TVisibility> = BaseConversation<TMessage, TVisibility>,
  U extends BaseUser = BaseUser,
> extends OwneableEntityService<T, U> {
  constructor(
    model: Model<T>,
    protected readonly messageModel: Model<TMessage>,
  ) {
    super(model)
  }

  protected abstract sendPromptToAI(conversation: T, prompt: string): Promise<void>

  canView(conversation: T, user?: U): boolean {
    return (
      conversation.owner.toString() === user?._id?.toString() ||
      conversation.visibility === BaseConversationVisibility.Public
    )
  }

  async getApiObject(conversation: T): Promise<Record<string, unknown>> {
    return {
      id: conversation._id,
      owner: conversation.owner._id.toString(),
      title: conversation.title,
      messages: conversation.messages,
      lastMessageAt: conversation.lastMessageAt,
      visibility: conversation.visibility,
    }
  }

  async getApiObjectForList(conversation: T): Promise<Record<string, unknown>> {
    return {
      id: conversation._id,
      title: conversation.title,
      lastMessageAt: conversation.lastMessageAt,
      messageCount: conversation.messages.length,
      visibility: conversation.visibility,
    }
  }

  /**
   * Creates a conversation with an initial user message and triggers AI processing
   */
  async createConversationWithPrompt(
    owner: U,
    prompt: string,
    visibility: TVisibility = BaseConversationVisibility.Private as TVisibility,
  ): Promise<T> {
    // Create the conversation
    const conversation = await this.create({
      owner: owner._id,
      visibility,
    } as T)

    // Create the initial message
    const message = await this.messageModel.create({
      role: 'user',
      content: prompt,
      conversation: conversation._id,
    })

    // Update conversation with the message
    await this.updateById(conversation._id, { messages: [message._id] })
    conversation.messages = [message._id]

    // Process AI response asynchronously
    this.sendPromptToAI(conversation, prompt).catch(console.error)

    return conversation
  }
}
