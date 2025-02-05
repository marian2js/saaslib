import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Request } from 'express'
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
      role: user.role,
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

  isSubscriptionActive(user: U, subscriptionKey: string): boolean {
    return user.subscriptions && user.subscriptions.has(subscriptionKey)
  }

  async findUserOnRequest(req: Request): Promise<U | null> {
    const userId = ((req as any).user as { id: string })?.id
    return userId ? this.findOne({ _id: userId }) : null
  }

  async requireUserOnRequest(req: Request): Promise<U> {
    const user = await this.findUserOnRequest(req)
    if (!user) {
      throw new NotFoundException('User not found')
    }
    return user
  }

  async requireSubscriptionOnRequest(req: Request, subscriptionKey: string): Promise<U> {
    const user = await this.findUserOnRequest(req)
    if (!user) {
      throw new NotFoundException('User not found')
    }
    if (!user.subscriptions || !user.subscriptions.has(subscriptionKey)) {
      throw new ForbiddenException('Active subscription required')
    }
    return user
  }

  async isSubscriptionActiveOnRequest(req: Request, subscriptionKey: string): Promise<boolean> {
    const userId = ((req as any).user as { id: string }).id
    const user = await this.findOne({ _id: userId })
    if (!user) {
      throw new NotFoundException('User not found')
    }
    return user.subscriptions && user.subscriptions.has(subscriptionKey)
  }

  async requireRoleOnRequest(req: Request, role: string): Promise<U> {
    const user = await this.findUserOnRequest(req)
    if (!user) {
      throw new NotFoundException('User not found')
    }
    if (user.role !== role) {
      throw new ForbiddenException('Forbidden')
    }
    return user
  }
}
