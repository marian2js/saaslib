import { useCallback, useState } from 'react'
import { useApiCallback, useApiFetch } from './fetch.hooks'

export function useNewsletterSubscription() {
  const { callback, loading: apiLoading, error: apiError } = useApiCallback<{ ok: boolean }>()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [success, setSuccess] = useState(false)

  const subscribe = useCallback(
    async (key: string): Promise<{ ok: boolean; message?: string }> => {
      setLoading(true)
      setError(null)
      setSuccess(false)

      try {
        const result = await callback('/newsletter/subscribe', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ key }),
        })

        if (result?.ok) {
          setSuccess(true)
          return { ok: true }
        }
        throw new Error('Failed to subscribe to newsletter')
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to subscribe to newsletter'))
        return { ok: false, message: err instanceof Error ? err.message : 'Failed to subscribe to newsletter' }
      } finally {
        setLoading(false)
      }
    },
    [callback],
  )

  const unsubscribe = useCallback(
    async (key: string): Promise<{ ok: boolean; message?: string }> => {
      setLoading(true)
      setError(null)
      setSuccess(false)

      try {
        const result = await callback('/newsletter/unsubscribe', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ key }),
        })

        if (result?.ok) {
          setSuccess(true)
          return { ok: true }
        }
        throw new Error('Failed to unsubscribe from newsletter')
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to unsubscribe from newsletter'))
        return { ok: false, message: err instanceof Error ? err.message : 'Failed to unsubscribe from newsletter' }
      } finally {
        setLoading(false)
      }
    },
    [callback],
  )

  return {
    subscribe,
    unsubscribe,
    loading: loading || apiLoading,
    error: error || apiError,
    success,
  }
}

export function useNewsletterTokenSubscription() {
  const { callback, loading: apiLoading, error: apiError } = useApiCallback<{ ok: boolean }>()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [success, setSuccess] = useState(false)

  const subscribeWithToken = useCallback(
    async (userId: string, key: string, token: string): Promise<{ ok: boolean; message?: string }> => {
      setLoading(true)
      setError(null)
      setSuccess(false)

      try {
        const result = await callback('/newsletter/subscribe/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ userId, key, token }),
        })

        if (result?.ok) {
          setSuccess(true)
          return { ok: true }
        }
        throw new Error('Failed to subscribe to newsletter')
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to subscribe to newsletter'))
        return { ok: false, message: err instanceof Error ? err.message : 'Failed to subscribe to newsletter' }
      } finally {
        setLoading(false)
      }
    },
    [callback],
  )

  const unsubscribeWithToken = useCallback(
    async (userId: string, key: string, token: string): Promise<{ ok: boolean; message?: string }> => {
      setLoading(true)
      setError(null)
      setSuccess(false)

      try {
        const result = await callback('/newsletter/unsubscribe/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ userId, key, token }),
        })

        if (result?.ok) {
          setSuccess(true)
          return { ok: true }
        }
        throw new Error('Failed to unsubscribe from newsletter')
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to unsubscribe from newsletter'))
        return { ok: false, message: err instanceof Error ? err.message : 'Failed to unsubscribe from newsletter' }
      } finally {
        setLoading(false)
      }
    },
    [callback],
  )

  return {
    subscribeWithToken,
    unsubscribeWithToken,
    loading: loading || apiLoading,
    error: error || apiError,
    success,
  }
}

export function useNewsletterSubscriptionStatus(key: string) {
  return useApiFetch<{ isSubscribed: boolean }>(`/newsletter/subscription-status?key=${encodeURIComponent(key)}`, {
    credentials: 'include',
  })
}
