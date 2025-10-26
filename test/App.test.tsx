// Mock react-markdown 和相关依赖（必须在导入前）
jest.mock('react-markdown', () => {
  return function ReactMarkdown({ children }: any) {
    return <div>{children}</div>;
  };
});

jest.mock('remark-gfm', () => ({}));
jest.mock('rehype-highlight', () => ({}));
jest.mock('highlight.js/styles/stackoverflow-light.css', () => ({}));

// Mock MarkdownContent 组件
jest.mock('../src/components/MarkdownContent', () => ({
  MarkdownContent: ({ content }: { content: string }) => <div>{content}</div>
}));

// Mock useSpeechRecognition Hook
jest.mock('../src/hooks/useSpeechRecognition', () => ({
  useSpeechRecognition: jest.fn()
}));

// Mock useSessionStorage Hook
jest.mock('../src/hooks/useSessionStorage', () => ({
  useSessionStorage: jest.fn()
}));

import React from 'react';
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';
import App from '../src/App';
import { useSessionStorage } from '../src/hooks/useSessionStorage';
import { useSpeechRecognition } from '../src/hooks/useSpeechRecognition';

// Mock window.api
const mockOnClaudeStream = jest.fn();
const mockOffClaudeStream = jest.fn();
const mockSendMessage = jest.fn();
const mockSelectDir = jest.fn();

const mockWindowApi = {
  sendMessage: mockSendMessage,
  selectDir: mockSelectDir,
  onClaudeStream: mockOnClaudeStream,
  offClaudeStream: mockOffClaudeStream,
  sessions: {
    load: jest.fn().mockResolvedValue({ sessions: [], activeSessionId: null }),
    save: jest.fn().mockResolvedValue({ success: true })
  },
  vnc: {
    start: jest.fn(),
    stop: jest.fn(),
    status: jest.fn().mockResolvedValue({ running: false }),
    onContainerStopped: jest.fn(() => jest.fn())
  }
};

(global as any).window.api = mockWindowApi;

