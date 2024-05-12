'use server'

import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'
import { FetchApiError } from '../errors'

export async function fetchApi<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_ENDPOINT}${path}`, {
    ...(options ?? {}),
    cache: options?.cache ?? options?.next?.revalidate ? undefined : 'no-store',
  })
  const data = await res.json()
  if (data?.error) {
    if (data.statusCode === 404) {
      notFound()
    }
    throw new FetchApiError(data)
  }
  return data
}

export async function fetchWithAuth<T>(path: string, options?: RequestInit): Promise<T> {
  const tokenCookie = cookies().get('jwt')
  if (!tokenCookie) {
    throw new Error('No token found')
  }
  const token = JSON.parse(tokenCookie.value).accessToken
  return fetchApi<T>(path, {
    ...options,
    headers: {
      ...options?.headers,
      Authorization: `Bearer ${token}`,
    },
  })
}
