import React, { useState, useEffect, useRef } from 'react'
import { 
  Box, 
  Typography, 
  LinearProgress, 
  Chip, 
  Paper,
  Collapse,
  IconButton,
  Badge
} from '@mui/material'
import {
  ExpandMore,
  ExpandLess,
  PlayArrow,
  CheckCircle,
  Error,
  Warning,
  Psychology
} from '@mui/icons-material'

interface StreamingMessage {
  type: 'stream-start' | 'stream-data' | 'stream-end' | 'stream-error'
  sessionId: string
  timestamp: string
  data?: {
    stage?: string
    content?: string
    rawOutput?: string
    exitCode?: number
    success?: boolean
    command?: string
    error?: string
    metadata?: any
  }
}

interface StreamingOutputProps {
  sessionId: string
  isActive: boolean
}

interface LogEntry {
  content: string
  timestamp: Date
  stage?: string
  rawOutput?: string
  isError?: boolean
  metadata?: any
}

export const StreamingOutput: React.FC<StreamingOutputProps> = ({
  sessionId,
  isActive
}) => {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [currentStage, setCurrentStage] = useState('')
  const [progress, setProgress] = useState(0)
  const [isExpanded, setIsExpanded] = useState(true)
  const [isCompleted, setIsCompleted] = useState(false)
  const [hasError, setHasError] = useState(false)
  const [command, setCommand] = useState('')
  
  const logsEndRef = useRef<HTMLDivElement>(null)

  // 滚动到底部
  useEffect(() => {
    if (isExpanded) {
      logsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [logs, isExpanded])

  // 监听流式事件
  useEffect(() => {
    if (!isActive || !window.api?.onClaudeStream) return

    const handleStream = (event: any, message: StreamingMessage) => {
      if (message.sessionId !== sessionId) return

      console.log('📥 收到流式更新:', message)

      switch (message.type) {
        case 'stream-start':
          setLogs([])
          setProgress(0)
          setCurrentStage('初始化')
          setIsCompleted(false)
          setHasError(false)
          if (message.data?.command) {
            setCommand(message.data.command)
          }
          break

        case 'stream-data':
          if (message.data?.content) {
            const newLog: LogEntry = {
              content: message.data.content,
              timestamp: new Date(message.timestamp),
              stage: message.data.stage,
              rawOutput: message.data.rawOutput,
              isError: message.data.metadata?.isError,
              metadata: message.data.metadata
            }
            
            setLogs(prev => [...prev, newLog])
            
            // 更新当前阶段
            if (message.data.stage) {
              setCurrentStage(getStageLabel(message.data.stage))
              setProgress(getStageProgress(message.data.stage))
            }
            
            // 检查错误状态
            if (message.data.stage === 'error' || message.data.metadata?.isError) {
              setHasError(true)
            }
          }
          break

        case 'stream-end':
          setIsCompleted(true)
          setProgress(100)
          if (message.data?.success) {
            setCurrentStage('完成')
          } else {
            setCurrentStage('失败')
            setHasError(true)
          }
          break

        case 'stream-error':
          setHasError(true)
          setIsCompleted(true)
          setCurrentStage('错误')
          if (message.data?.content) {
            const errorLog: LogEntry = {
              content: message.data.content,
              timestamp: new Date(message.timestamp),
              stage: 'error',
              isError: true
            }
            setLogs(prev => [...prev, errorLog])
          }
          break
      }
    }

    const unsubscribe = window.api.onClaudeStream(handleStream)
    return unsubscribe
  }, [sessionId, isActive])

  // 获取阶段显示名称
  const getStageLabel = (stage?: string): string => {
    const labels: Record<string, string> = {
      'init': '初始化',
      'spawn': '启动进程',
      'ready': '准备就绪',
      'response': 'Claude回复',
      'tool': '工具调用',
      'tool-result': '工具执行',
      'raw': '原始输出',
      'system': '系统消息',
      'info': '信息',
      'success': '成功',
      'completed': '完成',
      'failed': '失败',
      'error': '错误',
      'warning': '警告',
      'timeout': '超时'
    }
    return labels[stage || ''] || '处理中'
  }

  // 获取阶段进度
  const getStageProgress = (stage?: string): number => {
    const progressMap: Record<string, number> = {
      'init': 15,
      'spawn': 25,
      'ready': 35,
      'response': 60,
      'tool': 70,
      'tool-result': 85,
      'raw': 45,
      'system': 50,
      'success': 100,
      'completed': 100,
      'error': 100,
      'failed': 100
    }
    return progressMap[stage || ''] || progress
  }

  // 获取状态图标
  const getStatusIcon = () => {
    if (hasError) return <Error color="error" />
    if (isCompleted) return <CheckCircle color="success" />
    return <PlayArrow color="primary" />
  }

  // 获取状态颜色
  const getStatusColor = (): 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' => {
    if (hasError) return 'error'
    if (isCompleted) return 'success'
    return 'primary'
  }

  // 获取日志项颜色
  const getLogColor = (log: LogEntry): string => {
    if (log.isError || log.stage === 'error') return '#f44336'
    if (log.stage === 'warning') return '#ff9800'
    if (log.stage === 'success' || log.stage === 'completed') return '#4caf50'
    if (log.stage === 'response') return '#2196f3'
    if (log.stage === 'tool') return '#9c27b0'
    if (log.stage === 'tool-result') return '#4caf50'
    if (log.stage === 'init') return '#00bcd4'
    if (log.stage === 'ready' || log.stage === 'spawn') return '#8bc34a'
    if (log.stage === 'raw') return '#9e9e9e'
    if (log.stage === 'system') return '#ffc107'
    return '#ffffff'
  }

  // 获取气泡样式
  const getBubbleStyle = (log: LogEntry) => {
    const isUserSide = log.stage === 'init' || log.stage === 'system'
    const baseColor = getLogColor(log)

    return {
      alignSelf: isUserSide ? 'flex-end' : 'flex-start',
      maxWidth: '85%',
      bgcolor: isUserSide ? 'rgba(33, 150, 243, 0.08)' : 'white',
      borderRadius: 2,
      p: 2,
      mb: 1.5,
      border: '1px solid',
      borderColor: `${baseColor}60`,
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
      transition: 'all 0.2s ease',
      '&:hover': {
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.12)',
        transform: 'translateY(-1px)',
        borderColor: baseColor
      }
    }
  }

  // 获取气泡头部样式
  const getBubbleHeaderIcon = (log: LogEntry) => {
    if (log.isError || log.stage === 'error') return '❌'
    if (log.stage === 'warning') return '⚠️'
    if (log.stage === 'success' || log.stage === 'completed') return '✅'
    if (log.stage === 'response') return '💬'
    if (log.stage === 'tool') return '🔧'
    if (log.stage === 'tool-result') return '📋'
    if (log.stage === 'init') return '🚀'
    if (log.stage === 'ready' || log.stage === 'spawn') return '⚡'
    if (log.stage === 'raw') return '💭'
    if (log.stage === 'system') return '⚙️'
    return '📍'
  }

  if (!isActive) return null

  return (
    <Paper
      variant="outlined"
      sx={{
        mb: 2,
        overflow: 'hidden',
        border: '1px solid',
        borderColor: hasError ? 'error.main' : isCompleted ? 'success.main' : 'primary.main'
      }}
    >
      {/* 头部状态栏 */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          p: 2,
          bgcolor: hasError ? 'error.light' : isCompleted ? 'success.light' : 'primary.light',
          color: hasError ? 'error.contrastText' : isCompleted ? 'success.contrastText' : 'primary.contrastText',
          cursor: 'pointer'
        }}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {getStatusIcon()}
        
        <Typography variant="subtitle2" fontWeight={600} sx={{ flex: 1 }}>
          🤖 Claude Code 执行状态
        </Typography>

        <Chip
          label={currentStage}
          size="small"
          color={getStatusColor()}
          variant="filled"
        />

        <Badge badgeContent={logs.length} color="secondary" max={99}>
          <IconButton size="small" sx={{ color: 'inherit' }}>
            {isExpanded ? <ExpandLess /> : <ExpandMore />}
          </IconButton>
        </Badge>
      </Box>

      {/* 进度条 */}
      <LinearProgress
        variant="determinate"
        value={progress}
        sx={{
          height: 4,
          backgroundColor: 'grey.200',
          '& .MuiLinearProgress-bar': {
            backgroundColor: hasError ? 'error.main' : isCompleted ? 'success.main' : 'primary.main'
          }
        }}
      />

      {/* 可折叠的日志区域 */}
      <Collapse in={isExpanded}>
        <Box sx={{ bgcolor: 'grey.50', minHeight: '200px' }}>
          {/* 命令信息 */}
          {command && (
            <Box sx={{ px: 2, pt: 2, pb: 1 }}>
              <Typography variant="caption" color="text.secondary" gutterBottom>
                执行命令:
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  fontFamily: 'monospace',
                  bgcolor: 'white',
                  p: 1.5,
                  borderRadius: 1,
                  fontSize: '0.75rem',
                  border: '1px solid',
                  borderColor: 'grey.300',
                  color: 'grey.800'
                }}
              >
                {command}
              </Typography>
            </Box>
          )}

          {/* Claude Code 消息气泡列表 */}
          <Box
            sx={{
              maxHeight: 500,
              overflow: 'auto',
              p: 2,
              display: 'flex',
              flexDirection: 'column',
              gap: 0.5,
              '&::-webkit-scrollbar': {
                width: '8px'
              },
              '&::-webkit-scrollbar-track': {
                bgcolor: 'rgba(0, 0, 0, 0.1)',
                borderRadius: '4px'
              },
              '&::-webkit-scrollbar-thumb': {
                bgcolor: 'rgba(255, 255, 255, 0.2)',
                borderRadius: '4px',
                '&:hover': {
                  bgcolor: 'rgba(255, 255, 255, 0.3)'
                }
              }
            }}
          >
            {logs.length === 0 ? (
              <Box sx={{
                textAlign: 'center',
                py: 6,
                color: 'grey.400'
              }}>
                <Psychology sx={{ fontSize: 48, mb: 2, opacity: 0.5 }} />
                <Typography variant="body2" sx={{ fontStyle: 'italic' }}>
                  等待 Claude Code 输出...
                </Typography>
              </Box>
            ) : (
              logs.map((log, index) => (
                <Box
                  key={index}
                  sx={getBubbleStyle(log)}
                >
                  {/* 气泡头部 */}
                  <Box sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    mb: 1
                  }}>
                    <Typography sx={{ fontSize: '1.2rem' }}>
                      {getBubbleHeaderIcon(log)}
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{
                        color: 'grey.400',
                        fontSize: '0.7rem',
                        fontFamily: 'monospace'
                      }}
                    >
                      {log.timestamp.toLocaleTimeString()}
                    </Typography>
                    {log.stage && (
                      <Chip
                        label={getStageLabel(log.stage)}
                        size="small"
                        sx={{
                          height: '18px',
                          fontSize: '0.65rem',
                          bgcolor: `${getLogColor(log)}30`,
                          color: getLogColor(log),
                          border: `1px solid ${getLogColor(log)}60`,
                          ml: 'auto'
                        }}
                      />
                    )}
                  </Box>

                  {/* 主要内容 */}
                  <Typography
                    component="div"
                    sx={{
                      color: 'grey.800',
                      fontSize: '0.9rem',
                      fontFamily: '"Fira Code", "JetBrains Mono", "Monaco", monospace',
                      lineHeight: 1.6,
                      wordBreak: 'break-word',
                      whiteSpace: 'pre-wrap'
                    }}
                  >
                    {log.content.replace(/^[🔧💬❌✅⚠️🤔📍⚡💭🧠⚙️🔨🧪] /, '')}
                  </Typography>

                  {/* 原始输出（代码块） */}
                  {log.rawOutput &&
                   log.rawOutput !== log.content.replace(/^[🔧💬❌✅⚠️🤔📍⚡💭🧠⚙️🔨🧪] /, '') && (
                    <Box
                      sx={{
                        mt: 1.5,
                        p: 1.5,
                        bgcolor: 'grey.100',
                        borderRadius: 1,
                        border: '1px solid',
                        borderColor: 'grey.300'
                      }}
                    >
                      <Typography
                        component="div"
                        sx={{
                          color: 'grey.700',
                          fontSize: '0.75rem',
                          fontFamily: '"Fira Code", "JetBrains Mono", "Monaco", monospace',
                          lineHeight: 1.6,
                          whiteSpace: 'pre-wrap',
                          maxHeight: '200px',
                          overflow: 'auto',
                          '&::-webkit-scrollbar': {
                            width: '4px',
                            height: '4px'
                          },
                          '&::-webkit-scrollbar-thumb': {
                            backgroundColor: 'grey.400',
                            borderRadius: '2px'
                          }
                        }}
                      >
                        {log.rawOutput}
                      </Typography>
                    </Box>
                  )}

                  {/* 元数据 */}
                  {log.metadata && Object.keys(log.metadata).length > 0 &&
                   !log.metadata.messageId &&
                   !log.metadata.model && (
                    <Box sx={{
                      mt: 1,
                      pt: 1,
                      borderTop: '1px solid rgba(255, 255, 255, 0.1)'
                    }}>
                      <Typography
                        variant="caption"
                        sx={{
                          color: 'grey.500',
                          fontSize: '0.7rem',
                          fontFamily: 'monospace'
                        }}
                      >
                        {log.metadata.toolName && `🔧 ${log.metadata.toolName}`}
                        {log.metadata.fullContentLength && ` • ${log.metadata.fullContentLength} 字符`}
                      </Typography>
                    </Box>
                  )}
                </Box>
              ))
            )}
            <div ref={logsEndRef} />
          </Box>

          {/* 完成状态提示 */}
          {isCompleted && (
            <Box sx={{ mt: 2, textAlign: 'center' }}>
              <Chip
                icon={hasError ? <Error /> : <CheckCircle />}
                label={hasError ? '执行过程中遇到问题' : '执行完成'}
                color={hasError ? 'error' : 'success'}
                variant="outlined"
              />
            </Box>
          )}
        </Box>
      </Collapse>
    </Paper>
  )
}