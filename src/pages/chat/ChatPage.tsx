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
import { PromptBuilder } from '../../prompts/prompt-builder'

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
  updateVncState: (updates: Partial<ChatPageProps['vncState']>) => void
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

      // ========== System Prompt 集成 ==========

      // 1. 检测 VNC 状态
      // VNC 被视为"启用"需要满足两个条件:
      // - 条件1: Docker 容器正在运行
      // - 条件2: 用户界面显示了 VNC 面板 (showVnc === true)
      let vncEnabled = false
      let vncPorts = undefined

      try {
        if (window.api.vnc?.status) {
          const vncStatus = await window.api.vnc.status()
          const containerRunning = vncStatus.running || false

          // 只有当容器运行 AND 界面显示 VNC 面板时，才启用 VNC 模式
          vncEnabled = containerRunning && showVnc
          vncPorts = vncStatus.ports

          console.log('🔍 VNC 状态检测:', {
            containerRunning,
            showVnc,
            vncEnabled: vncEnabled ? '✅ 启用' : '❌ 未启用',
            containerId: vncStatus.containerId,
            ports: vncPorts,
            原因: !containerRunning ? '容器未运行' : !showVnc ? 'VNC 面板已关闭' : 'VNC 已启用'
          })
        }
      } catch (err) {
        console.warn('⚠️ 无法获取 VNC 状态:', err)
      }

      // 2. 读取用户自定义 System Prompt
      const customInstructions = localStorage.getItem('customSystemPrompt') || ''

      // 3. 构建完整的 System Prompt
      const promptBuilder = new PromptBuilder({
        vncEnabled,
        currentDate: new Date().toLocaleDateString('zh-CN', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          weekday: 'long',
        }),
        workingDirectory: cwd || undefined,
        systemArchitecture: navigator.platform,
        vncPorts,
        customInstructions,
        sessionId,
      })

      // 4. 构建 System Prompt（不拼接用户消息）
      const systemPrompt = promptBuilder.build()

      // 5. (开发环境) 预览 System Prompt
      if (process.env.NODE_ENV === 'development') {
        console.group('📋 System Prompt 预览')
        const stats = promptBuilder.getStats()
        console.log('统计信息:', stats)
        console.log('VNC 状态:', vncEnabled ? '✅ 已启用' : '❌ 未启用')
        console.log('估算 Tokens:', stats.estimatedTokens)
        console.log('是否包含 VNC_DESKTOP:', systemPrompt.includes('<VNC_DESKTOP>') ? '✅ 是' : '❌ 否')
        console.log('完整 System Prompt:\n', systemPrompt)
        console.groupEnd()
      }

      // ========== 发送消息 ==========

      const options = {
        command,
        baseArgs,
        message: userMessage, // ← 只发送用户消息
        cwd,
        env,
        sessionId,
        systemPrompt // ← 单独传递 System Prompt
      }

      console.log("📤 Sending to IPC:", {
        ...options,
        systemPrompt: `[${systemPrompt.length} chars, ~${Math.ceil(systemPrompt.length / 4)} tokens]`
      })
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

  // 终止任务处理函数
  const handleStopTask = React.useCallback(async () => {
    if (!isStreamingActive || !streamingSessionId) {
      console.log('❌ No active streaming session to terminate')
      return
    }

    try {
      console.log('🛑 Stopping task for session:', streamingSessionId)
      
      // 检查API是否可用
      if (!window.api || !window.api.terminateSession) {
        addMessage("system", "终止功能不可用，请确保在 Electron 应用中运行")
        return
      }

      const result = await window.api.terminateSession(streamingSessionId)
      console.log('📋 Terminate result:', result)

      if (result.success) {
        // 成功终止的反馈会通过流式事件自动处理
        console.log('✅ Termination signal sent successfully')
      } else {
        addMessage("system", `停止任务失败: ${result.error}`)
        // 如果终止失败，重置流式状态
        setIsStreamingActive(false)
        setStreamingSessionId(null)
      }
    } catch (error) {
      console.error('💥 Failed to stop task:', error)
      addMessage("system", `停止任务时发生错误: ${error}`)
      // 发生错误时重置流式状态
      setIsStreamingActive(false)
      setStreamingSessionId(null)
    }
  }, [isStreamingActive, streamingSessionId, addMessage])

  // 处理语音识别结果
  useEffect(() => {
    console.log('📱 ChatPage - voiceState:', voiceState, 'transcript:', transcript);
    // 只在正在监听或处理中时更新输入框
    // 当状态变为 idle 时，不再更新输入框（此时会由自动发送逻辑处理）
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

      // 先重置语音识别状态（此时 voiceState 已经是 idle，不会触发输入框更新）
      resetTranscript()

      // 立即调用发送消息（handleSendMessage 内部会清空输入框）
      handleSendMessage()
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

  // 处理虚拟电脑开关切换（异步非阻塞）
  const handleToggleVnc = () => {
    const willShow = !showVnc

    // 立即切换显示状态，不等待后台操作
    setShowVnc(willShow)

    // 如果要关闭VNC面板，异步检查并停止容器（不阻塞UI）
    if (!willShow) {
      // 使用Promise立即返回，后台异步执行
      (async () => {
        try {
          if (window.api?.vnc?.status) {
            const vncStatus = await window.api.vnc.status()

            // 如果容器正在运行，异步停止它
            if (vncStatus.running && window.api?.vnc?.stop) {
              console.log('🛑 关闭虚拟电脑面板，后台停止VNC容器:', vncStatus.containerId)
              addMessage("system", "正在后台停止VNC桌面环境...")

              const result = await window.api.vnc.stop()

              if (result.success) {
                resetVncState()
                addMessage("system", "VNC桌面环境已停止")
              } else {
                addMessage("system", `VNC停止失败: ${result.error}`)
              }
            }
          }
        } catch (error) {
          console.error('⚠️ 停止VNC容器时出错:', error)
          addMessage("system", `停止VNC容器时出错: ${error}`)
        }
      })() // 立即执行异步函数
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
              onToggleVnc={handleToggleVnc}
              isStreamingActive={isStreamingActive}
              onStopTask={handleStopTask}
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
