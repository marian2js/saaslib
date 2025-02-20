export enum ConversationVisibility {
  Private = 'private',
  Public = 'public',
}

export interface BaseMessage<T = string> {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: T
  conversation: string
  feedback?: 1 | 0 | -1
}

export interface BaseConversation<TMessage extends BaseMessage = BaseMessage> {
  id: string
  owner: string
  title?: string
  messages: TMessage[]
  lastMessageAt: Date
  visibility: ConversationVisibility
}
