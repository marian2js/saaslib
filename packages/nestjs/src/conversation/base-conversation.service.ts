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

  abstract generateResponse(conversation: T, prompt: string): Promise<TMessage['content']>

  /**
   * Process a prompt and return a stream of response chunks
   * @param conversation The conversation to process the prompt for
   * @param prompt The prompt to process
   */
  abstract streamResponse(conversation: T, prompt: string): AsyncIterable<string>

  async createResponse(conversation: T, prompt: string): Promise<TMessage> {
    const content = await this.generateResponse(conversation, prompt)
    const data = {
      role: 'assistant',
      content,
      conversation: conversation._id,
      owner: conversation.owner,
    } as TMessage
    return await this.messageService.create(data as TMessage)
  }

  async createMessage(data: Partial<TMessage>): Promise<TMessage> {
    const message = await this.messageService.create(data as TMessage)
    if (data.role === 'user') {
      await this.updateById(data.conversation, {
        $set: { lastMessageAt: new Date() },
      })
    }
    return message
  }

  canView(conversation: T, user?: U): boolean {
    return (
      conversation.owner.toString() === user?._id?.toString() ||
      conversation.visibility === BaseConversationVisibility.Public
    )
  }

  async getApiObject(conversation: T, _owner: U): Promise<Record<string, unknown>> {
    const messages = await this.messageService.findMany(
      { conversation: conversation._id },
      {
        sort: { _id: -1 },
        limit: 10,
      },
    )
    const messageApiData = await Promise.all(messages.map((m) => this.messageService.getApiObjectForList(m, _owner)))
    return {
      id: conversation._id,
      owner: conversation.owner.toString(),
      title: conversation.title,
      messages: messageApiData.reverse(),
      lastMessageAt: conversation.lastMessageAt,
      visibility: conversation.visibility,
    }
  }

  async getApiObjectForList(conversation: T, _owner: U): Promise<Record<string, unknown>> {
    return {
      id: conversation._id,
      title: conversation.title,
      lastMessageAt: conversation.lastMessageAt,
      visibility: conversation.visibility,
    }
  }

  /**
   * Creates a conversation with an initial user message
   */
  async createConversation(
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

    return conversation
  }
}
