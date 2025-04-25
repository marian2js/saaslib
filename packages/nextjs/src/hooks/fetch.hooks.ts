'use client'

import { useCallback, useEffect, useState } from 'react'
import { FetchApiError } from '../errors'
import { delay } from '../utils/async.utils'

// If skip is set then skipDefault must also be set
type FetchHookOptionsWithSkip<T> = { skip: boolean; skipDefault: T | null }
type FetchHookOptionsWithoutSkip = { skip?: never; skipDefault?: never }

type RetryOptions = {
  retries?: number
  /** Initial delay in milliseconds */
  initialRetryDelay?: number
  /** Multiplier for each subsequent retry delay. Set to 1 for constant delay */
  backoffMultiplier?: number
  /** Maximum delay in milliseconds between retries */
  maxRetryDelay?: number
}

export type FetchHookOptions<T> = RequestInit &
  (FetchHookOptionsWithSkip<T> | FetchHookOptionsWithoutSkip) &
  RetryOptions

export function useApiFetch<T>(url: string, options: FetchHookOptions<T> = {}) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<FetchApiError | null>(null)

  let fullUrl = url.startsWith('/') ? process.env.NEXT_PUBLIC_API_ENDPOINT + url : url

  const doFetch = useCallback(async () => {
    if (options.skip) {
      if (options.skipDefault) {
        setData(options.skipDefault)
      }
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    const maxRetries = options.retries ?? 0
    const initialDelay = options.initialRetryDelay ?? 1000
    const backoffMultiplier = options.backoffMultiplier ?? 2
    const maxRetryDelay = options.maxRetryDelay ?? 30000 // Default 30s max
    let currentTry = 0

    while (currentTry <= maxRetries) {
      try {
        const res = await fetch(fullUrl, {
          ...options,
          credentials: 'include',
        })

        // If it's not a 5xx error, or we're out of retries, throw the error
        if (res.status < 500 || res.status > 599 || currentTry === maxRetries) {
          const data = await res.json()
          if (!res.ok || data?.error) {
            throw new FetchApiError(data)
          }
          setData(data)
          setLoading(false)
          return
        }

        const errorData = await res.json().catch(() => ({ message: res.statusText }))
        throw new FetchApiError(errorData)
      } catch (e) {
        if (currentTry === maxRetries) {
          setError(e as FetchApiError)
          setLoading(false)
          return
        }

        const nextDelay = Math.min(initialDelay * Math.pow(backoffMultiplier, currentTry), maxRetryDelay)
        await delay(nextDelay)
        currentTry++
      }
    }
  }, [
    fullUrl,
    options.skip,
    options.retries,
    options.initialRetryDelay,
    options.backoffMultiplier,
    options.maxRetryDelay,
  ])

  useEffect(() => {
    doFetch()
  }, [doFetch])

  return { data, loading, error, refetch: doFetch }
}

export function useApiCallback<T>() {
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<FetchApiError | null>(null)

  const callback = useCallback(async (url: string, options: FetchHookOptions<T> = {}): Promise<T | null> => {
    setLoading(true)
    setError(null)
    try {
      const fullUrl = url.startsWith('/') ? process.env.NEXT_PUBLIC_API_ENDPOINT + url : url
      const res = await fetch(fullUrl, {
        credentials: 'include',
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...(options.headers || {}),
        },
      })
      const result = await res.json()
      if (result?.error) {
        setError(new FetchApiError(result))
        return null
      } else {
        setSuccess(true)
        return result as T
      }
    } catch (err) {
      setError(err as FetchApiError)
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  return { callback, loading, error, success }
}
