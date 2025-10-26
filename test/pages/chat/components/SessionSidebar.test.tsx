import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { SessionSidebar } from '../../../../src/pages/chat/components/SessionSidebar'

describe('SessionSidebar', () => {
  const mockSessions = [
    {
      id: 'session1',
      title: '会话 1',
      createdAt: '2024-01-01T10:00:00.000Z',
      updatedAt: '2024-01-01T10:00:00.000Z',
      messages: []
    },
    {
      id: 'session2',
      title: '会话 2',
      createdAt: '2024-01-02T10:00:00.000Z',
      updatedAt: '2024-01-02T10:00:00.000Z',
      messages: []
    }
  ]

  const mockOnNewSession = jest.fn()
  const mockOnSelectSession = jest.fn()
  const mockOnDeleteSession = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('渲染', () => {
    it('应该渲染所有会话', () => {
      render(
        <SessionSidebar
          sessions={mockSessions}
          activeSessionId="session1"
          onNewSession={mockOnNewSession}
          onSelectSession={mockOnSelectSession}
          onDeleteSession={mockOnDeleteSession}
        />
      )

      expect(screen.getByText('会话 1')).toBeInTheDocument()
      expect(screen.getByText('会话 2')).toBeInTheDocument()
    })

    it('应该显示新建会话按钮', () => {
      render(
        <SessionSidebar
          sessions={mockSessions}
          activeSessionId="session1"
          onNewSession={mockOnNewSession}
          onSelectSession={mockOnSelectSession}
          onDeleteSession={mockOnDeleteSession}
        />
      )

      const newButton = screen.getByRole('button', { name: /新建/i })
      expect(newButton).toBeInTheDocument()
    })

    it('应该在没有会话时显示空状态', () => {
      render(
        <SessionSidebar
          sessions={[]}
          activeSessionId={null}
          onNewSession={mockOnNewSession}
          onSelectSession={mockOnSelectSession}
          onDeleteSession={mockOnDeleteSession}
        />
      )

      expect(screen.getByText(/暂无会话/i)).toBeInTheDocument()
    })
  })

  describe('会话选择', () => {
    it('应该在点击会话时调用 onSelectSession', () => {
      render(
        <SessionSidebar
          sessions={mockSessions}
          activeSessionId="session1"
          onNewSession={mockOnNewSession}
          onSelectSession={mockOnSelectSession}
          onDeleteSession={mockOnDeleteSession}
        />
      )

      const session2 = screen.getByText('会话 2')
      fireEvent.click(session2)

      expect(mockOnSelectSession).toHaveBeenCalledWith('session2')
    })

    it('应该高亮显示当前活动会话', () => {
      const { container } = render(
        <SessionSidebar
          sessions={mockSessions}
          activeSessionId="session1"
          onNewSession={mockOnNewSession}
          onSelectSession={mockOnSelectSession}
          onDeleteSession={mockOnDeleteSession}
        />
      )

      const activeSession = screen.getByText('会话 1').closest('div')
      expect(activeSession).toHaveClass('Mui-selected')
    })
  })

  describe('新建会话', () => {
    it('应该在点击新建按钮时调用 onNewSession', () => {
      render(
        <SessionSidebar
          sessions={mockSessions}
          activeSessionId="session1"
          onNewSession={mockOnNewSession}
          onSelectSession={mockOnSelectSession}
          onDeleteSession={mockOnDeleteSession}
        />
      )

      const newButton = screen.getByRole('button', { name: /新建/i })
      fireEvent.click(newButton)

      expect(mockOnNewSession).toHaveBeenCalled()
    })
  })

  describe('删除会话', () => {
    it('应该显示删除按钮', () => {
      render(
        <SessionSidebar
          sessions={mockSessions}
          activeSessionId="session1"
          onNewSession={mockOnNewSession}
          onSelectSession={mockOnSelectSession}
          onDeleteSession={mockOnDeleteSession}
        />
      )

      const deleteButtons = screen.getAllByLabelText(/删除/i)
      expect(deleteButtons.length).toBeGreaterThan(0)
    })

    it('应该在点击删除按钮时调用 onDeleteSession', () => {
      render(
        <SessionSidebar
          sessions={mockSessions}
          activeSessionId="session1"
          onNewSession={mockOnNewSession}
          onSelectSession={mockOnSelectSession}
          onDeleteSession={mockOnDeleteSession}
        />
      )

      const deleteButtons = screen.getAllByLabelText(/删除/i)
      fireEvent.click(deleteButtons[0])

      expect(mockOnDeleteSession).toHaveBeenCalledWith('session1')
    })

    it('应该阻止删除事件冒泡到会话选择', () => {
      render(
        <SessionSidebar
          sessions={mockSessions}
          activeSessionId="session1"
          onNewSession={mockOnNewSession}
          onSelectSession={mockOnSelectSession}
          onDeleteSession={mockOnDeleteSession}
        />
      )

      const deleteButtons = screen.getAllByLabelText(/删除/i)
      fireEvent.click(deleteButtons[0])

      expect(mockOnDeleteSession).toHaveBeenCalled()
      expect(mockOnSelectSession).not.toHaveBeenCalled()
    })
  })

  describe('会话排序', () => {
    it('应该按更新时间降序排列会话', () => {
      const { container } = render(
        <SessionSidebar
          sessions={mockSessions}
          activeSessionId="session1"
          onNewSession={mockOnNewSession}
          onSelectSession={mockOnSelectSession}
          onDeleteSession={mockOnDeleteSession}
        />
      )

      const sessionTitles = container.querySelectorAll('[role="button"]')
      const texts = Array.from(sessionTitles).map((el) => el.textContent)

      const session1Index = texts.findIndex((t) => t?.includes('会话 1'))
      const session2Index = texts.findIndex((t) => t?.includes('会话 2'))

      expect(session2Index).toBeLessThan(session1Index)
    })
  })

  describe('可访问性', () => {
    it('应该有正确的 aria 标签', () => {
      render(
        <SessionSidebar
          sessions={mockSessions}
          activeSessionId="session1"
          onNewSession={mockOnNewSession}
          onSelectSession={mockOnSelectSession}
          onDeleteSession={mockOnDeleteSession}
        />
      )

      expect(screen.getByRole('button', { name: /新建/i })).toBeInTheDocument()
      expect(screen.getAllByLabelText(/删除/i)).toHaveLength(2)
    })
  })

  describe('响应式设计', () => {
    it('应该使用正确的布局', () => {
      const { container } = render(
        <SessionSidebar
          sessions={mockSessions}
          activeSessionId="session1"
          onNewSession={mockOnNewSession}
          onSelectSession={mockOnSelectSession}
          onDeleteSession={mockOnDeleteSession}
        />
      )

      const sidebar = container.firstChild
      expect(sidebar).toBeInTheDocument()
    })
  })

  describe('边界情况', () => {
    it('应该处理空会话列表', () => {
      render(
        <SessionSidebar
          sessions={[]}
          activeSessionId={null}
          onNewSession={mockOnNewSession}
          onSelectSession={mockOnSelectSession}
          onDeleteSession={mockOnDeleteSession}
        />
      )

      expect(screen.queryByText(/会话/)).toBeInTheDocument()
    })

    it('应该处理 null activeSessionId', () => {
      render(
        <SessionSidebar
          sessions={mockSessions}
          activeSessionId={null}
          onNewSession={mockOnNewSession}
          onSelectSession={mockOnSelectSession}
          onDeleteSession={mockOnDeleteSession}
        />
      )

      expect(screen.getByText('会话 1')).toBeInTheDocument()
    })
  })
})
