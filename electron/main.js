import { app, BrowserWindow, ipcMain, dialog } from 'electron'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawn } from 'node:child_process'
import { promisify } from 'node:util'
import { exec } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'

const execAsync = promisify(exec)

let mainWindow
const isDev = process.env.ELECTRON_DEV === 'true'
const __filename = fileURLToPath(import.meta.url)

// 全局VNC状态管理
let vncContainerId = null
let vncStartupPromise = null
const VNC_PORTS = {
  vnc: 5900,
  web: 6080,
  streamlit: 8501,
  tools: 8502
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(path.dirname(__filename), 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      enableRemoteModule: false,
      webSecurity: false, // 仅在开发环境
    },
    title: 'Claude Code Desktop',
  })


  if (isDev) {
    const devUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173'
    console.log('Loading dev URL:', devUrl)
    mainWindow.loadURL(devUrl)
    // 开发模式下打开开发者工具
    mainWindow.webContents.openDevTools()
  } else {
    const indexPath = path.join(process.cwd(), 'dist', 'index.html')
    mainWindow.loadFile(indexPath)
  }
}

app.whenReady().then(() => {
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

// ========== 会话持久化（文件） ==========
const sessionsDir = path.join(os.homedir(), 'claude_code_desktop')
const sessionsFile = path.join(sessionsDir, 'sessions.json')

function ensureSessionsDir() {
  try {
    if (!fs.existsSync(sessionsDir)) {
      fs.mkdirSync(sessionsDir, { recursive: true })
    }
  } catch (e) {
    console.error('创建会话目录失败:', e)
  }
}

ipcMain.handle('sessions-load', async () => {
  try {
    ensureSessionsDir()
    if (!fs.existsSync(sessionsFile)) {
      return { sessions: [], activeSessionId: null }
    }
    const raw = fs.readFileSync(sessionsFile, 'utf-8')
    const data = JSON.parse(raw)
    return data
  } catch (e) {
    console.error('读取会话文件失败:', e)
    return { sessions: [], activeSessionId: null }
  }
})

ipcMain.handle('sessions-save', async (_event, data) => {
  try {
    ensureSessionsDir()
    fs.writeFileSync(sessionsFile, JSON.stringify(data, null, 2), 'utf-8')
    return { success: true }
  } catch (e) {
    console.error('写入会话文件失败:', e)
    return { success: false, error: String(e) }
  }
})

ipcMain.handle('send-message', async (_event, options) => {
  console.log('=== IPC send-message received ===')
  console.log('Options:', JSON.stringify(options, null, 2))

  const { command, baseArgs = [], message, cwd, env = {}, timeoutMs = 120000 } = options || {}
  if (!command || !message) {
    console.log('❌ Missing command or message')
    return { success: false, error: 'Command and message are required' }
  }

  return new Promise((resolve) => {
    const mergedEnv = { ...process.env, ...env }
    // 将用户消息作为最后一个参数传递给CLI
    const args = [...baseArgs, message]

    const childProcess = spawn(command, args, {
      cwd: cwd || process.cwd(),
      env: mergedEnv,
      shell: true,
      stdio: ['pipe', 'pipe', 'pipe']
    })

    let stdout = ''
    let stderr = ''
    let isResolved = false

    // 立即发送换行符，确保命令执行
    childProcess.stdin.write('\n')
    childProcess.stdin.end()

    childProcess.stdout.on('data', (chunk) => {
      const data = chunk.toString()
      console.log('📤 STDOUT:', data)
      stdout += data
    })

    childProcess.stderr.on('data', (chunk) => {
      const data = chunk.toString()
      console.log('❗ STDERR:', data)
      stderr += data
    })

    // 超时控制，避免子进程长时间无响应
    const timeout = setTimeout(() => {
      if (isResolved) return
      isResolved = true
      console.log(`⏱️ Process timeout after ${timeoutMs}ms, killing process`)
      try {
        childProcess.kill('SIGKILL')
      } catch (e) {
        console.log('⚠️ Failed to kill process on timeout:', e)
      }
      const result = {
        success: false,
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        exitCode: null,
        error: `Timeout after ${timeoutMs}ms`
      }
      console.log('📋 Timeout result:', JSON.stringify(result, null, 2))
      resolve(result)
    }, timeoutMs)

    childProcess.on('close', (code) => {
      if (isResolved) return
      isResolved = true
      clearTimeout(timeout)

      console.log('✅ Process finished with exit code:', code)
      const result = {
        success: code === 0,
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        exitCode: code
      }
      console.log('📋 Final result:', JSON.stringify(result, null, 2))
      resolve(result)
    })

    childProcess.on('error', (err) => {
      if (isResolved) return
      isResolved = true
      clearTimeout(timeout)

      console.log('💥 Process error:', err)
      const result = {
        success: false,
        error: String(err)
      }
      console.log('📋 Error result:', JSON.stringify(result, null, 2))
      resolve(result)
    })

    // 监听进程启动
    childProcess.on('spawn', () => {
      console.log('🎯 Process spawned successfully')
    })
  })
})

ipcMain.handle('select-dir', async () => {
  const res = await dialog.showOpenDialog({ properties: ['openDirectory'] })
  if (res.canceled || res.filePaths.length === 0) return null
  return res.filePaths[0]
})

// ========== VNC容器管理功能 ==========

// 启动VNC容器
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
    await checkImageExists('computer-use-demo:local')
    
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

// 辅助函数实现
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
  
  const envMappings = envVars
    .map(env => `-e "${env}"`)
    .join(' ')
  
  // 生成唯一的容器名
  const containerName = `vnc-desktop-${Date.now()}`
  
  // 构建完整的Docker命令
  const command = `docker run -d --rm ${portMappings} ${envMappings} --name ${containerName} computer-use-demo:local`
  
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

// 停止VNC容器
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

// VNC状态检查
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

// 应用生命周期管理
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
    try {
      const { stdout } = await execAsync(`docker ps -q -f id=${vncContainerId}`)
      const isRunning = stdout.trim().length > 0
      
      if (!isRunning) {
        vncContainerId = null
        // 通知渲染进程容器已停止
        BrowserWindow.getAllWindows().forEach(win => {
          win.webContents.send('vnc-container-stopped')
        })
      }
    } catch (error) {
      console.error('容器状态检查失败:', error)
    }
  }
}, 10000) // 每10秒检查一次
