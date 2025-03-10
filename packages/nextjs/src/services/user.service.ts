'use server'

import { BaseUser } from '../types'
import { fetchWithAuth, FetchWithAuthOptions } from '../utils/fetch.utils'

export async function fetchMe<U extends BaseUser | null>(options?: FetchWithAuthOptions) {
  try {
    const data = await fetchWithAuth<{ user: U }>(`/users/me`, {
      throwIfNoToken: true,
      ...options,
    })
    return data?.user ?? null
  } catch {
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
