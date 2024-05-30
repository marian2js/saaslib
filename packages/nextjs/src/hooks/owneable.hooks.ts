import { useCallback } from 'react'
import { useApiCallback, useFetch } from './fetch.hooks'

export function useFetchOwnableItems<T>(entityKey: string) {
  return useFetch<{ items: T[] }>(`/${entityKey}`, { credentials: 'include' })
}

export function useFetchOwnableItem<T>(entityKey: string, itemId: string) {
  return useFetch<{ item: T }>(`/${entityKey}/${itemId}`, { credentials: 'include' })
}

export function useCreateOwneableItem<CreateDto, GetDto>(entityKey: string) {
  const { callback, success, loading, error } = useApiCallback<{ item: GetDto }>()

  const createItem = useCallback(
    async (item: CreateDto) => {
      const res = await callback(`/${entityKey}`, {
        method: 'POST',
        body: JSON.stringify(item),
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      })
      return res?.item
    },
    [callback],
  )

  return { createItem, success, loading, error }
}

export function useUpdateOwnableItem<UpdateDto>(entityKey: string) {
  const { callback, success, loading, error } = useApiCallback<{ ok: true }>()

  const updateItem = useCallback(
    async (itemId: string, data: UpdateDto) => {
      await callback(`/${entityKey}/${itemId}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      })
    },
    [callback, entityKey],
  )

  return { updateItem, success, loading, error }
}

export function useDeleteOwnableItem<T>(entityKey: string) {
  const { callback, success, loading, error } = useApiCallback<{ ok: true }>()

  const deleteItem = useCallback(
    async (itemId: string) => {
      await callback(`/${entityKey}/${itemId}`, { method: 'DELETE', credentials: 'include' })
    },
    [callback, entityKey],
  )

  return { deleteItem, success, loading, error }
}
