import React, { useEffect, useRef, useState } from 'react'
import { Box, Typography, Alert, CircularProgress, Button } from '@mui/material'
import { Refresh } from '@mui/icons-material'

interface VncDisplayProps {
  url: string
  isConnected: boolean
  connectionError: string | null
}

export const VncDisplay: React.FC<VncDisplayProps> = ({
  url,
  isConnected,
  connectionError
}) => {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)

  useEffect(() => {
    setIsLoading(true)
    setHasError(false)
  }, [url])

  const handleIframeLoad = () => {
    setIsLoading(false)
    setHasError(false)
  }

  const handleIframeError = () => {
    setIsLoading(false)
    setHasError(true)
  }

  const handleRefresh = () => {
    if (iframeRef.current) {
      setIsLoading(true)
      setHasError(false)
      iframeRef.current.src = iframeRef.current.src
    }
  }

  const handleOpenInNewTab = () => {
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  return (
    <Box
      sx={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        position: 'relative'
      }}
    >
      {/* 连接错误提示 */}
      {connectionError && (
        <Alert 
          severity="warning" 
          sx={{ m: 1 }}
          action={
            <Button
              color="inherit"
              size="small"
              onClick={handleRefresh}
              startIcon={<Refresh />}
            >
              重试
            </Button>
          }
        >
          {connectionError}
        </Alert>
      )}

      {/* 加载中指示器 */}
      {isLoading && (
        <Box
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 2
          }}
        >
          <CircularProgress />
          <Typography variant="body2" color="text.secondary">
            正在加载VNC界面...
          </Typography>
        </Box>
      )}

      {/* 错误状态 */}
      {hasError && (
        <Box
          sx={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 2,
            p: 3
          }}
        >
          <Typography variant="h6" color="error">
            VNC连接失败
          </Typography>
          <Typography variant="body2" color="text.secondary" textAlign="center">
            无法加载VNC界面，请检查容器状态和网络连接
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="outlined"
              onClick={handleRefresh}
              startIcon={<Refresh />}
            >
              重新加载
            </Button>
            <Button
              variant="text"
              onClick={handleOpenInNewTab}
            >
              在新标签页打开
            </Button>
          </Box>
        </Box>
      )}

      {/* VNC iframe */}
      {url && (
        <iframe
          ref={iframeRef}
          src={url}
          style={{
            width: '100%',
            height: '100%',
            border: 'none',
            display: hasError ? 'none' : 'block'
          }}
          onLoad={handleIframeLoad}
          onError={handleIframeError}
          title="VNC Desktop"
          sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-pointer-lock"
        />
      )}

      {/* 连接状态指示器 */}
      {!isLoading && !hasError && isConnected && (
        <Box
          sx={{
            position: 'absolute',
            top: 8,
            right: 8,
            bgcolor: 'success.main',
            color: 'white',
            px: 1,
            py: 0.5,
            borderRadius: 1,
            fontSize: '0.75rem',
            zIndex: 2
          }}
        >
          已连接
        </Box>
      )}
    </Box>
  )
}