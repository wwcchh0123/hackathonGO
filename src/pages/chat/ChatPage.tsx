import React, { useEffect, useRef, useState } from 'react'
import { Box, Container } from '@mui/material'
import { ChatMessages } from './components/ChatMessages'
import { ChatInput } from './components/ChatInput'
import { SessionSidebar } from './components/SessionSidebar'
import { Message } from './components/MessageBubble'
import { useSessionStorage } from '../../hooks/useSessionStorage'

interface ChatPageProps {
  command: string
  baseArgs: string[]
  cwd: string
  envText: string
  inputText: string
  setInputText: (text: string) => void
  onSendMessage: () => void
  isLoading: boolean
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
  messages: Message[]
}

export const ChatPage: React.FC<ChatPageProps> = ({
  command,
  baseArgs,
  cwd,
  envText,
  inputText,
  setInputText,
  onSendMessage,
  isLoading,
  sidebarOpen,
  setSidebarOpen,
  messages
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null)
  
  const {
    sessions,
    activeSessionId,
    createNewSession,
    selectSession
  } = useSessionStorage()

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const handleNewSession = () => {
    createNewSession()
    setSidebarOpen(false)
  }

  const handleSessionSelect = (sessionId: string) => {
    selectSession(sessionId)
    setSidebarOpen(false)
  }

  return (
    <>
      <SessionSidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        sessions={sessions}
        activeSessionId={activeSessionId}
        onSessionSelect={handleSessionSelect}
        onNewSession={handleNewSession}
      />
      
      <Container
        maxWidth="md"
        sx={{ 
          flex: 1, 
          display: "flex", 
          flexDirection: "column", 
          py: 3,
          ml: sidebarOpen ? '280px' : 'auto',
          transition: 'margin-left 0.3s ease'
        }}
      >
        <Box
          sx={{
            flex: 1,
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            bgcolor: 'white',
            borderRadius: 2,
            border: '1px solid',
            borderColor: 'grey.200',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
          }}
        >
          <ChatMessages
            messages={messages}
            messagesEndRef={messagesEndRef}
          />
          
          <ChatInput
            inputText={inputText}
            setInputText={setInputText}
            onSendMessage={onSendMessage}
            isLoading={isLoading}
          />
        </Box>
      </Container>
    </>
  )
}