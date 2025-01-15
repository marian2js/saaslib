import { BadRequestException, Inject, Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { BaseEntityService } from '../../base'
import { SaaslibOptions } from '../../types'
import { BaseUser } from '../../user'
import { SecurityUtils } from '../../utils'
import { NewsletterSubscription } from '../model/newsletter-subscription.model'

@Injectable()
export abstract class BaseNewsletterSubscriptionService<T extends NewsletterSubscription> extends BaseEntityService<T> {
  private validKeys: string[]

  constructor(
    @InjectModel(NewsletterSubscription.name) protected newsletterSubscriptionModel: Model<T>,
    @Inject('SL_OPTIONS') options: SaaslibOptions,
  ) {
    super(newsletterSubscriptionModel)
    this.validKeys = options.email.newsletters.map((n) => n.key)
  }

  async subscribe(user: BaseUser, key: string): Promise<T> {
    if (!this.validKeys.includes(key)) {
      throw new BadRequestException('Invalid newsletter key')
    }
    return this.newsletterSubscriptionModel.findOneAndUpdate(
      { user: user._id, key },
      { subscribed: true, token: SecurityUtils.generateRandomString(32) },
      { upsert: true, new: true },
    )
  }

  async subscribeWithToken(userId: string, key: string, token: string): Promise<T | null> {
    if (!this.validKeys.includes(key)) {
      throw new BadRequestException('Invalid newsletter key')
    }
    return this.newsletterSubscriptionModel.findOneAndUpdate(
      { user: userId, key, token },
      { subscribed: true },
      { new: true },
    )
  }

  async unsubscribe(user: BaseUser, key: string): Promise<T> {
    if (!this.validKeys.includes(key)) {
      throw new BadRequestException('Invalid newsletter key')
    }
    return this.newsletterSubscriptionModel.findOneAndUpdate(
      { user: user._id, key },
      { subscribed: false },
      { upsert: true, new: true },
    )
  }

  async unsubscribeWithToken(userId: string, key: string, token: string): Promise<T | null> {
    if (!this.validKeys.includes(key)) {
      throw new BadRequestException('Invalid newsletter key')
    }
    return this.newsletterSubscriptionModel.findOneAndUpdate(
      { user: userId, key, token },
      { subscribed: false },
      { new: true },
    )
  }
}
