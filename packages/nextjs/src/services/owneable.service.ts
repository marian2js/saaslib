'use server'

import { fetchWithAuth } from '../utils/fetch.utils'

export async function fetchOwneableItems<T>(entityKey: string, options?: RequestInit): Promise<T[]> {
  const res = await fetchWithAuth<{ items: T[] }>(`/${entityKey}`, options)
  return res.items
}

export async function fetchOwneableItem<T>(entityKey: string, itemId: string, options?: RequestInit): Promise<T> {
  const res = await fetchWithAuth<{ item: T }>(`/${entityKey}/${itemId}`, options)
  return res.item
}

export async function createOwnableItem<CreateDto, T>(
  entityKey: string,
  data: CreateDto,
  options?: RequestInit,
): Promise<T> {
  const res = await fetchWithAuth<{ item: T }>(`/${entityKey}`, {
    method: 'POST',
    body: JSON.stringify(data),
    ...(options ?? {}),
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers ?? {}),
    },
  })
  return res.item
}

export async function updateOwnableItem<UpdateDto, T>(
  entityKey: string,
  itemId: string,
  data: UpdateDto,
  options?: RequestInit,
): Promise<T> {
  const res = await fetchWithAuth<{ item: T }>(`/${entityKey}/${itemId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
    ...(options ?? {}),
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers ?? {}),
    },
  })
  return res.item
}

export async function deleteOwnableItem(entityKey: string, itemId: string, options?: RequestInit): Promise<void> {
  const res = await fetchWithAuth<void>(`/${entityKey}/${itemId}`, {
    method: 'DELETE',
    ...(options ?? {}),
  })
  return res
}
