import Stripe from 'stripe'

export type SubscriptionModelOptions = Record<
  string,
  {
    products: Array<{
      id: string
      prices: string[]
      subscriptionData?: Stripe.Checkout.SessionCreateParams.SubscriptionData
    }>
    checkoutSuccessUrl: string
    checkoutCancelUrl: string
    billingReturnUrl: string
  }
>
