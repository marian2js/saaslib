'use server'

import { BaseConversation, BaseMessage, BaseSharedConversation } from '../types'
import { fetchWithAuth } from '../utils/fetch.utils'

export async function fetchConversations<T>(): Promise<T[]> {
  const res = await fetchWithAuth<{ items: T[] }>('/conversations')
  return res.items
}

export async function fetchConversation<T extends BaseConversation>(conversationId: string, page?: number): Promise<T> {
  const url = `/conversations/${conversationId}${page ? `?page=${page}` : ''}`
  const res = await fetchWithAuth<{ item: T }>(url)
  return res.item
}

export async function fetchSharedConversation<T extends BaseSharedConversation>(idOrSlug: string): Promise<T> {
  const url = `/shared-conversations/${idOrSlug}`
  const res = await fetchWithAuth<{ item: T }>(url)
  return res.item
}

export async function createConversation<T extends BaseConversation>(
  prompt: string,
  visibility: string = 'private',
  async?: boolean,
): Promise<{ item: T }> {
  const queryParams = async ? '?async=true' : ''
  const res = await fetchWithAuth<{ item: T }>(`/conversations${queryParams}`, {
    method: 'POST',
    body: JSON.stringify({
      prompt,
      visibility,
    }),
  })
  return res
}

export async function sendConversationMessage<TMessage extends BaseMessage>(
  conversationId: string,
  content: string,
  async?: boolean,
): Promise<{ messages: TMessage[] }> {
  const queryParams = async ? '?async=true' : ''
  const res = await fetchWithAuth<{ messages: TMessage[] }>(`/conversations/${conversationId}/messages${queryParams}`, {
    method: 'POST',
    body: JSON.stringify({
      content,
    }),
  })
  return res
}
