import React, { useEffect, useRef, useState } from 'react'
import { Box } from '@mui/material'
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
  const [showVnc, setShowVnc] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const [splitPercent, setSplitPercent] = useState(42)
  const [isDragging, setIsDragging] = useState(false)

  const clamp = (val: number, min: number, max: number) => Math.min(Math.max(val, min), max)
  const updateSplitFromClientX = (clientX: number) => {
    const el = containerRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const relative = clientX - rect.left
    const pct = (relative / rect.width) * 100
    setSplitPercent(clamp(Math.round(pct), 25, 75))
  }

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

  // 记录上一次的语音状态，用于检测状态变化
  const prevVoiceStateRef = useRef<typeof voiceState>('idle')

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // 直接处理消息发送，避免双重调用
  const handleSendMessage = React.useCallback(async () => {
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
  }, [inputText, isLoading, isStreamingActive, addMessage, setInputText, command, baseArgs, cwd, envText])

  // 处理语音识别结果
  useEffect(() => {
    console.log('📱 ChatPage - voiceState:', voiceState, 'transcript:', transcript);
    // 持续更新输入框内容(包括临时结果)
    if ((voiceState === 'listening' || voiceState === 'processing') && transcript) {
      console.log('🎤 更新输入框文本:', transcript)
      setInputText(transcript)
    }
  }, [voiceState, transcript, setInputText])
  
  // 当识别停止后,自动发送消息
  useEffect(() => {
    // 检测从 listening/processing 变为 idle 的状态转换
    const wasListening = prevVoiceStateRef.current === 'listening' || prevVoiceStateRef.current === 'processing'
    const nowIdle = voiceState === 'idle'
    
    if (wasListening && nowIdle && inputText.trim()) {
      // 识别已停止且有文本内容，自动发送消息
      console.log('🚀 语音识别结束，自动发送消息:', inputText)
      resetTranscript()
      // 使用 setTimeout 确保状态更新完成后再发送
      setTimeout(() => {
        handleSendMessage()
      }, 100)
    }
    
    // 更新上一次的状态
    prevVoiceStateRef.current = voiceState
  }, [voiceState, inputText, resetTranscript, handleSendMessage])

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
          overflowX: 'auto',
          overflowY: 'hidden',
          p: 2,
          gap: 2,
          flexWrap: 'nowrap',
          position: 'relative',
          userSelect: isDragging ? 'none' : 'auto'
        }}
        ref={containerRef}
      >
        {/* 左侧聊天区域 */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            minHeight: 0,
            minWidth: 0,
            flex: showVnc ? `0 0 ${splitPercent}%` : '1 1 100%'
          }}
        >
          <Box
            sx={{
              flex: 1,
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
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
              onPrefillInput={(text) => setInputText(text)}
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
              showVnc={showVnc}
              onToggleVnc={() => setShowVnc(v => !v)}
            />
          </Box>
        </Box>

        {/* 可拖动分隔条 */}
        {showVnc && (
          <Box
            onMouseDown={(e) => {
              setIsDragging(true)
              updateSplitFromClientX(e.clientX)
            }}
            sx={{
              flex: '0 0 8px',
              height: '100%',
              bgcolor: 'grey.200',
              borderLeft: '1px solid',
              borderRight: '1px solid',
              borderColor: 'grey.300',
              cursor: 'col-resize'
            }}
          />
        )}

        {/* 右侧 VNC 桌面区域（仅在开启时显示），固定不换行 */}
        {showVnc && (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              height: '100%',
              minHeight: 0,
              minWidth: 0,
              flex: '1 1 auto'
            }}
          >
            <VncPanel
              vncState={vncState}
              vncHealth={vncHealth}
              updateVncState={updateVncState}
              resetVncState={resetVncState}
              addMessage={addMessage}
            />
          </Box>
        )}

        {/* 拖动覆盖层，避免 iframe 抢占事件 */}
        {isDragging && (
          <Box
            onMouseMove={(e) => updateSplitFromClientX(e.clientX)}
            onMouseUp={() => setIsDragging(false)}
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 2,
              cursor: 'col-resize'
            }}
          />
        )}
      </Box>
    </>
  )
}
