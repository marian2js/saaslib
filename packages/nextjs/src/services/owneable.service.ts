'use server'

import { fetchWithAuth } from '../utils/fetch.utils'

export async function fetchOwneableItems<T>(entityKey: string): Promise<T[]> {
  const res = await fetchWithAuth<{ items: T[] }>(`/${entityKey}`)
  return res.items
}

export async function fetchOwneableItem<T>(entityKey: string, itemId: string): Promise<T> {
  const res = await fetchWithAuth<{ item: T }>(`/${entityKey}/${itemId}`)
  return res.item
}

export async function createOwnableItem<CreateDto, T>(entityKey: string, data: CreateDto): Promise<T> {
  const res = await fetchWithAuth<{ item: T }>(`/${entityKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })
  return res.item
}

export async function updateOwnableItem<UpdateDto, T>(entityKey: string, itemId: string, data: UpdateDto): Promise<T> {
  const res = await fetchWithAuth<{ item: T }>(`/${entityKey}/${itemId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })
  return res.item
}

export async function deleteOwnableItem(entityKey: string, itemId: string): Promise<void> {
  const res = await fetchWithAuth<void>(`/${entityKey}/${itemId}`, {
    method: 'DELETE',
  })
  return res
}
