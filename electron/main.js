import { app, BrowserWindow, ipcMain, dialog } from 'electron'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawn } from 'node:child_process'

let mainWindow
const isDev = process.env.ELECTRON_DEV === 'true'
const __filename = fileURLToPath(import.meta.url)

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
