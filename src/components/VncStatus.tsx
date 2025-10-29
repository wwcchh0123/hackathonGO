import React from 'react'
import { 
  Box, 
  Typography, 
  Chip, 
  Grid,
  Divider,
  Tooltip
} from '@mui/material'
import {
  CheckCircle,
  Error,
  Warning,
  Info
} from '@mui/icons-material'
import { ServiceHealth } from '../types/api'

interface VncStatusProps {
  vncState: {
    isActive: boolean
    isLoading: boolean
    url: string
    error: string
    containerId: string
  }
  vncHealth: ServiceHealth[]
  isConnected: boolean
  connectionError: string | null
}

export const VncStatus: React.FC<VncStatusProps> = ({
  vncState,
  vncHealth,
  isConnected,
  connectionError
}) => {
  const getHealthIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle fontSize="small" color="success" />
      case 'unhealthy':
        return <Error fontSize="small" color="error" />
      default:
        return <Warning fontSize="small" color="warning" />
    }
  }

  const getHealthColor = (status: string): 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' => {
    switch (status) {
      case 'healthy':
        return 'success'
      case 'unhealthy':
        return 'error'
      default:
        return 'warning'
    }
  }

  if (!vncState.isActive) {
    return null
  }

  return (
    <Box
      sx={{
        borderTop: 'none',
        bgcolor: 'grey.50',
        p: 2
      }}
    >
      <Grid container spacing={2} alignItems="center">
        {/* 连接状态 */}
        <Grid item xs={12} sm={6} md={4}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Info fontSize="small" color="primary" />
            <Typography variant="body2" fontWeight={500}>
              连接状态:
            </Typography>
            <Chip
              label={isConnected ? '已连接' : (connectionError ? '连接失败' : '连接中')}
              color={isConnected ? 'success' : 'error'}
              size="small"
              variant="outlined"
            />
          </Box>
        </Grid>

        {/* 容器信息 */}
        {vncState.containerId && (
          <Grid item xs={12} sm={6} md={4}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body2" fontWeight={500}>
                容器:
              </Typography>
              <Tooltip title={`完整ID: ${vncState.containerId}`}>
                <Chip
                  label={vncState.containerId.slice(0, 12)}
                  size="small"
                  variant="outlined"
                  color="info"
                />
              </Tooltip>
            </Box>
          </Grid>
        )}

        {/* 服务健康状态 */}
        {vncHealth.length > 0 && (
          <Grid item xs={12}>
            <Divider sx={{ my: 1 }} />
            <Typography variant="body2" fontWeight={500} gutterBottom>
              服务状态:
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {vncHealth.map((service) => (
                <Tooltip
                  key={service.name}
                  title={`${service.name} (端口 ${service.port}): ${service.status}`}
                >
                  <Chip
                    icon={getHealthIcon(service.status)}
                    label={`${service.name}:${service.port}`}
                    color={getHealthColor(service.status)}
                    size="small"
                    variant="outlined"
                  />
                </Tooltip>
              ))}
            </Box>
          </Grid>
        )}

        {/* 错误信息 */}
        {vncState.error && (
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Error fontSize="small" color="error" />
              <Typography variant="body2" color="error">
                {vncState.error}
              </Typography>
            </Box>
          </Grid>
        )}

        {/* VNC URL */}
        {vncState.url && (
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
              <Typography variant="body2" fontWeight={500}>
                VNC地址:
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  fontFamily: 'monospace',
                  bgcolor: 'grey.100',
                  px: 1,
                  py: 0.5,
                  borderRadius: 0.5,
                  fontSize: '0.75rem',
                  wordBreak: 'break-all'
                }}
              >
                {vncState.url}
              </Typography>
            </Box>
          </Grid>
        )}
      </Grid>
    </Box>
  )
}
