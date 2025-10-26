# 阶段1: 基础VNC集成详细文档

## 概述
实现VNC容器管理和基础通信功能，建立Electron主进程与Docker容器的交互机制。

## 1.1 Electron主进程扩展

### 文件修改: `electron/main.js`

#### 新增依赖导入
```javascript
import { spawn } from 'node:child_process'
import { promisify } from 'node:util'
import { exec } from 'node:child_process'

const execAsync = promisify(exec)
```

#### VNC容器管理状态
```javascript
// 全局VNC状态管理
let vncContainerId = null
let vncStartupPromise = null
const VNC_PORTS = {
  vnc: 5900,
  web: 6080,
  streamlit: 8501,
  tools: 8502
}
```

#### 容器管理核心函数

**启动VNC容器**:
```javascript
ipcMain.handle('start-vnc', async (event) => {
  // 防止重复启动
  if (vncStartupPromise) {
    return await vncStartupPromise
  }
  
  vncStartupPromise = startVncInternal()
  const result = await vncStartupPromise
  vncStartupPromise = null
  return result
})

async function startVncInternal() {
  try {
    console.log('开始启动VNC容器...')
    
    // 1. 检查Docker可用性
    await checkDockerAvailable()
    
    // 2. 检查镜像存在性
    await checkImageExists('aslan-spock-register.qiniu.io/devops/anthropic-quickstarts:computer-use-demo-latest')
    
    // 3. 停止现有容器
    if (vncContainerId) {
      await stopVncContainer()
    }
    
    // 4. 检查端口可用性
    await checkPortsAvailable()
    
    // 5. 启动新容器
    const containerId = await launchContainer()
    
    // 6. 等待服务就绪
    await waitForServices()
    
    vncContainerId = containerId
    
    return {
      success: true,
      containerId,
      vncUrl: `http://localhost:${VNC_PORTS.web}/vnc.html?autoconnect=1&resize=scale&view_only=false`,
      toolsUrl: `http://localhost:${VNC_PORTS.tools}`
    }
    
  } catch (error) {
    console.error('VNC启动失败:', error)
    return {
      success: false,
      error: error.message
    }
  }
}
```

**辅助函数实现**:
```javascript
async function checkDockerAvailable() {
  try {
    await execAsync('docker --version')
    const { stdout } = await execAsync('docker info --format "{{.ServerVersion}}"')
    console.log('Docker版本:', stdout.trim())
  } catch (error) {
    throw new Error('Docker未安装或未运行')
  }
}

async function checkImageExists(imageName) {
  try {
    await execAsync(`docker image inspect ${imageName}`)
    console.log(`镜像 ${imageName} 已存在`)
  } catch (error) {
    throw new Error(`镜像 ${imageName} 不存在，请先构建镜像`)
  }
}

async function checkPortsAvailable() {
  const busyPorts = []
  
  for (const [service, port] of Object.entries(VNC_PORTS)) {
    try {
      await execAsync(`lsof -ti:${port}`)
      busyPorts.push(`${service}:${port}`)
    } catch {
      // 端口可用
    }
  }
  
  if (busyPorts.length > 0) {
    throw new Error(`以下端口被占用: ${busyPorts.join(', ')}`)
  }
}

async function launchContainer() {
  const envVars = [
    `ANTHROPIC_API_KEY=${process.env.ANTHROPIC_API_KEY || ''}`
  ]
  
  const portMappings = Object.values(VNC_PORTS)
    .map(port => `-p ${port}:${port}`)
    .join(' ')
  
  const command = `
    docker run -d --rm \
      ${portMappings} \
      ${envVars.map(env => `-e "${env}"`).join(' ')} \
      --name vnc-desktop-$(date +%s) \
      aslan-spock-register.qiniu.io/devops/anthropic-quickstarts:computer-use-demo-latest
  `.replace(/\s+/g, ' ').trim()
  
  console.log('启动容器命令:', command)
  
  const { stdout } = await execAsync(command)
  const containerId = stdout.trim()
  
  if (!containerId) {
    throw new Error('容器启动失败，未获取到容器ID')
  }
  
  console.log('容器启动成功，ID:', containerId)
  return containerId
}

async function waitForServices() {
  console.log('等待服务启动...')
  
  // 等待noVNC Web服务
  await waitForPort(VNC_PORTS.web, 30000, 'noVNC Web服务')
  
  // 等待Streamlit服务
  await waitForPort(VNC_PORTS.streamlit, 20000, 'Streamlit服务')
  
  console.log('所有服务已启动')
}

