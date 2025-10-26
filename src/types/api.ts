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
  ports?: {
    vnc: number
    web: number
    streamlit?: number
    tools?: number
  }
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
        sessionId?: string
        systemPrompt?: string // ← 新增：System Prompt 参数
      }) => Promise<{
        success: boolean
        stdout?: string
        stderr?: string
        error?: string
        exitCode?: number
        signal?: string
        terminated?: boolean
      }>

      // 任务终止API
      terminateSession: (sessionId: string) => Promise<{
        success: boolean
        message?: string
        duration?: number
        error?: string
      }>

      selectDir: () => Promise<string | null>

      // 会话持久化接口
      sessions: {
        load: () => Promise<import('./session').SessionStorage>
        save: (data: import('./session').SessionStorage) => Promise<{ success: boolean; error?: string }>
      }

      vnc: {
        start: () => Promise<VncStartResult>
        stop: () => Promise<VncStopResult>
        status: () => Promise<VncStatus>
        onContainerStopped: (callback: () => void) => () => void
      }

      // 流式事件监听
      onClaudeStream?: (callback: (event: any, message: any) => void) => () => void
      offClaudeStream?: (callback: any) => void
    }
  }
}
