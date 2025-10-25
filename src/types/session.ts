import { Message } from '../pages/chat/components/MessageBubble'

export interface Session {
  id: string
  title: string
  createdAt: Date
  updatedAt: Date
  messages: Message[]
}

export interface SessionStorage {
  sessions: Session[]
  activeSessionId: string | null
}