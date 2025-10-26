import { app, BrowserWindow, dialog, ipcMain, nativeImage, session } from 'electron'
import { exec, spawn } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'

const execAsync = promisify(exec)

let mainWindow
const isDev = process.env.ELECTRON_DEV === 'true'
const __filename = fileURLToPath(import.meta.url)

// 全局VNC状态管理
let vncContainerId = null
let vncStartupPromise = null

// 全局任务进程管理
const runningProcesses = new Map() // sessionId -> { process, startTime }

// VNC Docker 镜像配置 - 从环境变量读取，支持自定义镜像
const VNC_DOCKER_IMAGE = process.env.VNC_DOCKER_IMAGE || 'aslan-spock-register.qiniu.io/devops/anthropic-quickstarts:computer-use-demo-latest'

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
    minWidth: 900,
    minHeight: 600,
    webPreferences: {
      preload: path.join(path.dirname(__filename), 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      enableRemoteModule: false,
      webSecurity: false, // 仅在开发环境
    },
    title: 'XGopilot for Desktop',
    icon: path.join(process.cwd(), 'assets', 'icons', 'icon.png'),
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

app.whenReady().then(async () => {
  // 配置代理以访问 Google 语音识别服务
  // 如果你有本地代理，取消下面的注释并修改代理地址
  // 常见代理端口：Clash 7890, V2Ray 10809, SSR 1080
  try {
    // 方法1: 自动检测系统代理
    await session.defaultSession.setProxy({ mode: 'system' })
    console.log('✅ 已设置为使用系统代理')

    // 方法2: 手动设置代理（如果系统代理不生效，取消下面的注释）
    // await session.defaultSession.setProxy({
    //   proxyRules: 'http://127.0.0.1:7890' // 修改为你的代理地址和端口
    // })
    // console.log('✅ 已设置手动代理: http://127.0.0.1:7890')
  } catch (error) {
    console.warn('⚠️ 代理设置失败:', error)
  }

  createWindow()
  // macOS Dock icon
  try {
    const dockIconPath = path.join(process.cwd(), 'assets', 'icons', 'icon.png')
    if (process.platform === 'darwin') {
      const img = nativeImage.createFromPath(dockIconPath)
      if (!img.isEmpty()) {
        app.dock.setIcon(img)
      }
    }
  } catch { }
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

// 发送流式更新到前端
function sendStreamUpdate(sessionId, update) {
  BrowserWindow.getAllWindows().forEach(win => {
    win.webContents.send('claude-stream', {
      sessionId,
      timestamp: new Date().toISOString(),
      ...update
    })
  })
}

// Claude JSON流式解析器
class ClaudeJsonStreamProcessor {
  constructor(sessionId) {
    this.sessionId = sessionId
    this.lineBuffer = ''
    this.outputBuffer = ''
    this.messageCount = 0
  }

  processChunk(chunk) {
    this.outputBuffer += chunk
    this.lineBuffer += chunk

    // 按行分割处理JSON
    const lines = this.lineBuffer.split('\n')
    this.lineBuffer = lines.pop() || '' // 保留可能不完整的最后一行

    for (const line of lines) {
      if (line.trim()) {
        this.processJsonLine(line.trim())
      }
    }
  }

  processJsonLine(line) {
    try {
      const jsonData = JSON.parse(line)
      this.handleJsonMessage(jsonData)
    } catch (error) {
      // 如果不是JSON，作为原始输出处理
      this.sendRawOutput(line)
    }
  }

  handleJsonMessage(data) {
    this.messageCount++

    switch (data.type) {
      case 'system':
        this.handleSystemMessage(data)
        break

      case 'assistant':
        this.handleAssistantMessage(data)
        break

      case 'result':
        this.handleResultMessage(data)
        break

    }
  }

  handleSystemMessage(data) {
    // 静默处理系统消息，不显示在界面上
    // 系统初始化信息对用户来说不重要，只需内部使用
    console.log('📋 System message received:', data.subtype)
  }

  handleAssistantMessage(data) {
    const message = data.message
    if (!message) return

    // 处理消息内容
    if (message.content && Array.isArray(message.content)) {
      for (const content of message.content) {
        // 显示文本消息
        if (content.type === 'text' && content.text) {
          sendStreamUpdate(this.sessionId, {
            type: 'stream-data',
            data: {
              stage: 'response',
              content: `${content.text}`,
              metadata: {
                messageId: message.id,
                model: message.model
              }
            }
          })
        }

        // 显示工具调用详情
        if (content.type === 'tool_use') {
          const toolInput = JSON.stringify(content.input, null, 2)
          sendStreamUpdate(this.sessionId, {
            type: 'stream-data',
            data: {
              stage: 'tool',
              content: `🔧 调用工具: ${content.name}`,
              rawOutput: `参数:\n${toolInput}`,
              metadata: {
                toolName: content.name,
                toolId: content.id,
                input: content.input
              }
            }
          })
        }
      }
    }
  }

  handleResultMessage(data) {
    const isSuccess = !data.is_error

    // 只显示最终的result内容，不显示执行状态信息
    if (isSuccess && data.result) {
      // 最终结果通过stream-end事件发送，而不是stream-data
      sendStreamUpdate(this.sessionId, {
        type: 'stream-end',
        data: {
          success: true,
          result: data.result,
          metadata: {
            duration: data.duration_ms,
            cost: data.total_cost_usd,
            usage: data.usage
          }
        }
      })
    } else {
      // 错误情况也通过stream-end发送
      sendStreamUpdate(this.sessionId, {
        type: 'stream-end',
        data: {
          success: false,
          error: data.error,
          metadata: {
            duration: data.duration_ms,
            permissionDenials: data.permission_denials
          }
        }
      })
    }

    // 权限拒绝作为警告单独显示
    if (data.permission_denials && data.permission_denials.length > 0) {
      for (const denial of data.permission_denials) {
        sendStreamUpdate(this.sessionId, {
          type: 'stream-data',
          data: {
            stage: 'warning',
            content: `⚠️ 权限被拒绝: ${denial.tool_name}`
          }
        })
      }
    }
  }

  sendRawOutput(line) {
    sendStreamUpdate(this.sessionId, {
      type: 'stream-data',
      data: {
        stage: 'raw',
        content: `${line}`,
        rawOutput: line
      }
    })
  }

  sendCustomMessage(stage, message, icon = '📍') {
    sendStreamUpdate(this.sessionId, {
      type: 'stream-data',
      data: {
        stage,
        content: `${icon} ${message}`,
        timestamp: new Date().toISOString()
      }
    })
  }

  getFullOutput() {
    return this.outputBuffer
  }
}

ipcMain.handle('send-message', async (_event, options) => {
  console.log('=== IPC send-message received ===')
  console.log('Options:', JSON.stringify(options, null, 2))

  const {
    command,
    baseArgs = [],
    message,
    cwd,
    env = {},
    sessionId = `session_${Date.now()}`,
    systemPrompt // ← 新增：System Prompt 参数
  } = options || {}

  if (!command || !message) {
    console.log('❌ Missing command or message')
    return { success: false, error: 'Command and message are required' }
  }

  // 创建JSON流式处理器
  const streamProcessor = new ClaudeJsonStreamProcessor(sessionId)

  // 发送开始信号
  sendStreamUpdate(sessionId, {
    type: 'stream-start',
    data: {
      stage: 'init',
      command: `${command} ${baseArgs.join(' ')}`
    }
  })

  return new Promise((resolve) => {
    const mergedEnv = { ...process.env, ...env }

    // 构建命令行参数
    const args = [...baseArgs]

    // 如果有 System Prompt，添加 --system-prompt 参数
    if (systemPrompt && systemPrompt.trim()) {
      console.log(`📋 Adding system prompt (${systemPrompt.length} chars)`)
      args.push('--system-prompt', systemPrompt.trim())
    }

    // 最后添加用户消息
    args.push(message)

    const childProcess = spawn(command, args, {
      cwd: cwd || process.cwd(),
      env: mergedEnv,
      // 移除 shell: true 以避免特殊字符（<>、换行符等）被 shell 误解
      // Node.js spawn 会自动处理参数转义
      stdio: ['pipe', 'pipe', 'pipe']
    })

    // 将进程添加到管理Map中
    runningProcesses.set(sessionId, {
      process: childProcess,
      startTime: Date.now()
    })

    let stdout = ''
    let stderr = ''
    let isResolved = false

    // 立即发送换行符，确保命令执行
    childProcess.stdin.write('\n')
    childProcess.stdin.end()

    // 进程启动成功 - 不显示启动消息
    childProcess.on('spawn', () => {
      console.log('🎯 Process spawned successfully')
    })

    // 处理标准输出 - 直接显示Claude Code的真实输出
    childProcess.stdout.on('data', (chunk) => {
      const data = chunk.toString()
      console.log('📤 STDOUT:', data)
      stdout += data

      // 实时发送Claude Code的真实输出
      streamProcessor.processChunk(data)
    })

    // 处理错误输出
    childProcess.stderr.on('data', (chunk) => {
      const data = chunk.toString()
      console.log('❗ STDERR:', data)
      stderr += data

      // 错误输出也可能包含有用信息
      sendStreamUpdate(sessionId, {
        type: 'stream-data',
        data: {
          stage: 'warning',
          content: `⚠️ 注意: ${data.trim()}`,
          metadata: { isError: true }
        }
      })
    })


    // 进程结束处理
    childProcess.on('close', (code, signal) => {
      if (isResolved) return
      isResolved = true
      
      // 从管理Map中移除进程
      runningProcesses.delete(sessionId)

      console.log(`✅ Process finished with exit code: ${code}, signal: ${signal}`)

      // 根据信号判断是否为用户终止
      const wasTerminated = signal === 'SIGTERM' || signal === 'SIGKILL'
      let stage, content
      
      if (wasTerminated) {
        stage = 'terminated'
        content = '⏹️ 任务已被用户停止'
      } else if (code === 0) {
        stage = 'completed'
        content = '🎉 Claude Code 执行完成！'
      } else {
        stage = 'failed'
        content = '❌ Claude Code 执行失败'
      }

      // 发送完成信号
      sendStreamUpdate(sessionId, {
        type: 'stream-end',
        data: {
          stage,
          content,
          exitCode: code,
          signal,
          success: code === 0 && !wasTerminated,
          terminated: wasTerminated
        }
      })

      const result = {
        success: code === 0 && !wasTerminated,
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        exitCode: code,
        signal,
        terminated: wasTerminated
      }
      console.log('📋 Final result:', JSON.stringify(result, null, 2))
      resolve(result)
    })

    // 进程错误处理
    childProcess.on('error', (err) => {
      if (isResolved) return
      isResolved = true
      
      // 从管理Map中移除进程
      runningProcesses.delete(sessionId)

      console.log('💥 Process error:', err)

      sendStreamUpdate(sessionId, {
        type: 'stream-error',
        data: {
          stage: 'error',
          content: `💥 进程启动失败: ${err.message}`,
          error: String(err)
        }
      })

      const result = {
        success: false,
        error: String(err)
      }
      console.log('📋 Error result:', JSON.stringify(result, null, 2))
      resolve(result)
    })
  })
})

// 终止会话处理器
ipcMain.handle('terminate-session', async (_event, sessionId) => {
  console.log('=== IPC terminate-session received ===')
  console.log('SessionId:', sessionId)

  if (!sessionId) {
    console.log('❌ Missing sessionId')
    return { success: false, error: 'SessionId is required' }
  }

  const processInfo = runningProcesses.get(sessionId)
  if (!processInfo) {
    console.log('❌ No running process found for sessionId:', sessionId)
    return { success: false, error: 'No running process found for this session' }
  }

  const { process: childProcess, startTime } = processInfo
  const duration = Date.now() - startTime

  try {
    console.log(`🛑 Terminating process for session ${sessionId} (running for ${duration}ms)`)
    
    // 发送终止通知
    sendStreamUpdate(sessionId, {
      type: 'stream-data',
      data: {
        stage: 'terminating',
        content: '🛑 正在停止任务...',
        metadata: { duration }
      }
    })

    // 优雅终止：先发送 SIGTERM
    childProcess.kill('SIGTERM')
    
    // 设置强制终止的超时机制（5秒后强制 SIGKILL）
    const forceKillTimeout = setTimeout(() => {
      if (runningProcesses.has(sessionId)) {
        console.log(`💥 Force killing process for session ${sessionId}`)
        childProcess.kill('SIGKILL')
      }
    }, 5000)

    // 进程结束时清除超时并发送终止完成消息
    childProcess.on('exit', (code, signal) => {
      clearTimeout(forceKillTimeout)
      
      // 发送终止完成消息
      sendStreamUpdate(sessionId, {
        type: 'stream-end',
        data: {
          stage: 'terminated',
          content: '✅ 任务已停止',
          success: true,
          terminated: true,
          exitCode: code,
          signal: signal,
          metadata: { 
            duration,
            terminatedByUser: true
          }
        }
      })
      
      console.log(`✅ Process for session ${sessionId} terminated (code: ${code}, signal: ${signal})`)
    })

    return { 
      success: true, 
      message: 'Termination signal sent',
      duration 
    }
  } catch (error) {
    console.error('❌ Failed to terminate process:', error)
    return { 
      success: false, 
      error: String(error) 
    }
  }
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
    await checkImageExists(VNC_DOCKER_IMAGE)

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
  const command = `docker run -d --rm ${portMappings} ${envMappings} --name ${containerName} ${VNC_DOCKER_IMAGE}`

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
  console.log('🔍 [主进程] 检查VNC状态, vncContainerId:', vncContainerId)

  if (!vncContainerId) {
    console.log('❌ [主进程] vncContainerId 为空，返回 running: false')
    return { running: false }
  }

  try {
    const { stdout } = await execAsync(`docker ps -q -f id=${vncContainerId}`)
    const isRunning = stdout.trim().length > 0
    console.log('🐳 [主进程] docker ps 结果:', { stdout: stdout.trim(), isRunning })

    if (isRunning) {
      // 检查服务健康状态
      const healthStatus = await checkServiceHealth()
      console.log('✅ [主进程] 容器运行中，返回 running: true')
      return {
        running: true,
        containerId: vncContainerId,
        health: healthStatus,
        ports: VNC_PORTS
      }
    } else {
      console.log('⚠️ [主进程] 容器已停止，清空 vncContainerId')
      vncContainerId = null
      return { running: false }
    }
  } catch (error) {
    console.error('❌ [主进程] 检查VNC状态失败:', error)
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