async function waitForPort(port, timeout = 10000, serviceName = '服务') {
  const start = Date.now()
  const interval = 1000
  
  while (Date.now() - start < timeout) {
    try {
      await execAsync(`curl -f -s http://localhost:${port} > /dev/null`)
      console.log(`${serviceName} (端口${port}) 已就绪`)
      return true
    } catch {
      console.log(`等待${serviceName} (端口${port})...`)
      await new Promise(resolve => setTimeout(resolve, interval))
    }
  }
  
  throw new Error(`${serviceName} (端口${port}) 启动超时`)
}
```

**停止VNC容器**:
```javascript
ipcMain.handle('stop-vnc', async (event) => {
  return await stopVncContainer()
})

async function stopVncContainer() {
  try {
    if (vncContainerId) {
      console.log('停止VNC容器:', vncContainerId)
      
      // 发送SIGTERM信号，给容器时间优雅关闭
      await execAsync(`docker stop -t 10 ${vncContainerId}`)
      
      vncContainerId = null
      console.log('VNC容器已停止')
    }
    
    return { success: true }
  } catch (error) {
    console.error('停止VNC容器失败:', error)
    return { 
      success: false, 
      error: error.message 
    }
  }
}
```

**VNC状态检查**:
```javascript
ipcMain.handle('vnc-status', async (event) => {
  if (!vncContainerId) {
    return { running: false }
  }
  
  try {
    const { stdout } = await execAsync(`docker ps -q -f id=${vncContainerId}`)
    const isRunning = stdout.trim().length > 0
    
    if (isRunning) {
      // 检查服务健康状态
      const healthStatus = await checkServiceHealth()
      return {
        running: true,
        containerId: vncContainerId,
        health: healthStatus
      }
    } else {
      vncContainerId = null
      return { running: false }
    }
  } catch (error) {
    console.error('检查VNC状态失败:', error)
    vncContainerId = null
    return { running: false }
  }
})

async function checkServiceHealth() {
  const services = []
  
  for (const [serviceName, port] of Object.entries(VNC_PORTS)) {
    try {
      await execAsync(`curl -f -s --max-time 5 http://localhost:${port} > /dev/null`)
      services.push({ name: serviceName, port, status: 'healthy' })
    } catch {
      services.push({ name: serviceName, port, status: 'unhealthy' })
    }
  }
  
  return services
}
```

#### 应用生命周期管理
```javascript
// 应用退出时清理资源
app.on('before-quit', async (event) => {
  if (vncContainerId) {
    console.log('应用退出，清理VNC容器...')
    event.preventDefault()
    
    try {
      await stopVncContainer()
    } catch (error) {
      console.error('清理VNC容器失败:', error)
    }
    
    app.quit()
  }
})

// 监听容器状态变化
setInterval(async () => {
  if (vncContainerId) {
    const status = await ipcMain.handle('vnc-status')
    if (!status.running) {
      // 通知渲染进程容器已停止
      BrowserWindow.getAllWindows().forEach(win => {
        win.webContents.send('vnc-container-stopped')
      })
    }
  }
}, 10000) // 每10秒检查一次
```

## 1.2 IPC接口定义

### 文件修改: `electron/preload.js`

```javascript
const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('api', {
  // 现有API
  sendMessage: (options) => ipcRenderer.invoke('send-message', options),
  selectDir: () => ipcRenderer.invoke('select-dir'),
  
  // VNC管理API
  vnc: {
    start: () => ipcRenderer.invoke('start-vnc'),
    stop: () => ipcRenderer.invoke('stop-vnc'),
    status: () => ipcRenderer.invoke('vnc-status'),
    
    // 监听容器状态变化
    onContainerStopped: (callback) => {
      ipcRenderer.on('vnc-container-stopped', callback)
      return () => ipcRenderer.removeListener('vnc-container-stopped', callback)
    }
  }
})
```

### 文件创建: `src/types/api.ts`

```typescript
// VNC相关类型定义
export interface VncStartResult {
  success: boolean
  containerId?: string
  vncUrl?: string
  toolsUrl?: string
  error?: string
}

export interface VncStopResult {
  success: boolean
  error?: string
}

export interface ServiceHealth {
  name: string
  port: number
  status: 'healthy' | 'unhealthy'
}

export interface VncStatus {
  running: boolean
  containerId?: string
  health?: ServiceHealth[]
}

// 扩展Window API类型
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
      
      vnc: {
        start: () => Promise<VncStartResult>
        stop: () => Promise<VncStopResult>
        status: () => Promise<VncStatus>
        onContainerStopped: (callback: () => void) => () => void
      }
    }
  }
}
```

## 1.3 状态管理设计

### 文件修改: `src/App.tsx`

#### VNC状态变量添加
```typescript
// 在App组件中添加VNC相关状态
const [vncState, setVncState] = useState({
  isActive: false,
  isLoading: false,
  url: '',
  error: '',
  containerId: ''
})

