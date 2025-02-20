'use client'

import { useCallback } from 'react'
import { BaseConversation, BaseMessage, ConversationVisibility } from '../types/conversation.types'
import { useApiCallback, useApiFetch } from './fetch.hooks'
import { useDeleteOwnableItem, useUpdateOwnableItem } from './owneable.hooks'

interface FetchConversationsOptions {
  orderBy?: string
  page?: number
  limit?: number
}

export function useFetchConversations<T extends BaseConversation>(options: FetchConversationsOptions = {}) {
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
  const queryString = params.toString()
  return useApiFetch<{ items: T[] }>(`/conversations${queryString ? `?${queryString}` : ''}`)
}

export function useFetchConversation<T extends BaseConversation>(conversationId: string) {
  return useApiFetch<{ item: T }>(`/conversations/${conversationId}`)
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
