/**
 * 科大讯飞语音识别服务
 *
 * 基于科大讯飞 WebSocket API 实现实时语音识别
 * 文档：https://www.xfyun.cn/doc/asr/voicedictation/API.html
 */

import CryptoJS from 'crypto-js';
import type {
  ISpeechRecognitionService,
  SpeechRecognitionConfig,
  SpeechRecognitionListeners,
  SpeechRecognitionResult
} from './types';

/**
 * 科大讯飞配置
 */
export interface XunfeiConfig {
  /** APPID */
  appId: string;
  /** API Secret */
  apiSecret: string;
  /** API Key */
  apiKey: string;
}


/**
 * 科大讯飞语音识别服务
 */
export class XunfeiSpeechService implements ISpeechRecognitionService {
  private config: XunfeiConfig;
  private ws: WebSocket | null = null;
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private scriptProcessor: ScriptProcessorNode | null = null;
  private listeners: SpeechRecognitionListeners = {};
  private recognitionConfig: SpeechRecognitionConfig = {};
  private isRecording = false;
  private audioDataBuffer: Int16Array[] = [];
  private resultText = ''; // 最终确认的识别结果
  private resultTextTemp = ''; // 临时识别结果（包含未确认的部分）
  private sendAudioTimer: number | null = null; // 定时发送音频的定时器
  private actualSampleRate = 16000; // 实际的音频采样率
  private isFirstFrameSent = false; // 标记首帧（纯参数）是否已发送

  constructor(config: XunfeiConfig) {
    this.config = config;
  }

  /**
   * 初始化服务
   */
  initialize(config: SpeechRecognitionConfig): void {
    this.recognitionConfig = {
      language: config.language || 'zh_cn',
      continuous: config.continuous ?? false,
      interimResults: config.interimResults ?? true
    };
  }

  /**
   * 是否支持语音识别
   */
  isSupported(): boolean {
    return (
      typeof window !== 'undefined' &&
      'WebSocket' in window &&
      'AudioContext' in window &&
      'getUserMedia' in navigator.mediaDevices
    );
  }

  /**
   * 开始识别
   */
  async start(listeners: SpeechRecognitionListeners): Promise<void> {
    if (!this.isSupported()) {
      throw new Error('当前浏览器不支持语音识别');
    }

    if (this.isRecording) {
      console.warn('语音识别已在运行中');
      return;
    }

    this.listeners = listeners;
    this.audioDataBuffer = [];
    this.isFirstFrameSent = false; // 重置首帧标记
    this.resultText = ''; // 重置最终文本
    this.resultTextTemp = ''; // 重置临时文本

    try {
      // 1. 先获取麦克风权限并准备录音（但不立即开始）
      await this.initializeRecording();

      // 2. 设置录音状态（允许音频处理器开始采集）
      this.isRecording = true;

      // 3. 连接 WebSocket（连接成功后会自动发送首帧并开始定时发送）
      await this.connectWebSocket();

      this.listeners.onStart?.();
    } catch (error) {
      this.handleError(error as Error);
      throw error;
    }
  }

  /**
   * 停止识别
   */
  stop(): void {
    if (!this.isRecording) return;

    console.log('⏹️ 停止录音...');
    this.isRecording = false;

    // 停止定时器
    if (this.sendAudioTimer !== null) {
      clearInterval(this.sendAudioTimer);
      this.sendAudioTimer = null;
    }

    // 停止音频处理
    if (this.scriptProcessor) {
      this.scriptProcessor.disconnect();
      this.scriptProcessor = null;
    }

    // 停止媒体流
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }

