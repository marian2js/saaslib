'use server'

import { BaseUser } from '../types'
import { fetchWithAuth } from '../utils/fetch.utils'

export async function fetchAuthUser<U extends BaseUser>() {
  const data = await fetchWithAuth<{ user: U }>(`/users/me`)
  return data.user
}

export async function updateUser<U extends BaseUser>(user: Partial<U>) {
  const data = await fetchWithAuth<{ user: U }>(`/users/me`, {
    method: 'PUT',
    body: JSON.stringify(user),
  })
  return data.user
}
