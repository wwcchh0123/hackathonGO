import React, { useEffect, useRef } from 'react'
import { Box, Grid } from '@mui/material'
import { ChatMessages } from './components/ChatMessages'
import { ChatInput } from './components/ChatInput'
import { SessionSidebar } from './components/SessionSidebar'
import { Message } from './components/MessageBubble'
import { VncPanel } from '../../components/VncPanel'
import { ServiceHealth } from '../../types/api'
import { Session } from '../../types/session'

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
  vncState: {
    isActive: boolean
    isLoading: boolean
    url: string
    error: string
    containerId: string
  }
  vncHealth: ServiceHealth[]
  updateVncState: (updates: Partial<typeof vncState>) => void
  resetVncState: () => void
  addMessage: (type: "user" | "assistant" | "system", content: string) => void
  // 会话相关（由App统一管理）
  sessions: Session[]
  activeSessionId: string | null
  onNewSession: () => void
  onSessionSelect: (sessionId: string) => void
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
  messages,
  vncState,
  vncHealth,
  updateVncState,
  resetVncState,
  addMessage,
  sessions,
  activeSessionId,
  onNewSession,
  onSessionSelect
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const handleNewSession = () => {
    onNewSession()
    setSidebarOpen(false)
  }

  const handleSessionSelect = (sessionId: string) => {
    onSessionSelect(sessionId)
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
      
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          height: '100%',
          ml: sidebarOpen ? '280px' : 0,
          transition: 'margin-left 0.3s ease',
          overflow: 'hidden',
          p: 2,
          gap: 2
        }}
      >
        <Grid container spacing={2} sx={{ height: '100%' }}>
          {/* 聊天区域 - 40% */}
          <Grid
            item
            xs={12}
            md={5}
            sx={{
              display: 'flex',
              flexDirection: 'column',
              height: '100%',
              minHeight: 0
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
          </Grid>

          {/* VNC桌面区域 - 60% */}
          <Grid
            item
            xs={12}
            md={7}
            sx={{
              display: 'flex',
              flexDirection: 'column',
              height: '100%',
              minHeight: 0
            }}
          >
            <VncPanel
              vncState={vncState}
              vncHealth={vncHealth}
              updateVncState={updateVncState}
              resetVncState={resetVncState}
              addMessage={addMessage}
            />
          </Grid>
        </Grid>
      </Box>
    </>
  )
}
