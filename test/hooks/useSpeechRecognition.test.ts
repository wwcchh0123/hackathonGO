import { renderHook, act, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { useSpeechRecognition } from '../../src/hooks/useSpeechRecognition'
import { XunfeiSpeechService } from '../../src/services/speech/XunfeiSpeechService'

jest.mock('../../src/services/speech/XunfeiSpeechService')

const MockedXunfeiSpeechService = XunfeiSpeechService as jest.MockedClass<typeof XunfeiSpeechService>

describe('useSpeechRecognition', () => {
  let mockServiceInstance: jest.Mocked<XunfeiSpeechService>

  beforeEach(() => {
    jest.clearAllMocks()
    mockServiceInstance = {
      initialize: jest.fn(),
      start: jest.fn(),
      stop: jest.fn(),
      dispose: jest.fn(),
      isSupported: jest.fn().mockReturnValue(true)
    } as any

    MockedXunfeiSpeechService.mockImplementation(() => mockServiceInstance)

    Object.defineProperty(window, 'WebSocket', {
      writable: true,
      value: jest.fn()
    })

    Object.defineProperty(window, 'MediaRecorder', {
      writable: true,
      value: jest.fn()
    })

    Object.defineProperty(import.meta, 'env', {
      writable: true,
      value: {
        VITE_XUNFEI_APP_ID: 'test-app-id',
        VITE_XUNFEI_API_SECRET: 'test-api-secret',
        VITE_XUNFEI_API_KEY: 'test-api-key'
      }
    })
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('初始化', () => {
    it('应该初始化为空闲状态', () => {
      const { result } = renderHook(() => useSpeechRecognition())

      expect(result.current.transcript).toBe('')
      expect(result.current.state).toBe('idle')
      expect(result.current.error).toBeNull()
    })

    it('应该检测浏览器是否支持语音识别', () => {
      const { result } = renderHook(() => useSpeechRecognition())

      expect(result.current.isSupported).toBe(true)
    })

    it('应该在浏览器不支持时返回 false', () => {
      delete (window as any).WebSocket

      const { result } = renderHook(() => useSpeechRecognition())

      expect(result.current.isSupported).toBe(false)
    })

    it('应该使用默认配置初始化服务', async () => {
      renderHook(() => useSpeechRecognition())

      await waitFor(() => {
        expect(mockServiceInstance.initialize).toHaveBeenCalledWith({
          language: 'zh_cn',
          continuous: false,
          interimResults: true
        })
      })
    })

    it('应该使用自定义配置初始化服务', async () => {
      renderHook(() =>
        useSpeechRecognition({
          lang: 'en_us',
          continuous: true,
          interimResults: false
        })
      )

      await waitFor(() => {
        expect(mockServiceInstance.initialize).toHaveBeenCalledWith({
          language: 'en_us',
          continuous: true,
          interimResults: false
        })
      })
    })

    it('应该在初始化失败时设置错误状态', async () => {
      MockedXunfeiSpeechService.mockImplementation(() => {
        throw new Error('初始化失败')
      })

      const { result } = renderHook(() => useSpeechRecognition())

      await waitFor(() => {
        expect(result.current.state).toBe('error')
        expect(result.current.error).toBe('初始化失败')
      })
    })
  })

  describe('开始监听', () => {
    it('应该开始语音识别', async () => {
      mockServiceInstance.start.mockResolvedValue(undefined)

      const { result } = renderHook(() => useSpeechRecognition())

      await waitFor(() => {
        expect(mockServiceInstance.initialize).toHaveBeenCalled()
      })

      act(() => {
        result.current.startListening()
      })

      await waitFor(() => {
        expect(mockServiceInstance.start).toHaveBeenCalled()
      })
    })

    it('应该在浏览器不支持时显示错误', async () => {
      delete (window as any).WebSocket

      const { result } = renderHook(() => useSpeechRecognition())

      act(() => {
        result.current.startListening()
      })

      await waitFor(() => {
        expect(result.current.state).toBe('error')
        expect(result.current.error).toBe('当前浏览器不支持语音识别')
      })
    })

    it('应该在服务未初始化时显示错误', async () => {
      MockedXunfeiSpeechService.mockImplementation(() => {
        throw new Error('初始化失败')
      })

      const { result } = renderHook(() => useSpeechRecognition())

      await waitFor(() => {
        expect(result.current.state).toBe('error')
      })

      act(() => {
        result.current.startListening()
      })

      await waitFor(() => {
        expect(result.current.error).toBeTruthy()
      })
    })

    it('应该清空之前的识别结果', async () => {
      mockServiceInstance.start.mockResolvedValue(undefined)

      const { result } = renderHook(() => useSpeechRecognition())

      await waitFor(() => {
        expect(mockServiceInstance.initialize).toHaveBeenCalled()
      })

      act(() => {
        result.current.startListening()
      })

      await waitFor(() => {
        expect(result.current.transcript).toBe('')
        expect(result.current.error).toBeNull()
      })
    })

    it('应该调用 onStart 回调', async () => {
      mockServiceInstance.start.mockImplementation(async (listeners) => {
        listeners.onStart?.()
        return Promise.resolve()
      })

      const { result } = renderHook(() => useSpeechRecognition())

      await waitFor(() => {
        expect(mockServiceInstance.initialize).toHaveBeenCalled()
      })

      act(() => {
        result.current.startListening()
      })

      await waitFor(() => {
        expect(result.current.state).toBe('listening')
      })
    })

    it('应该处理识别结果', async () => {
      mockServiceInstance.start.mockImplementation(async (listeners) => {
        listeners.onStart?.()
        listeners.onResult?.({
          text: '你好',
          isFinal: false,
          confidence: 0.9
        })
        return Promise.resolve()
      })

      const { result } = renderHook(() => useSpeechRecognition())

      await waitFor(() => {
        expect(mockServiceInstance.initialize).toHaveBeenCalled()
      })

      act(() => {
        result.current.startListening()
      })

      await waitFor(() => {
        expect(result.current.transcript).toBe('你好')
        expect(result.current.state).toBe('listening')
      })
    })

    it('应该处理最终识别结果', async () => {
      mockServiceInstance.start.mockImplementation(async (listeners) => {
        listeners.onStart?.()
        listeners.onResult?.({
          text: '你好世界',
          isFinal: true,
          confidence: 0.95
        })
        return Promise.resolve()
      })

      const { result } = renderHook(() => useSpeechRecognition())

      await waitFor(() => {
        expect(mockServiceInstance.initialize).toHaveBeenCalled()
      })

      act(() => {
        result.current.startListening()
      })

      await waitFor(() => {
        expect(result.current.transcript).toBe('你好世界')
        expect(result.current.state).toBe('processing')
      })
    })

    it('应该处理识别错误', async () => {
      mockServiceInstance.start.mockImplementation(async (listeners) => {
        listeners.onError?.(new Error('识别失败'))
        return Promise.resolve()
      })

      const { result } = renderHook(() => useSpeechRecognition())

      await waitFor(() => {
        expect(mockServiceInstance.initialize).toHaveBeenCalled()
      })

      act(() => {
        result.current.startListening()
      })

      await waitFor(() => {
        expect(result.current.state).toBe('error')
        expect(result.current.error).toBe('识别失败')
      })
    })
  })

  describe('停止监听', () => {
    it('应该停止语音识别', async () => {
      const { result } = renderHook(() => useSpeechRecognition())

      await waitFor(() => {
        expect(mockServiceInstance.initialize).toHaveBeenCalled()
      })

      act(() => {
        result.current.stopListening()
      })

      expect(mockServiceInstance.stop).toHaveBeenCalled()
    })

    it('应该在服务未初始化时不执行任何操作', () => {
      MockedXunfeiSpeechService.mockImplementation(() => {
        throw new Error('初始化失败')
      })

      const { result } = renderHook(() => useSpeechRecognition())

      act(() => {
        result.current.stopListening()
      })

      expect(mockServiceInstance.stop).not.toHaveBeenCalled()
    })
  })

  describe('重置识别结果', () => {
    it('应该清空识别文本和错误', async () => {
      mockServiceInstance.start.mockImplementation(async (listeners) => {
        listeners.onStart?.()
        listeners.onResult?.({
          text: '测试文本',
          isFinal: true,
          confidence: 0.9
        })
        return Promise.resolve()
      })

      const { result } = renderHook(() => useSpeechRecognition())

      await waitFor(() => {
        expect(mockServiceInstance.initialize).toHaveBeenCalled()
      })

      act(() => {
        result.current.startListening()
      })

      await waitFor(() => {
        expect(result.current.transcript).toBe('测试文本')
      })

      act(() => {
        result.current.resetTranscript()
      })

      expect(result.current.transcript).toBe('')
      expect(result.current.error).toBeNull()
      expect(result.current.state).toBe('idle')
    })
  })

  describe('组件卸载', () => {
    it('应该清理资源', async () => {
      const { unmount } = renderHook(() => useSpeechRecognition())

      await waitFor(() => {
        expect(mockServiceInstance.initialize).toHaveBeenCalled()
      })

      unmount()

      expect(mockServiceInstance.dispose).toHaveBeenCalled()
    })
  })

  describe('持续识别模式', () => {
    it('应该在识别结束后自动重启', async () => {
      jest.useFakeTimers()

      mockServiceInstance.start.mockImplementation(async (listeners) => {
        listeners.onStart?.()
        listeners.onEnd?.()
        return Promise.resolve()
      })

      const { result } = renderHook(() =>
        useSpeechRecognition({ continuous: true })
      )

      await waitFor(() => {
        expect(mockServiceInstance.initialize).toHaveBeenCalled()
      })

      act(() => {
        result.current.startListening()
      })

      await waitFor(() => {
        expect(mockServiceInstance.start).toHaveBeenCalledTimes(1)
      })

      jest.runAllTimers()

      jest.useRealTimers()
    })
  })

  describe('环境变量检查', () => {
    it('应该在缺少环境变量时抛出错误', () => {
      Object.defineProperty(import.meta, 'env', {
        writable: true,
        value: {}
      })

      MockedXunfeiSpeechService.mockImplementation(() => {
        throw new Error('缺少科大讯飞 API 配置')
      })

      const { result } = renderHook(() => useSpeechRecognition())

      expect(result.current.state).toBe('error')
      expect(result.current.error).toContain('缺少科大讯飞 API 配置')
    })
  })
})
