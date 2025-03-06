import { BadRequestException, Injectable } from '@nestjs/common'
import { Model, Types } from 'mongoose'
import { OwneableEntityService } from '../owneable'
import { BaseUser } from '../user'
import { generateSlug, StorageService } from '../utils'
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
  ) {
    super(model)
  }

  async getApiObject(sharedConversation: T, _user: U | null): Promise<Record<string, unknown>> {
    const baseObject = {
      id: sharedConversation._id,
      title: sharedConversation.title,
      slug: sharedConversation.slug,
    }

    const filePath = `${this.filePrefix}/${sharedConversation.slug}.json`
    const messagesJson = await this.storageService.readTextFile(this.bucketName, filePath)
    const messages = JSON.parse(messagesJson)

    return {
      ...baseObject,
      messages,
    }
  }

  async getApiObjectForList(sharedConversation: T, user: U): Promise<Record<string, unknown>> {
    return this.getApiObject(sharedConversation, user)
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
    const simplifiedMessages = messages.map((message) => ({
      role: message.role,
      content: message.content,
    }))

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

  canView(): boolean {
    return true
  }
}
