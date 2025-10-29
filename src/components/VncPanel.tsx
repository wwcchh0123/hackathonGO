import React, { useState, useEffect } from 'react'
import { Box, Paper, Typography } from '@mui/material'
import { VncToolbar } from './VncToolbar'
import { VncDisplay } from './VncDisplay'
import { VncStatus } from './VncStatus'
import { ServiceHealth } from '../types/api'

interface VncPanelProps {
  vncState: {
    isActive: boolean
    isLoading: boolean
    url: string
    error: string
    containerId: string
  }
  vncHealth: ServiceHealth[]
  updateVncState: (updates: Partial<VncPanelProps['vncState']>) => void
  resetVncState: () => void
  addMessage: (type: "user" | "assistant" | "system", content: string) => void
}

export const VncPanel: React.FC<VncPanelProps> = ({
  vncState,
  vncHealth,
  updateVncState,
  resetVncState,
  addMessage
}) => {
  const [isConnected, setIsConnected] = useState(false)
  const [connectionError, setConnectionError] = useState<string | null>(null)

  // 监听VNC连接状态变化
  useEffect(() => {
    if (vncState.isActive && vncState.url) {
      // 当VNC激活时检查连接状态
      checkVncConnection()
    } else {
      setIsConnected(false)
      setConnectionError(null)
    }
  }, [vncState.isActive, vncState.url])

  const checkVncConnection = async () => {
    try {
      const response = await fetch('http://localhost:6080/vnc.html')
      if (response.ok) {
        setIsConnected(true)
        setConnectionError(null)
      } else {
        setIsConnected(false)
        setConnectionError(`连接失败: HTTP ${response.status}`)
      }
    } catch (error) {
      setIsConnected(false)
      setConnectionError(`连接错误: ${error}`)
    }
  }

  const handleStartVnc = async () => {
    if (!window.api?.vnc) {
      addMessage("system", "VNC API不可用，请确保在Electron环境中运行")
      return
    }

    updateVncState({ isLoading: true, error: '' })
    addMessage("system", "正在启动VNC桌面环境...")

    try {
      const result = await window.api.vnc.start()
      
      if (result.success) {
        updateVncState({
          isActive: true,
          isLoading: false,
          url: result.vncUrl || '',
          containerId: result.containerId || ''
        })
        addMessage("system", "VNC桌面环境启动成功")
      } else {
        updateVncState({
          isLoading: false,
          error: result.error || '启动失败'
        })
        addMessage("system", `VNC启动失败: ${result.error}`)
      }
    } catch (error) {
      updateVncState({
        isLoading: false,
        error: String(error)
      })
      addMessage("system", `VNC启动异常: ${error}`)
    }
  }

  const handleStopVnc = async () => {
    if (!window.api?.vnc) {
      addMessage("system", "VNC API不可用")
      return
    }

    addMessage("system", "正在停止VNC桌面环境...")

    try {
      const result = await window.api.vnc.stop()
      
      if (result.success) {
        resetVncState()
        setIsConnected(false)
        setConnectionError(null)
        addMessage("system", "VNC桌面环境已停止")
      } else {
        addMessage("system", `VNC停止失败: ${result.error}`)
      }
    } catch (error) {
      addMessage("system", `VNC停止异常: ${error}`)
    }
  }

  const handleRefreshVnc = () => {
    if (vncState.isActive) {
      checkVncConnection()
      addMessage("system", "正在刷新VNC连接...")
    }
  }

  return (
    <Paper
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        borderRadius: 2,
        border: 'none',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
      }}
    >
      {/* VNC工具栏 */}
      <VncToolbar
        vncState={vncState}
        isConnected={isConnected}
        onStart={handleStartVnc}
        onStop={handleStopVnc}
        onRefresh={handleRefreshVnc}
      />

      {/* VNC显示区域 */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {vncState.isActive && vncState.url ? (
          <VncDisplay
            url={vncState.url}
            isConnected={isConnected}
            connectionError={connectionError}
          />
        ) : (
          <Box
            sx={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: 'grey.100',
              flexDirection: 'column',
              gap: 2
            }}
          >
            <Typography variant="h6" color="text.secondary">
              VNC桌面环境
            </Typography>
            <Typography variant="body2" color="text.secondary" textAlign="center">
              点击"启动VNC"按钮开始使用虚拟桌面环境
            </Typography>
            {vncState.error && (
              <Typography variant="body2" color="error" textAlign="center">
                错误: {vncState.error}
              </Typography>
            )}
          </Box>
        )}
      </Box>

      {/* VNC状态栏 */}
      <VncStatus
        vncState={vncState}
        vncHealth={vncHealth}
        isConnected={isConnected}
        connectionError={connectionError}
      />
    </Paper>
  )
}
