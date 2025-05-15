import type { Stripe } from 'stripe'

export interface FailedPaymentInfo {
  userId?: string
  userEmail?: string
  stripeCustomerId: string
  paymentIntentId: string
  paymentIntentStatus: Stripe.PaymentIntent.Status
  failureReason: string
  amount: string
  created: string
  paymentFixUrl: string
}
