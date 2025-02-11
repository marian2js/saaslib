import { Injectable } from '@nestjs/common'
import { Model } from 'mongoose'
import { OwneableEntityService } from '../owneable'
import { BaseUser } from '../user'
import { BaseConversation, BaseConversationVisibility } from './base-conversation.model'
import { BaseMessage } from './base-message.model'
import { BaseMessageService } from './base-message.service'

@Injectable()
export abstract class BaseConversationService<
  TMessage extends BaseMessage = BaseMessage,
  T extends BaseConversation = BaseConversation,
  U extends BaseUser = BaseUser,
> extends OwneableEntityService<T, U> {
  constructor(
    model: Model<T>,
    protected readonly messageService: BaseMessageService<TMessage, U>,
  ) {
    super(model)
  }

  abstract processPromptWithAI(conversation: T, prompt: string): Promise<void>

  protected async addAssistantMessage(conversation: T, content: string): Promise<TMessage> {
    // Create the assistant message using message service
    const message = await this.messageService.create({
      role: 'assistant',
      content,
      conversation: conversation._id,
      owner: conversation.owner,
    } as TMessage)

    // Update conversation lastMessageAt
    await this.updateById(conversation._id, {
      lastMessageAt: new Date(),
    } as unknown as Partial<T>)

    return message
  }

  async createMessage(data: Partial<TMessage>): Promise<TMessage> {
    return this.messageService.create(data as TMessage)
  }

  canView(conversation: T, user?: U): boolean {
    return (
      conversation.owner.toString() === user?._id?.toString() ||
      conversation.visibility === BaseConversationVisibility.Public
    )
  }

  async getApiObject(conversation: T): Promise<Record<string, unknown>> {
    const messages = await this.messageService.findMany(
      { conversation: conversation._id },
      {
        sort: { _id: -1 },
        limit: 10,
      },
    )
    return {
      id: conversation._id,
      owner: conversation.owner.toString(),
      title: conversation.title,
      messages: messages,
      lastMessageAt: conversation.lastMessageAt,
      visibility: conversation.visibility,
    }
  }

  async getApiObjectForList(conversation: T): Promise<Record<string, unknown>> {
    return {
      id: conversation._id,
      title: conversation.title,
      lastMessageAt: conversation.lastMessageAt,
      visibility: conversation.visibility,
    }
  }

  /**
   * Creates a conversation with an initial user message and triggers AI processing
   */
  async createConversationWithPrompt(
    owner: U,
    prompt: string,
    visibility: BaseConversationVisibility = BaseConversationVisibility.Private,
  ): Promise<T> {
    // Create the conversation
    const conversation = await this.create({
      owner: owner._id,
      visibility,
      lastMessageAt: new Date(),
    } as T)

    // Create the initial message using message service
    await this.messageService.create({
      role: 'user',
      content: prompt,
      conversation: conversation._id,
      owner: owner._id,
    } as TMessage)

    // Process AI response asynchronously
    this.processPromptWithAI(conversation, prompt).catch(console.error)

    return conversation
  }
}
