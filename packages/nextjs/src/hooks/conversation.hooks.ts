'use client'

import { useCallback } from 'react'
import { BaseConversation, BaseMessage, ConversationVisibility } from '../types/conversation.types'
import { useApiCallback, useApiFetch } from './fetch.hooks'

export function useFetchConversations<T extends BaseConversation>() {
  return useApiFetch<{ items: T[] }>('/conversations')
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
