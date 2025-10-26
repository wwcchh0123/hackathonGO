import { useState, useCallback, useRef, useEffect } from 'react';
import { XunfeiSpeechService } from '../services/speech/XunfeiSpeechService';

/**
 * 语音识别状态
 */
export type RecognitionState = 'idle' | 'listening' | 'processing' | 'error';

/**
 * 语音识别 Hook 返回值
 */
export interface UseSpeechRecognitionReturn {
  /** 识别的文本结果 */
  transcript: string;
  /** 当前识别状态 */
  state: RecognitionState;
  /** 错误信息 */
  error: string | null;
  /** 是否支持语音识别 */
  isSupported: boolean;
  /** 开始语音识别 */
  startListening: () => void;
  /** 停止语音识别 */
  stopListening: () => void;
  /** 重置识别结果 */
  resetTranscript: () => void;
}

/**
 * 语音识别配置选项
 */
export interface SpeechRecognitionOptions {
  /** 是否持续识别（默认 false） */
  continuous?: boolean;
  /** 语言设置（默认 'zh_cn'） */
  lang?: string;
  /** 是否返回临时结果（默认 true） */
  interimResults?: boolean;
}

/**
 * 科大讯飞 API 配置
 *
 * 获取方式：
 * 1. 访问 https://console.xfyun.cn/
 * 2. 注册/登录账号
 * 3. 创建应用，获取 APPID、API Secret、API Key
 * 4. 配置到环境变量 .env 文件中
 */
interface XunfeiCredentials {
  appId: string;
  apiSecret: string;
  apiKey: string;
}

/**
 * 从环境变量获取科大讯飞凭证
 */
function getXunfeiCredentials(): XunfeiCredentials {
  const appId = import.meta.env.VITE_XUNFEI_APP_ID;
  const apiSecret = import.meta.env.VITE_XUNFEI_API_SECRET;
  const apiKey = import.meta.env.VITE_XUNFEI_API_KEY;

  if (!appId || !apiSecret || !apiKey) {
    throw new Error(
      '缺少科大讯飞 API 配置。请在 .env 文件中设置：\n' +
      'VITE_XUNFEI_APP_ID=你的APPID\n' +
      'VITE_XUNFEI_API_SECRET=你的APISecret\n' +
      'VITE_XUNFEI_API_KEY=你的APIKey\n\n' +
      '获取方式：https://console.xfyun.cn/'
    );
  }

  return { appId, apiSecret, apiKey };
}

/**
 * 自定义 Hook：语音识别（科大讯飞）
 *
 * 基于科大讯飞 WebSocket API 实现语音转文字功能
 * 支持中文语音识别，适用于驱动 AI 操作电脑的场景
 * 无需科学上网，国内网络稳定可用
 *
 * @param options - 语音识别配置选项
 * @returns 语音识别状态和控制方法
 *
 * @example
 * ```tsx
 * const { transcript, state, startListening, stopListening } = useSpeechRecognition({
 *   lang: 'zh_cn',
 *   continuous: false
 * });
 * ```
 */
export const useSpeechRecognition = (
  options: SpeechRecognitionOptions = {}
): UseSpeechRecognitionReturn => {
  const {
    continuous = false,
    lang = 'zh_cn',
    interimResults = true
  } = options;

  const [transcript, setTranscript] = useState<string>('');
  const [state, setState] = useState<RecognitionState>('idle');
  const [error, setError] = useState<string | null>(null);

  const serviceRef = useRef<XunfeiSpeechService | null>(null);
  const isListeningRef = useRef<boolean>(false);

  // 检查是否支持
  const isSupported = typeof window !== 'undefined' &&
    'WebSocket' in window &&
    'MediaRecorder' in window;

  // 初始化服务
  useEffect(() => {
    if (!isSupported) return;

    try {
      // 获取科大讯飞凭证
      const credentials = getXunfeiCredentials();

      // 创建服务实例
      serviceRef.current = new XunfeiSpeechService(credentials);

      // 初始化配置
      serviceRef.current.initialize({
        language: lang,
        continuous,
        interimResults
      });

      console.log('✅ 科大讯飞语音识别服务初始化成功');
    } catch (err) {
      console.error('❌ 初始化失败:', err);
      setError((err as Error).message);
      setState('error');
    }

    // 组件卸载时清理
    return () => {
      if (serviceRef.current) {
        serviceRef.current.dispose();
        serviceRef.current = null;
      }
    };
  }, [isSupported, lang, continuous, interimResults]);

  // 开始监听
  const startListening = useCallback(() => {
    if (!isSupported) {
      setError('当前浏览器不支持语音识别');
      setState('error');
      return;
    }

    if (!serviceRef.current) {
      setError('语音识别服务未初始化');
      setState('error');
      return;
    }

    if (isListeningRef.current) {
      console.log('⚠️ 语音识别已在运行中');
      return;
    }

    setTranscript('');
    setError(null);
    isListeningRef.current = true;

    serviceRef.current.start({
      onStart: () => {
        setState('listening');
        console.log('🎤 开始语音识别');
      },

      onResult: (result) => {
        console.log('📝 Hook 收到识别结果:', result.text, '最终结果:', result.isFinal);

        // 直接设置文本（服务层已经累积了）
        setTranscript(result.text);
        console.log('📝 更新后的 transcript:', result.text);

        if (result.isFinal) {
          setState('processing');
        }
      },

      onEnd: () => {
        console.log('🛑 语音识别结束');
        isListeningRef.current = false;

        // 如果是 continuous 模式且仍在监听，则重新启动
        if (continuous && isListeningRef.current) {
          console.log('🔄 continuous 模式，重新启动识别');
          setTimeout(() => {
            if (isListeningRef.current && serviceRef.current) {
              startListening();
            }
          }, 100);
        } else {
          setState('idle');
        }
      },

      onError: (err) => {
        console.error('❌ 语音识别错误:', err);
        isListeningRef.current = false;
        setError(err.message);
        setState('error');
      }
    }).catch((err) => {
      console.error('❌ 启动语音识别失败:', err);
      isListeningRef.current = false;
      setError(err.message);
      setState('error');
    });
  }, [isSupported, continuous]);

  // 停止监听
  const stopListening = useCallback(() => {
    if (!serviceRef.current) return;

    console.log('⏹️ 停止语音识别');
    isListeningRef.current = false;
    serviceRef.current.stop();
  }, []);

  // 重置识别结果
  const resetTranscript = useCallback(() => {
    setTranscript('');
    setError(null);
    setState('idle');
  }, []);

  return {
    transcript,
    state,
    error,
    isSupported,
    startListening,
    stopListening,
    resetTranscript
  };
};
