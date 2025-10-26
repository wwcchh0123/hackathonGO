/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** 科大讯飞 APPID */
  readonly VITE_XUNFEI_APP_ID: string;
  /** 科大讯飞 API Secret */
  readonly VITE_XUNFEI_API_SECRET: string;
  /** 科大讯飞 API Key */
  readonly VITE_XUNFEI_API_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// Electron API 类型定义
declare global {
  interface Window {
    api: {
      // 消息发送API
      sendMessage: (options: {
        command: string;
        baseArgs?: string[];
        message: string;
        cwd?: string;
        env?: Record<string, string>;
        sessionId?: string;
        systemPrompt?: string;
      }) => Promise<{
        success: boolean;
        stdout?: string;
        stderr?: string;
        exitCode?: number;
        error?: string;
        signal?: string;
        terminated?: boolean;
      }>;
      
      // 任务终止API
      terminateSession: (sessionId: string) => Promise<{
        success: boolean;
        message?: string;
        duration?: number;
        error?: string;
      }>;
      
      // 目录选择API
      selectDir: () => Promise<string | null>;
      
      // 会话持久化API
      sessions: {
        load: () => Promise<{
          sessions: any[];
          activeSessionId: string | null;
        }>;
        save: (data: any) => Promise<{
          success: boolean;
          error?: string;
        }>;
      };
      
      // 流式输出API
      onClaudeStream?: (callback: (event: any, message: any) => void) => () => void;
      offClaudeStream?: (callback: any) => void;
      
      // VNC管理API
      vnc?: {
        start: () => Promise<any>;
        stop: () => Promise<any>;
        status: () => Promise<any>;
        onContainerStopped: (callback: any) => () => void;
      };
    };
  }
}
