import { XunfeiSpeechService, XunfeiConfig } from '../../../src/services/speech/XunfeiSpeechService'
import type { SpeechRecognitionListeners } from '../../../src/services/speech/types'

describe('XunfeiSpeechService', () => {
  let service: XunfeiSpeechService
  let mockWebSocket: any
  let mockAudioContext: any
  let mockMediaStream: any
  let mockScriptProcessor: any
  let mockGetUserMedia: jest.Mock

  const mockConfig: XunfeiConfig = {
    appId: 'test_app_id',
    apiSecret: 'test_api_secret',
    apiKey: 'test_api_key'
  }

  beforeEach(() => {
    jest.clearAllMocks()

    mockWebSocket = {
      send: jest.fn(),
      close: jest.fn(),
      readyState: WebSocket.OPEN,
      onopen: null,
      onmessage: null,
      onerror: null,
      onclose: null
    }

    global.WebSocket = jest.fn(() => mockWebSocket) as any

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

    global.AudioContext = jest.fn(() => mockAudioContext) as any
    ;(window as any).webkitAudioContext = jest.fn(() => mockAudioContext)

    mockGetUserMedia = jest.fn().mockResolvedValue(mockMediaStream)
    global.navigator = {
      ...global.navigator,
      mediaDevices: {
        getUserMedia: mockGetUserMedia
      } as any
    }

    global.btoa = jest.fn((str) => Buffer.from(str, 'binary').toString('base64'))

    jest.spyOn(console, 'log').mockImplementation()
    jest.spyOn(console, 'error').mockImplementation()
    jest.spyOn(console, 'warn').mockImplementation()

    service = new XunfeiSpeechService(mockConfig)
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('初始化', () => {
    it('应该正确初始化配置', () => {
      const config = {
        language: 'zh_cn',
        continuous: true,
        interimResults: false
      }

      service.initialize(config)

      expect(service).toBeDefined()
    })

    it('应该使用默认配置初始化', () => {
      service.initialize({})

      expect(service).toBeDefined()
    })
  })

  describe('isSupported', () => {
    it('应该在支持所有必要 API 时返回 true', () => {
      expect(service.isSupported()).toBe(true)
    })

    it('应该在缺少 WebSocket 时返回 false', () => {
      delete (global as any).WebSocket
      expect(service.isSupported()).toBe(false)
    })

    it('应该在缺少 AudioContext 时返回 false', () => {
      delete (global as any).AudioContext
      delete (window as any).webkitAudioContext
      expect(service.isSupported()).toBe(false)
    })

    it('应该在缺少 getUserMedia 时返回 false', () => {
      global.navigator = {
        ...global.navigator,
        mediaDevices: {} as any
      }
      expect(service.isSupported()).toBe(false)
    })
  })

  describe('start', () => {
    const mockListeners: SpeechRecognitionListeners = {
      onStart: jest.fn(),
      onResult: jest.fn(),
      onEnd: jest.fn(),
      onError: jest.fn()
    }

    beforeEach(() => {
      service.initialize({
        language: 'zh_cn',
        continuous: false,
        interimResults: true
      })
    })

    it('应该成功启动语音识别', async () => {
      const startPromise = service.start(mockListeners)

      setTimeout(() => {
        mockWebSocket.onopen?.()
      }, 0)

      await expect(startPromise).resolves.toBeUndefined()

      expect(mockGetUserMedia).toHaveBeenCalledWith({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      })

      expect(global.WebSocket).toHaveBeenCalled()
      expect(mockListeners.onStart).toHaveBeenCalled()
    })

    it('应该在不支持时抛出错误', async () => {
      delete (global as any).WebSocket

      await expect(service.start(mockListeners)).rejects.toThrow(
        '当前浏览器不支持语音识别'
      )
    })

    it('应该在已经运行时发出警告并返回', async () => {
      const startPromise1 = service.start(mockListeners)

      setTimeout(() => {
        mockWebSocket.onopen?.()
      }, 0)

      await startPromise1

      await service.start(mockListeners)

      expect(console.warn).toHaveBeenCalledWith('语音识别已在运行中')
    })

    it('应该在获取麦克风权限失败时抛出错误', async () => {
      const error = new Error('Permission denied')
      mockGetUserMedia.mockRejectedValue(error)

      await expect(service.start(mockListeners)).rejects.toThrow(
        '无法访问麦克风: Permission denied'
      )

      expect(mockListeners.onError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('无法访问麦克风')
        })
      )
    })

    it('应该在 WebSocket 连接失败时拒绝 Promise', async () => {
      const startPromise = service.start(mockListeners)

      setTimeout(() => {
        mockWebSocket.onerror?.(new Error('Connection failed'))
      }, 0)

      await expect(startPromise).rejects.toThrow('WebSocket 连接失败')
    })

    it('应该发送首帧参数', async () => {
      const startPromise = service.start(mockListeners)

      setTimeout(() => {
        mockWebSocket.onopen?.()
      }, 0)

      await startPromise

      expect(mockWebSocket.send).toHaveBeenCalledWith(
        expect.stringContaining('"status":0')
      )
      expect(mockWebSocket.send).toHaveBeenCalledWith(
        expect.stringContaining('"audio":""')
      )
    })
  })

  describe('stop', () => {
    const mockListeners: SpeechRecognitionListeners = {
      onStart: jest.fn(),
      onResult: jest.fn(),
      onEnd: jest.fn(),
      onError: jest.fn()
    }

    beforeEach(() => {
      service.initialize({})
    })

    it('应该停止正在运行的识别', async () => {
      const startPromise = service.start(mockListeners)

      setTimeout(() => {
        mockWebSocket.onopen?.()
      }, 0)

      await startPromise

      service.stop()

      expect(mockScriptProcessor.disconnect).toHaveBeenCalled()
      expect(mockMediaStream.getTracks()[0].stop).toHaveBeenCalled()
      expect(mockAudioContext.close).toHaveBeenCalled()
      expect(mockWebSocket.send).toHaveBeenCalledWith(
        expect.stringContaining('"status":2')
      )
      expect(mockListeners.onEnd).toHaveBeenCalled()
    })

    it('应该在未运行时不执行任何操作', () => {
      service.stop()

      expect(mockListeners.onEnd).not.toHaveBeenCalled()
    })

    it('应该发送结束标记', async () => {
      const startPromise = service.start(mockListeners)

      setTimeout(() => {
        mockWebSocket.onopen?.()
      }, 0)

      await startPromise

      service.stop()

      expect(mockWebSocket.send).toHaveBeenCalledWith(
        expect.stringContaining('"status":2')
      )
    })
  })

  describe('dispose', () => {
    it('应该清理所有资源', async () => {
      const mockListeners: SpeechRecognitionListeners = {
        onStart: jest.fn(),
        onResult: jest.fn(),
        onEnd: jest.fn(),
        onError: jest.fn()
      }

      service.initialize({})

      const startPromise = service.start(mockListeners)

      setTimeout(() => {
        mockWebSocket.onopen?.()
      }, 0)

      await startPromise

      service.dispose()

      expect(mockWebSocket.close).toHaveBeenCalled()
      expect(mockScriptProcessor.disconnect).toHaveBeenCalled()
      expect(mockAudioContext.close).toHaveBeenCalled()
    })

    it('应该在未启动时也能安全调用', () => {
      expect(() => service.dispose()).not.toThrow()
    })
  })

  describe('WebSocket 消息处理', () => {
    const mockListeners: SpeechRecognitionListeners = {
      onStart: jest.fn(),
      onResult: jest.fn(),
      onEnd: jest.fn(),
      onError: jest.fn()
    }

    beforeEach(async () => {
      service.initialize({})
      const startPromise = service.start(mockListeners)

      setTimeout(() => {
        mockWebSocket.onopen?.()
      }, 0)

      await startPromise
      jest.clearAllMocks()
    })

    it('应该解析识别结果', () => {
      const mockMessage = {
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

      mockWebSocket.onmessage?.(mockMessage)

      expect(mockListeners.onResult).toHaveBeenCalledWith({
        text: '你好',
        isFinal: false,
        confidence: 1
      })
    })

    it('应该处理最终识别结果', () => {
      const mockMessage = {
        data: JSON.stringify({
          code: 0,
          data: {
            result: {
              ws: [
                {
                  cw: [{ w: '测试' }]
                }
              ],
              ls: true
            }
          }
        })
      }

      mockWebSocket.onmessage?.(mockMessage)

      expect(mockListeners.onResult).toHaveBeenCalledWith({
        text: '测试',
        isFinal: true,
        confidence: 1
      })
    })

    it('应该处理动态修正模式', () => {
      const mockMessage1 = {
        data: JSON.stringify({
          code: 0,
          data: {
            result: {
              ws: [{ cw: [{ w: '你' }] }],
              pgs: 'rpl',
              ls: false
            }
          }
        })
      }

      mockWebSocket.onmessage?.(mockMessage1)

      expect(mockListeners.onResult).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('你')
        })
      )
    })

    it('应该处理错误响应', () => {
      const mockMessage = {
        data: JSON.stringify({
          code: 10013,
          message: 'APPID 不存在或无效'
        })
      }

      mockWebSocket.onmessage?.(mockMessage)

      expect(mockListeners.onError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'APPID 不存在或无效'
        })
      )
    })

    it('应该处理各种错误代码', () => {
      const errorCodes = [
        { code: 10313, expected: '缺少 APPID 参数' },
        { code: 11200, expected: '未授权的功能访问,请检查服务是否已开通' },
        { code: 10163, expected: '参数验证失败,请检查配置参数' },
        { code: 10165, expected: '会话句柄无效(服务器读取消息超时,可能是首帧后没有及时发送音频数据)' },
        { code: 10200, expected: '长时间无数据传输,连接已断开' },
        { code: 10160, expected: '音频格式错误' }
      ]

      errorCodes.forEach(({ code, expected }) => {
        jest.clearAllMocks()
        const mockMessage = {
          data: JSON.stringify({
            code,
            message: 'Generic error'
          })
        }

        mockWebSocket.onmessage?.(mockMessage)

        expect(mockListeners.onError).toHaveBeenCalledWith(
          expect.objectContaining({
            message: expected
          })
        )
      })
    })

    it('应该处理最后一帧标记', () => {
      const mockMessage = {
        data: JSON.stringify({
          code: 0,
          data: {
            status: 2
          }
        })
      }

      mockWebSocket.onmessage?.(mockMessage)

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('识别完成')
      )
    })

    it('应该处理无效的 JSON 消息', () => {
      const mockMessage = {
        data: 'invalid json'
      }

      mockWebSocket.onmessage?.(mockMessage)

      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('解析响应失败'),
        expect.any(Error)
      )
    })
  })

  describe('音频处理', () => {
    const mockListeners: SpeechRecognitionListeners = {
      onStart: jest.fn(),
      onResult: jest.fn(),
      onEnd: jest.fn(),
      onError: jest.fn()
    }

    beforeEach(async () => {
      service.initialize({})
      const startPromise = service.start(mockListeners)

      setTimeout(() => {
        mockWebSocket.onopen?.()
      }, 0)

      await startPromise
      jest.clearAllMocks()
    })

    it('应该处理音频数据并发送', () => {
      jest.useFakeTimers()

      const mockAudioData = new Float32Array(4096).fill(0.5)
      const mockEvent = {
        inputBuffer: {
          getChannelData: jest.fn(() => mockAudioData)
        }
      }

      mockScriptProcessor.onaudioprocess?.(mockEvent)

      jest.advanceTimersByTime(200)

      expect(mockWebSocket.send).toHaveBeenCalledWith(
        expect.stringContaining('"status":1')
      )

      jest.useRealTimers()
    })

    it('应该在未录音时不处理音频', () => {
      service.stop()

      const mockEvent = {
        inputBuffer: {
          getChannelData: jest.fn(() => new Float32Array(4096))
        }
      }

      mockScriptProcessor.onaudioprocess?.(mockEvent)

      expect(mockEvent.inputBuffer.getChannelData).not.toHaveBeenCalled()
    })
  })

  describe('重采样', () => {
    it('应该在采样率不匹配时进行重采样', async () => {
      mockAudioContext.sampleRate = 44100

      service.initialize({})
      const mockListeners: SpeechRecognitionListeners = {
        onStart: jest.fn(),
        onResult: jest.fn(),
        onEnd: jest.fn(),
        onError: jest.fn()
      }

      const startPromise = service.start(mockListeners)

      setTimeout(() => {
        mockWebSocket.onopen?.()
      }, 0)

      await startPromise

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('将自动进行重采样')
      )
    })

    it('应该在采样率匹配时跳过重采样', async () => {
      mockAudioContext.sampleRate = 16000

      service.initialize({})
      const mockListeners: SpeechRecognitionListeners = {
        onStart: jest.fn(),
        onResult: jest.fn(),
        onEnd: jest.fn(),
        onError: jest.fn()
      }

      const startPromise = service.start(mockListeners)

      setTimeout(() => {
        mockWebSocket.onopen?.()
      }, 0)

      await startPromise

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('无需重采样')
      )
    })
  })

  describe('WebSocket URL 生成', () => {
    it('应该生成正确的 WebSocket URL', async () => {
      service.initialize({})
      const mockListeners: SpeechRecognitionListeners = {
        onStart: jest.fn(),
        onResult: jest.fn(),
        onEnd: jest.fn(),
        onError: jest.fn()
      }

      const startPromise = service.start(mockListeners)

      setTimeout(() => {
        mockWebSocket.onopen?.()
      }, 0)

      await startPromise

      const wsCall = (global.WebSocket as jest.Mock).mock.calls[0][0]

      expect(wsCall).toContain('wss://iat-api.xfyun.cn/v2/iat')
      expect(wsCall).toContain('appid=test_app_id')
      expect(wsCall).toContain('authorization=')
      expect(wsCall).toContain('date=')
      expect(wsCall).toContain('host=iat-api.xfyun.cn')
    })
  })
})
