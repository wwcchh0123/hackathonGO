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
      
      // 流式 API
      startStream?: (options: {
        command: string
        baseArgs?: string[]
        message: string
        cwd?: string
        env?: Record<string, string>
        model?: string
      }) => void
      
      onStreamStarted?: (callback: (event: any, data: any) => void) => () => void
      onStreamData?: (callback: (event: any, data: any) => void) => () => void
      onStreamEnd?: (callback: (event: any, data: any) => void) => () => void
      onStreamError?: (callback: (event: any, data: any) => void) => () => void
      
      pauseStream?: (streamId: string) => void
      resumeStream?: (streamId: string) => void
      abortStream?: (streamId: string) => void
      getActiveStreams?: () => Promise<string[]>
      
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
    }
  }
}
