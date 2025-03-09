import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common'
import { Model, Types } from 'mongoose'
import { OwneableEntityService } from '../owneable'
import { BaseUser } from '../user'
import { generateSlug, StorageService } from '../utils'
import { BaseConversation } from './base-conversation.model'
import { BaseConversationService } from './base-conversation.service'
import { BaseMessage } from './base-message.model'
import { BaseMessageService } from './base-message.service'
import { BaseSharedConversation } from './base-shared-conversation.model'

@Injectable()
export abstract class BaseSharedConversationService<
  T extends BaseSharedConversation = BaseSharedConversation,
  U extends BaseUser = BaseUser,
> extends OwneableEntityService<T, U> {
  abstract bucketName: string
  abstract filePrefix: string

  constructor(
    model: Model<T>,
    protected readonly messageService: BaseMessageService<BaseMessage<any>, U>,
    protected readonly storageService: StorageService,
    protected readonly conversationService: BaseConversationService<BaseMessage<any>, BaseConversation, U>,
  ) {
    super(model)
  }

  async getStoredMessages(slug: string): Promise<Record<string, any>[]> {
    const filePath = `${this.filePrefix}/${slug}.json`
    const messagesJson = await this.storageService.readTextFile(this.bucketName, filePath)
    return JSON.parse(messagesJson)
  }

  async getApiObject(sharedConversation: T, _user: U | null): Promise<Record<string, unknown>> {
    const baseObject = {
      id: sharedConversation._id,
      title: sharedConversation.title,
      slug: sharedConversation.slug,
    }

    const messages = await this.getStoredMessages(sharedConversation.slug)
    return {
      ...baseObject,
      messages,
    }
  }

  async getApiObjectForList(sharedConversation: T, user: U): Promise<Record<string, unknown>> {
    if (user._id.toString() !== sharedConversation.owner.toString()) {
      throw new UnauthorizedException()
    }
    return {
      id: sharedConversation._id,
      title: sharedConversation.title,
      slug: sharedConversation.slug,
    }
  }

  /**
   * Creates a shared conversation from an original conversation
   */
  async createSharedConversation(conversationId: Types.ObjectId, owner: Types.ObjectId, title: string): Promise<T> {
    const slug = generateSlug(title)

    // Get all messages from the original conversation
    const messages = await this.messageService.findMany({ conversation: conversationId }, { sort: { _id: 1 } })

    if (!messages.length) {
      throw new BadRequestException('No messages found for the original conversation')
    }

    // Filter messages to only include role and content
    const simplifiedMessages = messages.map((message, index) => this.parseMessageForStorage(message, index, slug))

    // Store filtered messages
    const filePath = `${this.filePrefix}/${slug}.json`
    await this.storageService.uploadTextFile(this.bucketName, filePath, JSON.stringify(simplifiedMessages))

    return await this.create({
      owner,
      title,
      slug,
      original: conversationId,
    } as T)
  }

  /**
   * Creates a new conversation based on a shared conversation
   * @param sharedConversation The shared conversation to create a conversation from
   * @param userId The ID of the user who will own the new conversation
   */
  async createConversationFromShared(
    sharedConversation: T,
    userId: Types.ObjectId | string,
  ): Promise<BaseConversation> {
    const conversation = await this.conversationService.create({
      owner: new Types.ObjectId(userId),
      title: sharedConversation.title,
      lastMessageAt: new Date(),
    } as BaseConversation)

    const storedMessages = await this.getStoredMessages(sharedConversation.slug)
    for (const message of storedMessages) {
      await this.messageService.create(
        this.parseStoredMessageForNewConversation(message, conversation._id, new Types.ObjectId(userId)),
      )
    }

    return conversation
  }

  parseMessageForStorage(message: BaseMessage, index: number, slug: string): Record<string, unknown> {
    return {
      id: slug + ':' + index,
      role: message.role,
      content: message.content,
    }
  }

  parseStoredMessageForApi(message: Record<string, unknown>) {
    return message
  }

  parseStoredMessageForNewConversation(
    message: Record<string, any>,
    conversationId: Types.ObjectId,
    owner: Types.ObjectId,
  ): BaseMessage<any> {
    return {
      role: message.role,
      content: message.content,
      conversation: conversationId,
      owner,
    }
  }

  canView(): boolean {
    return true
  }
}
