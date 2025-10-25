import React, { useEffect, useMemo, useRef, useState } from "react"
import { ThemeProvider, createTheme } from "@mui/material/styles"
import { Box, Container, CssBaseline, Paper, Typography } from "@mui/material"
import { AppHeader } from "./components/AppHeader"
import { SettingsPanel } from "./components/SettingsPanel"
import { ChatMessages } from "./components/ChatMessages"
import { ChatInput } from "./components/ChatInput"
import { Message } from "./components/MessageBubble"

// API types
declare global {
  interface Window {
    api: {
      runCli: (options: {
        command: string
        args?: string[]
        cwd?: string
        env?: Record<string, string>
      }) => Promise<void>
      stopCli: () => Promise<void>
      sendCliInput: (line: string) => Promise<void>
      onCliEvent: (
        cb: (payload: { type: string; data: string }) => void
      ) => () => void
      selectDir: () => Promise<string | null>
    }
  }
}


const theme = createTheme({
  palette: {
    mode: "dark",
    primary: {
      main: "#2196f3",
    },
    background: {
      default: "#0a0a0a",
      paper: "#1a1a1a",
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
  },
})

export default function App() {
  const hasApi = typeof window !== "undefined" && !!(window as any).api
  const [command, setCommand] = useState("claude-code")
  const [argsText, setArgsText] = useState("--interactive")
  const [cwd, setCwd] = useState("")
  const [running, setRunning] = useState(false)
  const [envText, setEnvText] = useState("")
  const [inputText, setInputText] = useState("")
  const [messages, setMessages] = useState<Message[]>([])
  const [showSettings, setShowSettings] = useState(false)

  const args = useMemo(
    () => (argsText.trim() ? argsText.split(/\s+/) : []),
    [argsText]
  )
  const detachRef = useRef<null | (() => void)>(null)
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

  useEffect(() => {
    console.log('API检查:', { hasApi, windowApi: !!(window as any).api });
    if (!hasApi) return
    detachRef.current = window.api.onCliEvent((payload) => {
      addMessage("assistant", payload.data)
      if (payload.type === "start") setRunning(true)
      if (payload.type === "exit" || payload.type === "error") setRunning(false)
    })
    return () => {
      detachRef.current?.()
    }
  }, [hasApi])

  // restore persisted config
  useEffect(() => {
    try {
      const raw = localStorage.getItem("config")
      if (raw) {
        const cfg = JSON.parse(raw)
        setCommand(cfg.command || "")
        setArgsText(cfg.argsText || "")
        setCwd(cfg.cwd || "")
        setEnvText(cfg.envText || "")
      }
    } catch {}
  }, [])

  // persist config
  useEffect(() => {
    const cfg = { command, argsText, cwd, envText }
    localStorage.setItem("config", JSON.stringify(cfg))
  }, [command, argsText, cwd, envText])

  const handleRun = async () => {
    if (!running) {
      const env: Record<string, string> = {}
      envText.split(/\n/).forEach((line) => {
        const m = line.match(/^([^=]+)=(.*)$/)
        if (m) env[m[1].trim()] = m[2].trim()
      })
      addMessage("system", `Starting: ${command} ${args.join(" ")}`)
      if (hasApi) {
        try {
          await window.api.runCli({ command, args, cwd, env })
        } catch (error) {
          addMessage("system", `Error starting CLI: ${error}`)
        }
      } else {
        addMessage(
          "system",
          "Electron API unavailable. Launch the desktop app to run CLI."
        )
      }
    }
  }

  const handleStop = async () => {
    if (hasApi && running) {
      await window.api.stopCli()
      addMessage("system", "Claude Code stopped")
    }
  }

  const handleSendMessage = async () => {
    if (!inputText.trim()) return

    addMessage("user", inputText)

    if (running && hasApi) {
      await window.api.sendCliInput(inputText)
    } else if (!running) {
      addMessage(
        "system",
        "Claude Code is not running. Click the play button to start."
      )
    }

    setInputText("")
  }

  const handlePickCwd = async () => {
    const dir = await window.api.selectDir()
    if (dir) setCwd(dir)
  }


  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ height: "100vh", display: "flex", flexDirection: "column" }}>
        <AppHeader
          running={running}
          showSettings={showSettings}
          onToggleSettings={() => setShowSettings(!showSettings)}
          onRunStop={running ? handleStop : handleRun}
          hasCommand={!!command}
        />

        <Container
          maxWidth="md"
          sx={{ flex: 1, display: "flex", flexDirection: "column", py: 2 }}
        >
          {!hasApi && (
            <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
              <Typography color="warning.main">
                Running in web mode (no Electron). Use the desktop app for CLI control.
              </Typography>
            </Paper>
          )}

          {showSettings && (
            <SettingsPanel
              command={command}
              setCommand={setCommand}
              argsText={argsText}
              setArgsText={setArgsText}
              cwd={cwd}
              setCwd={setCwd}
              envText={envText}
              setEnvText={setEnvText}
              onPickCwd={handlePickCwd}
            />
          )}

          <Box
            sx={{
              flex: 1,
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <ChatMessages
              messages={messages}
              running={running}
              messagesEndRef={messagesEndRef}
            />
            
            <ChatInput
              inputText={inputText}
              setInputText={setInputText}
              onSendMessage={handleSendMessage}
              running={running}
            />
          </Box>
        </Container>
      </Box>
    </ThemeProvider>
  )
}
