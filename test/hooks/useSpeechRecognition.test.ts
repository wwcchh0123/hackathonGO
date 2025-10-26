import { renderHook, act, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { useSpeechRecognition } from '../../src/hooks/useSpeechRecognition'
import { XunfeiSpeechService } from '../../src/services/speech/XunfeiSpeechService'

jest.mock('../../src/services/speech/XunfeiSpeechService')

describe('useSpeechRecognition', () => {
  let mockServiceInstance: any

  beforeEach(() => {
    jest.clearAllMocks()

    mockServiceInstance = {
      initialize: jest.fn(),
      start: jest.fn(),
      stop: jest.fn(),
      dispose: jest.fn()
    }

    ;(XunfeiSpeechService as jest.MockedClass<typeof XunfeiSpeechService>).mockImplementation(
      () => mockServiceInstance
    )

    global.WebSocket = jest.fn() as any
    ;(window as any).MediaRecorder = jest.fn()

    Object.defineProperty(import.meta, 'env', {
      value: {
        VITE_XUNFEI_APP_ID: 'test_app_id',
        VITE_XUNFEI_API_SECRET: 'test_api_secret',
        VITE_XUNFEI_API_KEY: 'test_api_key'
      },
      writable: true,
      configurable: true
    })

    jest.spyOn(console, 'log').mockImplementation()
    jest.spyOn(console, 'error').mockImplementation()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('初始化', () => {
    it('应该使用默认配置初始化', () => {
      const { result } = renderHook(() => useSpeechRecognition())

      expect(result.current.transcript).toBe('')
      expect(result.current.state).toBe('idle')
      expect(result.current.error).toBeNull()
      expect(result.current.isSupported).toBe(true)
    })

    it('应该使用自定义配置初始化', () => {
      const { result } = renderHook(() =>
        useSpeechRecognition({
          continuous: true,
          lang: 'en_us',
          interimResults: false
        })
      )

      expect(result.current).toBeDefined()
      expect(mockServiceInstance.initialize).toHaveBeenCalledWith({
        language: 'en_us',
        continuous: true,
        interimResults: false
      })
    })

    it('应该在环境变量缺失时设置错误状态', () => {
      Object.defineProperty(import.meta, 'env', {
        value: {},
        writable: true,
        configurable: true
      })

      const { result } = renderHook(() => useSpeechRecognition())

      expect(result.current.state).toBe('error')
      expect(result.current.error).toContain('缺少科大讯飞 API 配置')
    })

    it('应该检测浏览器支持', () => {
      const { result } = renderHook(() => useSpeechRecognition())

      expect(result.current.isSupported).toBe(true)
    })

    it('应该在不支持时返回 false', () => {
      delete (global as any).WebSocket

      const { result } = renderHook(() => useSpeechRecognition())

      expect(result.current.isSupported).toBe(false)
    })
  })

  describe('startListening', () => {
    it('应该成功开始语音识别', async () => {
      mockServiceInstance.start.mockImplementation(async (listeners: any) => {
        listeners.onStart?.()
        return Promise.resolve()
      })

      const { result } = renderHook(() => useSpeechRecognition())

      act(() => {
        result.current.startListening()
      })

      await waitFor(() => {
        expect(result.current.state).toBe('listening')
      })

      expect(mockServiceInstance.start).toHaveBeenCalled()
      expect(result.current.transcript).toBe('')
      expect(result.current.error).toBeNull()
    })

    it('应该在不支持时设置错误', async () => {
      delete (global as any).WebSocket

      const { result } = renderHook(() => useSpeechRecognition())

      act(() => {
        result.current.startListening()
      })

      await waitFor(() => {
        expect(result.current.state).toBe('error')
      })

      expect(result.current.error).toBe('当前浏览器不支持语音识别')
    })

    it('应该在服务未初始化时设置错误', async () => {
      ;(XunfeiSpeechService as jest.MockedClass<typeof XunfeiSpeechService>).mockImplementation(
        () => {
          throw new Error('初始化失败')
        }
      )

      const { result } = renderHook(() => useSpeechRecognition())

      act(() => {
        result.current.startListening()
      })

      await waitFor(() => {
        expect(result.current.state).toBe('error')
      })

      expect(result.current.error).toContain('初始化失败')
    })

    it('应该在已经监听时发出警告', async () => {
      mockServiceInstance.start.mockImplementation(async (listeners: any) => {
        listeners.onStart?.()
        return Promise.resolve()
      })

      const { result } = renderHook(() => useSpeechRecognition())

      act(() => {
        result.current.startListening()
      })

      await waitFor(() => {
        expect(result.current.state).toBe('listening')
      })

      act(() => {
        result.current.startListening()
      })

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('已在运行中')
      )
    })

    it('应该在启动失败时设置错误', async () => {
      mockServiceInstance.start.mockRejectedValue(new Error('启动失败'))

      const { result } = renderHook(() => useSpeechRecognition())

      act(() => {
        result.current.startListening()
      })

      await waitFor(() => {
        expect(result.current.state).toBe('error')
      })

      expect(result.current.error).toBe('启动失败')
    })
  })

  describe('stopListening', () => {
    it('应该停止语音识别', async () => {
      mockServiceInstance.start.mockImplementation(async (listeners: any) => {
        listeners.onStart?.()
        return Promise.resolve()
      })

      const { result } = renderHook(() => useSpeechRecognition())

      act(() => {
        result.current.startListening()
      })

      await waitFor(() => {
        expect(result.current.state).toBe('listening')
      })

      act(() => {
        result.current.stopListening()
      })

      expect(mockServiceInstance.stop).toHaveBeenCalled()
    })

    it('应该在未运行时安全调用', () => {
      const { result } = renderHook(() => useSpeechRecognition())

      expect(() => {
        act(() => {
          result.current.stopListening()
        })
      }).not.toThrow()
    })
  })

  describe('resetTranscript', () => {
    it('应该重置识别结果', async () => {
      mockServiceInstance.start.mockImplementation(async (listeners: any) => {
        listeners.onStart?.()
        listeners.onResult?.({ text: '测试', isFinal: false, confidence: 1 })
        return Promise.resolve()
      })

      const { result } = renderHook(() => useSpeechRecognition())

      act(() => {
        result.current.startListening()
      })

      await waitFor(() => {
        expect(result.current.transcript).toBe('测试')
      })

      act(() => {
        result.current.resetTranscript()
      })

      expect(result.current.transcript).toBe('')
      expect(result.current.error).toBeNull()
      expect(result.current.state).toBe('idle')
    })
  })

  describe('识别结果处理', () => {
    it('应该更新临时识别结果', async () => {
      mockServiceInstance.start.mockImplementation(async (listeners: any) => {
        listeners.onStart?.()
        listeners.onResult?.({ text: '你好', isFinal: false, confidence: 1 })
        return Promise.resolve()
      })

      const { result } = renderHook(() => useSpeechRecognition())

      act(() => {
        result.current.startListening()
      })

      await waitFor(() => {
        expect(result.current.transcript).toBe('你好')
      })

      expect(result.current.state).toBe('listening')
    })

    it('应该更新最终识别结果', async () => {
      mockServiceInstance.start.mockImplementation(async (listeners: any) => {
        listeners.onStart?.()
        listeners.onResult?.({ text: '你好世界', isFinal: true, confidence: 1 })
        return Promise.resolve()
      })

      const { result } = renderHook(() => useSpeechRecognition())

      act(() => {
        result.current.startListening()
      })

      await waitFor(() => {
        expect(result.current.transcript).toBe('你好世界')
      })

      await waitFor(() => {
        expect(result.current.state).toBe('processing')
      })
    })

    it('应该累积多个识别结果', async () => {
      let onResultCallback: any

      mockServiceInstance.start.mockImplementation(async (listeners: any) => {
        onResultCallback = listeners.onResult
        listeners.onStart?.()
        return Promise.resolve()
      })

      const { result } = renderHook(() => useSpeechRecognition())

      act(() => {
        result.current.startListening()
      })

      await waitFor(() => {
        expect(result.current.state).toBe('listening')
      })

      act(() => {
        onResultCallback?.({ text: '你好', isFinal: false, confidence: 1 })
      })

      await waitFor(() => {
        expect(result.current.transcript).toBe('你好')
      })

      act(() => {
        onResultCallback?.({ text: '你好世界', isFinal: false, confidence: 1 })
      })

      await waitFor(() => {
        expect(result.current.transcript).toBe('你好世界')
      })
    })
  })

  describe('错误处理', () => {
    it('应该处理识别错误', async () => {
      mockServiceInstance.start.mockImplementation(async (listeners: any) => {
        listeners.onStart?.()
        listeners.onError?.(new Error('识别错误'))
        return Promise.resolve()
      })

      const { result } = renderHook(() => useSpeechRecognition())

      act(() => {
        result.current.startListening()
      })

      await waitFor(() => {
        expect(result.current.state).toBe('error')
      })

      expect(result.current.error).toBe('识别错误')
    })

    it('应该在错误时停止监听', async () => {
      let onErrorCallback: any

      mockServiceInstance.start.mockImplementation(async (listeners: any) => {
        listeners.onStart?.()
        onErrorCallback = listeners.onError
        return Promise.resolve()
      })

      const { result } = renderHook(() => useSpeechRecognition())

      act(() => {
        result.current.startListening()
      })

      await waitFor(() => {
        expect(result.current.state).toBe('listening')
      })

      act(() => {
        onErrorCallback?.(new Error('网络错误'))
      })

      await waitFor(() => {
        expect(result.current.state).toBe('error')
      })
      expect(result.current.error).toBe('网络错误')
    })
  })

  describe('生命周期', () => {
    it('应该在组件卸载时清理资源', () => {
      const { unmount } = renderHook(() => useSpeechRecognition())

      unmount()

      expect(mockServiceInstance.dispose).toHaveBeenCalled()
    })

    it('应该在配置变化时重新初始化', () => {
      const { rerender } = renderHook(
        ({ options }) => useSpeechRecognition(options),
        {
          initialProps: {
            options: { lang: 'zh_cn' }
          }
        }
      )

      expect(mockServiceInstance.initialize).toHaveBeenCalledWith(
        expect.objectContaining({
          language: 'zh_cn'
        })
      )

      jest.clearAllMocks()

      rerender({ options: { lang: 'en_us' } })

      expect(mockServiceInstance.dispose).toHaveBeenCalled()
      expect(XunfeiSpeechService).toHaveBeenCalledTimes(1)
    })
  })

  describe('continuous 模式', () => {
    it('应该在 continuous 模式下自动重启', async () => {
      let onEndCallback: any

      mockServiceInstance.start.mockImplementation(async (listeners: any) => {
        listeners.onStart?.()
        onEndCallback = listeners.onEnd
        return Promise.resolve()
      })

      const { result } = renderHook(() =>
        useSpeechRecognition({ continuous: true })
      )

      act(() => {
        result.current.startListening()
      })

      await waitFor(() => {
        expect(result.current.state).toBe('listening')
      })

      act(() => {
        onEndCallback?.()
      })

      await waitFor(() => {
        expect(result.current.state).toBe('idle')
      })
    })

    it('应该在非 continuous 模式下停止', async () => {
      let onEndCallback: any

      mockServiceInstance.start.mockImplementation(async (listeners: any) => {
        listeners.onStart?.()
        onEndCallback = listeners.onEnd
        return Promise.resolve()
      })

      const { result } = renderHook(() =>
        useSpeechRecognition({ continuous: false })
      )

      act(() => {
        result.current.startListening()
      })

      await waitFor(() => {
        expect(result.current.state).toBe('listening')
      })

      act(() => {
        onEndCallback?.()
      })

      await waitFor(() => {
        expect(result.current.state).toBe('idle')
      })
    })
  })

  describe('状态转换', () => {
    it('应该正确转换状态: idle → listening → processing → idle', async () => {
      let callbacks: any = {}

      mockServiceInstance.start.mockImplementation(async (listeners: any) => {
        callbacks = listeners
        return Promise.resolve()
      })

      const { result } = renderHook(() => useSpeechRecognition())

      expect(result.current.state).toBe('idle')

      act(() => {
        result.current.startListening()
      })

      act(() => {
        callbacks.onStart?.()
      })

      await waitFor(() => {
        expect(result.current.state).toBe('listening')
      })

      act(() => {
        callbacks.onResult?.({ text: '测试', isFinal: true, confidence: 1 })
      })

      await waitFor(() => {
        expect(result.current.state).toBe('processing')
      })

      act(() => {
        callbacks.onEnd?.()
      })

      await waitFor(() => {
        expect(result.current.state).toBe('idle')
      })
    })

    it('应该正确转换状态: idle → listening → error', async () => {
      let callbacks: any = {}

      mockServiceInstance.start.mockImplementation(async (listeners: any) => {
        callbacks = listeners
        return Promise.resolve()
      })

      const { result } = renderHook(() => useSpeechRecognition())

      expect(result.current.state).toBe('idle')

      act(() => {
        result.current.startListening()
      })

      act(() => {
        callbacks.onStart?.()
      })

      await waitFor(() => {
        expect(result.current.state).toBe('listening')
      })

      act(() => {
        callbacks.onError?.(new Error('测试错误'))
      })

      await waitFor(() => {
        expect(result.current.state).toBe('error')
      })
    })
  })
})
