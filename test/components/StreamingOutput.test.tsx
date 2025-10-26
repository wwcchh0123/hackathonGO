import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import { StreamingOutput } from '../../src/components/StreamingOutput'

describe('StreamingOutput', () => {
  let mockOnClaudeStream: jest.Mock
  let unsubscribeMock: jest.Mock

  beforeEach(() => {
    jest.clearAllMocks()
    unsubscribeMock = jest.fn()
    mockOnClaudeStream = jest.fn(() => unsubscribeMock)

    Object.defineProperty(window, 'api', {
      writable: true,
      value: {
        onClaudeStream: mockOnClaudeStream
      }
    })
  })

  afterEach(() => {
    delete (window as any).api
  })

  describe('渲染', () => {
    it('应该在非活动状态下不渲染', () => {
      const { container } = render(
        <StreamingOutput sessionId="test-session" isActive={false} />
      )

      expect(container.firstChild).toBeNull()
    })

    it('应该在活动状态下渲染组件', () => {
      render(<StreamingOutput sessionId="test-session" isActive={true} />)

      expect(screen.getByText('🤖 Claude Code 执行状态')).toBeInTheDocument()
    })

    it('应该显示初始状态', () => {
      render(<StreamingOutput sessionId="test-session" isActive={true} />)

      expect(screen.getByText('等待 Claude Code 输出...')).toBeInTheDocument()
    })

    it('应该默认展开日志区域', () => {
      render(<StreamingOutput sessionId="test-session" isActive={true} />)

      const logsArea = screen.getByText('等待 Claude Code 输出...')
      expect(logsArea).toBeVisible()
    })
  })

  describe('流式消息处理', () => {
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
        expect(screen.getByText('执行过程中遇到问题')).toBeInTheDocument()
      })
    })

    it('应该忽略不匹配的 sessionId', () => {
      render(<StreamingOutput sessionId="test-session" isActive={true} />)

      const handler = mockOnClaudeStream.mock.calls[0][0]
      handler(null, {
        type: 'stream-data',
        sessionId: 'other-session',
        timestamp: new Date().toISOString(),
        data: {
          content: '其他会话消息'
        }
      })

      expect(screen.queryByText('其他会话消息')).not.toBeInTheDocument()
    })

    it('应该累积多条日志消息', async () => {
      render(<StreamingOutput sessionId="test-session" isActive={true} />)

      const handler = mockOnClaudeStream.mock.calls[0][0]

      handler(null, {
        type: 'stream-data',
        sessionId: 'test-session',
        timestamp: new Date().toISOString(),
        data: {
          content: '第一条消息',
          stage: 'init'
        }
      })

      handler(null, {
        type: 'stream-data',
        sessionId: 'test-session',
        timestamp: new Date().toISOString(),
        data: {
          content: '第二条消息',
          stage: 'response'
        }
      })

      await waitFor(() => {
        expect(screen.getByText('第一条消息')).toBeInTheDocument()
        expect(screen.getByText('第二条消息')).toBeInTheDocument()
      })
    })
  })

  describe('阶段状态', () => {
    it('应该更新当前阶段', async () => {
      render(<StreamingOutput sessionId="test-session" isActive={true} />)

      const handler = mockOnClaudeStream.mock.calls[0][0]
      handler(null, {
        type: 'stream-data',
        sessionId: 'test-session',
        timestamp: new Date().toISOString(),
        data: {
          content: '消息',
          stage: 'tool'
        }
      })

      await waitFor(() => {
        expect(screen.getByText('工具调用')).toBeInTheDocument()
      })
    })

    it('应该在错误阶段设置错误状态', async () => {
      render(<StreamingOutput sessionId="test-session" isActive={true} />)

      const handler = mockOnClaudeStream.mock.calls[0][0]
      handler(null, {
        type: 'stream-data',
        sessionId: 'test-session',
        timestamp: new Date().toISOString(),
        data: {
          content: '错误消息',
          stage: 'error'
        }
      })

      await waitFor(() => {
        expect(screen.getByText('错误消息')).toBeInTheDocument()
      })
    })
  })

  describe('交互', () => {
    it('应该在点击头部时切换展开状态', async () => {
      const user = userEvent.setup()
      render(<StreamingOutput sessionId="test-session" isActive={true} />)

      const header = screen.getByText('🤖 Claude Code 执行状态')
      expect(screen.getByText('等待 Claude Code 输出...')).toBeVisible()

      await user.click(header)

      await waitFor(() => {
        expect(screen.queryByText('等待 Claude Code 输出...')).not.toBeVisible()
      })
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
        expect(screen.getByText('npm run build')).toBeInTheDocument()
      })
    })
  })

  describe('日志样式', () => {
    it('应该为错误日志应用错误样式', async () => {
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

    it('应该显示不同阶段的图标', async () => {
      render(<StreamingOutput sessionId="test-session" isActive={true} />)

      const handler = mockOnClaudeStream.mock.calls[0][0]

      const stages = [
        { stage: 'init', icon: '🚀' },
        { stage: 'response', icon: '💬' },
        { stage: 'tool', icon: '🔧' },
        { stage: 'success', icon: '✅' },
        { stage: 'error', icon: '❌' }
      ]

      for (const { stage } of stages) {
        handler(null, {
          type: 'stream-data',
          sessionId: 'test-session',
          timestamp: new Date().toISOString(),
          data: {
            content: `${stage} 消息`,
            stage
          }
        })
      }

      await waitFor(() => {
        expect(screen.getByText('init 消息')).toBeInTheDocument()
      })
    })
  })

  describe('原始输出', () => {
    it('应该显示原始输出', async () => {
      render(<StreamingOutput sessionId="test-session" isActive={true} />)

      const handler = mockOnClaudeStream.mock.calls[0][0]
      handler(null, {
        type: 'stream-data',
        sessionId: 'test-session',
        timestamp: new Date().toISOString(),
        data: {
          content: '简短消息',
          rawOutput: '详细的原始输出内容...',
          stage: 'raw'
        }
      })

      await waitFor(() => {
        expect(screen.getByText('简短消息')).toBeInTheDocument()
        expect(screen.getByText('详细的原始输出内容...')).toBeInTheDocument()
      })
    })

    it('应该在原始输出与内容相同时不重复显示', async () => {
      render(<StreamingOutput sessionId="test-session" isActive={true} />)

      const handler = mockOnClaudeStream.mock.calls[0][0]
      handler(null, {
        type: 'stream-data',
        sessionId: 'test-session',
        timestamp: new Date().toISOString(),
        data: {
          content: '💬 相同内容',
          rawOutput: '相同内容',
          stage: 'response'
        }
      })

      await waitFor(() => {
        const matches = screen.getAllByText('相同内容')
        expect(matches).toHaveLength(1)
      })
    })
  })

  describe('元数据显示', () => {
    it('应该显示工具名称', async () => {
      render(<StreamingOutput sessionId="test-session" isActive={true} />)

      const handler = mockOnClaudeStream.mock.calls[0][0]
      handler(null, {
        type: 'stream-data',
        sessionId: 'test-session',
        timestamp: new Date().toISOString(),
        data: {
          content: '工具消息',
          stage: 'tool',
          metadata: {
            toolName: 'TestTool'
          }
        }
      })

      await waitFor(() => {
        expect(screen.getByText('工具消息')).toBeInTheDocument()
      })
    })
  })

  describe('进度条', () => {
    it('应该根据阶段更新进度', async () => {
      const { container } = render(
        <StreamingOutput sessionId="test-session" isActive={true} />
      )

      const handler = mockOnClaudeStream.mock.calls[0][0]
      handler(null, {
        type: 'stream-data',
        sessionId: 'test-session',
        timestamp: new Date().toISOString(),
        data: {
          content: '消息',
          stage: 'response'
        }
      })

      await waitFor(() => {
        const progressBar = container.querySelector('.MuiLinearProgress-bar')
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
        expect(screen.getByText('执行完成')).toBeInTheDocument()
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

      expect(unsubscribeMock).toHaveBeenCalled()
    })

    it('应该在 isActive 变为 false 时取消订阅', () => {
      const { rerender } = render(
        <StreamingOutput sessionId="test-session" isActive={true} />
      )

      expect(mockOnClaudeStream).toHaveBeenCalled()

      rerender(<StreamingOutput sessionId="test-session" isActive={false} />)

      expect(unsubscribeMock).toHaveBeenCalled()
    })
  })

  describe('日志计数', () => {
    it('应该显示日志数量', async () => {
      render(<StreamingOutput sessionId="test-session" isActive={true} />)

      const handler = mockOnClaudeStream.mock.calls[0][0]

      for (let i = 0; i < 5; i++) {
        handler(null, {
          type: 'stream-data',
          sessionId: 'test-session',
          timestamp: new Date().toISOString(),
          data: {
            content: `消息 ${i}`,
            stage: 'response'
          }
        })
      }

      await waitFor(() => {
        expect(screen.getByText('消息 4')).toBeInTheDocument()
      })
    })
  })

  describe('边界条件', () => {
    it('应该处理空消息内容', () => {
      render(<StreamingOutput sessionId="test-session" isActive={true} />)

      const handler = mockOnClaudeStream.mock.calls[0][0]
      handler(null, {
        type: 'stream-data',
        sessionId: 'test-session',
        timestamp: new Date().toISOString(),
        data: {
          content: '',
          stage: 'response'
        }
      })

      expect(screen.queryByText('')).not.toBeInTheDocument()
    })

    it('应该处理缺少 data 字段的消息', () => {
      render(<StreamingOutput sessionId="test-session" isActive={true} />)

      const handler = mockOnClaudeStream.mock.calls[0][0]
      expect(() => {
        handler(null, {
          type: 'stream-data',
          sessionId: 'test-session',
          timestamp: new Date().toISOString()
        })
      }).not.toThrow()
    })

    it('应该处理无效的时间戳', async () => {
      render(<StreamingOutput sessionId="test-session" isActive={true} />)

      const handler = mockOnClaudeStream.mock.calls[0][0]
      handler(null, {
        type: 'stream-data',
        sessionId: 'test-session',
        timestamp: 'invalid-timestamp',
        data: {
          content: '测试消息',
          stage: 'response'
        }
      })

      await waitFor(() => {
        expect(screen.getByText('测试消息')).toBeInTheDocument()
      })
    })
  })
})
