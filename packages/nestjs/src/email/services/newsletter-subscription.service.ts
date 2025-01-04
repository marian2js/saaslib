import { BadRequestException, Inject, Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { BaseEntityService } from 'src/base'
import { SaaslibOptions } from 'src/types'
import { BaseUser } from 'src/user'
import { SecurityUtils } from 'src/utils'
import { NewsletterSubscription } from '../model/newsletter-subscription.model'

@Injectable()
export class NewsletterSubscriptionService extends BaseEntityService<NewsletterSubscription> {
  private validKeys: string[]

  constructor(
    @InjectModel(NewsletterSubscription.name) private newsletterSubscriptionModel: Model<NewsletterSubscription>,
    @Inject('SL_OPTIONS') options: SaaslibOptions,
  ) {
    super(newsletterSubscriptionModel)
    this.validKeys = options.email.newsletters.map((n) => n.key)
  }

  async subscribe(user: BaseUser, key: string): Promise<NewsletterSubscription> {
    if (!this.validKeys.includes(key)) {
      throw new BadRequestException('Invalid newsletter key')
    }
    return this.newsletterSubscriptionModel.findOneAndUpdate(
      { user: user._id, key },
      { subscribed: true, token: SecurityUtils.generateRandomString(32) },
      { upsert: true, new: true },
    )
  }

  async subscribeWithToken(userId: string, key: string, token: string): Promise<NewsletterSubscription | null> {
    if (!this.validKeys.includes(key)) {
      throw new BadRequestException('Invalid newsletter key')
    }
    return this.newsletterSubscriptionModel.findOneAndUpdate(
      { user: userId, key, token },
      { subscribed: true },
      { new: true },
    )
  }

  async unsubscribe(user: BaseUser, key: string): Promise<NewsletterSubscription> {
    if (!this.validKeys.includes(key)) {
      throw new BadRequestException('Invalid newsletter key')
    }
    return this.newsletterSubscriptionModel.findOneAndUpdate(
      { user: user._id, key },
      { subscribed: false },
      { upsert: true, new: true },
    )
  }

  async unsubscribeWithToken(userId: string, key: string, token: string): Promise<NewsletterSubscription | null> {
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
