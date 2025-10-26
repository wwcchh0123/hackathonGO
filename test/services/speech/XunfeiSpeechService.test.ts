import '@testing-library/jest-dom'
import { XunfeiSpeechService } from '../../../src/services/speech/XunfeiSpeechService'
import type { SpeechRecognitionListeners } from '../../../src/services/speech/types'

describe('XunfeiSpeechService', () => {
  let service: XunfeiSpeechService
  let mockWebSocket: any
  let mockAudioContext: any
  let mockMediaStream: any
  let mockScriptProcessor: any

  const mockConfig = {
    appId: 'test-app-id',
    apiSecret: 'test-api-secret',
    apiKey: 'test-api-key'
  }

  beforeEach(() => {
    jest.clearAllMocks()

    global.WebSocket = jest.fn() as any
    ;(global.WebSocket as any).OPEN = 1

    mockWebSocket = {
      send: jest.fn(),
      close: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      readyState: 1
    }

    mockScriptProcessor = {
      connect: jest.fn(),
      disconnect: jest.fn(),
      onaudioprocess: null
    }

    mockMediaStream = {
      getTracks: jest.fn(() => [
        {
          stop: jest.fn()
        }
      ])
    }

    mockAudioContext = {
      createMediaStreamSource: jest.fn(() => ({
        connect: jest.fn()
      })),
      createScriptProcessor: jest.fn(() => mockScriptProcessor),
      close: jest.fn(),
      destination: {},
      sampleRate: 48000,
      state: 'running'
    }

    ;(global.WebSocket as any).mockImplementation(() => mockWebSocket)
    global.AudioContext = jest.fn(() => mockAudioContext) as any

    Object.defineProperty(navigator, 'mediaDevices', {
      writable: true,
      value: {
        getUserMedia: jest.fn().mockResolvedValue(mockMediaStream)
      }
    })

    service = new XunfeiSpeechService(mockConfig)
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('初始化', () => {
    it('应该创建服务实例', () => {
      expect(service).toBeInstanceOf(XunfeiSpeechService)
    })

    it('应该初始化配置', () => {
      service.initialize({
        language: 'zh_cn',
        continuous: false,
        interimResults: true
      })

      expect(service).toBeDefined()
    })

    it('应该使用默认配置初始化', () => {
      service.initialize({})

      expect(service).toBeDefined()
    })
  })

  describe('支持检测', () => {
    it('应该在支持的浏览器中返回 true', () => {
      expect(service.isSupported()).toBe(true)
    })

    it('应该在不支持 WebSocket 时返回 false', () => {
      delete (window as any).WebSocket
      expect(service.isSupported()).toBe(false)
    })

    it('应该在不支持 AudioContext 时返回 false', () => {
      delete (window as any).AudioContext
      expect(service.isSupported()).toBe(false)
    })

    it('应该在不支持 getUserMedia 时返回 false', () => {
      Object.defineProperty(navigator, 'mediaDevices', {
        writable: true,
        value: {}
      })
      expect(service.isSupported()).toBe(false)
    })
  })

  describe('开始识别', () => {
    let listeners: SpeechRecognitionListeners

    beforeEach(() => {
      listeners = {
        onStart: jest.fn(),
        onResult: jest.fn(),
        onEnd: jest.fn(),
        onError: jest.fn()
      }

      service.initialize({
        language: 'zh_cn',
        continuous: false,
        interimResults: true
      })
    })

    it('应该开始语音识别', async () => {
      await service.start(listeners)

      expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      })
    })

    it('应该在不支持时抛出错误', async () => {
      delete (window as any).WebSocket

      await expect(service.start(listeners)).rejects.toThrow(
        '当前浏览器不支持语音识别'
      )
    })

    it('应该在已运行时不重复启动', async () => {
      const promise1 = service.start(listeners)
      const promise2 = service.start(listeners)

      await promise1
      await promise2

      expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledTimes(1)
    })

    it('应该连接 WebSocket', async () => {
      await service.start(listeners)

      expect(global.WebSocket).toHaveBeenCalled()
    })

    it('应该调用 onStart 回调', async () => {
      const startPromise = service.start(listeners)

      mockWebSocket.onopen?.()

      await startPromise

      expect(listeners.onStart).toHaveBeenCalled()
    })

    it('应该处理麦克风权限错误', async () => {
      const error = new Error('麦克风权限被拒绝')
      ;(navigator.mediaDevices.getUserMedia as jest.Mock).mockRejectedValue(
        error
      )

      await expect(service.start(listeners)).rejects.toThrow()
      expect(listeners.onError).toHaveBeenCalled()
    })

    it('应该处理 WebSocket 连接错误', async () => {
      const startPromise = service.start(listeners)

      mockWebSocket.onerror?.(new Error('连接失败'))

      await expect(startPromise).rejects.toThrow('WebSocket 连接失败')
    })

    it('应该发送首帧参数', async () => {
      const startPromise = service.start(listeners)

      mockWebSocket.onopen?.()

      await startPromise

      expect(mockWebSocket.send).toHaveBeenCalled()
      const firstCall = mockWebSocket.send.mock.calls[0][0]
      const frame = JSON.parse(firstCall)
      expect(frame.data.status).toBe(0)
    })
  })

  describe('停止识别', () => {
    let listeners: SpeechRecognitionListeners

    beforeEach(() => {
      listeners = {
        onStart: jest.fn(),
        onResult: jest.fn(),
        onEnd: jest.fn(),
        onError: jest.fn()
      }

      service.initialize({
        language: 'zh_cn',
        continuous: false,
        interimResults: true
      })
    })

    it('应该停止语音识别', async () => {
      await service.start(listeners)
      mockWebSocket.onopen?.()

      service.stop()

      expect(mockMediaStream.getTracks()[0].stop).toHaveBeenCalled()
      expect(mockAudioContext.close).toHaveBeenCalled()
    })

    it('应该发送结束标记', async () => {
      await service.start(listeners)
      mockWebSocket.onopen?.()

      service.stop()

      const endFrame = mockWebSocket.send.mock.calls.find((call: any) => {
        const frame = JSON.parse(call[0])
        return frame.data?.status === 2
      })
      expect(endFrame).toBeDefined()
    })

    it('应该调用 onEnd 回调', async () => {
      await service.start(listeners)
      mockWebSocket.onopen?.()

      service.stop()

      expect(listeners.onEnd).toHaveBeenCalled()
    })

    it('应该在未启动时不执行任何操作', () => {
      expect(() => service.stop()).not.toThrow()
    })
  })

  describe('识别结果处理', () => {
    let listeners: SpeechRecognitionListeners

    beforeEach(() => {
      listeners = {
        onStart: jest.fn(),
        onResult: jest.fn(),
        onEnd: jest.fn(),
        onError: jest.fn()
      }

      service.initialize({
        language: 'zh_cn',
        continuous: false,
        interimResults: true
      })
    })

    it('应该处理识别结果', async () => {
      await service.start(listeners)
      mockWebSocket.onopen?.()

      const message = {
        data: JSON.stringify({
          code: 0,
          data: {
            result: {
              ws: [
                {
                  cw: [{ w: '你好' }]
                }
              ],
              ls: false
            }
          }
        })
      }

      mockWebSocket.onmessage?.(message)

      expect(listeners.onResult).toHaveBeenCalledWith({
        text: expect.stringContaining('你好'),
        isFinal: false,
        confidence: 1
      })
    })

    it('应该处理最终结果', async () => {
      await service.start(listeners)
      mockWebSocket.onopen?.()

      const message = {
        data: JSON.stringify({
          code: 0,
          data: {
            result: {
              ws: [
                {
                  cw: [{ w: '你好世界' }]
                }
              ],
              ls: true
            }
          }
        })
      }

      mockWebSocket.onmessage?.(message)

      expect(listeners.onResult).toHaveBeenCalledWith({
        text: expect.stringContaining('你好世界'),
        isFinal: true,
        confidence: 1
      })
    })

    it('应该处理动态修正模式', async () => {
      await service.start(listeners)
      mockWebSocket.onopen?.()

      const message1 = {
        data: JSON.stringify({
          code: 0,
          data: {
            result: {
              ws: [{ cw: [{ w: '你好' }] }],
              pgs: 'apd',
              ls: false
            }
          }
        })
      }

      mockWebSocket.onmessage?.(message1)

      const message2 = {
        data: JSON.stringify({
          code: 0,
          data: {
            result: {
              ws: [{ cw: [{ w: '世界' }] }],
              pgs: 'apd',
              ls: false
            }
          }
        })
      }

      mockWebSocket.onmessage?.(message2)

      expect(listeners.onResult).toHaveBeenCalledTimes(2)
    })

    it('应该处理 API 错误', async () => {
      await service.start(listeners)
      mockWebSocket.onopen?.()

      const errorMessage = {
        data: JSON.stringify({
          code: 10013,
          message: 'APPID 不存在'
        })
      }

      mockWebSocket.onmessage?.(errorMessage)

      expect(listeners.onError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('APPID')
        })
      )
    })

    it('应该处理常见错误码', async () => {
      await service.start(listeners)
      mockWebSocket.onopen?.()

      const errorCodes = [
        { code: 10013, text: 'APPID' },
        { code: 10313, text: 'APPID' },
        { code: 11200, text: '未授权' },
        { code: 10163, text: '参数验证' },
        { code: 10165, text: '会话句柄' },
        { code: 10200, text: '长时间无数据' },
        { code: 10160, text: '音频格式' }
      ]

      for (const { code, text } of errorCodes) {
        const errorMessage = {
          data: JSON.stringify({
            code,
            message: '测试错误'
          })
        }

        mockWebSocket.onmessage?.(errorMessage)

        expect(listeners.onError).toHaveBeenCalledWith(
          expect.objectContaining({
            message: expect.stringContaining(text)
          })
        )

        jest.clearAllMocks()
        await service.start(listeners)
        mockWebSocket.onopen?.()
      }
    })
  })

  describe('音频处理', () => {
    let listeners: SpeechRecognitionListeners

    beforeEach(() => {
      listeners = {
        onStart: jest.fn(),
        onResult: jest.fn(),
        onEnd: jest.fn(),
        onError: jest.fn()
      }

      service.initialize({
        language: 'zh_cn',
        continuous: false,
        interimResults: true
      })
    })

    it('应该创建音频处理器', async () => {
      await service.start(listeners)

      expect(mockAudioContext.createScriptProcessor).toHaveBeenCalledWith(
        4096,
        1,
        1
      )
    })

    it('应该处理音频数据', async () => {
      await service.start(listeners)
      mockWebSocket.onopen?.()

      const audioData = new Float32Array(4096)
      for (let i = 0; i < audioData.length; i++) {
        audioData[i] = Math.sin(i * 0.01)
      }

      const event = {
        inputBuffer: {
          getChannelData: jest.fn(() => audioData)
        }
      }

      mockScriptProcessor.onaudioprocess?.(event)

      expect(event.inputBuffer.getChannelData).toHaveBeenCalledWith(0)
    })

    it('应该在未录音时不处理音频', async () => {
      await service.start(listeners)

      service.stop()

      const event = {
        inputBuffer: {
          getChannelData: jest.fn(() => new Float32Array(4096))
        }
      }

      mockScriptProcessor.onaudioprocess?.(event)

      expect(event.inputBuffer.getChannelData).toHaveBeenCalledWith(0)
    })
  })

  describe('重采样', () => {
    it('应该正确处理不同采样率', async () => {
      mockAudioContext.sampleRate = 44100

      const listeners: SpeechRecognitionListeners = {
        onStart: jest.fn(),
        onResult: jest.fn(),
        onEnd: jest.fn(),
        onError: jest.fn()
      }

      service.initialize({
        language: 'zh_cn',
        continuous: false,
        interimResults: true
      })

      await service.start(listeners)
      mockWebSocket.onopen?.()

      const audioData = new Float32Array(4410)
      for (let i = 0; i < audioData.length; i++) {
        audioData[i] = Math.sin(i * 0.01)
      }

      const event = {
        inputBuffer: {
          getChannelData: jest.fn(() => audioData)
        }
      }

      mockScriptProcessor.onaudioprocess?.(event)

      expect(event.inputBuffer.getChannelData).toHaveBeenCalled()
    })
  })

  describe('资源清理', () => {
    it('应该清理所有资源', async () => {
      const listeners: SpeechRecognitionListeners = {
        onStart: jest.fn(),
        onResult: jest.fn(),
        onEnd: jest.fn(),
        onError: jest.fn()
      }

      service.initialize({
        language: 'zh_cn',
        continuous: false,
        interimResults: true
      })

      await service.start(listeners)
      mockWebSocket.onopen?.()

      service.dispose()

      expect(mockWebSocket.close).toHaveBeenCalled()
      expect(mockMediaStream.getTracks()[0].stop).toHaveBeenCalled()
      expect(mockAudioContext.close).toHaveBeenCalled()
    })

    it('应该在未启动时安全清理', () => {
      expect(() => service.dispose()).not.toThrow()
    })
  })

  describe('WebSocket URL 生成', () => {
    it('应该生成正确的 WebSocket URL', async () => {
      const listeners: SpeechRecognitionListeners = {
        onStart: jest.fn(),
        onResult: jest.fn(),
        onEnd: jest.fn(),
        onError: jest.fn()
      }

      service.initialize({
        language: 'zh_cn',
        continuous: false,
        interimResults: true
      })

      await service.start(listeners)

      const wsCall = (global.WebSocket as jest.Mock).mock.calls[0][0]
      expect(wsCall).toContain('wss://iat-api.xfyun.cn/v2/iat')
      expect(wsCall).toContain('authorization=')
      expect(wsCall).toContain('date=')
      expect(wsCall).toContain('appid=test-app-id')
    })
  })

  describe('配置选项', () => {
    it('应该支持不同的语言设置', () => {
      service.initialize({
        language: 'en_us'
      })

      expect(service).toBeDefined()
    })

    it('应该支持持续识别模式', () => {
      service.initialize({
        continuous: true
      })

      expect(service).toBeDefined()
    })

    it('应该支持禁用临时结果', () => {
      service.initialize({
        interimResults: false
      })

      expect(service).toBeDefined()
    })
  })

  describe('边界条件', () => {
    it('应该处理空音频数据', async () => {
      const listeners: SpeechRecognitionListeners = {
        onStart: jest.fn(),
        onResult: jest.fn(),
        onEnd: jest.fn(),
        onError: jest.fn()
      }

      service.initialize({
        language: 'zh_cn',
        continuous: false,
        interimResults: true
      })

      await service.start(listeners)
      mockWebSocket.onopen?.()

      const event = {
        inputBuffer: {
          getChannelData: jest.fn(() => new Float32Array(0))
        }
      }

      expect(() => mockScriptProcessor.onaudioprocess?.(event)).not.toThrow()
    })

    it('应该处理无效的 JSON 响应', async () => {
      const listeners: SpeechRecognitionListeners = {
        onStart: jest.fn(),
        onResult: jest.fn(),
        onEnd: jest.fn(),
        onError: jest.fn()
      }

      service.initialize({
        language: 'zh_cn',
        continuous: false,
        interimResults: true
      })

      await service.start(listeners)
      mockWebSocket.onopen?.()

      const message = {
        data: 'invalid json'
      }

      expect(() => mockWebSocket.onmessage?.(message)).not.toThrow()
    })

    it('应该处理缺少结果数据的响应', async () => {
      const listeners: SpeechRecognitionListeners = {
        onStart: jest.fn(),
        onResult: jest.fn(),
        onEnd: jest.fn(),
        onError: jest.fn()
      }

      service.initialize({
        language: 'zh_cn',
        continuous: false,
        interimResults: true
      })

      await service.start(listeners)
      mockWebSocket.onopen?.()

      const message = {
        data: JSON.stringify({
          code: 0,
          data: {}
        })
      }

      expect(() => mockWebSocket.onmessage?.(message)).not.toThrow()
    })
  })

  describe('WebSocket 状态', () => {
    it('应该处理 WebSocket 关闭', async () => {
      const listeners: SpeechRecognitionListeners = {
        onStart: jest.fn(),
        onResult: jest.fn(),
        onEnd: jest.fn(),
        onError: jest.fn()
      }

      service.initialize({
        language: 'zh_cn',
        continuous: false,
        interimResults: true
      })

      await service.start(listeners)
      mockWebSocket.onopen?.()

      const closeEvent = {
        code: 1000,
        reason: '正常关闭'
      }

      expect(() => mockWebSocket.onclose?.(closeEvent)).not.toThrow()
    })
  })
})