// VNC服务健康状态
const [vncHealth, setVncHealth] = useState<ServiceHealth[]>([])
```

#### 状态管理Hook
```typescript
// 自定义VNC状态管理Hook
const useVncState = () => {
  const updateVncState = useCallback((updates: Partial<typeof vncState>) => {
    setVncState(prev => ({ ...prev, ...updates }))
  }, [])
  
  const resetVncState = useCallback(() => {
    setVncState({
      isActive: false,
      isLoading: false,
      url: '',
      error: '',
      containerId: ''
    })
    setVncHealth([])
  }, [])
  
  return {
    vncState,
    vncHealth,
    updateVncState,
    resetVncState,
    setVncHealth
  }
}
```

#### 容器状态监听
```typescript
useEffect(() => {
  // 监听容器状态变化
  const unsubscribe = window.api.vnc.onContainerStopped(() => {
    console.log('VNC容器已停止')
    updateVncState({
      isActive: false,
      error: '容器意外停止'
    })
    setVncHealth([])
  })
  
  return unsubscribe
}, [])

// 定期检查VNC状态
useEffect(() => {
  if (!vncState.isActive) return
  
  const checkStatus = async () => {
    try {
      const status = await window.api.vnc.status()
      if (!status.running) {
        updateVncState({
          isActive: false,
          error: '容器已停止'
        })
        setVncHealth([])
      } else if (status.health) {
        setVncHealth(status.health)
      }
    } catch (error) {
      console.error('检查VNC状态失败:', error)
    }
  }
  
  const interval = setInterval(checkStatus, 10000)
  return () => clearInterval(interval)
}, [vncState.isActive])
```

## 验收标准

### 功能验收
- [ ] 成功启动VNC容器并获取容器ID
- [ ] noVNC Web服务在端口6080正常运行
- [ ] 能够通过IPC调用停止VNC容器
- [ ] VNC状态检查返回正确的运行状态
- [ ] 容器异常停止时能正确通知前端
- [ ] 应用退出时能自动清理容器

### 测试脚本

```javascript
// 测试VNC基础功能
async function testVncBasicFunctions() {
  console.log('开始测试VNC基础功能...')
  
  try {
    // 1. 测试启动VNC
    console.log('1. 测试启动VNC...')
    const startResult = await window.api.vnc.start()
    if (!startResult.success) {
      throw new Error(`启动失败: ${startResult.error}`)
    }
    console.log('✅ VNC启动成功:', startResult.containerId)
    
    // 2. 等待服务就绪
    console.log('2. 等待服务就绪...')
    await new Promise(resolve => setTimeout(resolve, 5000))
    
    // 3. 测试状态检查
    console.log('3. 测试状态检查...')
    const status = await window.api.vnc.status()
    if (!status.running) {
      throw new Error('容器状态检查失败')
    }
    console.log('✅ 状态检查通过:', status)
    
    // 4. 测试Web访问
    console.log('4. 测试Web访问...')
    const response = await fetch('http://localhost:6080')
    if (!response.ok) {
      throw new Error('noVNC Web服务无法访问')
    }
    console.log('✅ noVNC Web服务正常')
    
    // 5. 测试停止VNC
    console.log('5. 测试停止VNC...')
    const stopResult = await window.api.vnc.stop()
    if (!stopResult.success) {
      throw new Error(`停止失败: ${stopResult.error}`)
    }
    console.log('✅ VNC停止成功')
    
    console.log('🎉 所有测试通过！')
    
  } catch (error) {
    console.error('❌ 测试失败:', error)
  }
}
```

## 故障排除

### 常见问题及解决方案

1. **容器启动失败**
   ```javascript
   // 检查详细错误信息
   docker logs <container-id>
   
   // 检查镜像是否正确构建
   docker run -it aslan-spock-register.qiniu.io/devops/anthropic-quickstarts:computer-use-demo-latest /bin/bash
   ```

2. **端口冲突**
   ```bash
   # 查找并终止占用进程
   lsof -ti:6080 | xargs kill -9
   ```

3. **服务启动超时**
   ```javascript
   // 增加超时时间
   await waitForPort(6080, 60000) // 改为60秒
   ```

4. **容器状态检查失败**
   ```javascript
   // 检查Docker daemon状态
   systemctl status docker
   ```

## 下一步

完成阶段1后，进入阶段2: UI界面实现。

**准备工作**:
1. 验证所有VNC基础功能正常
2. 提交代码到功能分支
3. 准备UI组件开发环境