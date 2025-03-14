import {
  BadRequestException,
  Body,
  ForbiddenException,
  Get,
  Inject,
  Logger,
  NotFoundException,
  Post,
  Query,
  RawBody,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common'
import { Request, Response } from 'express'
import { UpdateQuery } from 'mongoose'
import Stripe from 'stripe'
import { EmailService } from '../../email/services/email.service'
import { SaaslibOptions } from '../../types'
import { BaseUser, BaseUserService, UserGuard } from '../../user'
import { isEmptyObj } from '../../utils'
import { BaseSubscriptionService } from '../services/base-subscription.service'

export class BaseSubscriptionController<U extends BaseUser> {
  protected readonly logger = new Logger(BaseSubscriptionController.name)
  constructor(
    private baseSubscriptionService: BaseSubscriptionService<U>,
    private baseUserService: BaseUserService<U>,
    protected emailService: EmailService,
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
    if (!this.options.subscriptions[type].products.some((p) => p.prices.includes(priceId))) {
      throw new NotFoundException('Price not found')
    }
    const userSubscription = user.subscriptions.get(type)
    if (userSubscription?.stripeSubscriptionId) {
      if (userSubscription.product === priceId) {
        throw new BadRequestException('You already have this plan')
      }
      await this.baseSubscriptionService.changeSubscription(user, type, priceId)
      await this.baseUserService.updateOne(
        { _id: user._id },
        {
          $set: {
            [`subscriptions.${type}.nextProduct`]: priceId,
          } as UpdateQuery<U>,
        },
      )
      return { ok: true }
    }
    const { checkoutSuccessUrl, checkoutCancelUrl } = this.options.subscriptions[type]
    this.logger.log(`Creating checkout session for user ${user._id} with price ${priceId}`)
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

  @UseGuards(UserGuard)
  @Post('resume-subscription')
  async resumeSubscription(@Req() req: Request, @Query('subscriptionId') subscriptionId: string) {
    const userId = (req.user as { id: string }).id
    const user = await this.baseUserService.findOne({ _id: userId })
    if (!user) {
      throw new NotFoundException('User not found')
    }
    const { type, userSubscription } = this.baseSubscriptionService.getUserSubscription(user, subscriptionId)
    this.logger.log(`Resuming subscription ${type} for user ${user._id}`)
    await this.baseSubscriptionService.resumeSubscription(userSubscription)
    await this.baseUserService.updateOne(
      { _id: user._id },
      {
        $unset: {
          [`subscriptions.${type}.nextProduct`]: 1,
        } as UpdateQuery<U>,
      },
    )
    return { ok: true }
  }

  @UseGuards(UserGuard)
  @Post('update-subscription')
  async changeSubscription(
    @Req() req: Request,
    @Query('subscriptionId') subscriptionId: string,
    @Query('priceId') priceId: string,
  ) {
    const userId = (req.user as { id: string }).id
    const user = await this.baseUserService.findOne({ _id: userId })
    if (!user) {
      throw new NotFoundException('User not found')
    }
    const { type } = this.baseSubscriptionService.getUserSubscription(user, subscriptionId)
    this.logger.log(`Changing subscription ${type} for user ${user._id}`)
    const newProduct = await this.baseSubscriptionService.changeSubscription(user, type, priceId)
    await this.baseUserService.updateOne(
      { _id: user._id, 'subscriptions.type': type },
      {
        $set: {
          [`subscriptions.${type}.product`]: newProduct,
        } as UpdateQuery<U>,
        $unset: {
          [`subscriptions.${type}.nextProduct`]: 1,
        } as UpdateQuery<U>,
      },
    )
    return { ok: true }
  }

  @UseGuards(UserGuard)
  @Post('cancel-subscription')
  async cancelSubscription(@Req() req: Request, @Query('subscriptionId') subscriptionId: string) {
    const userId = (req.user as { id: string }).id
    const user = await this.baseUserService.findOne({ _id: userId })
    if (!user) {
      throw new NotFoundException('User not found')
    }
    const { type, userSubscription } = this.baseSubscriptionService.getUserSubscription(user, subscriptionId)
    this.logger.log(`Cancelling subscription ${type} for user ${user._id}`)
    await this.baseSubscriptionService.cancelSubscription(userSubscription)
    await this.baseUserService.updateOne(
      { _id: user._id },
      {
        $unset: {
          [`subscriptions.${type}`]: 1,
        } as UpdateQuery<U>,
      },
    )
    return { ok: true }
  }

  @UseGuards(UserGuard)
  @Get('billing-url')
  async getBillingUrl(@Req() req: Request, @Query('type') type: string) {
    const userId = (req.user as { id: string }).id
    const user = await this.baseUserService.findOne({ _id: userId })
    if (!user) {
      throw new NotFoundException('User not found')
    }
    return {
      url: await this.baseSubscriptionService.getBillingUrl(user, type),
    }
  }

  @UseGuards(UserGuard)
  @Get('billing')
  async redirectToBilling(@Req() req: Request, @Res() res: Response, @Query('type') type: string) {
    const userId = (req.user as { id: string }).id
    const user = await this.baseUserService.findOne({ _id: userId })
    if (!user) {
      throw new NotFoundException('User not found')
    }
    const billingUrl = await this.baseSubscriptionService.getBillingUrl(user, type)
    res.redirect(billingUrl)
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
        await this.onCheckoutSessionCompleted(event)
        break
      case 'customer.subscription.updated':
        await this.onCustomerSubscriptionUpdated(event)
        break
      case 'customer.subscription.deleted':
        await this.onCustomerSubscriptionDeleted(event)
        break
    }
    return {}
  }

  protected async onCheckoutSessionCompleted(event: Stripe.CheckoutSessionCompletedEvent) {
    const session = event.data.object as Stripe.Checkout.Session
    const userId = session.client_reference_id
    if (!userId) {
      this.logger.error(`onCheckoutSessionCompleted: Missing user id in checkout session ${session.id}`)
      throw new Error('Missing user id')
    }
    const user = await this.baseUserService.findOne({ _id: userId })
    if (!user) {
      this.logger.error(
        `onCheckoutSessionCompleted: User ${userId} not found when completing checkout session ${session.id}`,
      )
      throw new Error('User not found')
    }
    if (!session.subscription) {
      this.logger.error(`onCheckoutSessionCompleted: Missing subscription id in checkout session ${session.id}`)
      throw new Error('Missing subscription id')
    }
    const subscription = await this.baseSubscriptionService.getSubscription(session.subscription.toString())
    this.logger.log(`Checkout completed for user ${userId} - ${subscription.id} (${session.id})`)
    const productId = subscription.items.data[0].price.product
    const type = this.baseSubscriptionService.getSubscriptionType(productId.toString())
    const userSubscription = user.subscriptions.get(type)
    await this.baseUserService.updateOne(
      { _id: user._id },
      {
        stripeCustomerId: session.customer,
        [`subscriptions.${type}`]: {
          product: productId,
          periodEnd: new Date(subscription.current_period_end * 1000),
          stripeSubscriptionId: session.subscription,
        },
        ...(userSubscription?.nextProduct
          ? ({
              $unset: {
                [`subscriptions.${type}.nextProduct`]: 1,
              },
            } as UpdateQuery<U>)
          : {}),
      },
    )

    // Send subscription email if template is configured
    await this.emailService.sendNewSubscriptionEmail(user, type)
  }

  protected async onCustomerSubscriptionUpdated(event: Stripe.CustomerSubscriptionUpdatedEvent) {
    const subscription = event.data.object
    const user = await this.baseUserService.findOne({ stripeCustomerId: subscription.customer })
    if (!user) {
      this.logger.error(`onCustomerSubscriptionUpdated: User not found for customer ${subscription.customer}`)
      throw new Error('User not found')
    }

    const productId = subscription.items.data[0].price.product
    const type = this.baseSubscriptionService.getSubscriptionType(productId.toString())
    const userSubscription = user.subscriptions.get(type)

    // Remove subscription if it's expired or canceled
    if (subscription.status === 'incomplete_expired' || subscription.status === 'canceled') {
      if (userSubscription) {
        this.logger.log(`Removing subscription ${type} for user ${user._id}`)
        await this.baseUserService.updateOne({ _id: user._id }, {
          $unset: { [`subscriptions.${type}`]: 1 },
        } as UpdateQuery<U>)
      }
      return
    }

    const update: Record<string, any> = {
      ...(userSubscription?.product !== productId ? { [`subscriptions.${type}.product`]: productId } : {}),
      ...(userSubscription?.periodEnd.getTime() !== new Date(subscription.current_period_end * 1000).getTime()
        ? { [`subscriptions.${type}.periodEnd`]: new Date(subscription.current_period_end * 1000) }
        : {}),
      ...(userSubscription?.stripeSubscriptionId !== subscription.id
        ? { [`subscriptions.${type}.stripeSubscriptionId`]: subscription.id }
        : {}),
    }

    // Handle scheduled plan changes for next billing cycle
    if (subscription.pending_update?.subscription_items?.[0]?.price?.product) {
      update[`subscriptions.${type}.nextProduct`] = subscription.pending_update.subscription_items[0].price.product
    } else if (userSubscription?.nextProduct) {
      update.$unset = { [`subscriptions.${type}.nextProduct`]: 1 }
    }

    // Track subscription cancellation status
    if (subscription.cancel_at) {
      this.logger.log(
        `Cancelling subscription ${type} for user ${user._id} after ${new Date(subscription.cancel_at * 1000).toISOString()}`,
      )
      update[`subscriptions.${type}.cancelled`] = true
      update[`subscriptions.${type}.cancelledAt`] = new Date()
    } else if (userSubscription?.cancelled || userSubscription?.cancelledAt) {
      this.logger.log(`Resuming subscription ${type} for user ${user._id}`)
      update.$unset = update.$unset || {}
      update.$unset[`subscriptions.${type}.cancelled`] = 1
      update.$unset[`subscriptions.${type}.cancelledAt`] = 1
    }

    if (!isEmptyObj(update)) {
      await this.baseUserService.updateOne({ _id: user._id }, update)
    }
  }

  protected async onCustomerSubscriptionDeleted(event: Stripe.CustomerSubscriptionDeletedEvent) {
    const subscription = event.data.object
    const user = await this.baseUserService.findOne({ stripeCustomerId: subscription.customer })
    if (!user) {
      this.logger.error(`onCustomerSubscriptionDeleted: User not found for customer ${subscription.customer}`)
      throw new Error('User not found')
    }

    this.logger.log(`Subscription ${subscription.id} for user ${user._id} was deleted`)
    const productId = subscription.items.data[0].price.product
    const type = this.baseSubscriptionService.getSubscriptionType(productId.toString())
    const userSubscription = user.subscriptions.get(type)

    if (userSubscription.stripeSubscriptionId === subscription.id) {
      await this.baseUserService.updateOne({ _id: user._id }, {
        $unset: { [`subscriptions.${type}`]: 1 },
      } as UpdateQuery<U>)
      this.logger.log(`Subscription ${subscription.id} for user ${user._id} was deleted`)
    }
  }
}
