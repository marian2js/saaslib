import { useEffect, useState } from 'react'
import { FetchApiError } from '../errors'

// If skip is set then skipDefault must also be set
type FetchHookOptionsWithSkip<T> = { skip: boolean; skipDefault: T }
type FetchHookOptionsWithoutSkip = { skip?: never; skipDefault?: never }

type FetchHookOptions<T> = RequestInit & (FetchHookOptionsWithSkip<T> | FetchHookOptionsWithoutSkip)

export function useFetch<T>(url: string, options: FetchHookOptions<T> = {}) {
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
    fetch(fullUrl, options)
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
