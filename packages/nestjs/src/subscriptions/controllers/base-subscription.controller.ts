import {
  BadRequestException,
  Body,
  ForbiddenException,
  Inject,
  Logger,
  NotFoundException,
  Post,
  RawBody,
  Req,
  UseGuards,
} from '@nestjs/common'
import { Request } from 'express'
import { UpdateQuery } from 'mongoose'
import Stripe from 'stripe'
import { SaaslibOptions } from '../../types'
import { BaseUser, BaseUserService, UserGuard } from '../../user'
import { BaseSubscriptionService } from '../services/base-subscription.service'

export class BaseSubscriptionController<U extends BaseUser> {
  protected readonly logger = new Logger(BaseSubscriptionController.name)
  constructor(
    private baseSubscriptionService: BaseSubscriptionService<U>,
    private baseUserService: BaseUserService<U>,
    @Inject('SL_OPTIONS') protected options: SaaslibOptions,
  ) {}

  protected canSubscribe(user: U, type: string) {
    return this.options.subscriptions?.[type]?.products.length > 0
  }

  @UseGuards(UserGuard)
  @Post('checkout-session')
  async createCheckoutSession(@Req() req: Request, @Body('priceId') priceId: string, @Body('type') type: string) {
    const userId = (req.user as { id: string }).id
    const user = await this.baseUserService.findOne({ _id: userId })
    if (!user) {
      throw new NotFoundException('User not found')
    }
    if (!this.canSubscribe(user, type)) {
      throw new ForbiddenException('Cannot subscribe')
    }
    this.logger.log(`Creating checkout session for user ${user._id} with price ${priceId}`)
    const { checkoutSuccessUrl, checkoutCancelUrl } = this.options.subscriptions[type]
    console.log('checkoutSuccessUrl:', checkoutSuccessUrl)
    console.log('checkoutCancelUrl:', checkoutCancelUrl)
    const sessionId = await this.baseSubscriptionService.createCheckoutSession(
      user,
      type,
      priceId,
      checkoutSuccessUrl,
      checkoutCancelUrl,
    )
    return {
      sessionId,
    }
  }

  @Post('/stripe-webhook')
  async stripeWebhook(@Req() req: Request, @RawBody() payload: Buffer): Promise<any> {
    if (!payload) {
      this.logger.error('Missing payload. Make sure to use `rawBody` is set to true on main.ts')
      throw new BadRequestException('Missing payload')
    }
    const signature = req.headers['stripe-signature'] as string
    if (!signature) {
      throw new BadRequestException('Missing signature')
    }
    const event = await this.baseSubscriptionService.getWebhookEvent(payload, signature)
    if (!event) {
      return {}
    }
    switch (event.type) {
      case 'checkout.session.completed':
        const session = event.data.object as Stripe.Checkout.Session
        const userId = session.client_reference_id
        if (!userId) {
          this.logger.error(`Missing user id in checkout session ${session.id}`)
          throw new Error('Missing user id')
        }
        const user = await this.baseUserService.findOne({ _id: userId })
        if (!user) {
          this.logger.error(`User ${userId} not found when completing checkout session ${session.id}`)
          throw new Error('User not found')
        }
        if (!session.subscription) {
          this.logger.error(`Missing subscription id in checkout session ${session.id}`)
          throw new Error('Missing subscription id')
        }
        const subscription = await this.baseSubscriptionService.getSubscription(session.subscription.toString())
        this.logger.log(`Checkout completed for user ${userId} - ${subscription.id} (${session.id})`)
        const productId = subscription.items.data[0].price.product
        const type = this.baseSubscriptionService.getSubscriptionType(productId.toString())
        await this.baseUserService.updateOne(
          { _id: user._id },
          {
            stripeCustomerId: session.customer,
            [`subscriptions.${type}`]: {
              product: productId,
              periodEnd: new Date(subscription.current_period_end * 1000),
              stripeSubscriptionId: session.subscription,
            },
            ...(user.subscriptions[type]?.nextProduct
              ? ({
                  $unset: {
                    [`subscriptions.${type}.nextProduct`]: 1,
                  },
                } as UpdateQuery<U>)
              : {}),
          },
        )
    }
    return {}
  }
}
