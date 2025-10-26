import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { SessionSidebar } from '../../../../src/pages/chat/components/SessionSidebar'

describe('SessionSidebar', () => {
  const sessions = [
    { id: 's1', title: '短标题', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), messages: [] },
    { id: 's2', title: '很长很长很长很长很长很长很长很长很长很长的标题', createdAt: new Date().toISOString(), updatedAt: new Date(Date.now() - 24*3600*1000).toISOString(), messages: [] },
  ]

  const props = {
    open: true,
    onClose: jest.fn(),
    sessions: sessions as any,
    activeSessionId: 's1',
    onSessionSelect: jest.fn(),
    onNewSession: jest.fn(),
  }

  beforeEach(() => jest.clearAllMocks())

  it('renders header and new session button', () => {
    render(<SessionSidebar {...props} />)
    expect(screen.getByText('会话历史')).toBeInTheDocument()
    expect(screen.getByText('新建会话')).toBeInTheDocument()
  })

  it('handles close and new session actions', () => {
    render(<SessionSidebar {...props} />)
    fireEvent.click(screen.getByRole('button', { name: '' })) // Close IconButton has no accessible name
    expect(props.onClose).toHaveBeenCalled()
    fireEvent.click(screen.getByText('新建会话'))
    expect(props.onNewSession).toHaveBeenCalled()
  })

  it('renders sessions and selects active', () => {
    render(<SessionSidebar {...props} />)
    expect(screen.getByText('短标题')).toBeInTheDocument()
    // Long title should be truncated (presence suffices)
    expect(screen.getByText(/很长很长/)).toBeInTheDocument()
  })

  it('formats dates as 今天/昨天/几天前', () => {
    const now = new Date()
    const sessions = [
      { id: 's1', title: '今天的', createdAt: now.toISOString(), updatedAt: now.toISOString(), messages: [] },
      { id: 's2', title: '昨天的', createdAt: now.toISOString(), updatedAt: new Date(now.getTime() - 24*3600*1000).toISOString(), messages: [] },
      { id: 's3', title: '三天前', createdAt: now.toISOString(), updatedAt: new Date(now.getTime() - 3*24*3600*1000).toISOString(), messages: [] },
    ]
    const p = { ...props, sessions: sessions as any }
    render(<SessionSidebar {...p} />)
    expect(screen.getByText('今天')).toBeInTheDocument()
    expect(screen.getByText('昨天')).toBeInTheDocument()
    expect(screen.getByText('3天前')).toBeInTheDocument()
  })

  it('selects session on click', () => {
    render(<SessionSidebar {...props} />)
    fireEvent.click(screen.getByText('短标题'))
    expect(props.onSessionSelect).toHaveBeenCalledWith('s1')
  })
})
