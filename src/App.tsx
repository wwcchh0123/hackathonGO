import { useEffect, useState, useCallback, useRef } from "react"
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
    "--verbose",
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
    url: "",
    error: "",
    containerId: "",
  })

  // VNC服务健康状态
  const [vncHealth, setVncHealth] = useState<ServiceHealth[]>([])

  const {
    sessions,
    activeSessionId,
    getActiveSession,
    createNewSession,
    updateSessionMessages,
    selectSession,
    deleteSession,
  } = useSessionStorage()

  // 自定义VNC状态管理Hook
  const updateVncState = useCallback((updates: Partial<typeof vncState>) => {
    setVncState((prev) => ({ ...prev, ...updates }))
  }, [])

  const resetVncState = useCallback(() => {
    setVncState({
      isActive: false,
      isLoading: false,
      url: "",
      error: "",
      containerId: "",
    })
    setVncHealth([])
  }, [])

  const addMessage = useCallback(
    (type: "user" | "assistant" | "system", content: string) => {
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
    },
    [activeSessionId, updateSessionMessages]
  )

  // 用于流式更新的消息管理
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(
    null
  )
  // 记录每个会话的流式状态，用于避免重复渲染
  const sessionStreamStateRef = useRef(new Map<string, { sawResponse: boolean }>)
  // 维护流式请求ID到聊天会话ID的映射，确保消息保存到正确的会话
  const requestToChatSessionMap = useRef(new Map<string, string>())

  // 注册流式请求ID与聊天会话ID的映射
  const registerStreamRequest = useCallback(
    (requestSessionId: string, chatSessionId: string) => {
      requestToChatSessionMap.current.set(requestSessionId, chatSessionId)
      console.log(
        `📝 注册流式请求映射: ${requestSessionId} → ${chatSessionId}`
      )
    },
    []
  )

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
      console.log("VNC容器已停止")
      updateVncState({
        isActive: false,
        error: "容器意外停止",
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
            error: "容器已停止",
          })
          setVncHealth([])
        } else if (status.health) {
          setVncHealth(status.health)
        }
      } catch (error) {
        console.error("检查VNC状态失败:", error)
      }
    }

    const interval = setInterval(checkStatus, 10000)
    return () => clearInterval(interval)
  }, [vncState.isActive, updateVncState])

  // 监听Claude Code流式事件
  useEffect(() => {
    const api = window.api as any
    if (!api?.onClaudeStream) return

    const handleStreamEvent = (_event: any, message: any) => {
      console.log("🎯 收到流式事件:", message)
      const requestSessionId = message.sessionId
      const stateMap = sessionStreamStateRef.current
      const currentState = stateMap.get(requestSessionId) || {
        sawResponse: false,
      }

      // 从映射中获取正确的聊天会话ID
      const targetChatSessionId =
        requestToChatSessionMap.current.get(requestSessionId)

      if (!targetChatSessionId) {
        console.warn(
          `⚠️ 找不到流式请求 ${requestSessionId} 对应的聊天会话ID，跳过消息保存`
        )
        return
      }

      // 创建一个临时的 addMessage 函数，使用目标聊天会话ID
      const addMessageToTargetSession = (
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
          // 使用目标聊天会话ID而不是当前的 activeSessionId
          updateSessionMessages(targetChatSessionId, updated)
          return updated
        })
      }

      switch (message.type) {
        case "stream-start":
          break

        case "stream-data": {
          const stage = message.data?.stage
          const content = message.data?.content || ""
          const rawOutput = message.data?.rawOutput
          const metadata = message.data?.metadata || {}

          // 按事件阶段拆分为独立气泡
          if (stage === "response") {
            // 标记本会话已经收到过响应内容
            currentState.sawResponse = true
            sessionStreamStateRef.current.set(requestSessionId, currentState)
            addMessageToTargetSession("assistant", content)
          } else if (stage === "tool") {
            const toolName = metadata.toolName || "未知工具"
            console.log(`🔧 ${toolName} 工具已执行`)
          } else if (stage === "warning" || stage === "error") {
            const details = rawOutput ? `\n${rawOutput}` : ""
            addMessageToTargetSession("assistant", `${content}${details}`)
          } else if (stage === "raw") {
            // 原始输出只在 StreamingOutput 面板显示，避免与 response 重复
            // 在聊天气泡中忽略 raw 阶段
          } else {
            addMessageToTargetSession("assistant", content)
          }
          break
        }

        case "stream-end":
          if (message.data?.terminated) {
            // 用户主动终止的情况
            addMessage("assistant", message.data.content || "✅ 任务已停止")
          } else if (message.data?.success && message.data.result) {
            // 如果该会话已收到过 response，则忽略最终 result，避免重复
            if (!currentState.sawResponse) {
              addMessageToTargetSession("assistant", message.data.result)
            }
          } else if (message.data?.error) {
            addMessageToTargetSession(
              "assistant",
              `❌ 执行失败: ${message.data.error}`
            )
          }
          setStreamingMessageId(null)
          // 清理会话状态和映射
          sessionStreamStateRef.current.delete(requestSessionId)
          requestToChatSessionMap.current.delete(requestSessionId)
          console.log(`🧹 清理流式请求映射: ${requestSessionId}`)
          break

        case "stream-error":
          addMessageToTargetSession(
            "assistant",
            `❌ 执行错误: ${message.data?.content || "未知错误"}`
          )
          setStreamingMessageId(null)
          // 清理会话状态和映射
          sessionStreamStateRef.current.delete(requestSessionId)
          requestToChatSessionMap.current.delete(requestSessionId)
          console.log(`🧹 清理流式请求映射: ${requestSessionId}`)
          break
      }
    }

    const unsubscribe = api.onClaudeStream(handleStreamEvent)
    return unsubscribe
  }, [streamingMessageId, updateSessionMessages])

  // restore persisted config
  useEffect(() => {
    try {
      const raw = localStorage.getItem("config")
      if (raw) {
        const cfg = JSON.parse(raw)
        setCommand(cfg.command || "claude")
        // 确保包含stream-json格式参数
        const savedArgs = cfg.baseArgs || []
        if (
          !savedArgs.includes("--output-format") ||
          !savedArgs.includes("stream-json")
        ) {
          setBaseArgs([
            "--output-format",
            "stream-json",
            "-p",
            "--dangerously-skip-permissions",
            "--verbose",
          ])
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
          onDeleteSession={deleteSession}
          registerStreamRequest={registerStreamRequest}
        />
      </Box>
    </ThemeProvider>
  )
}
