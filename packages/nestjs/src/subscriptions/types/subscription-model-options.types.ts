export type SubscriptionModelOptions = Record<
  string,
  {
    products: Array<{
      id: string
    }>
    checkoutSuccessUrl: string
    checkoutCancelUrl: string
    billingReturnUrl: string
  }
>
