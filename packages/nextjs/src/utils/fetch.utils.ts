'use server'

import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'
import { FetchApiError } from '../errors'

export type FetchApiOptions = RequestInit & {
  maxRetries?: number
  initialDelayMs?: number
  maxDelayMs?: number
  backoffMultiplier?: number
  nullOn404?: boolean
}

export type FetchWithAuthOptions = FetchApiOptions & {
  throwIfNoToken?: boolean
}

export async function fetchWithRetry(url: string, options: FetchApiOptions): Promise<Response> {
  let lastError: Error | null = null
  const maxRetries = options.maxRetries ?? 0
  const initialDelay = options.initialDelayMs ?? 0
  const maxDelay = options.maxDelayMs ?? 10000
  const backoffMultiplier = options.backoffMultiplier ?? 1.2

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, {
        ...options,
        cache: options.cache ?? options.next?.revalidate ? undefined : 'no-store',
        headers: {
          ...options.headers,
          ...(process.env.API_KEY && {
            'x-api-key': process.env.API_KEY,
          }),
        },
      })

      if (response.ok) {
        return response
      }

      // Only retry for 5xx errors
      if (response.status < 500 || response.status >= 600) {
        return response
      }

      lastError = new Error(`HTTP error! status: ${response.status}`)
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
    }

    if (attempt < maxRetries) {
      let delay: number
      if (attempt === 0) {
        delay = initialDelay
      } else {
        delay = Math.min(initialDelay * Math.pow(backoffMultiplier, attempt), maxDelay)
      }
      await new Promise((resolve) => setTimeout(resolve, delay))
    }
  }

  throw lastError || new Error('Failed to fetch after retries')
}

export async function fetchApi<T>(path: string, options?: FetchApiOptions): Promise<T> {
  const url = `${process.env.NEXT_PUBLIC_API_ENDPOINT}${path}`
  const response = await fetchWithRetry(url, options || {})
  const data = await response.json()

  if (data?.error) {
    if (data.statusCode === 404) {
      if (options?.nullOn404) {
        return null as T
      }
      notFound()
    }
    throw new FetchApiError(data)
  }
  return data
}

export async function fetchWithAuth<T>(path: string, options?: FetchWithAuthOptions): Promise<T> {
  const cookieData = await cookies()
  const tokenCookie = cookieData.get('jwt')
  if (!tokenCookie) {
    if (options?.throwIfNoToken) {
      throw new Error('No token found')
    }
    return fetchApi<T>(path, options)
  }
  const token = JSON.parse(tokenCookie.value).accessToken

  const headers: { [key: string]: any } = {
    'Content-Type': 'application/json',
    ...(options?.headers ?? {}),
    Authorization: `Bearer ${token}`,
  }
  if (options?.headers && 'Content-Type' in options?.headers) {
    delete headers['Content-Type']
  }

  return fetchApi<T>(path, {
    ...options,
    headers,
  })
}
