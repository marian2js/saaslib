import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common'
import { UpdateQuery } from 'mongoose'
import { BadRequestError } from 'passport-headerapikey'
import { SaaslibOptions } from 'src/types'
import { BaseUser } from 'src/user'
import Stripe from 'stripe'
import { UserSubscription } from '../models/user-subscription.model'

@Injectable()
export class BaseSubscriptionService<U extends BaseUser> {
  private readonly logger = new Logger(BaseSubscriptionService.name)
  private readonly stripe: Stripe

  constructor(@Inject('SL_OPTIONS') protected options: SaaslibOptions) {
    const secretKey = process.env.STRIPE_SECRET_KEY
    if (secretKey) {
      this.stripe = new Stripe(secretKey, { apiVersion: '2024-11-20.acacia' })
    }
  }

  async createCheckoutSession(
    user: U,
    type: string,
    priceId: string,
    successUrl: string,
    cancelUrl: string,
  ): Promise<string> {
    const stripePrice = await this.stripe.prices.retrieve(priceId)
    if (!stripePrice) {
      throw new Error('Price not found')
    }
    const userSubscription = user.subscriptions.get(type)
    if (stripePrice.product === userSubscription?.product) {
      throw new BadRequestError('You already have this plan')
    }
    const session = await this.stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      client_reference_id: user._id.toString(),
      ...(user.stripeCustomerId ? { customer: user.stripeCustomerId } : { customer_email: user.email }),
      success_url: successUrl,
      cancel_url: cancelUrl,
    })
    return session.id
  }

  async changeSubscription(user: U, type: string, priceId: string): Promise<UpdateQuery<UserSubscription>> {
    const stripePrice = await this.stripe.prices.retrieve(priceId)
    if (!stripePrice) {
      throw new Error('Price not found')
    }
    const userSubscription = user.subscriptions.get(type)
    if (stripePrice.product === userSubscription.product) {
      throw new BadRequestError('You already have this plan')
    }
    const currentSubscription = await this.stripe.subscriptions.retrieve(userSubscription.stripeSubscriptionId)
    if (!currentSubscription) {
      throw new Error(`Subscription ${userSubscription.stripeSubscriptionId} not found`)
    }

    const isUpgrade =
      this.options.subscriptions[type].products.findIndex((product) => product.id === stripePrice.product) >
      this.options.subscriptions[type].products.findIndex((product) => product.id === userSubscription.product)

    const updatedSubscription = await this.stripe.subscriptions.update(userSubscription.stripeSubscriptionId, {
      items: [
        {
          id: currentSubscription.items.data[0].id,
          price: priceId,
        },
      ],
      proration_behavior: isUpgrade ? 'always_invoice' : 'none',
      billing_cycle_anchor: isUpgrade ? 'now' : 'unchanged',
      payment_behavior: 'pending_if_incomplete',
    })
    const latestInvoice = await this.stripe.invoices.retrieve(updatedSubscription.latest_invoice.toString())

    if (!latestInvoice.payment_intent && latestInvoice.amount_due > 0) {
      await this.stripe.paymentIntents.create({
        amount: latestInvoice.amount_due,
        currency: latestInvoice.currency,
        customer: user.stripeCustomerId,
        automatic_payment_methods: {
          enabled: true,
        },
      })
    }

    const commonSet = {
      [`subscriptions.${type}.stripeSubscriptionId`]: updatedSubscription.id,
      [`subscriptions.${type}.periodEnd`]: new Date(updatedSubscription.current_period_end * 1000),
    }
    const commonUnset = {
      ...(userSubscription.cancelled ? { [`subscriptions.${type}.cancelled`]: '' } : {}),
      ...(userSubscription.cancelledAt ? { [`subscriptions.${type}.cancelledAt`]: '' } : {}),
    }

    if (isUpgrade) {
      return {
        $set: {
          ...commonSet,
          [`subscriptions.${type}.product`]: stripePrice.product,
          [`subscriptions.${type}.periodEnd`]: new Date(updatedSubscription.current_period_end * 1000),
        },
        $unset: {
          ...commonUnset,
          ...(userSubscription.nextProduct ? { [`subscriptions.${type}.nextProduct`]: '' } : {}),
        },
      }
    }

    return {
      $set: {
        ...commonSet,
        [`subscriptions.${type}.nextProduct`]: stripePrice.product,
      },
      $unset: commonUnset,
    }
  }

  async resumeSubscription(userSubscription: UserSubscription): Promise<void> {
    const subscription = await this.stripe.subscriptions.retrieve(userSubscription.stripeSubscriptionId)
    if (!subscription) {
      throw new NotFoundException('Subscription not found')
    }
    if (subscription.cancel_at_period_end) {
      await this.stripe.subscriptions.update(userSubscription.stripeSubscriptionId, {
        cancel_at_period_end: false,
      })
    }
  }

  async cancelSubscription(userSubscription: UserSubscription): Promise<void> {
    // Cancel subscription at the end of the billing cycle
    await this.stripe.subscriptions.update(userSubscription.stripeSubscriptionId, {
      cancel_at_period_end: true,
    })
  }

  async getWebhookEvent(payload: any, signature: string): Promise<Stripe.Event | null> {
    return this.stripe.webhooks.constructEvent(payload, signature, process.env.STRIPE_WEBHOOK_SECRET)
  }

  async getSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
    return this.stripe.subscriptions.retrieve(subscriptionId)
  }

  async getBillingUrl(user: U, type: string): Promise<string> {
    const customer = await this.stripe.customers.retrieve(user.stripeCustomerId)
    if (!customer) {
      throw new Error(`Customer ${user.stripeCustomerId} not found`)
    }
    const billingSession = await this.stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: this.options.subscriptions[type].billingReturnUrl,
    })
    return billingSession.url
  }

  getSubscriptionType(productId: string): string | undefined {
    return Object.keys(this.options.subscriptions).find((type) =>
      this.options.subscriptions[type].products.some((product) => product.id === productId),
    )
  }

  getUserSubscription(user: U, subscriptionId: string): { userSubscription: UserSubscription; type: string } {
    const [type, userSubscription] =
      Array.from(user.subscriptions).find(([_, value]) => value.stripeSubscriptionId === subscriptionId) ?? []
    if (!type) {
      throw new NotFoundException('Subscription not found')
    }
    return { userSubscription, type }
  }

  async createStripeWebhook() {
    const webhookEndpoint = await this.stripe.webhookEndpoints.create({
      url: `https://bullaware.com/subscriptions/stripe-webhook`,
      enabled_events: [
        'checkout.session.completed',
        // 'customer.subscription.created',
        'customer.subscription.updated',
        // 'customer.subscription.deleted',
        // 'customer.subscription.trial_will_end',
      ],
    })
    this.logger.debug('Webhook endpoint created successfully')
    this.logger.debug('Webhook ID:', webhookEndpoint.id)
    this.logger.debug('Webhook Secret:', webhookEndpoint.secret)
    return webhookEndpoint
  }
}
