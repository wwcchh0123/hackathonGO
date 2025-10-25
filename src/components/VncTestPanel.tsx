import React, { useState } from 'react'
import { 
  Box, 
  Button, 
  Typography, 
  Paper, 
  Alert,
  Chip,
  CircularProgress 
} from '@mui/material'
import { VncStartResult, VncStatus } from '../types/api'

export const VncTestPanel: React.FC = () => {
  const [testResults, setTestResults] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [lastResult, setLastResult] = useState<VncStartResult | null>(null)

  const addLog = (message: string, type: 'info' | 'success' | 'error' = 'info') => {
    const timestamp = new Date().toLocaleTimeString()
    const logMessage = `[${timestamp}] ${message}`
    setTestResults(prev => [...prev, logMessage])
    console.log(`${type.toUpperCase()}: ${logMessage}`)
  }

  const clearLogs = () => {
    setTestResults([])
    setLastResult(null)
  }

  const checkApiAvailable = (): boolean => {
    if (!window.api) {
      addLog('❌ window.api 不可用', 'error')
      return false
    }
    if (!window.api.vnc) {
      addLog('❌ window.api.vnc 不可用', 'error')
      return false
    }
    addLog('✅ VNC API 可用', 'success')
    return true
  }

  const testStartVnc = async () => {
    if (!checkApiAvailable()) return

    setIsLoading(true)
    addLog('🚀 开始启动VNC容器...')

    try {
      const result = await window.api.vnc.start()
      setLastResult(result)

      if (result.success) {
        addLog('✅ VNC启动成功!', 'success')
        addLog(`   容器ID: ${result.containerId}`)
        addLog(`   VNC URL: ${result.vncUrl}`)
        addLog(`   工具API URL: ${result.toolsUrl}`)
      } else {
        addLog(`❌ VNC启动失败: ${result.error}`, 'error')
      }
    } catch (error) {
      addLog(`💥 启动过程发生异常: ${error}`, 'error')
    } finally {
      setIsLoading(false)
    }
  }

  const testCheckStatus = async () => {
    if (!checkApiAvailable()) return

    addLog('🔍 检查VNC状态...')

    try {
      const status: VncStatus = await window.api.vnc.status()
      
      if (status.running) {
        addLog('✅ VNC容器正在运行', 'success')
        addLog(`   容器ID: ${status.containerId}`)
        
        if (status.health) {
          addLog('   服务健康状态:')
          status.health.forEach(service => {
            const icon = service.status === 'healthy' ? '✅' : '❌'
            addLog(`     ${icon} ${service.name} (端口${service.port}): ${service.status}`)
          })
        }
      } else {
        addLog('⚠️ VNC容器未运行', 'error')
      }
    } catch (error) {
      addLog(`💥 检查状态时发生异常: ${error}`, 'error')
    }
  }

  const testStopVnc = async () => {
    if (!checkApiAvailable()) return

    addLog('🛑 停止VNC容器...')

    try {
      const result = await window.api.vnc.stop()
      
      if (result.success) {
        addLog('✅ VNC停止成功', 'success')
      } else {
        addLog(`❌ VNC停止失败: ${result.error}`, 'error')
      }
    } catch (error) {
      addLog(`💥 停止过程发生异常: ${error}`, 'error')
    }
  }

  const testWebAccess = async () => {
    addLog('🌐 测试noVNC Web服务访问...')

    try {
      const response = await fetch('http://localhost:6080')
      if (response.ok) {
        addLog('✅ noVNC Web服务可访问', 'success')
      } else {
        addLog(`❌ noVNC Web服务无法访问 (状态: ${response.status})`, 'error')
      }
    } catch (error) {
      addLog(`❌ 无法连接到noVNC Web服务: ${error}`, 'error')
    }
  }

  const runFullTest = async () => {
    clearLogs()
    addLog('🎯 开始完整VNC功能测试...')

    // 依次执行所有测试
    await testStartVnc()
    
    if (lastResult?.success) {
      addLog('⏱️ 等待10秒让服务完全启动...')
      await new Promise(resolve => setTimeout(resolve, 10000))
      
      await testCheckStatus()
      await testWebAccess()
      
      addLog('⏱️ 等待5秒后停止VNC...')
      await new Promise(resolve => setTimeout(resolve, 5000))
      
      await testStopVnc()
    }

    addLog('🏁 测试完成')
  }

  return (
    <Paper sx={{ p: 3, m: 2 }}>
      <Typography variant="h6" gutterBottom>
        VNC功能测试面板
      </Typography>

      <Box sx={{ mb: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        <Button 
          variant="contained" 
          onClick={runFullTest}
          disabled={isLoading}
          color="primary"
        >
          {isLoading ? <CircularProgress size={20} /> : '运行完整测试'}
        </Button>
        
        <Button variant="outlined" onClick={testStartVnc} disabled={isLoading}>
          启动VNC
        </Button>
        
        <Button variant="outlined" onClick={testCheckStatus} disabled={isLoading}>
          检查状态
        </Button>
        
        <Button variant="outlined" onClick={testWebAccess} disabled={isLoading}>
          测试Web访问
        </Button>
        
        <Button variant="outlined" onClick={testStopVnc} disabled={isLoading}>
          停止VNC
        </Button>
        
        <Button variant="text" onClick={clearLogs}>
          清除日志
        </Button>
      </Box>

      {lastResult && (
        <Box sx={{ mb: 2 }}>
          <Chip 
            label={lastResult.success ? "最后操作：成功" : "最后操作：失败"} 
            color={lastResult.success ? "success" : "error"}
          />
          {lastResult.vncUrl && (
            <Chip 
              label="VNC可用" 
              color="info" 
              sx={{ ml: 1 }}
              onClick={() => window.open(lastResult.vncUrl, '_blank')}
            />
          )}
        </Box>
      )}

      {testResults.length > 0 && (
        <Alert severity="info" sx={{ mt: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            测试日志:
          </Typography>
          <Box 
            component="pre" 
            sx={{ 
              fontSize: '0.8rem', 
              maxHeight: 300, 
              overflow: 'auto',
              fontFamily: 'monospace',
              whiteSpace: 'pre-wrap'
            }}
          >
            {testResults.join('\n')}
          </Box>
        </Alert>
      )}
    </Paper>
  )
}