    // 关闭音频上下文
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    // 发送结束标记
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const endFrame = {
        data: {
          status: 2, // 2 表示数据传输结束
          format: 'audio/L16;rate=16000',
          encoding: 'raw',
          audio: ''
        }
      };
      this.ws.send(JSON.stringify(endFrame));
      console.log('📤 发送结束标记');
    }

    this.listeners.onEnd?.();
  }

  /**
   * 清理资源
   */
  dispose(): void {
    this.stop();

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.listeners = {};
    this.audioDataBuffer = [];
  }

  /**
   * 连接 WebSocket
   */
  private async connectWebSocket(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const url = this.getWebSocketUrl();
        console.log('🔌 连接科大讯飞 WebSocket...');

        this.ws = new WebSocket(url);

        this.ws.onopen = () => {
          console.log('✅ WebSocket 连接成功');

          // 立即发送首帧（纯参数，无音频数据）
          this.sendFirstFrame();

          // 首帧发送后立即开始录音，确保尽快发送音频数据
          this.startAudioCapture();

          resolve();
        };

        this.ws.onmessage = (event) => {
          this.handleWebSocketMessage(event);
        };

        this.ws.onerror = (error) => {
          console.error('❌ WebSocket 错误:', error);
          reject(new Error('WebSocket 连接失败'));
        };

        this.ws.onclose = (event) => {
          console.log('🔌 WebSocket 连接已关闭', event.code, event.reason);
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * 生成 WebSocket URL（包含鉴权）
   */
  private getWebSocketUrl(): string {
    const host = 'iat-api.xfyun.cn';
    const path = '/v2/iat';
    const date = new Date().toUTCString();

    // 1. 生成签名原文
    const signatureOrigin = `host: ${host}\ndate: ${date}\nGET ${path} HTTP/1.1`;

    // 2. 使用 HMAC-SHA256 加密
    const signatureSha = CryptoJS.HmacSHA256(signatureOrigin, this.config.apiSecret);
    const signature = CryptoJS.enc.Base64.stringify(signatureSha);

    // 3. 生成 authorization_origin
    const authorizationOrigin = `api_key="${this.config.apiKey}", algorithm="hmac-sha256", headers="host date request-line", signature="${signature}"`;

    // 4. Base64 编码（authorizationOrigin 是 ASCII 字符串，可以使用 btoa）
    const authorization = btoa(authorizationOrigin);

    // 5. 拼接 URL，添加鉴权参数和 APPID
    const url = `wss://${host}${path}?authorization=${encodeURIComponent(authorization)}&date=${encodeURIComponent(
      date
    )}&host=${host}&appid=${this.config.appId}`;

    return url;
  }

  /**
   * 初始化录音（获取麦克风权限并创建音频上下文，但不开始采集）
   */
  private async initializeRecording(): Promise<void> {
    try {
      // 获取麦克风流
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      this.mediaStream = stream;

      // 创建音频上下文（使用浏览器默认采样率，然后通过重采样转换为 16kHz）
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

      const source = this.audioContext.createMediaStreamSource(stream);

      // 创建 ScriptProcessor 处理音频（4096 采样点缓冲）
      const bufferSize = 4096;
      this.scriptProcessor = this.audioContext.createScriptProcessor(bufferSize, 1, 1);

      // 音频处理回调
      this.scriptProcessor.onaudioprocess = (event) => {
        if (!this.isRecording) return;

        const inputData = event.inputBuffer.getChannelData(0);

        // 计算音量（RMS）
        let sum = 0;
        for (let i = 0; i < inputData.length; i++) {
          sum += inputData[i] * inputData[i];
        }
        const rms = Math.sqrt(sum / inputData.length);
        const volume = Math.round(rms * 100);

        // 每隔一段时间打印音量，避免日志过多
        if (Math.random() < 0.1) { // 大约 10% 的概率打印
          console.log('🎤 当前音量:', volume, '%');
        }

        const pcmData = this.float32ToPCM16(inputData);

        // 缓存音频数据，由定时器负责发送
        this.audioDataBuffer.push(pcmData);
      };

      // 连接音频节点（准备就绪，但此时 isRecording 为 false，不会处理音频）
      source.connect(this.scriptProcessor);
      this.scriptProcessor.connect(this.audioContext.destination);

      // 保存实际采样率
      this.actualSampleRate = this.audioContext.sampleRate;

      console.log('🎤 AudioContext 信息:');
      console.log('  - 实际采样率:', this.actualSampleRate, 'Hz');
      console.log('  - 目标采样率: 16000 Hz');
      console.log('  - 状态:', this.audioContext.state);

      // 验证采样率并提示重采样
      if (this.actualSampleRate !== 16000) {
        console.log(`✅ 将自动进行重采样: ${this.actualSampleRate}Hz → 16000Hz`);
        console.log(`  - 重采样比例: ${(this.actualSampleRate / 16000).toFixed(2)}:1`);
      } else {
        console.log('✅ 采样率匹配，无需重采样');
      }
    } catch (error) {
      throw new Error(`无法访问麦克风: ${(error as Error).message}`);
    }
  }

  /**
   * 开始音频采集（在首帧发送后调用）
   */
  private startAudioCapture(): void {
    console.log('🎙️ 开始音频采集...');

    // 启动定时发送音频（每 200ms 发送一次，确保有足够数据）
    this.sendAudioTimer = window.setInterval(() => {
      this.sendBufferedAudio();
    }, 200);

    console.log('✅ 定时器已启动，每 200ms 发送一次音频数据');
  }

  /**
   * Float32Array 转 PCM16（包含重采样到 16kHz）
   */
  private float32ToPCM16(float32Array: Float32Array): Int16Array {
    let samples = float32Array;

    // 如果实际采样率不是 16000Hz，需要重采样
    if (this.actualSampleRate !== 16000) {
      samples = this.resample(float32Array, this.actualSampleRate, 16000);
    }

    // 转换为 PCM16
    const pcm16 = new Int16Array(samples.length);
    for (let i = 0; i < samples.length; i++) {
      const s = Math.max(-1, Math.min(1, samples[i]));
      pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    return pcm16;
  }

  /**
   * 重采样：将音频从 sourceSampleRate 重采样到 targetSampleRate
   *
   * 改进版算法：
   * - 上采样（低频→高频）：使用线性插值
   * - 下采样（高频→低频）：使用多点抽取+平均（抗混叠）
   */
  private resample(
    audioData: Float32Array,
    sourceSampleRate: number,
    targetSampleRate: number
  ): Float32Array {
    if (sourceSampleRate === targetSampleRate) {
      return audioData;
    }

    const ratio = sourceSampleRate / targetSampleRate;
    const newLength = Math.round(audioData.length / ratio);
    const result = new Float32Array(newLength);

    if (ratio < 1) {
      // 上采样（低频 → 高频）：线性插值
      for (let i = 0; i < newLength; i++) {
        const srcIndex = i * ratio;
        const srcIndexFloor = Math.floor(srcIndex);
        const srcIndexCeil = Math.min(srcIndexFloor + 1, audioData.length - 1);
        const fraction = srcIndex - srcIndexFloor;

        // 线性插值
        result[i] = audioData[srcIndexFloor] * (1 - fraction) + audioData[srcIndexCeil] * fraction;
      }
    } else {
      // 下采样（高频 → 低频）：多点抽取 + 平均（抗混叠）
      for (let i = 0; i < newLength; i++) {
        const srcStart = Math.floor(i * ratio);
        const srcEnd = Math.min(Math.floor((i + 1) * ratio), audioData.length);

        // 累加多个源采样点
        let sum = 0;
        for (let j = srcStart; j < srcEnd; j++) {
          sum += audioData[j];
        }

        // 取平均值（相当于低通滤波，避免混叠失真）
        result[i] = sum / (srcEnd - srcStart);
      }
    }

    return result;
  }

  /**
   * 发送首帧（纯参数，无音频数据）
   */
  private sendFirstFrame(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.error('❌ WebSocket 未连接，无法发送首帧');
      return;
    }

    if (this.isFirstFrameSent) {
      console.warn('⚠️ 首帧已发送，跳过');
      return;
    }

    const firstFrame = {
      common: {
        app_id: this.config.appId
      },
      business: {
        language: this.recognitionConfig.language || 'zh_cn',
        domain: 'iat', // 领域：通用听写（日常用语）
        accent: 'mandarin', // 口音：普通话
        vad_eos: 5000, // 后端点检测：5秒静默后结束
        dwa: 'wpgs', // 开启动态修正（仅中文支持）
        ptt: 1, // 开启标点符号
        nunum: 1 // 数字转阿拉伯数字格式
      },
      data: {
        status: 0, // 0 表示首帧
        format: 'audio/L16;rate=16000',
        encoding: 'raw',
        audio: '' // 首帧音频数据为空
      }
    };

    this.ws.send(JSON.stringify(firstFrame));
    this.isFirstFrameSent = true;
    console.log('📤 已发送首帧（纯参数，无音频）');
  }

  /**
   * 发送缓存的音频数据
   */
  private sendBufferedAudio(): void {
    // 如果缓冲区为空，不发送
    if (this.audioDataBuffer.length === 0) {
      // 首次可能没有数据，这是正常的
      return;
    }

    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('⚠️ WebSocket 未连接，无法发送音频数据');
      return;
    }

    // 合并所有缓冲的音频数据
    const totalLength = this.audioDataBuffer.reduce((sum, arr) => sum + arr.length, 0);
    const mergedData = new Int16Array(totalLength);

    let offset = 0;
    for (const chunk of this.audioDataBuffer) {
      mergedData.set(chunk, offset);
      offset += chunk.length;
    }

    // 清空缓冲
    this.audioDataBuffer = [];

    // 如果合并后的数据为空，不发送
    if (mergedData.length === 0) {
      console.log('⚠️ 音频数据为空，跳过发送');
      return;
    }

    // 转换为 Base64
    const base64Audio = this.pcmToBase64(mergedData);

    // 构造音频数据帧（所有音频帧都使用 status: 1）
    const frame = {
      data: {
        status: 1, // 1 表示音频数据中
        format: 'audio/L16;rate=16000',
        encoding: 'raw',
        audio: base64Audio
      }
    };

    // 详细的数据验证和日志
    console.log('📊 音频数据统计:');
    console.log('  - 采样点数:', mergedData.length);
    console.log('  - 字节数:', mergedData.byteLength);
    console.log('  - 持续时间:', (mergedData.length / 16000).toFixed(3), '秒');
    console.log('  - Base64 长度:', base64Audio.length);

    // 验证重采样是否正确
    if (this.actualSampleRate !== 16000) {
      console.log('  - 实际采样率:', this.actualSampleRate, 'Hz');
      console.log('  - 重采样比例:', (this.actualSampleRate / 16000).toFixed(2) + ':1');
    }

    // 检查音频数据样本（验证不是静音）
    const sampleSize = Math.min(10, mergedData.length);
    const samples = Array.from(mergedData.slice(0, sampleSize));
    console.log('  - 数据样本（前' + sampleSize + '个）:', samples);

    const allZero = samples.every(v => v === 0);
    if (allZero) {
      console.warn('⚠️ 警告：音频数据全为 0，可能没有采集到声音');
    }

    // 发送数据
    this.ws.send(JSON.stringify(frame));
    console.log('✅ 音频数据已发送');
  }

  /**
   * PCM16 转 Base64
   *
   * 注意：必须使用浏览器原生的 btoa() 函数，不能使用 js-base64 库
   * 因为 js-base64 的 encode() 期望 UTF-8 字符串，会对二进制数据产生错误编码
   */
  private pcmToBase64(pcm16: Int16Array): string {
    const uint8Array = new Uint8Array(pcm16.buffer);

    // 将字节数组转换为二进制字符串
    let binary = '';
    for (let i = 0; i < uint8Array.length; i++) {
      binary += String.fromCharCode(uint8Array[i]);
    }

    // 使用浏览器原生 btoa() 进行 Base64 编码（处理二进制数据）
    const base64 = btoa(binary);

    // 验证 Base64 编码长度是否正确
    const expectedLength = Math.ceil(uint8Array.length / 3) * 4;
    if (Math.abs(base64.length - expectedLength) > 4) {
      console.warn('⚠️ Base64 编码长度异常:', {
        实际长度: base64.length,
        预期长度: expectedLength,
        原始字节数: uint8Array.length
      });
    } else {
      // 编码正确，移除警告（只在异常时打印）
    }

    return base64;
  }

  /**
   * 处理 WebSocket 消息
   */
  private handleWebSocketMessage(event: MessageEvent): void {
    try {
      const response = JSON.parse(event.data);
      console.log('📥 收到 WebSocket 消息:', response);

      // 检查错误
      if (response.code !== 0) {
        console.error('❌ 识别错误:', response.message);
        console.error('完整响应:', response);

        // 提供友好的错误提示
        let errorMessage = response.message;
        switch (response.code) {
          case 10013:
            errorMessage = 'APPID 不存在或无效';
            break;
          case 10313:
            errorMessage = '缺少 APPID 参数';
            break;
          case 11200:
            errorMessage = '未授权的功能访问，请检查服务是否已开通';
            break;
          case 10163:
            errorMessage = '参数验证失败，请检查配置参数';
            break;
          case 10165:
            errorMessage = '会话句柄无效（服务器读取消息超时，可能是首帧后没有及时发送音频数据）';
            break;
          case 10200:
            errorMessage = '长时间无数据传输，连接已断开';
            break;
          case 10160:
            errorMessage = '音频格式错误';
            break;
          default:
            errorMessage = `${response.message} (错误代码: ${response.code})`;
        }

        this.handleError(new Error(errorMessage));
        return;
      }

      // 解析识别结果
      if (response.data && response.data.result) {
        console.log('📝 原始识别结果:', response.data.result);
        const data = response.data.result;

        // 提取文本
        let str = '';
        const ws = data.ws || [];
        for (let i = 0; i < ws.length; i++) {
          const cw = ws[i].cw || [];
          for (let j = 0; j < cw.length; j++) {
            str += cw[j].w || '';
          }
        }

        console.log('🔍 本次识别文本:', `"${str}"`);

        // 处理动态修正
        if (data.pgs) {
          console.log('🔄 动态修正模式:', data.pgs);

          if (data.pgs === 'apd') {
            // 追加模式：将临时结果同步到最终结果
            this.resultText = this.resultTextTemp;
          }

          // 更新临时结果（最终结果 + 当前文本）
          this.resultTextTemp = this.resultText + str;
        } else {
          // 无动态修正：直接追加
          this.resultText = this.resultText + str;
          this.resultTextTemp = this.resultText;
        }

        console.log('✅ 最终文本:', this.resultText);
        console.log('✅ 临时文本:', this.resultTextTemp);

        // 返回临时结果（显示给用户，包含未确认的部分）
        const displayText = this.resultTextTemp || this.resultText;
        const result: SpeechRecognitionResult = {
          text: displayText,
          isFinal: data.ls === true,
          confidence: 1
        };

        console.log('✅ 发送给 Hook 的结果:', result);
        this.listeners.onResult?.(result);
      }

      // 检查是否为最后一帧
      if (response.data && response.data.status === 2) {
        console.log('✅ 识别完成（最后一帧）');
      }
    } catch (error) {
      console.error('❌ 解析响应失败:', error);
      console.error('原始数据:', event.data);
    }
  }


  /**
   * 处理错误
   */
  private handleError(error: Error): void {
    console.error('❌ 语音识别错误:', error);
    this.isRecording = false;
    this.listeners.onError?.(error);
  }
}
