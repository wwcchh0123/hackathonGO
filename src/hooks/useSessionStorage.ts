import { useState, useEffect, useCallback } from 'react'
import { Session, SessionStorage } from '../types/session'
import { Message } from '../pages/chat/components/MessageBubble'

const SESSIONS_STORAGE_KEY = 'claude-sessions'

const generateSessionTitle = (messages: Message[]): string => {
  const userMessages = messages.filter(m => m.type === 'user')
  if (userMessages.length === 0) return '新会话'
  
  const firstMessage = userMessages[0].content
  // 取前30个字符作为标题
  return firstMessage.length > 30 
    ? firstMessage.substring(0, 30) + '...'
    : firstMessage
}

export const useSessionStorage = () => {
  const [sessions, setSessions] = useState<Session[]>([])
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)

  // 从 localStorage 加载会话数据
  const loadSessions = useCallback(() => {
    try {
      const stored = localStorage.getItem(SESSIONS_STORAGE_KEY)
      if (stored) {
        const data: SessionStorage = JSON.parse(stored)
        setSessions(data.sessions.map(session => ({
          ...session,
          createdAt: new Date(session.createdAt),
          updatedAt: new Date(session.updatedAt),
          messages: session.messages.map(msg => ({
            ...msg,
            timestamp: new Date(msg.timestamp)
          }))
        })))
        setActiveSessionId(data.activeSessionId)
      }
    } catch (error) {
      console.error('Failed to load sessions:', error)
    }
  }, [])

  // 保存会话数据到 localStorage
  const saveSessions = useCallback((sessionsToSave: Session[], activeId: string | null) => {
    try {
      const data: SessionStorage = {
        sessions: sessionsToSave,
        activeSessionId: activeId
      }
      localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(data))
    } catch (error) {
      console.error('Failed to save sessions:', error)
    }
  }, [])

  // 创建新会话
  const createNewSession = useCallback((): string => {
    const newSession: Session = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      title: '新会话',
      createdAt: new Date(),
      updatedAt: new Date(),
      messages: []
    }
    
    const updatedSessions = [newSession, ...sessions]
    setSessions(updatedSessions)
    setActiveSessionId(newSession.id)
    saveSessions(updatedSessions, newSession.id)
    
    return newSession.id
  }, [sessions, saveSessions])

  // 获取当前活动会话
  const getActiveSession = useCallback((): Session | null => {
    if (!activeSessionId) return null
    return sessions.find(s => s.id === activeSessionId) || null
  }, [sessions, activeSessionId])

  // 更新会话消息
  const updateSessionMessages = useCallback((sessionId: string, messages: Message[]) => {
    setSessions(prev => {
      const updated = prev.map(session => {
        if (session.id === sessionId) {
          const title = messages.length > 0 ? generateSessionTitle(messages) : '新会话'
          return {
            ...session,
            title,
            messages,
            updatedAt: new Date()
          }
        }
        return session
      })
      
      saveSessions(updated, activeSessionId)
      return updated
    })
  }, [activeSessionId, saveSessions])

  // 选择会话
  const selectSession = useCallback((sessionId: string) => {
    setActiveSessionId(sessionId)
    const updatedSessions = [...sessions]
    saveSessions(updatedSessions, sessionId)
  }, [sessions, saveSessions])

  // 删除会话
  const deleteSession = useCallback((sessionId: string) => {
    setSessions(prev => {
      const updated = prev.filter(s => s.id !== sessionId)
      const newActiveId = activeSessionId === sessionId ? 
        (updated.length > 0 ? updated[0].id : null) : activeSessionId
      
      setActiveSessionId(newActiveId)
      saveSessions(updated, newActiveId)
      return updated
    })
  }, [activeSessionId, saveSessions])

  // 初始化时加载数据
  useEffect(() => {
    loadSessions()
  }, [loadSessions])

  return {
    sessions,
    activeSessionId,
    getActiveSession,
    createNewSession,
    selectSession,
    updateSessionMessages,
    deleteSession
  }
}