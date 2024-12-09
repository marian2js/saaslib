import { loadStripe } from '@stripe/stripe-js'
import { useRouter } from 'next/navigation'
import { useCallback, useState } from 'react'
import { useApiCallback } from './fetch.hooks'

const stripePromise = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  ? loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
  : null

export function useCreateCheckoutSession() {
  const { callback, loading, error, success } = useApiCallback<
    { sessionId: string } | { ok: boolean } | { statusCode: number; message?: string }
  >()

  const createCheckoutSession = useCallback(
    async (type: string, priceId: string) => {
      const result = await callback('/subscriptions/checkout-session', {
        method: 'POST',
        body: JSON.stringify({ type, priceId }),
      })
      return result
    },
    [callback],
  )

  return { createCheckoutSession, loading, error, success }
}

export const useStripeSubscription = () => {
  const { createCheckoutSession, loading: sessionLoading, error: sessionError } = useCreateCheckoutSession()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const router = useRouter()

  const subscribe = useCallback(
    async (type: string, priceId: string): Promise<{ ok: boolean; message?: string }> => {
      setLoading(true)
      setError(null)

      try {
        const stripe = await stripePromise
        if (!stripe) {
          return { ok: false }
        }
        const result = await createCheckoutSession(type, priceId)
        if (!result) {
          return { ok: false }
        }

        if ('sessionId' in result) {
          const { error } = await stripe.redirectToCheckout({ sessionId: result.sessionId })

          if (error) {
            throw new Error(error.message)
          }
          return { ok: true }
        } else if ('ok' in result) {
          setLoading(false)
          return result
        } else {
          throw new Error(result?.message ?? 'Invalid response')
        }
      } catch (err) {
        setError(err as Error)
        return { ok: false, message: (err as Error).message }
      }
    },
    [createCheckoutSession, router],
  )

  return {
    subscribe,
    loading: loading || sessionLoading,
    error: error || sessionError,
  }
}

export function useGetBillingUrl(type: string) {
  const { callback, loading, error, success } = useApiCallback<{ url: string }>()

  const getPortalUrl = useCallback(async () => {
    const result = await callback(`/subscriptions/billing-url?type=${type}`, {
      method: 'GET',
    })
    return result?.url
  }, [callback])

  return { getPortalUrl, loading, error, success }
}