import React from 'react'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { ChatMessages } from '../../../../src/pages/chat/components/ChatMessages'
import { Message } from '../../../../src/pages/chat/components/MessageBubble'

describe('ChatMessages', () => {
  const mockMessages: Message[] = [
    {
      id: '1',
      type: 'user',
      content: '用户消息 1',
      timestamp: new Date('2024-01-01T10:00:00')
    },
    {
      id: '2',
      type: 'assistant',
      content: '助手回复 1',
      timestamp: new Date('2024-01-01T10:00:01')
    },
    {
      id: '3',
      type: 'user',
      content: '用户消息 2',
      timestamp: new Date('2024-01-01T10:00:02')
    }
  ]

  beforeEach(() => {
    Element.prototype.scrollIntoView = jest.fn()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('渲染', () => {
    it('应该渲染所有消息', () => {
      render(<ChatMessages messages={mockMessages} />)

      expect(screen.getByText('用户消息 1')).toBeInTheDocument()
      expect(screen.getByText('助手回复 1')).toBeInTheDocument()
      expect(screen.getByText('用户消息 2')).toBeInTheDocument()
    })

    it('应该在没有消息时不渲染任何内容', () => {
      const { container } = render(<ChatMessages messages={[]} />)

      const messageBubbles = container.querySelectorAll('[role="article"]')
      expect(messageBubbles).toHaveLength(0)
    })

    it('应该按时间顺序渲染消息', () => {
      const { container } = render(<ChatMessages messages={mockMessages} />)

      const messages = container.querySelectorAll('div')
      const texts = Array.from(messages).map((div) => div.textContent)

      const userMsg1Index = texts.findIndex((t) => t?.includes('用户消息 1'))
      const assistantMsg1Index = texts.findIndex((t) => t?.includes('助手回复 1'))
      const userMsg2Index = texts.findIndex((t) => t?.includes('用户消息 2'))

      expect(userMsg1Index).toBeLessThan(assistantMsg1Index)
      expect(assistantMsg1Index).toBeLessThan(userMsg2Index)
    })
  })

  describe('滚动行为', () => {
    it('应该在消息更新时自动滚动到底部', () => {
      const scrollIntoViewMock = jest.fn()
      Element.prototype.scrollIntoView = scrollIntoViewMock

      const { rerender } = render(<ChatMessages messages={mockMessages} />)

      const newMessages = [
        ...mockMessages,
        {
          id: '4',
          type: 'assistant',
          content: '新消息',
          timestamp: new Date()
        }
      ]

      rerender(<ChatMessages messages={newMessages} />)

      expect(scrollIntoViewMock).toHaveBeenCalled()
    })

    it('应该使用平滑滚动', () => {
      const scrollIntoViewMock = jest.fn()
      Element.prototype.scrollIntoView = scrollIntoViewMock

      render(<ChatMessages messages={mockMessages} />)

      expect(scrollIntoViewMock).toHaveBeenCalledWith({
        behavior: 'smooth'
      })
    })
  })

  describe('消息类型', () => {
    it('应该正确渲染用户消息', () => {
      const userMessages: Message[] = [
        {
          id: '1',
          type: 'user',
          content: '用户消息',
          timestamp: new Date()
        }
      ]

      render(<ChatMessages messages={userMessages} />)

      expect(screen.getByText('用户消息')).toBeInTheDocument()
    })

    it('应该正确渲染助手消息', () => {
      const assistantMessages: Message[] = [
        {
          id: '1',
          type: 'assistant',
          content: '助手消息',
          timestamp: new Date()
        }
      ]

      render(<ChatMessages messages={assistantMessages} />)

      expect(screen.getByText('助手消息')).toBeInTheDocument()
    })

    it('应该正确渲染系统消息', () => {
      const systemMessages: Message[] = [
        {
          id: '1',
          type: 'system',
          content: '系统消息',
          timestamp: new Date()
        }
      ]

      render(<ChatMessages messages={systemMessages} />)

      expect(screen.getByText('系统消息')).toBeInTheDocument()
    })
  })

  describe('消息附加内容', () => {
    it('应该渲染带图片的消息', () => {
      const messagesWithImages: Message[] = [
        {
          id: '1',
          type: 'user',
          content: '看图片',
          timestamp: new Date(),
          images: ['https://example.com/image.jpg']
        }
      ]

      render(<ChatMessages messages={messagesWithImages} />)

      const img = screen.getByAltText('Attachment 1')
      expect(img).toBeInTheDocument()
    })

    it('应该渲染带工具结果的消息', () => {
      const messagesWithTools: Message[] = [
        {
          id: '1',
          type: 'assistant',
          content: '工具执行',
          timestamp: new Date(),
          toolResults: [
            {
              id: 'tool1',
              name: 'test_tool',
              status: 'success',
              output: '工具输出'
            }
          ]
        }
      ]

      render(<ChatMessages messages={messagesWithTools} />)

      expect(screen.getByText(/工具输出/)).toBeInTheDocument()
    })
  })

  describe('性能', () => {
    it('应该能够处理大量消息', () => {
      const manyMessages: Message[] = Array.from({ length: 100 }, (_, i) => ({
        id: `msg-${i}`,
        type: i % 2 === 0 ? 'user' : 'assistant',
        content: `消息 ${i}`,
        timestamp: new Date()
      }))

      render(<ChatMessages messages={manyMessages} />)

      expect(screen.getByText('消息 0')).toBeInTheDocument()
      expect(screen.getByText('消息 99')).toBeInTheDocument()
    })
  })

  describe('边界情况', () => {
    it('应该处理空消息数组', () => {
      const { container } = render(<ChatMessages messages={[]} />)

      expect(container.firstChild).toBeInTheDocument()
    })

    it('应该处理单条消息', () => {
      const singleMessage: Message[] = [
        {
          id: '1',
          type: 'user',
          content: '单条消息',
          timestamp: new Date()
        }
      ]

      render(<ChatMessages messages={singleMessage} />)

      expect(screen.getByText('单条消息')).toBeInTheDocument()
    })

    it('应该处理相同 ID 的消息', () => {
      const duplicateMessages: Message[] = [
        {
          id: '1',
          type: 'user',
          content: '消息 A',
          timestamp: new Date()
        },
        {
          id: '1',
          type: 'assistant',
          content: '消息 B',
          timestamp: new Date()
        }
      ]

      render(<ChatMessages messages={duplicateMessages} />)

      expect(screen.getByText('消息 A')).toBeInTheDocument()
      expect(screen.getByText('消息 B')).toBeInTheDocument()
    })
  })

  describe('布局', () => {
    it('应该使用正确的容器样式', () => {
      const { container } = render(<ChatMessages messages={mockMessages} />)

      const messagesContainer = container.firstChild
      expect(messagesContainer).toHaveClass('MuiBox-root')
    })

    it('应该在消息间保持适当间距', () => {
      render(<ChatMessages messages={mockMessages} />)

      const messages = screen.getAllByText(/消息|回复/)
      expect(messages.length).toBeGreaterThan(0)
    })
  })

  describe('更新', () => {
    it('应该在添加新消息时更新', () => {
      const { rerender } = render(<ChatMessages messages={mockMessages} />)

      const updatedMessages = [
        ...mockMessages,
        {
          id: '4',
          type: 'user',
          content: '新添加的消息',
          timestamp: new Date()
        }
      ]

      rerender(<ChatMessages messages={updatedMessages} />)

      expect(screen.getByText('新添加的消息')).toBeInTheDocument()
    })

    it('应该在删除消息时更新', () => {
      const { rerender } = render(<ChatMessages messages={mockMessages} />)

      const reducedMessages = mockMessages.slice(0, 2)

      rerender(<ChatMessages messages={reducedMessages} />)

      expect(screen.queryByText('用户消息 2')).not.toBeInTheDocument()
    })

    it('应该在消息内容更新时重新渲染', () => {
      const { rerender } = render(<ChatMessages messages={mockMessages} />)

      const updatedMessages = mockMessages.map((msg) =>
        msg.id === '1' ? { ...msg, content: '更新后的消息' } : msg
      )

      rerender(<ChatMessages messages={updatedMessages} />)

      expect(screen.getByText('更新后的消息')).toBeInTheDocument()
      expect(screen.queryByText('用户消息 1')).not.toBeInTheDocument()
    })
  })
})
