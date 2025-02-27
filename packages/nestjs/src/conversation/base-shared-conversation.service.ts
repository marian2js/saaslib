import { Injectable } from '@nestjs/common'
import { Model, Types } from 'mongoose'
import { OwneableEntityService } from '../owneable'
import { BaseUser } from '../user'
import { generateSlug } from '../utils'
import { BaseSharedConversation } from './base-shared-conversation.model'

@Injectable()
export abstract class BaseSharedConversationService<
  T extends BaseSharedConversation = BaseSharedConversation,
  U extends BaseUser = BaseUser,
> extends OwneableEntityService<T, U> {
  constructor(model: Model<T>) {
    super(model)
  }

  async getApiObject(sharedConversation: T, _user: U | null): Promise<Record<string, unknown>> {
    return {
      id: sharedConversation._id,
      title: sharedConversation.title,
      slug: sharedConversation.slug,
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
    return this.create({
      owner,
      title,
      slug,
      original: conversationId,
    } as T)
  }
}
