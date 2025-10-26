import { renderHook, act, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { useSessionStorage } from '../../src/hooks/useSessionStorage'
import { Message } from '../../src/pages/chat/components/MessageBubble'

describe('useSessionStorage', () => {
  const mockApi = {
    sessions: {
      load: jest.fn(),
      save: jest.fn()
    }
  }

  beforeEach(() => {
    localStorage.clear()
    jest.clearAllMocks()
    
    // @ts-ignore
    delete window.api
  })

  describe('初始化和加载', () => {
    it('应该从 localStorage 加载会话数据', async () => {
      const mockData = {
        sessions: [
          {
            id: 'session1',
            title: '测试会话',
            createdAt: '2024-01-01T00:00:00.000Z',
            updatedAt: '2024-01-01T00:00:00.000Z',
            messages: []
          }
        ],
        activeSessionId: 'session1'
      }
      localStorage.setItem('claude-sessions', JSON.stringify(mockData))

      const { result } = renderHook(() => useSessionStorage())

      await waitFor(() => {
        expect(result.current.sessions).toHaveLength(1)
      })

      expect(result.current.sessions[0].id).toBe('session1')
      expect(result.current.activeSessionId).toBe('session1')
    })

    it('应该在没有存储数据时初始化空会话列表', async () => {
      const { result } = renderHook(() => useSessionStorage())

      await waitFor(() => {
        expect(result.current.sessions).toEqual([])
      })
      expect(result.current.activeSessionId).toBeNull()
    })

    it('应该使用 window.api 加载会话(如果可用)', async () => {
      const mockData = {
        sessions: [
          {
            id: 'session1',
            title: '测试会话',
            createdAt: '2024-01-01T00:00:00.000Z',
            updatedAt: '2024-01-01T00:00:00.000Z',
            messages: []
          }
        ],
        activeSessionId: 'session1'
      }
      mockApi.sessions.load.mockResolvedValue(mockData)
      // @ts-ignore
      window.api = mockApi

      const { result } = renderHook(() => useSessionStorage())

      await waitFor(() => {
        expect(mockApi.sessions.load).toHaveBeenCalled()
        expect(result.current.sessions).toHaveLength(1)
      })
    })

    it('应该在 window.api 加载失败时退回到 localStorage', async () => {
      const mockData = {
        sessions: [
          {
            id: 'session1',
            title: '测试会话',
            createdAt: '2024-01-01T00:00:00.000Z',
            updatedAt: '2024-01-01T00:00:00.000Z',
            messages: []
          }
        ],
        activeSessionId: 'session1'
      }
      localStorage.setItem('claude-sessions', JSON.stringify(mockData))
      mockApi.sessions.load.mockRejectedValue(new Error('加载失败'))
      // @ts-ignore
      window.api = mockApi

      const { result } = renderHook(() => useSessionStorage())

      await waitFor(() => {
        expect(result.current.sessions).toHaveLength(1)
      })
    })

    it('应该处理加载错误', async () => {
      localStorage.setItem('claude-sessions', 'invalid json')
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

      const { result } = renderHook(() => useSessionStorage())

      await waitFor(() => {
        expect(result.current.sessions).toEqual([])
      })
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to load sessions:',
        expect.any(Error)
      )

      consoleSpy.mockRestore()
    })
  })

  describe('创建会话', () => {
    it('应该创建新会话', async () => {
      const { result } = renderHook(() => useSessionStorage())

      await waitFor(() => {
        expect(result.current.sessions).toEqual([])
      })

      let newSessionId: string = ''
      act(() => {
        newSessionId = result.current.createNewSession()
      })

      expect(newSessionId).toBeTruthy()
      expect(result.current.sessions).toHaveLength(1)
      expect(result.current.sessions[0].title).toBe('新会话')
      expect(result.current.activeSessionId).toBe(newSessionId)
    })

    it('应该将新会话添加到列表开头', async () => {
      const mockData = {
        sessions: [
          {
            id: 'old-session',
            title: '旧会话',
            createdAt: '2024-01-01T00:00:00.000Z',
            updatedAt: '2024-01-01T00:00:00.000Z',
            messages: []
          }
        ],
        activeSessionId: 'old-session'
      }
      localStorage.setItem('claude-sessions', JSON.stringify(mockData))

      const { result } = renderHook(() => useSessionStorage())

      await waitFor(() => {
        expect(result.current.sessions).toHaveLength(1)
      })

      act(() => {
        result.current.createNewSession()
      })

      expect(result.current.sessions).toHaveLength(2)
      expect(result.current.sessions[0].title).toBe('新会话')
    })
  })

  describe('获取活动会话', () => {
    it('应该返回当前活动会话', async () => {
      const mockData = {
        sessions: [
          {
            id: 'session1',
            title: '测试会话',
            createdAt: '2024-01-01T00:00:00.000Z',
            updatedAt: '2024-01-01T00:00:00.000Z',
            messages: []
          }
        ],
        activeSessionId: 'session1'
      }
      localStorage.setItem('claude-sessions', JSON.stringify(mockData))

      const { result } = renderHook(() => useSessionStorage())

      await waitFor(() => {
        expect(result.current.sessions).toHaveLength(1)
      })

      const activeSession = result.current.getActiveSession()
      expect(activeSession).not.toBeNull()
      expect(activeSession?.id).toBe('session1')
    })

    it('应该在没有活动会话时返回 null', () => {
      const { result } = renderHook(() => useSessionStorage())
      const activeSession = result.current.getActiveSession()
      expect(activeSession).toBeNull()
    })

    it('应该在活动会话不存在时返回 null', async () => {
      const mockData = {
        sessions: [
          {
            id: 'session1',
            title: '测试会话',
            createdAt: '2024-01-01T00:00:00.000Z',
            updatedAt: '2024-01-01T00:00:00.000Z',
            messages: []
          }
        ],
        activeSessionId: 'non-existent'
      }
      localStorage.setItem('claude-sessions', JSON.stringify(mockData))

      const { result } = renderHook(() => useSessionStorage())

      await waitFor(() => {
        expect(result.current.sessions).toHaveLength(1)
      })

      const activeSession = result.current.getActiveSession()
      expect(activeSession).toBeNull()
    })
  })

  describe('更新会话消息', () => {
    it('应该更新会话消息', async () => {
      const mockData = {
        sessions: [
          {
            id: 'session1',
            title: '测试会话',
            createdAt: '2024-01-01T00:00:00.000Z',
            updatedAt: '2024-01-01T00:00:00.000Z',
            messages: []
          }
        ],
        activeSessionId: 'session1'
      }
      localStorage.setItem('claude-sessions', JSON.stringify(mockData))

      const { result } = renderHook(() => useSessionStorage())

      await waitFor(() => {
        expect(result.current.sessions).toHaveLength(1)
      })

      const newMessages: Message[] = [
        {
          id: 'msg1',
          type: 'user',
          content: '你好',
          timestamp: new Date()
        }
      ]

      act(() => {
        result.current.updateSessionMessages('session1', newMessages)
      })

      expect(result.current.sessions[0].messages).toHaveLength(1)
      expect(result.current.sessions[0].title).toBe('你好')
    })

    it('应该根据消息内容生成会话标题', async () => {
      const mockData = {
        sessions: [
          {
            id: 'session1',
            title: '新会话',
            createdAt: '2024-01-01T00:00:00.000Z',
            updatedAt: '2024-01-01T00:00:00.000Z',
            messages: []
          }
        ],
        activeSessionId: 'session1'
      }
      localStorage.setItem('claude-sessions', JSON.stringify(mockData))

      const { result } = renderHook(() => useSessionStorage())

      await waitFor(() => {
        expect(result.current.sessions).toHaveLength(1)
      })

      const longMessage = '这是一条非常长的消息内容,需要超过三十个字符才能触发标题截断功能,所以我们需要写得更长一些'
      const newMessages: Message[] = [
        {
          id: 'msg1',
          type: 'user',
          content: longMessage,
          timestamp: new Date()
        }
      ]

      act(() => {
        result.current.updateSessionMessages('session1', newMessages)
      })

      expect(result.current.sessions[0].title).toBe(longMessage.substring(0, 30) + '...')
    })

    it('应该在没有消息时使用默认标题', async () => {
      const mockData = {
        sessions: [
          {
            id: 'session1',
            title: '旧标题',
            createdAt: '2024-01-01T00:00:00.000Z',
            updatedAt: '2024-01-01T00:00:00.000Z',
            messages: []
          }
        ],
        activeSessionId: 'session1'
      }
      localStorage.setItem('claude-sessions', JSON.stringify(mockData))

      const { result } = renderHook(() => useSessionStorage())

      await waitFor(() => {
        expect(result.current.sessions).toHaveLength(1)
      })

      act(() => {
        result.current.updateSessionMessages('session1', [])
      })

      expect(result.current.sessions[0].title).toBe('新会话')
    })
  })

  describe('选择会话', () => {
    it('应该切换活动会话', async () => {
      const mockData = {
        sessions: [
          {
            id: 'session1',
            title: '会话1',
            createdAt: '2024-01-01T00:00:00.000Z',
            updatedAt: '2024-01-01T00:00:00.000Z',
            messages: []
          },
          {
            id: 'session2',
            title: '会话2',
            createdAt: '2024-01-01T00:00:00.000Z',
            updatedAt: '2024-01-01T00:00:00.000Z',
            messages: []
          }
        ],
        activeSessionId: 'session1'
      }
      localStorage.setItem('claude-sessions', JSON.stringify(mockData))

      const { result } = renderHook(() => useSessionStorage())

      await waitFor(() => {
        expect(result.current.sessions).toHaveLength(2)
      })

      expect(result.current.activeSessionId).toBe('session1')

      act(() => {
        result.current.selectSession('session2')
      })

      expect(result.current.activeSessionId).toBe('session2')
    })
  })

  describe('删除会话', () => {
    it('应该删除指定会话', async () => {
      const mockData = {
        sessions: [
          {
            id: 'session1',
            title: '会话1',
            createdAt: '2024-01-01T00:00:00.000Z',
            updatedAt: '2024-01-01T00:00:00.000Z',
            messages: []
          },
          {
            id: 'session2',
            title: '会话2',
            createdAt: '2024-01-01T00:00:00.000Z',
            updatedAt: '2024-01-01T00:00:00.000Z',
            messages: []
          }
        ],
        activeSessionId: 'session1'
      }
      localStorage.setItem('claude-sessions', JSON.stringify(mockData))

      const { result } = renderHook(() => useSessionStorage())

      await waitFor(() => {
        expect(result.current.sessions).toHaveLength(2)
      })

      act(() => {
        result.current.deleteSession('session2')
      })

      expect(result.current.sessions).toHaveLength(1)
      expect(result.current.sessions[0].id).toBe('session1')
    })

    it('应该在删除活动会话后自动选择第一个会话', async () => {
      const mockData = {
        sessions: [
          {
            id: 'session1',
            title: '会话1',
            createdAt: '2024-01-01T00:00:00.000Z',
            updatedAt: '2024-01-01T00:00:00.000Z',
            messages: []
          },
          {
            id: 'session2',
            title: '会话2',
            createdAt: '2024-01-01T00:00:00.000Z',
            updatedAt: '2024-01-01T00:00:00.000Z',
            messages: []
          }
        ],
        activeSessionId: 'session1'
      }
      localStorage.setItem('claude-sessions', JSON.stringify(mockData))

      const { result } = renderHook(() => useSessionStorage())

      await waitFor(() => {
        expect(result.current.sessions).toHaveLength(2)
      })

      act(() => {
        result.current.deleteSession('session1')
      })

      expect(result.current.sessions).toHaveLength(1)
      expect(result.current.activeSessionId).toBe('session2')
    })

    it('应该在删除最后一个会话后设置 activeSessionId 为 null', async () => {
      const mockData = {
        sessions: [
          {
            id: 'session1',
            title: '会话1',
            createdAt: '2024-01-01T00:00:00.000Z',
            updatedAt: '2024-01-01T00:00:00.000Z',
            messages: []
          }
        ],
        activeSessionId: 'session1'
      }
      localStorage.setItem('claude-sessions', JSON.stringify(mockData))

      const { result } = renderHook(() => useSessionStorage())

      await waitFor(() => {
        expect(result.current.sessions).toHaveLength(1)
      })

      act(() => {
        result.current.deleteSession('session1')
      })

      expect(result.current.sessions).toHaveLength(0)
      expect(result.current.activeSessionId).toBeNull()
    })
  })

  describe('数据持久化', () => {
    it('应该在创建会话时保存到 localStorage', async () => {
      const { result } = renderHook(() => useSessionStorage())

      await waitFor(() => {
        expect(result.current.sessions).toEqual([])
      })

      act(() => {
        result.current.createNewSession()
      })

      const stored = localStorage.getItem('claude-sessions')
      expect(stored).not.toBeNull()
      
      const data = JSON.parse(stored!)
      expect(data.sessions).toHaveLength(1)
    })

    it('应该使用 window.api 保存会话(如果可用)', async () => {
      mockApi.sessions.save.mockResolvedValue({})
      // @ts-ignore
      window.api = mockApi

      const { result } = renderHook(() => useSessionStorage())

      await waitFor(() => {
        expect(result.current.sessions).toEqual([])
      })

      act(() => {
        result.current.createNewSession()
      })

      await waitFor(() => {
        expect(mockApi.sessions.save).toHaveBeenCalled()
      })
    })

    it('应该在 window.api 保存失败时退回到 localStorage', async () => {
      mockApi.sessions.save.mockRejectedValue(new Error('保存失败'))
      // @ts-ignore
      window.api = mockApi

      const { result } = renderHook(() => useSessionStorage())

      await waitFor(() => {
        expect(result.current.sessions).toEqual([])
      })

      act(() => {
        result.current.createNewSession()
      })

      await waitFor(() => {
        const stored = localStorage.getItem('claude-sessions')
        expect(stored).not.toBeNull()
      })
    })
  })
})
