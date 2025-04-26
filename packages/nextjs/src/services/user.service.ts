'use server'

import { FetchApiError } from '../errors'
import { BaseUser } from '../types'
import { fetchWithAuth, FetchWithAuthOptions } from '../utils/fetch.utils'
import { signOutServer } from './auth.service'

export async function fetchMe<U extends BaseUser | null>(options?: FetchWithAuthOptions) {
  try {
    const data = await fetchWithAuth<{ user: U }>(`/users/me`, {
      throwIfNoToken: true,
      ...options,
    })
    return data?.user ?? null
  } catch (err) {
    if (err instanceof FetchApiError && err.statusCode >= 400 && err.statusCode < 500) {
      // the user has cookies, but the token is invalid
      await signOutServer()
    }
    return null
  }
}

export async function fetchAuthUser<U extends BaseUser>() {
  const data = await fetchWithAuth<{ user: U }>(`/users/me`)
  return data.user
}

export async function updateUser<U extends BaseUser>(user: Partial<U>) {
  const data = await fetchWithAuth<{ user: U }>(`/users/me`, {
    method: 'PATCH',
    body: JSON.stringify(user),
  })
  return data.user
}
