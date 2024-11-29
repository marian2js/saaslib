import { useCallback, useEffect, useState } from 'react'
import { FetchApiError } from '../errors'

// If skip is set then skipDefault must also be set
type FetchHookOptionsWithSkip<T> = { skip: boolean; skipDefault: T }
type FetchHookOptionsWithoutSkip = { skip?: never; skipDefault?: never }

type FetchHookOptions<T> = RequestInit & (FetchHookOptionsWithSkip<T> | FetchHookOptionsWithoutSkip)

export function useApiFetch<T>(url: string, options: FetchHookOptions<T> = {}) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<FetchApiError | null>(null)

  let fullUrl = url.startsWith('/') ? process.env.NEXT_PUBLIC_API_ENDPOINT + url : url

  useEffect(() => {
    if (options.skip) {
      if (options.skipDefault) {
        setData(options.skipDefault)
      }
      return
    }
    setLoading(true)
    fetch(fullUrl, {
      ...options,
      credentials: 'include',
    })
      .then((res) => res.json())
      .then((data) => {
        if (data?.error) {
          setError(new FetchApiError(data))
        } else {
          setData(data)
        }
      })
      .catch((err) => setError(err))
      .finally(() => setLoading(false))
  }, [fullUrl, options.skip])

  return { data, loading, error }
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
