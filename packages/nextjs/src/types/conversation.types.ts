export enum ConversationVisibility {
  Private = 'private',
  Public = 'public',
}

export interface BaseMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
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
