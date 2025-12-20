import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common'
import { UpdateQuery } from 'mongoose'
import { BadRequestError } from 'passport-headerapikey'
import Stripe from 'stripe'
import { EmailService } from '../../email/services/email.service'
import { SaaslibOptions } from '../../types/saaslib-options'
import { BaseUser, BaseUserService } from '../../user'
import { UserSubscription } from '../models/user-subscription.model'
import type { FailedPaymentInfo } from '../types/failed-payment-info'

@Injectable()
export class BaseSubscriptionService<U extends BaseUser> {
  protected readonly logger = new Logger(BaseSubscriptionService.name)
  protected readonly stripe: Stripe

  constructor(
    @Inject('SL_OPTIONS') protected options: SaaslibOptions,
    protected userService: BaseUserService<U>,
    protected emailService: EmailService,
  ) {
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
    currency?: string,
  ): Promise<string> {
    const stripePrice = await this.stripe.prices.retrieve(priceId)
    if (!stripePrice) {
      throw new NotFoundException('Price not found')
    }

    const userSubscription = user.subscriptions.get(type)
    if (stripePrice.product === userSubscription?.product) {
      throw new BadRequestError('You already have this plan')
    }

    const options = this.options.subscriptions[type].products.find((product) => product.id === stripePrice.product)

    const session = await this.stripe.checkout.sessions.create({
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      ...(currency ? { currency } : {}),
      client_reference_id: user._id.toString(),
      ...(user.stripeCustomerId ? { customer: user.stripeCustomerId } : { customer_email: user.email }),
      success_url: successUrl,
      cancel_url: cancelUrl,
      automatic_tax: { enabled: true },
      ...(options.subscriptionData ? { subscription_data: options.subscriptionData } : {}),
    })

    return session.id
  }

