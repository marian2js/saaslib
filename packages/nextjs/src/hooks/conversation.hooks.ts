'use client'

import { useCallback } from 'react'
import {
  BaseConversation,
  BaseMessage,
  BaseSharedConversation,
  ConversationVisibility,
} from '../types/conversation.types'
import { FetchHookOptions, useApiCallback, useApiFetch } from './fetch.hooks'
import { useDeleteOwnableItem, useFetchOwnableItem, useFetchOwnableItems, useUpdateOwnableItem } from './owneable.hooks'

interface FetchConversationsParams {
  orderBy?: string
  page?: number
  limit?: number
  admin?: boolean
}

export function useFetchConversations<T extends BaseConversation = BaseConversation>(
  options: FetchConversationsParams = {},
  fetchOptions?: FetchHookOptions<{ items: T[] }>,
) {
  const defaultOptions = { orderBy: 'createdAt:-1' }
  const urlOptions = { ...defaultOptions, ...options }

  const params = new URLSearchParams()
  if (urlOptions.orderBy) {
    params.set('orderBy', urlOptions.orderBy)
  }
  if (urlOptions.page !== undefined) {
    params.set('page', urlOptions.page.toString())
  }
  if (urlOptions.limit !== undefined) {
    params.set('limit', urlOptions.limit.toString())
  }
  if (urlOptions.admin !== undefined) {
    params.set('admin', urlOptions.admin.toString())
  }
  const queryString = params.toString()
  return useApiFetch<{ items: T[] }>(`/conversations${queryString ? `?${queryString}` : ''}`, fetchOptions)
}

export function useFetchConversation<T extends BaseConversation>(
  conversationId: string,
  fetchOptions?: FetchHookOptions<{ item: T }>,
) {
  return useApiFetch<{ item: T }>(`/conversations/${conversationId}`, fetchOptions)
}

export function useCreateConversation<T extends BaseConversation>() {
  const { callback, loading, error } = useApiCallback<{ item: T }>()

  const createConversation = useCallback(
    async (prompt: string, visibility: ConversationVisibility = ConversationVisibility.Private, async?: boolean) => {
      const queryParams = async ? '?async=true' : ''
      const result = await callback(`/conversations${queryParams}`, {
        method: 'POST',
        body: JSON.stringify({
          prompt,
          visibility,
        }),
      })
      return result
    },
    [callback],
  )

  return { createConversation, loading, error }
}

export function useSendConversationMessage<TMessage extends BaseMessage>() {
  const { callback, loading, error } = useApiCallback<{ messages: TMessage[] }>()

  const sendMessage = useCallback(
    async (conversationId: string, content: string, async?: boolean) => {
      const queryParams = async ? '?async=true' : ''
      const result = await callback(`/conversations/${conversationId}/messages${queryParams}`, {
        method: 'POST',
        body: JSON.stringify({ content }),
      })
      return result
    },
    [callback],
  )

  return { sendMessage, loading, error }
}

export function useUpdateConversation<T extends BaseConversation<any> = BaseConversation<any>>() {
  return useUpdateOwnableItem<Partial<T>>('conversations')
}

export function useDeleteConversation<T extends BaseConversation<any> = BaseConversation<any>>() {
  return useDeleteOwnableItem<Partial<T>>('conversations')
}

export function useUpdateMessage<T extends BaseMessage<any> = BaseMessage<any>>() {
  return useUpdateOwnableItem<Partial<T>>('messages')
}

export function useDeleteMessage<T extends BaseMessage<any> = BaseMessage<any>>() {
  return useDeleteOwnableItem<Partial<T>>('messages')
}

export function useRetryMessage<TMessage extends BaseMessage>() {
  const { callback, loading, error } = useApiCallback<{ messages: TMessage[] }>()

  const retryMessage = useCallback(
    async (messageId: string, async?: boolean) => {
      const queryParams = async ? '?async=true' : ''
      const result = await callback(`/conversations/messages/${messageId}/retry${queryParams}`, {
        method: 'POST',
      })
      return result
    },
    [callback],
  )

  return { retryMessage, loading, error }
}

export function useShareConversation<T extends BaseSharedConversation = BaseSharedConversation>() {
  const { callback, loading, error } = useApiCallback<{ item: T }>()

  const shareConversation = useCallback(
    async (conversationId: string) => {
      const result = await callback(`/conversations/${conversationId}/share`, {
        method: 'POST',
      })
      return result
    },
    [callback],
  )

  return { shareConversation, loading, error }
}

export function useFetchSharedConversation<T extends BaseSharedConversation<any> = BaseSharedConversation>(
  idOrSlug: string,
) {
  return useFetchOwnableItem<T>('shared-conversations', idOrSlug)
}

export function useFetchSharedConversations<T extends BaseSharedConversation<any> = BaseSharedConversation>() {
  return useFetchOwnableItems<T>('shared-conversations')
}

export function useUpdateSharedConversation<T extends BaseSharedConversation<any> = BaseSharedConversation>() {
  return useUpdateOwnableItem<Partial<T>>('shared-conversations')
}

export function useDeleteSharedConversation<T extends BaseSharedConversation<any> = BaseSharedConversation>() {
  return useDeleteOwnableItem<Partial<T>>('shared-conversations')
}
