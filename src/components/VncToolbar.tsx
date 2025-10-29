import React from 'react'
import { 
  Box, 
  Toolbar, 
  Button, 
  Typography, 
  Chip,
  IconButton,
  CircularProgress,
  Tooltip
} from '@mui/material'
import {
  PlayArrow,
  Stop,
  Refresh,
  Computer,
  CheckCircle,
  Error,
  HourglassEmpty
} from '@mui/icons-material'

interface VncToolbarProps {
  vncState: {
    isActive: boolean
    isLoading: boolean
    url: string
    error: string
    containerId: string
  }
  isConnected: boolean
  onStart: () => void
  onStop: () => void
  onRefresh: () => void
}

export const VncToolbar: React.FC<VncToolbarProps> = ({
  vncState,
  isConnected,
  onStart,
  onStop,
  onRefresh
}) => {
  const getStatusIcon = () => {
    if (vncState.isLoading) {
      return <HourglassEmpty color="info" />
    }
    if (vncState.error) {
      return <Error color="error" />
    }
    if (vncState.isActive && isConnected) {
      return <CheckCircle color="success" />
    }
    if (vncState.isActive && !isConnected) {
      return <Error color="warning" />
    }
    return <Computer color="disabled" />
  }

  const getStatusText = () => {
    if (vncState.isLoading) {
      return "启动中..."
    }
    if (vncState.error) {
      return "错误"
    }
    if (vncState.isActive && isConnected) {
      return "已连接"
    }
    if (vncState.isActive && !isConnected) {
      return "连接中断"
    }
    return "未启动"
  }

  const getStatusColor = (): 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' => {
    if (vncState.isLoading) {
      return "info"
    }
    if (vncState.error) {
      return "error"
    }
    if (vncState.isActive && isConnected) {
      return "success"
    }
    if (vncState.isActive && !isConnected) {
      return "warning"
    }
    return "default"
  }

  return (
    <Toolbar
      variant="dense"
      sx={{
      borderBottom: 'none',
        bgcolor: 'grey.50',
        gap: 2,
        justifyContent: 'space-between',
        minHeight: '56px !important',
        px: 2
      }}
    >
      {/* 左侧：标题和状态 */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {getStatusIcon()}
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            虚拟桌面
          </Typography>
        </Box>

        <Chip
          label={getStatusText()}
          color={getStatusColor()}
          size="small"
          variant="outlined"
        />

        {vncState.containerId && (
          <Tooltip title={`容器ID: ${vncState.containerId}`}>
            <Chip
              label={`ID: ${vncState.containerId.slice(0, 8)}`}
              size="small"
              variant="outlined"
              color="info"
            />
          </Tooltip>
        )}
      </Box>

      {/* 右侧：操作按钮 */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        {!vncState.isActive ? (
          <Button
            variant="contained"
            color="primary"
            startIcon={vncState.isLoading ? <CircularProgress size={16} /> : <PlayArrow />}
            onClick={onStart}
            disabled={vncState.isLoading}
            size="small"
          >
            {vncState.isLoading ? '启动中' : '启动VNC'}
          </Button>
        ) : (
          <>
            <IconButton
              color="primary"
              onClick={onRefresh}
              disabled={vncState.isLoading}
              size="small"
              title="刷新连接"
            >
              <Refresh />
            </IconButton>
            
            <Button
              variant="outlined"
              color="error"
              startIcon={<Stop />}
              onClick={onStop}
              disabled={vncState.isLoading}
              size="small"
            >
              停止VNC
            </Button>
          </>
        )}
      </Box>
    </Toolbar>
  )
}
