import React, { useEffect, useMemo, useRef, useState } from "react"
import { ThemeProvider, createTheme } from "@mui/material/styles"
import { Box, Container, CssBaseline } from "@mui/material"
import { AppHeader } from "./components/AppHeader"
import { SettingsPage } from "./components/SettingsPage"
import { ChatMessages } from "./components/ChatMessages"
import { ChatInput } from "./components/ChatInput"
import { Message } from "./components/MessageBubble"

// API types
declare global {
  interface Window {
    api: {
      sendMessage: (options: {
        command: string
        baseArgs?: string[]
        message: string
        cwd?: string
        env?: Record<string, string>
      }) => Promise<{
        success: boolean
        stdout?: string
        stderr?: string
        error?: string
        exitCode?: number
      }>
      selectDir: () => Promise<string | null>
    }
  }
}


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
      50: '#fafafa',
      100: '#f5f5f5',
      200: '#eeeeee',
      300: '#e0e0e0',
      500: '#9e9e9e',
      600: '#757575',
      700: '#616161',
    }
  },
  typography: {
    fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
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
          textTransform: 'none',
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
  const [baseArgs, setBaseArgs] = useState(["-p", "--dangerously-skip-permissions"])
  const [cwd, setCwd] = useState("")
  const [envText, setEnvText] = useState("")
  const [inputText, setInputText] = useState("")
  const [messages, setMessages] = useState<Message[]>([])
  const [currentPage, setCurrentPage] = useState<'chat' | 'settings'>('chat')
  const [isLoading, setIsLoading] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)

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
    setMessages((prev) => [...prev, newMessage])
  }

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // restore persisted config
  useEffect(() => {
    try {
      const raw = localStorage.getItem("config")
      if (raw) {
        const cfg = JSON.parse(raw)
        setCommand(cfg.command || "claude")
        setBaseArgs(cfg.baseArgs || ["-p", "--dangerously-skip-permissions"])
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

  const handleSendMessage = async () => {
    if (!inputText.trim() || isLoading) return
    
    const userMessage = inputText.trim()
    console.log("🔵 Sending message:", userMessage)
    addMessage("user", userMessage)
    setInputText("")
    setIsLoading(true)
    
    try {
      // 检查API是否可用（在浏览器打开时不可用）
      console.log("🔍 Checking window.api:", !!window.api, !!window.api?.sendMessage)
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
        env
      }
      
      console.log("📤 Sending to IPC:", options)
      const result = await window.api.sendMessage(options)
      console.log("📥 Received from IPC:", result)

      if (result.success && result.stdout) {
        addMessage("assistant", result.stdout)
      } else if (result.stderr) {
        addMessage("system", `Error: ${result.stderr}`)
      } else if (result.error) {
        addMessage("system", `Error: ${result.error}`)
      } else {
        addMessage("system", "No response from Claude Code CLI")
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


  if (currentPage === 'settings') {
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
          onBack={() => setCurrentPage('chat')}
        />
      </ThemeProvider>
    )
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ height: "100vh", display: "flex", flexDirection: "column", bgcolor: '#fafafa' }}>
        <AppHeader
          currentPage={currentPage}
          onNavigateToSettings={() => setCurrentPage('settings')}
        />

        <Container
          maxWidth="md"
          sx={{ flex: 1, display: "flex", flexDirection: "column", py: 3 }}
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
              isLoading={isLoading}
            />
          </Box>
        </Container>
      </Box>
    </ThemeProvider>
  )
}
