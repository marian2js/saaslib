export type SubscriptionModelOptions = Record<
  string,
  {
    products: Array<{
      id: string
      prices: string[]
    }>
    checkoutSuccessUrl: string
    checkoutCancelUrl: string
    billingReturnUrl: string
  }
>
