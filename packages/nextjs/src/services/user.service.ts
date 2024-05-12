'use server'

import { fetchWithAuth } from '../utils/fetch.utils'

export async function fetchAuthUser() {
  const data = await fetchWithAuth<{ user: { id: string; email: string } }>(`/users/me`)
  return data.user
}
