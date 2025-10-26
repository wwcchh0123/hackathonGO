import React, { useEffect, useRef, useState } from 'react'
import { Box, Grid } from '@mui/material'
import { ChatMessages } from './components/ChatMessages'
import { ChatInput } from './components/ChatInput'
import { SessionSidebar } from './components/SessionSidebar'
import { Message } from './components/MessageBubble'
import { VncPanel } from '../../components/VncPanel'
import { ServiceHealth } from '../../types/api'
import { Session } from '../../types/session'
import { useSpeechRecognition } from '../../hooks/useSpeechRecognition'

interface ChatPageProps {
  command: string
  baseArgs: string[]
  cwd: string
  envText: string
  inputText: string
  setInputText: (text: string) => void
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
  const [streamingSessionId, setStreamingSessionId] = useState<string | null>(null)
  const [isStreamingActive, setIsStreamingActive] = useState(false)

  // 语音识别 Hook
  const {
    transcript,
    state: voiceState,
    error: voiceError,
    isSupported: isVoiceSupported,
    startListening,
    stopListening,
    resetTranscript
  } = useSpeechRecognition({
    lang: 'zh_cn', // 科大讯飞使用下划线格式
    continuous: false, // 科大讯飞单次识别，不支持 continuous
    interimResults: true
  })

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // 处理语音识别结果
  useEffect(() => {
    console.log('📱 ChatPage - voiceState:', voiceState, 'transcript:', transcript);
    // 持续更新输入框内容(包括临时结果)
    if ((voiceState === 'listening' || voiceState === 'processing') && transcript) {
      console.log('🎤 更新输入框文本:', transcript)
      setInputText(transcript)
    }
  }, [voiceState, transcript, setInputText])

  // 当识别停止后,清理状态
  useEffect(() => {
    if (voiceState === 'idle' && transcript) {
      // 识别已停止,保持最终文本在输入框中
      resetTranscript()
    }
  }, [voiceState, transcript, resetTranscript])

  // 流式事件处理现在移到了App.tsx中的父组件
  // 这里只需要处理本地状态
  useEffect(() => {
    if (!window.api?.onClaudeStream) return

    const handleStreamEvent = (event: any, message: any) => {
      if (message.sessionId !== streamingSessionId) return

      switch (message.type) {
        case 'stream-end':
        case 'stream-error':
          setIsStreamingActive(false)
          setStreamingSessionId(null)
          break
      }
    }

    const unsubscribe = window.api.onClaudeStream(handleStreamEvent)
    return unsubscribe
  }, [streamingSessionId])

  const handleNewSession = () => {
    onNewSession()
    setSidebarOpen(false)
  }

  const handleSessionSelect = (sessionId: string) => {
    onSessionSelect(sessionId)
    setSidebarOpen(false)
  }

  // 直接处理消息发送，避免双重调用
  const handleSendMessage = async () => {
    if (!inputText.trim() || isLoading || isStreamingActive) return

    const userMessage = inputText.trim()
    addMessage("user", userMessage)
    setInputText("")

    // 生成唯一的会话ID
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    setStreamingSessionId(sessionId)
    setIsStreamingActive(true)

    try {
      // 检查API是否可用
      if (!window.api || !window.api.sendMessage) {
        addMessage("system", "Electron API not available. Please run the desktop app via Electron: npm start (built) or npm run dev (dev).")
        setIsStreamingActive(false)
        return
      }

      const env: Record<string, string> = {}
      envText.split(/\n/).forEach((line) => {
        const m = line.match(/^([^=]+)=(.*)$/)
        if (m) env[m[1].trim()] = m[2].trim()
      })

      const options = {
        command,
        baseArgs,
        message: userMessage,
        cwd,
        env,
        sessionId
      }

      console.log("📤 Sending to IPC:", options)
      const result = await window.api.sendMessage(options)
      console.log("📥 Received from IPC:", result)

      // 结果完全通过App.tsx中的流式事件处理，这里不再添加
    } catch (error) {
      console.log("💥 Frontend error:", error)
      addMessage("system", `Failed to send message: ${error}`)
    } finally {
      setIsStreamingActive(false)
    }
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
                onSendMessage={handleSendMessage}
                isLoading={isLoading || isStreamingActive}
                isListening={voiceState === 'listening'}
                onStartVoice={startListening}
                onStopVoice={stopListening}
                voiceError={voiceError}
                isVoiceSupported={isVoiceSupported}
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
