import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { ChatMessages } from '../../../../src/pages/chat/components/ChatMessages'
// Mock MarkdownContent to avoid ESM issues via MessageBubble
jest.mock('../../../../src/components/MarkdownContent', () => ({
  __esModule: true,
  MarkdownContent: ({ content }: any) => <div>{content}</div>,
  default: ({ content }: any) => <div>{content}</div>,
}))

describe('ChatMessages', () => {
  const endRef = { current: null } as React.RefObject<HTMLDivElement>
  const onPrefillInput = jest.fn()

  it('renders welcome when no messages', () => {
    render(<ChatMessages messages={[]} messagesEndRef={endRef} onPrefillInput={onPrefillInput} />)
    expect(screen.getByText('Welcome to XGopilot for Desktop')).toBeInTheDocument()
    expect(screen.getByText(/Start a conversation/)).toBeInTheDocument()
  })

  it('renders message bubbles when messages exist', () => {
    const messages = [
      { id: '1', type: 'user', content: '你好', timestamp: new Date() },
      { id: '2', type: 'assistant', content: '世界', timestamp: new Date() },
    ]
    render(<ChatMessages messages={messages as any} messagesEndRef={endRef} onPrefillInput={onPrefillInput} />)
    expect(screen.getByText('你好')).toBeInTheDocument()
    expect(screen.getByText('世界')).toBeInTheDocument()
  })
})
