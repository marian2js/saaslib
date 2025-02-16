import { FilterQuery, QueryOptions, Types } from 'mongoose'
import { BaseEntityService } from '../../base/base-entity.service'
import { BaseUser } from '../../user/models/base-user.model'
import { OwneableModel } from '../models/owneable.model'

export abstract class OwneableEntityService<T extends OwneableModel, U extends BaseUser> extends BaseEntityService<T> {
  abstract getApiObject(entity: T, owner: U | null): Record<string, unknown> | Promise<Record<string, unknown>>

  /**
   * Returns an object for the API list view
   */
  async getApiObjectForList(entity: T, owner: U) {
    return this.getApiObject(entity, owner)
  }

  /**
   * Returns the keys that are allowed to be used for sorting.
   * By default, supports 'createdAt' which uses MongoDB's _id field for sorting.
   */
  protected getAllowedSortKeys(): string[] {
    return ['createdAt']
  }

  /**
   * Validates if the provided sort keys are allowed
   */
  protected validateSortKeys(sort?: Record<string, 1 | -1>): boolean {
    if (!sort) return true
    const allowedKeys = this.getAllowedSortKeys()
    return Object.keys(sort).every((key) => allowedKeys.includes(key))
  }

  async findManyByOwner(ownerId: Types.ObjectId | string, filter?: FilterQuery<T>, options?: QueryOptions<T>) {
    if (typeof ownerId === 'string') {
      ownerId = new Types.ObjectId(ownerId)
    }
    if (options?.sort) {
      if (!this.validateSortKeys(options.sort)) {
        throw new Error('Invalid sort keys provided')
      }

      // Map createdAt sorting to _id
      const mappedSort: Record<string, 1 | -1> = {}
      for (const [key, value] of Object.entries(options.sort)) {
        if (typeof value === 'number' && (value === 1 || value === -1)) {
          mappedSort[key === 'createdAt' ? '_id' : key] = value
        }
      }
      options.sort = mappedSort
    }
    return this.findMany({ ...(filter ?? {}), owner: ownerId }, options)
  }

  maxEntities(_owner: U) {
    return Infinity
  }

  canView(entity: T, owner: U | null) {
    return owner && entity.owner.equals(owner._id)
  }

  canCreate(_entity: T, _owner: U) {
    return true
  }

  canEdit(entity: T, owner: U) {
    return entity.owner.equals(owner._id)
  }

  canDelete(entity: T, owner: U) {
    return entity.owner.equals(owner._id)
  }
}