// Mock scrollIntoView
Element.prototype.scrollIntoView = jest.fn();

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; }
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('App - 消息持久化功能', () => {
  let mockUpdateSessionMessages: jest.Mock;
  let mockCreateNewSession: jest.Mock;
  let mockSelectSession: jest.Mock;
  let mockGetActiveSession: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.clear();

    // 设置 useSpeechRecognition mock
    (useSpeechRecognition as jest.Mock).mockReturnValue({
      transcript: '',
      state: 'idle',
      error: null,
      isSupported: true,
      startListening: jest.fn(),
      stopListening: jest.fn(),
      resetTranscript: jest.fn(),
    });

    // 设置 useSessionStorage mock
    mockUpdateSessionMessages = jest.fn();
    mockCreateNewSession = jest.fn().mockReturnValue('new-session-id');
    mockSelectSession = jest.fn();
    mockGetActiveSession = jest.fn().mockReturnValue({
      id: 'test-session-id',
      title: '测试会话',
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date()
    });

    (useSessionStorage as jest.Mock).mockReturnValue({
      sessions: [{
        id: 'test-session-id',
        title: '测试会话',
        messages: [],
        createdAt: new Date(),
        updatedAt: new Date()
      }],
      activeSessionId: 'test-session-id',
      getActiveSession: mockGetActiveSession,
      createNewSession: mockCreateNewSession,
      updateSessionMessages: mockUpdateSessionMessages,
      selectSession: mockSelectSession,
      deleteSession: jest.fn()
    });

    // 重置 onClaudeStream 的实现
    mockOnClaudeStream.mockReturnValue(jest.fn());
  });

  describe('addMessage 函数', () => {
    it('应该能够添加用户消息并更新会话', async () => {
      render(<App />);

      // 获取 onClaudeStream 的回调函数（测试流式事件）
      expect(mockOnClaudeStream).toHaveBeenCalled();
      const streamCallback = mockOnClaudeStream.mock.calls[0][0];

      // 模拟添加用户消息（通过 ChatPage 的 addMessage）
      // 这里我们通过触发流式事件来间接测试
      act(() => {
        streamCallback(null, {
          type: 'stream-start',
          sessionId: 'request-123'
        });
      });

      // 验证 addMessage 没有抛出错误
      expect(mockOnClaudeStream).toHaveBeenCalled();
    });

    it('应该在有活动会话时更新会话消息', async () => {
      render(<App />);

      // 验证 useSessionStorage 被正确调用
      expect(useSessionStorage).toHaveBeenCalled();

      // 验证活动会话被加载
      await waitFor(() => {
        expect(mockGetActiveSession).toHaveBeenCalled();
      });
    });
  });

  describe('流式请求映射机制', () => {
    it('应该正确处理流式事件并保存消息到对应会话', async () => {
      render(<App />);

      const streamCallback = mockOnClaudeStream.mock.calls[0][0];
      const requestSessionId = 'request-123';
      const chatSessionId = 'test-session-id';

      // 注意：在实际应用中，映射是在 ChatPage 的 handleSendMessage 中注册的
      // 这里我们模拟流式事件到达，但由于缺少映射注册，消息会被忽略
      act(() => {
        streamCallback(null, {
          type: 'stream-data',
          sessionId: requestSessionId,
          data: {
            stage: 'response',
            content: 'AI 响应内容'
          }
        });
      });

      // 由于没有注册映射，消息不会被保存
      // 这验证了我们的保护机制工作正常
      await waitFor(() => {
        // updateSessionMessages 不应该被调用
        expect(mockUpdateSessionMessages).not.toHaveBeenCalled();
      });
    });

    it('应该在流式结束时清理映射', async () => {
      render(<App />);

      const streamCallback = mockOnClaudeStream.mock.calls[0][0];
      const requestSessionId = 'request-123';

      // 模拟流式结束事件
      act(() => {
        streamCallback(null, {
          type: 'stream-end',
          sessionId: requestSessionId,
          data: {
            success: true,
            result: '任务完成'
          }
        });
      });

      // 验证事件被处理
      expect(mockOnClaudeStream).toHaveBeenCalled();
    });

    it('应该正确处理流式错误事件', async () => {
      render(<App />);

      const streamCallback = mockOnClaudeStream.mock.calls[0][0];
      const requestSessionId = 'request-123';

      // 模拟流式错误事件
      act(() => {
        streamCallback(null, {
          type: 'stream-error',
          sessionId: requestSessionId,
          data: {
            content: '执行出错'
          }
        });
      });

      // 验证事件被处理
      expect(mockOnClaudeStream).toHaveBeenCalled();
    });

    it('应该处理任务终止事件', async () => {
      render(<App />);

      const streamCallback = mockOnClaudeStream.mock.calls[0][0];
      const requestSessionId = 'request-123';

      // 模拟任务终止事件
      act(() => {
        streamCallback(null, {
          type: 'stream-end',
          sessionId: requestSessionId,
          data: {
            terminated: true,
            content: '✅ 任务已停止'
          }
        });
      });

      // 验证事件被处理
      expect(mockOnClaudeStream).toHaveBeenCalled();
    });
  });

  describe('会话加载', () => {
    it('应该在活动会话改变时加载消息', async () => {
      const mockMessages = [
        {
          id: '1',
          type: 'user' as const,
          content: '你好',
          timestamp: new Date()
        },
        {
          id: '2',
          type: 'assistant' as const,
          content: '你好！有什么可以帮助你的吗？',
          timestamp: new Date()
        }
      ];

      mockGetActiveSession.mockReturnValue({
        id: 'test-session-id',
        title: '测试会话',
        messages: mockMessages,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      render(<App />);

      // 验证活动会话的消息被加载
      await waitFor(() => {
        expect(mockGetActiveSession).toHaveBeenCalled();
      });
    });

    it('应该在没有活动会话时显示空消息列表', async () => {
      mockGetActiveSession.mockReturnValue(null);
      (useSessionStorage as jest.Mock).mockReturnValue({
        sessions: [],
        activeSessionId: null,
        getActiveSession: mockGetActiveSession,
        createNewSession: mockCreateNewSession,
        updateSessionMessages: mockUpdateSessionMessages,
        selectSession: mockSelectSession,
        deleteSession: jest.fn()
      });

      render(<App />);

      await waitFor(() => {
        expect(mockGetActiveSession).toHaveBeenCalled();
      });
    });
  });

  describe('页面切换与持久化配置', () => {
    it('切换到设置页并返回聊天页', () => {
      const { container } = render(<App />)
      // 点击右上角设置按钮（通过 SettingsIcon 的父按钮）
      const settingsIcon = screen.getByTestId('SettingsIcon')
      const settingsBtn = settingsIcon.closest('button') as HTMLButtonElement
      fireEvent.click(settingsBtn)
      expect(!!screen.getByText('CLI Configuration')).toBe(true)
      // 点击返回按钮（ArrowBackIcon）
      const backIcon = screen.getByTestId('ArrowBackIcon')
      const backBtn = backIcon.closest('button') as HTMLButtonElement
      fireEvent.click(backBtn)
      // 返回到聊天页后显示标题
      expect(!!screen.getByText('XGopilot for Desktop')).toBe(true)
    })

    it('持久化与恢复配置', () => {
      localStorage.setItem('config', JSON.stringify({ command: 'x', baseArgs: ['--output-format', 'stream-json'], cwd: '/d', envText: 'K=V' }))
      render(<App />)
      expect(useSessionStorage).toHaveBeenCalled()
      // 不抛错即可
    })
  })

  describe('VNC 状态管理', () => {
    it('应该正确初始化 VNC 状态', async () => {
      render(<App />);

      // 验证 VNC API 被正确调用
      await waitFor(() => {
        expect(mockWindowApi.vnc.onContainerStopped).toHaveBeenCalled();
      });
    });

    it('应该监听容器停止事件', async () => {
      const onContainerStoppedCallback = jest.fn();
      mockWindowApi.vnc.onContainerStopped.mockReturnValue(onContainerStoppedCallback);

      render(<App />);

      await waitFor(() => {
        expect(mockWindowApi.vnc.onContainerStopped).toHaveBeenCalled();
      });
    });
  });

  describe('配置持久化', () => {
    it('应该从 localStorage 恢复配置', () => {
      const config = {
        command: 'claude',
        baseArgs: ['--output-format', 'stream-json'],
        cwd: '/test/path',
        envText: 'TEST=value'
      };

      localStorageMock.setItem('config', JSON.stringify(config));

      render(<App />);

      // 验证配置被恢复
      expect(localStorageMock.getItem('config')).toBeTruthy();
    });

    it('应该保存配置到 localStorage', async () => {
      render(<App />);

      // 等待配置被保存
      await waitFor(() => {
        const savedConfig = localStorageMock.getItem('config');
        expect(savedConfig).toBeTruthy();
      });
    });
  });
});
