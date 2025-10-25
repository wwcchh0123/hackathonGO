import React, { useEffect, useState, useCallback, useRef } from "react"
import { ThemeProvider, createTheme } from "@mui/material/styles"
import { Box, CssBaseline } from "@mui/material"
import { AppHeader } from "./components/shared"
import { SettingsPage } from "./pages/settings"
import { ChatPage, Message } from "./pages/chat"
import { useSessionStorage } from "./hooks/useSessionStorage"
import { ServiceHealth } from "./types/api"

const theme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: "#CC785C",
    },
    background: {
      default: "#ffffff",
      paper: "#ffffff",
    },
    grey: {
      50: "#fafafa",
      100: "#f5f5f5",
      200: "#eeeeee",
      300: "#e0e0e0",
      500: "#9e9e9e",
      600: "#757575",
      700: "#616161",
    },
  },
  typography: {
    fontFamily:
      '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    h5: {
      fontWeight: 600,
    },
    h6: {
      fontWeight: 600,
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: "none",
          borderRadius: 8,
          fontWeight: 500,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 12,
        },
      },
    },
  },
})

export default function App() {
  const [command, setCommand] = useState("claude")
  const [cwd, setCwd] = useState("")
  const [envText, setEnvText] = useState("")
  const [inputText, setInputText] = useState("")
  const [messages, setMessages] = useState<Message[]>([])
  const [currentPage, setCurrentPage] = useState<"chat" | "settings">("chat")
  const [isLoading, setIsLoading] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  
  // 流式模式状态
  const [isStreaming, setIsStreaming] = useState(false)
  const [currentStreamContent, setCurrentStreamContent] = useState("")
  const streamIdRef = useRef<string | null>(null)
  const streamMessageIdRef = useRef<string | null>(null)

  // VNC相关状态
  const [vncState, setVncState] = useState({
    isActive: false,
    isLoading: false,
    url: '',
    error: '',
    containerId: ''
  })

  // VNC服务健康状态
  const [vncHealth, setVncHealth] = useState<ServiceHealth[]>([])

  const {
    sessions,
    activeSessionId,
    getActiveSession,
    createNewSession,
    updateSessionMessages,
    selectSession
  } = useSessionStorage()

  // 自定义VNC状态管理Hook
  const updateVncState = useCallback((updates: Partial<typeof vncState>) => {
    setVncState(prev => ({ ...prev, ...updates }))
  }, [])
  
  const resetVncState = useCallback(() => {
    setVncState({
      isActive: false,
      isLoading: false,
      url: '',
      error: '',
      containerId: ''
    })
    setVncHealth([])
  }, [])

  const addMessage = (
    type: "user" | "assistant" | "system",
    content: string
  ) => {
    const newMessage: Message = {
      id: Date.now().toString(),
      type,
      content,
      timestamp: new Date(),
    }
    setMessages((prev) => {
      const updated = [...prev, newMessage]
      // 如果有活动会话，更新会话消息
      if (activeSessionId) {
        updateSessionMessages(activeSessionId, updated)
      }
      return updated
    })
  }

  // 当活动会话改变时，加载会话消息
  useEffect(() => {
    const activeSession = getActiveSession()
    if (activeSession) {
      setMessages(activeSession.messages)
    } else {
      setMessages([])
    }
  }, [activeSessionId, getActiveSession])

  // 移除自动创建会话逻辑，避免覆盖已有历史

  // 监听流式事件
  useEffect(() => {
    if (!window.api) return
    
    const handleStreamStarted = (event: any, data: any) => {
      console.log('Stream started:', data)
      streamIdRef.current = data.streamId
    }
    
    const handleStreamData = (event: any, data: any) => {
      console.log('Stream data:', data)
      if (!streamIdRef.current || data.streamId === streamIdRef.current) {
        // 处理流式数据
        if (data.chunk?.type === 'delta' && data.chunk?.delta?.text) {
          // 累积内容
          setCurrentStreamContent(prev => {
            const newContent = prev + data.chunk.delta.text
            // 同时更新消息内容
            if (streamMessageIdRef.current) {
              setMessages(messages => messages.map(msg => 
                msg.id === streamMessageIdRef.current 
                  ? { ...msg, content: newContent }
                  : msg
              ))
            }
            return newContent
          })
        }
      }
    }
    
    const handleStreamEnd = (event: any, data: any) => {
      console.log('Stream ended:', data)
      if (!streamIdRef.current || data.streamId === streamIdRef.current) {
        setIsStreaming(false)
        streamIdRef.current = null
        streamMessageIdRef.current = null
        setCurrentStreamContent("")
      }
    }
    
    const handleStreamError = (event: any, data: any) => {
      console.log('Stream error:', data)
      if (!streamIdRef.current || data.streamId === streamIdRef.current) {
        addMessage("system", `Stream error: ${data.error?.message || 'Unknown error'}`)
        setIsStreaming(false)
        streamIdRef.current = null
        streamMessageIdRef.current = null
        setCurrentStreamContent("")
      }
    }
    
    // 添加监听器
    const unsubscribeStarted = window.api.onStreamStarted?.(handleStreamStarted)
    const unsubscribeData = window.api.onStreamData?.(handleStreamData)
    const unsubscribeEnd = window.api.onStreamEnd?.(handleStreamEnd)
    const unsubscribeError = window.api.onStreamError?.(handleStreamError)
    
    return () => {
      unsubscribeStarted?.()
      unsubscribeData?.()
      unsubscribeEnd?.()
      unsubscribeError?.()
    }
  }, [addMessage])

  // 监听容器状态变化
  useEffect(() => {
    if (!window.api?.vnc) return

    const unsubscribe = window.api.vnc.onContainerStopped(() => {
      console.log('VNC容器已停止')
      updateVncState({
        isActive: false,
        error: '容器意外停止'
      })
      setVncHealth([])
      addMessage("system", "VNC容器已停止")
    })
    
    return unsubscribe
  }, [updateVncState])

  // 定期检查VNC状态
  useEffect(() => {
    if (!vncState.isActive || !window.api?.vnc) return
    
    const checkStatus = async () => {
      try {
        const status = await window.api.vnc.status()
        if (!status.running) {
          updateVncState({
            isActive: false,
            error: '容器已停止'
          })
          setVncHealth([])
        } else if (status.health) {
          setVncHealth(status.health)
        }
      } catch (error) {
        console.error('检查VNC状态失败:', error)
      }
    }
    
    const interval = setInterval(checkStatus, 10000)
    return () => clearInterval(interval)
  }, [vncState.isActive, updateVncState])

  // restore persisted config
  useEffect(() => {
    try {
      const raw = localStorage.getItem("config")
      if (raw) {
        const cfg = JSON.parse(raw)
        setCommand(cfg.command || "claude")
        setCwd(cfg.cwd || "")
        setEnvText(cfg.envText || "")
      }
    } catch {}
  }, [])

  // persist config
  useEffect(() => {
    const cfg = { command, cwd, envText }
    localStorage.setItem("config", JSON.stringify(cfg))
  }, [command, cwd, envText])

  const handleSendMessage = async () => {
    if (!inputText.trim() || isLoading || isStreaming) return

    // 确保有活动会话
    let currentSessionId = activeSessionId
    if (!currentSessionId) {
      currentSessionId = createNewSession()
    }

    const userMessage = inputText.trim()
    console.log("🔵 Sending message:", userMessage)
    addMessage("user", userMessage)
    setInputText("")
    
    // 统一使用流式模式
    if (!window.api?.startStream) {
      console.log("❌ Stream API not available")
      addMessage(
        "system",
        "Stream API not available. Please run the desktop app via Electron: npm start (built) or npm run dev (dev)."
      )
      return
    }

    console.log("🚀 Using streaming mode")
    setIsStreaming(true)
    setCurrentStreamContent("")
    
    const env: Record<string, string> = {}
    envText.split(/\n/).forEach((line) => {
      // 跳过空行和注释行（以 # 开头）
      const trimmedLine = line.trim()
      if (!trimmedLine || trimmedLine.startsWith('#')) return
      
      const m = line.match(/^([^=]+)=(.*)$/)
      if (m) env[m[1].trim()] = m[2].trim()
    })

    const options = {
      command,
      message: userMessage,
      cwd,
      env
    }
    
    // 创建一个占位的助手消息
    const assistantMessageId = Date.now().toString() + '-assistant'
    streamMessageIdRef.current = assistantMessageId
    const assistantMessage: Message = {
      id: assistantMessageId,
      type: 'assistant',
      content: '',
      timestamp: new Date(),
    }
    setMessages(prev => [...prev, assistantMessage])
    
    window.api.startStream(options)
  }

  const handlePickCwd = async () => {
    if (!window.api || !window.api.selectDir) {
      addMessage(
        "system",
        "Electron API not available for directory selection. Start via Electron: npm start or npm run dev."
      )
      return
    }

    const dir = await window.api.selectDir()
    if (dir) setCwd(dir)
  }

  const handleToggleSidebar = () => {
    setSidebarOpen(!sidebarOpen)
  }

  if (currentPage === "settings") {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <SettingsPage
          command={command}
          setCommand={setCommand}
          cwd={cwd}
          setCwd={setCwd}
          envText={envText}
          setEnvText={setEnvText}
          onPickCwd={handlePickCwd}
          onBack={() => setCurrentPage("chat")}
        />
      </ThemeProvider>
    )
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box
        sx={{
          height: "100vh",
          display: "flex",
          flexDirection: "column",
          bgcolor: "#fafafa",
        }}
      >
        <AppHeader
          currentPage={currentPage}
          onNavigateToSettings={() => setCurrentPage("settings")}
          onToggleSidebar={handleToggleSidebar}
          sidebarOpen={sidebarOpen}
        />

        <ChatPage
          command={command}
          cwd={cwd}
          envText={envText}
          inputText={inputText}
          setInputText={setInputText}
          onSendMessage={handleSendMessage}
          isLoading={isLoading}
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          messages={messages}
          vncState={vncState}
          vncHealth={vncHealth}
          updateVncState={updateVncState}
          resetVncState={resetVncState}
          addMessage={addMessage}
          sessions={sessions}
          activeSessionId={activeSessionId}
          onNewSession={createNewSession}
          onSessionSelect={selectSession}
        />
      </Box>
    </ThemeProvider>
  )
}
