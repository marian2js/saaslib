import { BadRequestException, Inject, Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import Handlebars from 'handlebars'
import { Model, ObjectId, Types } from 'mongoose'
import { BaseEntityService } from '../../base'
import { SaaslibOptions } from '../../types'
import { BaseUser, BaseUserService } from '../../user'
import { SecurityUtils } from '../../utils'
import { NewsletterSubscription } from '../model/newsletter-subscription.model'
import { EmailService } from './email.service'

@Injectable()
export abstract class BaseNewsletterSubscriptionService<T extends NewsletterSubscription> extends BaseEntityService<T> {
  private validKeys: string[]

  constructor(
    @InjectModel(NewsletterSubscription.name) protected newsletterSubscriptionModel: Model<T>,
    protected emailService: EmailService,
    protected userService: BaseUserService<BaseUser>,
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
      { user: new Types.ObjectId(userId), key, token },
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
      { user: new Types.ObjectId(userId), key, token },
      { subscribed: false },
      { new: true },
    )
  }

  async sendEmail(subscriptionId: ObjectId, subject: string, body: string): Promise<T> {
    const subscription = await this.newsletterSubscriptionModel.findById(subscriptionId)
    if (!subscription) {
      throw new BadRequestException('Subscription not found')
    }
    if (!subscription.subscribed) {
      throw new BadRequestException('User is not subscribed')
    }

    const user = await this.userService.findById(subscription.user.toString())
    if (!user) {
      throw new BadRequestException('User not found')
    }

    const unsubscribeUrl = `${process.env.UNSUBSCRIBE_EMAIL_URL}?userId=${subscription.user}&key=${subscription.key}&token=${subscription.token}`
    await this.emailService.sendEmail([user.email], subject, body, unsubscribeUrl)

    return this.newsletterSubscriptionModel.findByIdAndUpdate(
      subscriptionId,
      {
        $inc: { emailsSent: 1 },
        lastEmailSentAt: new Date(),
      },
      { new: true },
    )
  }

  async sendTemplateEmail(
    subscriptionId: ObjectId,
    subject: string,
    templateHtml: string,
    templateVars: any,
  ): Promise<T> {
    const template = Handlebars.compile(templateHtml)
    const body = template(templateVars)
    return this.sendEmail(subscriptionId, subject, body)
  }

  async isSubscribed(user: BaseUser, key: string): Promise<boolean> {
    if (!this.validKeys.includes(key)) {
      throw new BadRequestException('Invalid newsletter key')
    }
    const subscription = await this.newsletterSubscriptionModel.findOne({ user: user._id, key })
    return subscription?.subscribed ?? false
  }
}
