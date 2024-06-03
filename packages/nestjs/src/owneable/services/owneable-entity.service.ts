import { FilterQuery, QueryOptions, Types } from 'mongoose'
import { BaseEntityService } from '../../base/base-entity.service'
import { BaseUser } from '../../user/models/base-user.model'
import { OwneableModel } from '../models/owneable.model'

export abstract class OwneableEntityService<T extends OwneableModel, U extends BaseUser> extends BaseEntityService<T> {
  abstract getApiObject(entity: T, owner: U): Record<string, unknown> | Promise<Record<string, unknown>>

  /**
   * Returns an object for the API list view
   */
  async getApiObjectForList(entity: T, owner: U) {
    return this.getApiObject(entity, owner)
  }

  async findManyByOwner(ownerId: Types.ObjectId | string, filter?: FilterQuery<T>, options?: QueryOptions<T>) {
    if (typeof ownerId === 'string') {
      ownerId = new Types.ObjectId(ownerId)
    }
    return this.findMany({ ...(filter ?? {}), owner: ownerId }, options)
  }

  canView(entity: T, owner: U) {
    return entity.owner.equals(owner._id)
  }

  canEdit(entity: T, owner: U) {
    return entity.owner.equals(owner._id)
  }

  canDelete(entity: T, owner: U) {
    return entity.owner.equals(owner._id)
  }
}
