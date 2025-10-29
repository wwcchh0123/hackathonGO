import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { MessageBubble } from '../../../../src/pages/chat/components/MessageBubble'

// Mock MarkdownContent to avoid ESM issues
jest.mock('../../../../src/components/MarkdownContent', () => ({
  __esModule: true,
  MarkdownContent: ({ content }: any) => <div>{content}</div>,
  default: ({ content }: any) => <div>{content}</div>,
}))

describe('MessageBubble', () => {
  const baseMessage = {
    id: '1',
    content: '测试内容',
    timestamp: new Date(),
  }

  it('renders user message with user avatar', () => {
    render(<MessageBubble message={{ ...baseMessage, type: 'user' } as any} />)
    expect(screen.getByText('测试内容')).toBeInTheDocument()
    expect(screen.getByText('U')).toBeInTheDocument()
  })

  it('renders assistant message with assistant badge', () => {
    render(<MessageBubble message={{ ...baseMessage, type: 'assistant' } as any} />)
    expect(screen.getByText('测试内容')).toBeInTheDocument()
    // 通过图片的 alt 文本断言助手图标是否渲染
    expect(screen.getByAltText('Assistant')).toBeInTheDocument()
  })

  it('renders system message with exclamation badge', () => {
    render(<MessageBubble message={{ ...baseMessage, type: 'system' } as any} />)
    expect(screen.getByText('测试内容')).toBeInTheDocument()
    expect(screen.getByText('!')).toBeInTheDocument()
  })

  it('renders images when provided', () => {
    const images = ['http://example.com/a.png', 'http://example.com/b.png']
    render(<MessageBubble message={{ ...baseMessage, type: 'assistant', images } as any} />)
    expect(screen.getAllByRole('img').length).toBeGreaterThan(0)
  })
})
