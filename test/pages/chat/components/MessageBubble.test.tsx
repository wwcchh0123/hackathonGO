import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { MessageBubble, Message } from '../../../../src/pages/chat/components/MessageBubble'

describe('MessageBubble', () => {
  const mockOnPrefillInput = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    global.open = jest.fn()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('用户消息渲染', () => {
    it('应该渲染用户消息', () => {
      const message: Message = {
        id: '1',
        type: 'user',
        content: '用户消息内容',
        timestamp: new Date()
      }

      render(<MessageBubble message={message} />)

      expect(screen.getByText('用户消息内容')).toBeInTheDocument()
    })

    it('应该将用户消息右对齐', () => {
      const message: Message = {
        id: '1',
        type: 'user',
        content: '测试',
        timestamp: new Date()
      }

      const { container } = render(<MessageBubble message={message} />)

      const messageBox = container.firstChild
      expect(messageBox).toHaveStyle({ justifyContent: 'flex-end' })
    })

    it('应该不显示用户消息的头像', () => {
      const message: Message = {
        id: '1',
        type: 'user',
        content: '测试',
        timestamp: new Date()
      }

      const { container } = render(<MessageBubble message={message} />)

      const avatar = container.querySelector('[role="img"]')
      expect(avatar).not.toBeInTheDocument()
    })
  })

  describe('助手消息渲染', () => {
    it('应该渲染助手消息', () => {
      const message: Message = {
        id: '1',
        type: 'assistant',
        content: '助手回复',
        timestamp: new Date()
      }

      render(<MessageBubble message={message} />)

      expect(screen.getByText('助手回复')).toBeInTheDocument()
    })

    it('应该将助手消息左对齐', () => {
      const message: Message = {
        id: '1',
        type: 'assistant',
        content: '测试',
        timestamp: new Date()
      }

      const { container } = render(<MessageBubble message={message} />)

      const messageBox = container.firstChild
      expect(messageBox).toHaveStyle({ justifyContent: 'flex-start' })
    })

    it('应该显示助手头像', () => {
      const message: Message = {
        id: '1',
        type: 'assistant',
        content: '测试',
        timestamp: new Date()
      }

      render(<MessageBubble message={message} />)

      expect(screen.getByText('C')).toBeInTheDocument()
    })

    it('应该显示正确的助手头像颜色', () => {
      const message: Message = {
        id: '1',
        type: 'assistant',
        content: '测试',
        timestamp: new Date()
      }

      const { container } = render(<MessageBubble message={message} />)

      const avatar = screen.getByText('C').parentElement
      expect(avatar).toHaveStyle({ backgroundColor: '#CC785C' })
    })
  })

  describe('系统消息渲染', () => {
    it('应该渲染系统消息', () => {
      const message: Message = {
        id: '1',
        type: 'system',
        content: '系统通知',
        timestamp: new Date()
      }

      render(<MessageBubble message={message} />)

      expect(screen.getByText('系统通知')).toBeInTheDocument()
    })

    it('应该显示系统消息头像', () => {
      const message: Message = {
        id: '1',
        type: 'system',
        content: '测试',
        timestamp: new Date()
      }

      render(<MessageBubble message={message} />)

      expect(screen.getByText('!')).toBeInTheDocument()
    })

    it('应该显示正确的系统头像样式', () => {
      const message: Message = {
        id: '1',
        type: 'system',
        content: '测试',
        timestamp: new Date()
      }

      const { container } = render(<MessageBubble message={message} />)

      const avatar = screen.getByText('!').parentElement
      expect(avatar).toHaveStyle({ backgroundColor: '#f5f5f5' })
    })
  })

  describe('图片附件', () => {
    it('应该渲染单张图片', () => {
      const message: Message = {
        id: '1',
        type: 'user',
        content: '看这张图片',
        timestamp: new Date(),
        images: ['https://example.com/image1.jpg']
      }

      render(<MessageBubble message={message} />)

      const img = screen.getByAltText('Attachment 1')
      expect(img).toHaveAttribute('src', 'https://example.com/image1.jpg')
    })

    it('应该渲染多张图片', () => {
      const message: Message = {
        id: '1',
        type: 'user',
        content: '多张图片',
        timestamp: new Date(),
        images: [
          'https://example.com/img1.jpg',
          'https://example.com/img2.jpg',
          'https://example.com/img3.jpg'
        ]
      }

      render(<MessageBubble message={message} />)

      expect(screen.getByAltText('Attachment 1')).toBeInTheDocument()
      expect(screen.getByAltText('Attachment 2')).toBeInTheDocument()
      expect(screen.getByAltText('Attachment 3')).toBeInTheDocument()
    })

    it('应该在点击图片时打开新窗口', () => {
      const message: Message = {
        id: '1',
        type: 'user',
        content: '图片',
        timestamp: new Date(),
        images: ['https://example.com/image.jpg']
      }

      render(<MessageBubble message={message} />)

      const img = screen.getByAltText('Attachment 1')
      fireEvent.click(img)

      expect(global.open).toHaveBeenCalledWith(
        'https://example.com/image.jpg',
        '_blank'
      )
    })

    it('应该在没有图片时不渲染图片区域', () => {
      const message: Message = {
        id: '1',
        type: 'user',
        content: '无图片',
        timestamp: new Date()
      }

      render(<MessageBubble message={message} />)

      const images = screen.queryAllByRole('img')
      expect(images).toHaveLength(0)
    })

    it('应该在图片数组为空时不渲染图片区域', () => {
      const message: Message = {
        id: '1',
        type: 'user',
        content: '空数组',
        timestamp: new Date(),
        images: []
      }

      render(<MessageBubble message={message} />)

      const images = screen.queryAllByRole('img')
      expect(images).toHaveLength(0)
    })
  })

  describe('Markdown 内容', () => {
    it('应该渲染 Markdown 格式的文本', () => {
      const message: Message = {
        id: '1',
        type: 'assistant',
        content: '**粗体** 和 *斜体*',
        timestamp: new Date()
      }

      render(<MessageBubble message={message} />)

      const bold = screen.getByText('粗体')
      const italic = screen.getByText('斜体')

      expect(bold.tagName).toBe('STRONG')
      expect(italic.tagName).toBe('EM')
    })

    it('应该渲染代码块', () => {
      const message: Message = {
        id: '1',
        type: 'assistant',
        content: '```javascript\nconst x = 1;\n```',
        timestamp: new Date()
      }

      render(<MessageBubble message={message} />)

      expect(screen.getByText('const x = 1;')).toBeInTheDocument()
    })

    it('应该渲染链接', () => {
      const message: Message = {
        id: '1',
        type: 'assistant',
        content: '[点击这里](https://example.com)',
        timestamp: new Date()
      }

      render(<MessageBubble message={message} />)

      const link = screen.getByRole('link', { name: '点击这里' })
      expect(link).toHaveAttribute('href', 'https://example.com')
    })
  })

  describe('消息布局', () => {
    it('应该限制消息宽度为 70%', () => {
      const message: Message = {
        id: '1',
        type: 'user',
        content: '测试',
        timestamp: new Date()
      }

      const { container } = render(<MessageBubble message={message} />)

      const messageContent = container.querySelector('[style*="maxWidth"]')
      expect(messageContent).toHaveStyle({ maxWidth: '70%' })
    })

    it('应该显示为列布局', () => {
      const message: Message = {
        id: '1',
        type: 'user',
        content: '测试',
        timestamp: new Date()
      }

      const { container } = render(<MessageBubble message={message} />)

      const messageContent = container.querySelector('[style*="flexDirection"]')
      expect(messageContent).toHaveStyle({ flexDirection: 'column' })
    })
  })

  describe('工具结果', () => {
    it('应该渲染成功的工具结果', () => {
      const message: Message = {
        id: '1',
        type: 'assistant',
        content: '执行完成',
        timestamp: new Date(),
        toolResults: [
          {
            id: 'tool1',
            name: 'test_tool',
            status: 'success',
            output: '成功输出'
          }
        ]
      }

      render(<MessageBubble message={message} onPrefillInput={mockOnPrefillInput} />)

      expect(screen.getByText(/成功输出/)).toBeInTheDocument()
    })

    it('应该渲染错误的工具结果', () => {
      const message: Message = {
        id: '1',
        type: 'assistant',
        content: '执行失败',
        timestamp: new Date(),
        toolResults: [
          {
            id: 'tool1',
            name: 'test_tool',
            status: 'error',
            error: '错误信息'
          }
        ]
      }

      render(<MessageBubble message={message} onPrefillInput={mockOnPrefillInput} />)

      expect(screen.getByText(/错误信息/)).toBeInTheDocument()
    })

    it('应该渲染待处理的工具结果', () => {
      const message: Message = {
        id: '1',
        type: 'assistant',
        content: '执行中',
        timestamp: new Date(),
        toolResults: [
          {
            id: 'tool1',
            name: 'test_tool',
            status: 'pending'
          }
        ]
      }

      render(<MessageBubble message={message} onPrefillInput={mockOnPrefillInput} />)

      expect(screen.getByText(/test_tool/)).toBeInTheDocument()
    })
  })

  describe('边界情况', () => {
    it('应该处理空内容', () => {
      const message: Message = {
        id: '1',
        type: 'user',
        content: '',
        timestamp: new Date()
      }

      const { container } = render(<MessageBubble message={message} />)

      expect(container.firstChild).toBeInTheDocument()
    })

    it('应该处理超长文本', () => {
      const longText = 'a'.repeat(10000)
      const message: Message = {
        id: '1',
        type: 'user',
        content: longText,
        timestamp: new Date()
      }

      render(<MessageBubble message={message} />)

      expect(screen.getByText(longText)).toBeInTheDocument()
    })

    it('应该处理特殊字符', () => {
      const message: Message = {
        id: '1',
        type: 'user',
        content: '<script>alert("xss")</script>',
        timestamp: new Date()
      }

      render(<MessageBubble message={message} />)

      const scripts = document.querySelectorAll('script')
      expect(scripts).toHaveLength(0)
    })
  })

  describe('响应式设计', () => {
    it('应该在不同消息类型间有间距', () => {
      const message: Message = {
        id: '1',
        type: 'user',
        content: '测试',
        timestamp: new Date()
      }

      const { container } = render(<MessageBubble message={message} />)

      const messageBox = container.firstChild
      expect(messageBox).toHaveStyle({ marginBottom: expect.any(String) })
    })

    it('应该正确显示头像和消息的间距', () => {
      const message: Message = {
        id: '1',
        type: 'assistant',
        content: '测试',
        timestamp: new Date()
      }

      const { container } = render(<MessageBubble message={message} />)

      const messageBox = container.firstChild
      expect(messageBox).toHaveStyle({ gap: expect.any(String) })
    })
  })
})
