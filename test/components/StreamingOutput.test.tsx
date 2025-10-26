import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { StreamingOutput } from '../../src/components/StreamingOutput'

describe('StreamingOutput', () => {
  let mockOnClaudeStream: jest.Mock
  let mockUnsubscribe: jest.Mock

  beforeEach(() => {
    jest.clearAllMocks()

    mockUnsubscribe = jest.fn()
    mockOnClaudeStream = jest.fn(() => mockUnsubscribe)

    ;(window as any).api = {
      onClaudeStream: mockOnClaudeStream
    }

    jest.spyOn(console, 'log').mockImplementation()
  })

  afterEach(() => {
    delete (window as any).api
    jest.restoreAllMocks()
  })

  describe('渲染', () => {
    it('应该在 isActive 为 false 时不渲染', () => {
      const { container } = render(
        <StreamingOutput sessionId="test-session" isActive={false} />
      )

      expect(container.firstChild).toBeNull()
    })

    it('应该在 isActive 为 true 时渲染', () => {
      render(<StreamingOutput sessionId="test-session" isActive={true} />)

      expect(screen.getByText('🤖 Claude Code 执行状态')).toBeInTheDocument()
    })

    it('应该显示初始状态', () => {
      render(<StreamingOutput sessionId="test-session" isActive={true} />)

      expect(screen.getByText('等待 Claude Code 输出...')).toBeInTheDocument()
    })
  })

  describe('展开/折叠', () => {
    it('应该默认展开日志区域', () => {
      render(<StreamingOutput sessionId="test-session" isActive={true} />)

      const logsArea = screen.getByText('等待 Claude Code 输出...')
      expect(logsArea).toBeVisible()
    })

    it('应该能够折叠日志区域', async () => {
      render(<StreamingOutput sessionId="test-session" isActive={true} />)

      const header = screen.getByText('🤖 Claude Code 执行状态')
      fireEvent.click(header)

      await waitFor(() => {
        const logsArea = screen.queryByText('等待 Claude Code 输出...')
        expect(logsArea).not.toBeVisible()
      })
    })

    it('应该能够重新展开日志区域', async () => {
      render(<StreamingOutput sessionId="test-session" isActive={true} />)

      const header = screen.getByText('🤖 Claude Code 执行状态')

      fireEvent.click(header)
      await waitFor(() => {
        expect(screen.queryByText('等待 Claude Code 输出...')).not.toBeVisible()
      })

      fireEvent.click(header)
      await waitFor(() => {
        expect(screen.getByText('等待 Claude Code 输出...')).toBeVisible()
      })
    })
  })

  describe('流式事件处理', () => {
    it('应该处理 stream-start 事件', async () => {
      render(<StreamingOutput sessionId="test-session" isActive={true} />)

      const handler = mockOnClaudeStream.mock.calls[0][0]

      handler(null, {
        type: 'stream-start',
        sessionId: 'test-session',
        timestamp: new Date().toISOString(),
        data: {
          command: 'npm test'
        }
      })

      await waitFor(() => {
        expect(screen.getByText('npm test')).toBeInTheDocument()
      })

      expect(screen.getByText('初始化')).toBeInTheDocument()
    })

    it('应该处理 stream-data 事件', async () => {
      render(<StreamingOutput sessionId="test-session" isActive={true} />)

      const handler = mockOnClaudeStream.mock.calls[0][0]

      handler(null, {
        type: 'stream-data',
        sessionId: 'test-session',
        timestamp: new Date().toISOString(),
        data: {
          content: '测试消息',
          stage: 'response'
        }
      })

      await waitFor(() => {
        expect(screen.getByText('测试消息')).toBeInTheDocument()
      })
    })

    it('应该处理 stream-end 事件', async () => {
      render(<StreamingOutput sessionId="test-session" isActive={true} />)

      const handler = mockOnClaudeStream.mock.calls[0][0]

      handler(null, {
        type: 'stream-end',
        sessionId: 'test-session',
        timestamp: new Date().toISOString(),
        data: {
          success: true
        }
      })

      await waitFor(() => {
        expect(screen.getByText('执行完成')).toBeInTheDocument()
      })
    })

    it('应该处理 stream-error 事件', async () => {
      render(<StreamingOutput sessionId="test-session" isActive={true} />)

      const handler = mockOnClaudeStream.mock.calls[0][0]

      handler(null, {
        type: 'stream-error',
        sessionId: 'test-session',
        timestamp: new Date().toISOString(),
        data: {
          content: '错误信息'
        }
      })

      await waitFor(() => {
        expect(screen.getByText('错误信息')).toBeInTheDocument()
      })

      expect(screen.getByText('执行过程中遇到问题')).toBeInTheDocument()
    })

    it('应该忽略不匹配的 sessionId 的事件', async () => {
      render(<StreamingOutput sessionId="test-session" isActive={true} />)

      const handler = mockOnClaudeStream.mock.calls[0][0]

      handler(null, {
        type: 'stream-data',
        sessionId: 'other-session',
        timestamp: new Date().toISOString(),
        data: {
          content: '不应该显示的消息'
        }
      })

      await waitFor(() => {
        expect(screen.queryByText('不应该显示的消息')).not.toBeInTheDocument()
      })
    })
  })

  describe('进度条', () => {
    it('应该更新进度条', async () => {
      render(<StreamingOutput sessionId="test-session" isActive={true} />)

      const handler = mockOnClaudeStream.mock.calls[0][0]

      handler(null, {
        type: 'stream-data',
        sessionId: 'test-session',
        timestamp: new Date().toISOString(),
        data: {
          content: '测试',
          stage: 'ready'
        }
      })

      await waitFor(() => {
        const progressBar = document.querySelector('.MuiLinearProgress-bar')
        expect(progressBar).toBeInTheDocument()
      })
    })

    it('应该在完成时显示 100% 进度', async () => {
      render(<StreamingOutput sessionId="test-session" isActive={true} />)

      const handler = mockOnClaudeStream.mock.calls[0][0]

      handler(null, {
        type: 'stream-end',
        sessionId: 'test-session',
        timestamp: new Date().toISOString(),
        data: {
          success: true
        }
      })

      await waitFor(() => {
        const progressBar = document.querySelector('.MuiLinearProgress-bar')
        expect(progressBar).toHaveStyle({ transform: expect.stringContaining('100') })
      })
    })
  })

  describe('日志显示', () => {
    it('应该显示多条日志消息', async () => {
      render(<StreamingOutput sessionId="test-session" isActive={true} />)

      const handler = mockOnClaudeStream.mock.calls[0][0]

      handler(null, {
        type: 'stream-data',
        sessionId: 'test-session',
        timestamp: new Date().toISOString(),
        data: {
          content: '消息1',
          stage: 'init'
        }
      })

      handler(null, {
        type: 'stream-data',
        sessionId: 'test-session',
        timestamp: new Date().toISOString(),
        data: {
          content: '消息2',
          stage: 'response'
        }
      })

      await waitFor(() => {
        expect(screen.getByText('消息1')).toBeInTheDocument()
        expect(screen.getByText('消息2')).toBeInTheDocument()
      })
    })

    it('应该显示日志数量徽章', async () => {
      render(<StreamingOutput sessionId="test-session" isActive={true} />)

      const handler = mockOnClaudeStream.mock.calls[0][0]

      handler(null, {
        type: 'stream-data',
        sessionId: 'test-session',
        timestamp: new Date().toISOString(),
        data: {
          content: '测试消息',
          stage: 'response'
        }
      })

      await waitFor(() => {
        expect(screen.getByText('1')).toBeInTheDocument()
      })
    })

    it('应该显示原始输出', async () => {
      render(<StreamingOutput sessionId="test-session" isActive={true} />)

      const handler = mockOnClaudeStream.mock.calls[0][0]

      handler(null, {
        type: 'stream-data',
        sessionId: 'test-session',
        timestamp: new Date().toISOString(),
        data: {
          content: '消息',
          rawOutput: '原始输出内容',
          stage: 'raw'
        }
      })

      await waitFor(() => {
        expect(screen.getByText('原始输出内容')).toBeInTheDocument()
      })
    })
  })

  describe('状态指示', () => {
    it('应该显示正常运行状态图标', () => {
      render(<StreamingOutput sessionId="test-session" isActive={true} />)

      const playIcon = document.querySelector('[data-testid="PlayArrowIcon"]')
      expect(playIcon).toBeInTheDocument()
    })

    it('应该显示完成状态图标', async () => {
      render(<StreamingOutput sessionId="test-session" isActive={true} />)

      const handler = mockOnClaudeStream.mock.calls[0][0]

      handler(null, {
        type: 'stream-end',
        sessionId: 'test-session',
        timestamp: new Date().toISOString(),
        data: {
          success: true
        }
      })

      await waitFor(() => {
        const checkIcon = document.querySelector('[data-testid="CheckCircleIcon"]')
        expect(checkIcon).toBeInTheDocument()
      })
    })

    it('应该显示错误状态图标', async () => {
      render(<StreamingOutput sessionId="test-session" isActive={true} />)

      const handler = mockOnClaudeStream.mock.calls[0][0]

      handler(null, {
        type: 'stream-error',
        sessionId: 'test-session',
        timestamp: new Date().toISOString(),
        data: {
          content: '错误'
        }
      })

      await waitFor(() => {
        const errorIcon = document.querySelector('[data-testid="ErrorIcon"]')
        expect(errorIcon).toBeInTheDocument()
      })
    })
  })

  describe('阶段标签', () => {
    const stages = [
      { stage: 'init', expected: '初始化' },
      { stage: 'spawn', expected: '启动进程' },
      { stage: 'ready', expected: '准备就绪' },
      { stage: 'response', expected: 'Claude回复' },
      { stage: 'tool', expected: '工具调用' },
      { stage: 'tool-result', expected: '工具执行' },
      { stage: 'success', expected: '成功' },
      { stage: 'error', expected: '错误' }
    ]

    stages.forEach(({ stage, expected }) => {
      it(`应该正确显示 ${stage} 阶段标签`, async () => {
        render(<StreamingOutput sessionId="test-session" isActive={true} />)

        const handler = mockOnClaudeStream.mock.calls[0][0]

        handler(null, {
          type: 'stream-data',
          sessionId: 'test-session',
          timestamp: new Date().toISOString(),
          data: {
            content: '测试',
            stage
          }
        })

        await waitFor(() => {
          expect(screen.getByText(expected)).toBeInTheDocument()
        })
      })
    })
  })

  describe('清理', () => {
    it('应该在组件卸载时取消订阅', () => {
      const { unmount } = render(
        <StreamingOutput sessionId="test-session" isActive={true} />
      )

      expect(mockOnClaudeStream).toHaveBeenCalled()

      unmount()

      expect(mockUnsubscribe).toHaveBeenCalled()
    })

    it('应该在 isActive 变为 false 时取消订阅', () => {
      const { rerender } = render(
        <StreamingOutput sessionId="test-session" isActive={true} />
      )

      expect(mockOnClaudeStream).toHaveBeenCalled()

      rerender(<StreamingOutput sessionId="test-session" isActive={false} />)

      expect(mockUnsubscribe).toHaveBeenCalled()
    })
  })

  describe('命令显示', () => {
    it('应该显示执行的命令', async () => {
      render(<StreamingOutput sessionId="test-session" isActive={true} />)

      const handler = mockOnClaudeStream.mock.calls[0][0]

      handler(null, {
        type: 'stream-start',
        sessionId: 'test-session',
        timestamp: new Date().toISOString(),
        data: {
          command: 'npm run build'
        }
      })

      await waitFor(() => {
        expect(screen.getByText('执行命令:')).toBeInTheDocument()
        expect(screen.getByText('npm run build')).toBeInTheDocument()
      })
    })
  })

  describe('日志气泡样式', () => {
    it('应该为不同阶段应用不同样式', async () => {
      render(<StreamingOutput sessionId="test-session" isActive={true} />)

      const handler = mockOnClaudeStream.mock.calls[0][0]

      handler(null, {
        type: 'stream-data',
        sessionId: 'test-session',
        timestamp: new Date().toISOString(),
        data: {
          content: '初始化消息',
          stage: 'init'
        }
      })

      handler(null, {
        type: 'stream-data',
        sessionId: 'test-session',
        timestamp: new Date().toISOString(),
        data: {
          content: '系统消息',
          stage: 'system'
        }
      })

      await waitFor(() => {
        expect(screen.getByText('初始化消息')).toBeInTheDocument()
        expect(screen.getByText('系统消息')).toBeInTheDocument()
      })
    })

    it('应该显示错误日志的特殊样式', async () => {
      render(<StreamingOutput sessionId="test-session" isActive={true} />)

      const handler = mockOnClaudeStream.mock.calls[0][0]

      handler(null, {
        type: 'stream-data',
        sessionId: 'test-session',
        timestamp: new Date().toISOString(),
        data: {
          content: '错误消息',
          stage: 'error',
          metadata: { isError: true }
        }
      })

      await waitFor(() => {
        expect(screen.getByText('错误消息')).toBeInTheDocument()
      })
    })
  })

  describe('滚动行为', () => {
    it('应该在接收新消息时自动滚动', async () => {
      const { container } = render(
        <StreamingOutput sessionId="test-session" isActive={true} />
      )

      const scrollIntoViewMock = jest.fn()
      Element.prototype.scrollIntoView = scrollIntoViewMock

      const handler = mockOnClaudeStream.mock.calls[0][0]

      handler(null, {
        type: 'stream-data',
        sessionId: 'test-session',
        timestamp: new Date().toISOString(),
        data: {
          content: '新消息',
          stage: 'response'
        }
      })

      await waitFor(() => {
        expect(screen.getByText('新消息')).toBeInTheDocument()
      })

      expect(scrollIntoViewMock).toHaveBeenCalled()
    })
  })
})
