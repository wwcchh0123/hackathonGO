/**
 * 语音识别服务类型定义
 */

/**
 * 语音识别状态
 */
export type SpeechRecognitionState = 'idle' | 'listening' | 'processing' | 'error';

/**
 * 语音识别结果
 */
export interface SpeechRecognitionResult {
  /** 识别的文本 */
  text: string;
  /** 是否为最终结果 */
  isFinal: boolean;
  /** 置信度 (0-1) */
  confidence?: number;
}

/**
 * 语音识别配置
 */
export interface SpeechRecognitionConfig {
  /** 语言 */
  language?: string;
  /** 是否持续识别 */
  continuous?: boolean;
  /** 是否返回临时结果 */
  interimResults?: boolean;
}

/**
 * 语音识别事件监听器
 */
export interface SpeechRecognitionListeners {
  /** 识别开始 */
  onStart?: () => void;
  /** 识别结果 */
  onResult?: (result: SpeechRecognitionResult) => void;
  /** 识别结束 */
  onEnd?: () => void;
  /** 识别错误 */
  onError?: (error: Error) => void;
}

/**
 * 语音识别服务抽象接口
 */
export interface ISpeechRecognitionService {
  /** 初始化服务 */
  initialize(config: SpeechRecognitionConfig): void;

  /** 开始识别 */
  start(listeners: SpeechRecognitionListeners): Promise<void>;

  /** 停止识别 */
  stop(): void;

  /** 是否支持 */
  isSupported(): boolean;

  /** 清理资源 */
  dispose(): void;
}
