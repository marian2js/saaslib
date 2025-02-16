export enum ConversationVisibility {
  Private = 'private',
  Public = 'public',
}

export interface BaseMessage<T = string> {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: T
  conversation: string
}

export interface BaseConversation<TMessage extends BaseMessage = BaseMessage> {
  id: string
  owner: string
  title?: string
  messages: TMessage[]
  lastMessageAt: Date
  visibility: ConversationVisibility
}
