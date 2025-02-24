import { Injectable } from '@nestjs/common'
import { Model, Types } from 'mongoose'
import { RateLimitExceededException } from '../exceptions/rate-limit-exceed.exception'
import { OwneableEntityService } from '../owneable'
import { BaseUser } from '../user'
import { BaseConversation, BaseConversationVisibility } from './base-conversation.model'
import { BaseMessage } from './base-message.model'
import { BaseMessageService } from './base-message.service'
import { MessageLogService } from './message-log.service'

export interface ConversationRateLimit {
  limit: number
  ttl?: number // milliseconds
}

@Injectable()
export abstract class BaseConversationService<
  TMessage extends BaseMessage<any> = BaseMessage<any>,
  T extends BaseConversation = BaseConversation,
  U extends BaseUser = BaseUser,
> extends OwneableEntityService<T, U> {
  constructor(
    model: Model<T>,
    protected readonly messageService: BaseMessageService<TMessage, U>,
    protected readonly messageLogService: MessageLogService,
  ) {
    super(model)
  }

  abstract generateResponse(
    user: U,
    conversation: T,
    message: TMessage,
    newConversation: boolean,
  ): Promise<{ message: Partial<TMessage>; conversation?: Partial<T> }>

  getRateLimit(_user: U): ConversationRateLimit | ConversationRateLimit[] {
    return { limit: Infinity }
  }

  /**
   * Process a prompt and return a stream of response chunks
   * @param conversation The conversation to process the prompt for
   * @param prompt The prompt to process
   */
  abstract streamResponse(conversation: T, prompt: string): AsyncIterable<string>

  async createResponse(user: U, conversation: T, message: TMessage, newConversation: boolean): Promise<TMessage> {
    const { message: assistantResponse, conversation: conversationData } = await this.generateResponse(
      user,
      conversation,
      message,
      newConversation,
    )
    const data = {
      ...assistantResponse,
      role: 'assistant',
      conversation: conversation._id,
      owner: conversation.owner,
    } as TMessage
    if (conversationData) {
      await this.updateById(data.conversation, {
        ...conversationData,
        lastMessageAt: new Date(),
      })
    }
    return await this.messageService.create(data)
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

  async verifyRateLimit(user: U): Promise<void> {
    const rateLimits = this.getRateLimit(user)
    const limits = Array.isArray(rateLimits) ? rateLimits : [rateLimits]

    // If any limit is 0, throw immediately
    if (limits.some((limit) => limit.limit === 0)) {
      throw new RateLimitExceededException(new Date(Date.now()))
    }

    // If all limits are Infinity, return early
    if (limits.every((limit) => limit.limit === Infinity)) {
      await this.messageLogService.createMessageLog(user)
      return
    }

    // Check each rate limit
    for (const rateLimit of limits) {
      if (rateLimit.limit === Infinity) {
        continue
      }

      // If ttl is not set, skip this limit
      if (!rateLimit.ttl) {
        continue
      }

      // Get the timestamp from ttl milliseconds ago
      const timestampFromId = Types.ObjectId.createFromTime(Math.floor((Date.now() - rateLimit.ttl) / 1000))

      // Count message logs since that timestamp
      const count = await this.messageLogService.count({
        owner: user._id,
        _id: { $gt: timestampFromId },
      })

      if (count >= rateLimit.limit) {
        // Get the oldest message in the window
        // Find the oldest message in the window using findMany with limit 1
        const [oldestMessage] = await this.messageLogService.findMany(
          {
            owner: user._id,
            _id: { $gt: timestampFromId },
          },
          { sort: { _id: 1 }, limit: 1 },
        )

        if (!oldestMessage) {
          // This shouldn't happen since we just found count > 0, but just in case
          throw new RateLimitExceededException(new Date(Date.now()))
        }

        // Calculate when the next message will be available
        const oldestMessageDate = oldestMessage._id.getTimestamp()
        const nextAvailableDate = new Date(oldestMessageDate.getTime() + rateLimit.ttl)

        throw new RateLimitExceededException(nextAvailableDate)
      }
    }

    // Create message log entry after all checks pass
    await this.messageLogService.createMessageLog(user)
  }
}
