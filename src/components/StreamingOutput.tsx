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
        <Box sx={{ p: 2 }}>
          {/* 命令信息 */}
          {command && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="caption" color="text.secondary" gutterBottom>
                执行命令:
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  fontFamily: 'monospace',
                  bgcolor: 'grey.100',
                  p: 1,
                  borderRadius: 1,
                  fontSize: '0.75rem'
                }}
              >
                {command}
              </Typography>
            </Box>
          )}

          {/* Claude Code 真实输出日志 */}
          <Box
            sx={{
              maxHeight: 400,
              overflow: 'auto',
              bgcolor: 'grey.900',
              borderRadius: 1,
              p: 1.5,
              border: '1px solid #333'
            }}
          >
            {logs.length === 0 ? (
              <Typography
                variant="body2"
                sx={{ 
                  color: 'grey.400', 
                  textAlign: 'center', 
                  py: 3,
                  fontStyle: 'italic' 
                }}
              >
                等待 Claude Code 输出...
              </Typography>
            ) : (
              logs.map((log, index) => (
                <Box key={index} sx={{ mb: 1 }}>
                  {/* 主要输出行 */}
                  <Typography
                    component="div"
                    sx={{
                      color: getLogColor(log),
                      fontSize: '0.8rem',
                      fontFamily: '"Fira Code", "JetBrains Mono", "Monaco", monospace',
                      lineHeight: 1.4,
                      wordBreak: 'break-word',
                      whiteSpace: 'pre-wrap'
                    }}
                  >
                    <span style={{ 
                      color: '#555', 
                      marginRight: 8,
                      fontSize: '0.7rem'
                    }}>
                      [{log.timestamp.toLocaleTimeString()}]
                    </span>
                    <span style={{ marginRight: 4 }}>
                      {log.content}
                    </span>
                  </Typography>
                  
                  {/* 如果有原始输出且与处理后内容不同，显示原始内容 */}
                  {log.rawOutput && 
                   log.rawOutput !== log.content.replace(/^[🔧💬❌✅⚠️🤔📍⚡💭🧠⚙️🔨🧪] /, '') && (
                    <Typography
                      component="div"
                      sx={{
                        color: '#888',
                        fontSize: '0.7rem',
                        fontFamily: '"Fira Code", "JetBrains Mono", "Monaco", monospace',
                        fontStyle: 'italic',
                        ml: 4,
                        mt: 0.5,
                        pl: 1,
                        borderLeft: '2px solid #333',
                        opacity: 0.8,
                        whiteSpace: 'pre-wrap'
                      }}
                    >
                      {log.rawOutput}
                    </Typography>
                  )}
                  
                  {/* 如果有元数据，显示在小字体中 */}
                  {log.metadata && Object.keys(log.metadata).length > 0 && (
                    <Typography
                      component="div"
                      sx={{
                        color: '#666',
                        fontSize: '0.65rem',
                        fontFamily: 'monospace',
                        ml: 2,
                        mt: 0.5,
                        opacity: 0.7
                      }}
                    >
                      📋 {JSON.stringify(log.metadata, null, 0).replace(/[{}]/g, '').replace(/"/g, '')}
                    </Typography>
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