  async changeSubscription(user: U, type: string, priceId: string): Promise<UpdateQuery<UserSubscription>> {
    const stripePrice = await this.stripe.prices.retrieve(priceId)
    if (!stripePrice) {
      throw new NotFoundException('Price not found')
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
      url: `${process.env.BACKEND_ENDPOINT}/subscriptions/stripe-webhook`,
      enabled_events: [
        'checkout.session.completed',
        // 'customer.subscription.created',
        'customer.subscription.updated',
        'customer.subscription.deleted',
        // 'customer.subscription.trial_will_end',
      ],
    })
    this.logger.debug('Webhook endpoint created successfully')
    this.logger.debug('Webhook ID:', webhookEndpoint.id)
    this.logger.debug('Webhook Secret:', webhookEndpoint.secret)
    return webhookEndpoint
  }

  async cleanUpCancelledSubscriptions(type: string) {
    const users = await this.userService.findMany({
      [`subscriptions.${type}.cancelled`]: true,
      [`subscriptions.${type}.periodEnd`]: { $lt: new Date() },
    } as any)
    this.logger.log(`Cleaning up ${users.length} cancelled subscriptions for ${type}...`)
    for (const user of users) {
      await this.userService.updateOne(
        { _id: user._id },
        {
          $unset: {
            [`subscriptions.${type}`]: 1,
          } as any,
        },
      )
    }
  }

  /**
   * Retrieves all payments from Stripe and aggregates the total (price) per month and per country.
   */
  async getMonthlyPaymentTotalsByCountry(): Promise<
    Record<string, Record<string, Array<{ total: number; currency: string }>>>
  > {
    if (!this.stripe) {
      throw new Error('Stripe is not initialized.')
    }

    const zeroDecimalCurrencies = new Set([
      'BIF',
      'CLP',
      'DJF',
      'GNF',
      'JPY',
      'KMF',
      'KRW',
      'MGA',
      'PYG',
      'RWF',
      'UGX',
      'VND',
      'VUV',
      'XAF',
      'XOF',
      'XPF',
    ])
    const aggregate: Record<string, Record<string, Record<string, number>>> = {}

    for await (const invoice of this.stripe.invoices.list({
      status: 'paid',
      expand: ['data.customer'],
    })) {
      let country = 'unknown'
      const customer = invoice.customer

      if (typeof customer === 'string') {
        this.logger.warn(`Invoice ${invoice.id} has a string customer ID instead of expanded object.`)
      } else if (customer && 'deleted' in customer && customer.deleted) {
        country = 'unknown'
      } else if (customer && 'address' in customer) {
        const address = (customer as Stripe.Customer).address
        country = (address?.country || 'unknown').toUpperCase()
      } else {
        country = 'unknown'
      }

      const paidAt = invoice.status_transitions?.paid_at
      if (!paidAt) {
        this.logger.warn(`Invoice ${invoice.id} is paid but has no paid_at timestamp. Skipping.`)
        continue
      }
      const date = new Date(paidAt * 1000)
      const yearMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`

      const currencyCode = invoice.currency.toUpperCase()
      const isZeroDecimal = zeroDecimalCurrencies.has(currencyCode)
      const amount = isZeroDecimal ? invoice.amount_paid : invoice.amount_paid / 100

      if (!aggregate[yearMonth]) aggregate[yearMonth] = {}
      if (!aggregate[yearMonth][country]) aggregate[yearMonth][country] = {}
      aggregate[yearMonth][country][currencyCode] = (aggregate[yearMonth][country][currencyCode] || 0) + amount
    }

    const result: Record<string, Record<string, Array<{ total: number; currency: string }>>> = {}
    for (const [yearMonth, countries] of Object.entries(aggregate)) {
      result[yearMonth] = {}
      for (const [country, currencies] of Object.entries(countries)) {
        result[yearMonth][country] = Object.entries(currencies).map(([currency, total]) => ({
          total,
          currency,
        }))
      }
    }

    return result
  }

  async getUsersWithFailedPayments(limit = 1000): Promise<FailedPaymentInfo[]> {
    const failedPaymentsInfo: FailedPaymentInfo[] = []
    try {
      const initialPaymentIntents = await this.stripe.paymentIntents.list({
        limit,
      })

      const PIsWithRequiresPaymentMethod = initialPaymentIntents.data.filter(
        (pi) => pi.status === 'requires_payment_method',
      )

      if (PIsWithRequiresPaymentMethod.length === 0) {
        return failedPaymentsInfo
      }

      const customerIdsToVerify = [
        ...new Set(
          PIsWithRequiresPaymentMethod.map((pi) => pi.customer).filter((c): c is string => typeof c === 'string'),
        ),
      ]

      if (customerIdsToVerify.length === 0) {
        return failedPaymentsInfo
      }

      for (const customerId of customerIdsToVerify) {
        const latestPIsForCustomer = await this.stripe.paymentIntents.list({
          customer: customerId,
          limit: 1,
        })

        if (latestPIsForCustomer.data.length === 0) {
          continue
        }

        const latestPI = latestPIsForCustomer.data[0]

        if (latestPI.status === 'requires_payment_method') {
          const user = await this.userService.findOne({ stripeCustomerId: customerId })

          let paymentFixUrl: string | null = null
          if (latestPI.invoice && typeof latestPI.invoice === 'string') {
            try {
              const invoice = await this.stripe.invoices.retrieve(latestPI.invoice)
              if (invoice && invoice.hosted_invoice_url) {
                paymentFixUrl = invoice.hosted_invoice_url
              } else if (invoice && invoice.status === 'paid') {
                continue
              }
            } catch (invoiceError) {
              this.logger.error(
                `Error retrieving invoice ${latestPI.invoice} for PaymentIntent ${latestPI.id}: ${invoiceError.message}`,
              )
            }
          } else if (latestPI.invoice) {
            const inv = latestPI.invoice as Stripe.Invoice
            if (inv.hosted_invoice_url) {
              paymentFixUrl = inv.hosted_invoice_url
            }
          }

          const paymentInfo: FailedPaymentInfo = {
            stripeCustomerId: customerId,
            paymentIntentId: latestPI.id,
            paymentIntentStatus: latestPI.status,
            failureReason: latestPI.last_payment_error?.message,
            amount: `${latestPI.amount / 100} ${latestPI.currency.toUpperCase()}`,
            created: new Date(latestPI.created * 1000).toISOString(),
            paymentFixUrl: paymentFixUrl,
          }

          if (user) {
            paymentInfo.userId = user.id
            paymentInfo.userEmail = user.email
          }
          failedPaymentsInfo.push(paymentInfo)
        }
      }
    } catch (error) {
      this.logger.error(
        'Error fetching or processing failed payments from Stripe:',
        error.message,
        JSON.stringify(error, null, 2),
      )
    }
    return failedPaymentsInfo
  }

  async sendFailedPaymentEmails(minDaysFromLastEmail = 30) {
    const failedPayments = await this.getUsersWithFailedPayments()
    for (const data of failedPayments) {
      const user = await this.userService.findOne({ email: data.userEmail })
      if (user) {
        if (
          !user.failedPaymentEmailSentAt ||
          user.failedPaymentEmailSentAt < new Date(Date.now() - minDaysFromLastEmail * 24 * 60 * 60 * 1000)
        ) {
          await this.emailService.sendFailedPaymentEmail(
            user.toJSON() as BaseUser,
            data.failureReason,
            data.amount,
            data.paymentFixUrl,
          )
          await this.userService.updateOne({ _id: user._id }, { failedPaymentEmailSentAt: new Date() })
        }
      }
    }
  }
}
