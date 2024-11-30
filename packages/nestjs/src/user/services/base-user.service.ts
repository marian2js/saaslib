import { Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { BaseEntityService } from '../../base/base-entity.service'
import { BaseUser } from '../models/base-user.model'

@Injectable()
export class BaseUserService<U extends BaseUser> extends BaseEntityService<U> {
  constructor(@InjectModel(BaseUser.name) private baseUserModel: Model<U>) {
    super(baseUserModel)
  }

  /**
   * Get the object to be returned in the API response for when a user is fetching its own profile.
   */
  getApiObject(user: U): Record<string, unknown> {
    return {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      subscriptions: this.getSubscriptionsApiObject(user),
    }
  }

  getSubscriptionsApiObject(user: U): Record<string, unknown> {
    if (!user.subscriptions || user.subscriptions.size === 0) {
      return undefined
    }
    return Array.from(user.subscriptions.entries()).reduce((acc, [key, value]) => {
      acc[key] = {
        product: value.product,
        periodEnd: value.periodEnd,
        nextProduct: value.nextProduct,
        cancelled: value.cancelled,
      }
      return acc
    }, {})
  }
}
