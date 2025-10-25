import React, { useEffect, useState, useCallback } from "react"
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
  const [baseArgs, setBaseArgs] = useState([
    "--output-format",
    "stream-json",
    "-p",
    "--dangerously-skip-permissions",
    "--verbose"
  ])
  const [cwd, setCwd] = useState("")
  const [envText, setEnvText] = useState("")
  const [inputText, setInputText] = useState("")
  const [messages, setMessages] = useState<Message[]>([])
  const [currentPage, setCurrentPage] = useState<"chat" | "settings">("chat")
  const [isLoading, setIsLoading] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)

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

  // 用于流式更新的消息管理
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null)

  const updateStreamingMessage = (content: string, replace: boolean = false) => {
    if (!streamingMessageId) return
    
    setMessages((prev) => {
      const updated = prev.map(msg => 
        msg.id === streamingMessageId 
          ? { ...msg, content: replace ? content : msg.content + "\n" + content }
          : msg
      )
      // 如果有活动会话，更新会话消息
      if (activeSessionId) {
        updateSessionMessages(activeSessionId, updated)
      }
      return updated
    })
  }

  const startStreamingMessage = () => {
    const messageId = Date.now().toString()
    const newMessage: Message = {
      id: messageId,
      type: "assistant",
      content: "",
      timestamp: new Date(),
    }
    setStreamingMessageId(messageId)
    setMessages((prev) => {
      const updated = [...prev, newMessage]
      if (activeSessionId) {
        updateSessionMessages(activeSessionId, updated)
      }
      return updated
    })
    return messageId
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

  // 监听Claude Code流式事件
  useEffect(() => {
    if (!window.api?.onClaudeStream) return

    const handleStreamEvent = (event: any, message: any) => {
      console.log('🎯 收到流式事件:', message)

      switch (message.type) {
        case 'stream-start':
          startStreamingMessage()
          break
          
        case 'stream-data':
          if (message.data?.content) {
            updateStreamingMessage(message.data.content)
          }
          break
          
        case 'stream-end':
          if (message.data?.success && message.data.result) {
            updateStreamingMessage(`\n\n${message.data.result}`) // 追加最终结果
          } else if (message.data?.error) {
            updateStreamingMessage(`\n\n❌ 执行失败: ${message.data.error}`)
          }
          setStreamingMessageId(null)
          break
          
        case 'stream-error':
          updateStreamingMessage(`❌ 执行错误: ${message.data?.content || '未知错误'}`, true)
          setStreamingMessageId(null)
          break
      }
    }

    const unsubscribe = window.api.onClaudeStream(handleStreamEvent)
    return unsubscribe
  }, [streamingMessageId])

  // restore persisted config
  useEffect(() => {
    try {
      const raw = localStorage.getItem("config")
      if (raw) {
        const cfg = JSON.parse(raw)
        setCommand(cfg.command || "claude")
        // 确保包含stream-json格式参数
        const savedArgs = cfg.baseArgs || []
        if (!savedArgs.includes("--output-format") || !savedArgs.includes("stream-json")) {
          setBaseArgs(["--output-format", "stream-json", "-p", "--dangerously-skip-permissions", "--verbose"])
        } else {
          setBaseArgs(savedArgs)
        }
        setCwd(cfg.cwd || "")
        setEnvText(cfg.envText || "")
      }
    } catch {}
  }, [])

  // persist config
  useEffect(() => {
    const cfg = { command, baseArgs, cwd, envText }
    localStorage.setItem("config", JSON.stringify(cfg))
  }, [command, baseArgs, cwd, envText])

  const handleSendMessage = async (streamingSessionId?: string) => {
    if (!inputText.trim() || isLoading) return

    // 确保有活动会话
    let currentSessionId = activeSessionId
    if (!currentSessionId) {
      currentSessionId = createNewSession()
    }

    const userMessage = inputText.trim()
    console.log("🔵 Sending message:", userMessage)
    setIsLoading(true)

    try {
      // 检查API是否可用（在浏览器打开时不可用）
      console.log(
        "🔍 Checking window.api:",
        !!window.api,
        !!window.api?.sendMessage
      )
      if (!window.api || !window.api.sendMessage) {
        console.log("❌ window.api not available")
        addMessage(
          "system",
          "Electron API not available. Please run the desktop app via Electron: npm start (built) or npm run dev (dev)."
        )
        setIsLoading(false)
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
        sessionId: streamingSessionId // 传递流式会话ID
      }

      console.log("📤 Sending to IPC:", options)
      const result = await window.api.sendMessage(options)
      console.log("📥 Received from IPC:", result)

      // 不再自动添加结果到聊天消息，因为结果会通过流式事件处理
      // 只处理非JSON格式输出的兼容性情况
      if (!baseArgs.includes("--output-format") || !baseArgs.includes("stream-json")) {
        if (result.success && result.stdout) {
          addMessage("assistant", result.stdout)
        } else if (result.stderr) {
          addMessage("system", `Error: ${result.stderr}`)
        } else if (result.error) {
          addMessage("system", `Error: ${result.error}`)
        } else {
          addMessage("system", "No response from Claude Code CLI")
        }
      }
    } catch (error) {
      console.log("💥 Frontend error:", error)
      addMessage("system", `Failed to send message: ${error}`)
    }

    setIsLoading(false)
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
          baseArgs={baseArgs}
          setBaseArgs={setBaseArgs}
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
          baseArgs={baseArgs}
          cwd={cwd}
          envText={envText}
          inputText={inputText}
          setInputText={setInputText}
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
