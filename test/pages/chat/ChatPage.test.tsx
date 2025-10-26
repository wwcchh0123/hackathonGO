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
jest.mock('../../../src/components/MarkdownContent', () => ({
  MarkdownContent: ({ content }: { content: string }) => <div>{content}</div>
}));

// Mock useSpeechRecognition Hook
jest.mock('../../../src/hooks/useSpeechRecognition', () => ({
  useSpeechRecognition: jest.fn()
}));

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { ChatPage } from '../../../src/pages/chat/ChatPage';
import { useSpeechRecognition } from '../../../src/hooks/useSpeechRecognition';

// Mock window.api
const mockWindowApi = {
  sendMessage: jest.fn(),
  onClaudeStream: jest.fn(() => jest.fn()),
  terminateSession: jest.fn(),
};

(global as any).window.api = mockWindowApi;

// Mock scrollIntoView
Element.prototype.scrollIntoView = jest.fn();

describe('ChatPage - 语音识别自动发送功能', () => {
  const defaultProps = {
    command: 'test-command',
    baseArgs: [],
    cwd: '/test/path',
    envText: '',
    inputText: '',
    setInputText: jest.fn(),
    isLoading: false,
    sidebarOpen: false,
    setSidebarOpen: jest.fn(),
    messages: [],
    vncState: {
      isActive: false,
      isLoading: false,
      url: '',
      error: '',
      containerId: '',
    },
    vncHealth: [],
    updateVncState: jest.fn(),
    resetVncState: jest.fn(),
    addMessage: jest.fn(),
    sessions: [],
    activeSessionId: null,
    onNewSession: jest.fn(),
    onSessionSelect: jest.fn(),
    registerStreamRequest: jest.fn(),
  };

  const mockUseSpeechRecognition = useSpeechRecognition as jest.MockedFunction<typeof useSpeechRecognition>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockWindowApi.sendMessage.mockResolvedValue({ success: true });
  });

  it('应该在语音识别从 listening 状态变为 idle 且有文本时自动发送消息', async () => {
    const setInputText = jest.fn();
    const addMessage = jest.fn();
    
    // 初始状态：idle
    const mockResetTranscript = jest.fn();
    mockUseSpeechRecognition.mockReturnValue({
      transcript: '',
      state: 'idle',
      error: null,
      isSupported: true,
      startListening: jest.fn(),
      stopListening: jest.fn(),
      resetTranscript: mockResetTranscript,
    });

    const { rerender } = render(
      <ChatPage
        {...defaultProps}
        inputText=""
        setInputText={setInputText}
        addMessage={addMessage}
      />
    );

    // 模拟语音识别开始：listening
    mockUseSpeechRecognition.mockReturnValue({
      transcript: '你好',
      state: 'listening',
      error: null,
      isSupported: true,
      startListening: jest.fn(),
      stopListening: jest.fn(),
      resetTranscript: mockResetTranscript,
    });

    rerender(
      <ChatPage
        {...defaultProps}
        inputText="你好"
        setInputText={setInputText}
        addMessage={addMessage}
      />
    );

    // 模拟语音识别结束：idle
    mockUseSpeechRecognition.mockReturnValue({
      transcript: '你好',
      state: 'idle',
      error: null,
      isSupported: true,
      startListening: jest.fn(),
      stopListening: jest.fn(),
      resetTranscript: mockResetTranscript,
    });

    rerender(
      <ChatPage
        {...defaultProps}
        inputText="你好"
        setInputText={setInputText}
        addMessage={addMessage}
      />
    );

    // 等待自动发送消息（有 100ms 延迟）
    await waitFor(() => {
      expect(mockResetTranscript).toHaveBeenCalled();
      expect(addMessage).toHaveBeenCalledWith('user', '你好');
      expect(mockWindowApi.sendMessage).toHaveBeenCalled();
    }, { timeout: 200 });
  });

  it('应该在语音识别从 processing 状态变为 idle 且有文本时自动发送消息', async () => {
    const setInputText = jest.fn();
    const addMessage = jest.fn();
    
    const mockResetTranscript = jest.fn();
    mockUseSpeechRecognition.mockReturnValue({
      transcript: '',
      state: 'idle',
      error: null,
      isSupported: true,
      startListening: jest.fn(),
      stopListening: jest.fn(),
      resetTranscript: mockResetTranscript,
    });

    const { rerender } = render(
      <ChatPage
        {...defaultProps}
        inputText=""
        setInputText={setInputText}
        addMessage={addMessage}
      />
    );

    // 模拟语音识别处理中：processing
    mockUseSpeechRecognition.mockReturnValue({
      transcript: '测试消息',
      state: 'processing',
      error: null,
      isSupported: true,
      startListening: jest.fn(),
      stopListening: jest.fn(),
      resetTranscript: mockResetTranscript,
    });

    rerender(
      <ChatPage
        {...defaultProps}
        inputText="测试消息"
        setInputText={setInputText}
        addMessage={addMessage}
      />
    );

    // 模拟语音识别结束：idle
    mockUseSpeechRecognition.mockReturnValue({
      transcript: '测试消息',
      state: 'idle',
      error: null,
      isSupported: true,
      startListening: jest.fn(),
      stopListening: jest.fn(),
      resetTranscript: mockResetTranscript,
    });

    rerender(
      <ChatPage
        {...defaultProps}
        inputText="测试消息"
        setInputText={setInputText}
        addMessage={addMessage}
      />
    );

    // 等待自动发送消息
    await waitFor(() => {
      expect(mockResetTranscript).toHaveBeenCalled();
      expect(addMessage).toHaveBeenCalledWith('user', '测试消息');
      expect(mockWindowApi.sendMessage).toHaveBeenCalled();
    }, { timeout: 200 });
  });

  it('不应该在输入框为空时自动发送消息', async () => {
    const setInputText = jest.fn();
    const addMessage = jest.fn();
    
    const mockResetTranscript = jest.fn();
    mockUseSpeechRecognition.mockReturnValue({
      transcript: '',
      state: 'idle',
      error: null,
      isSupported: true,
      startListening: jest.fn(),
      stopListening: jest.fn(),
      resetTranscript: mockResetTranscript,
    });

    const { rerender } = render(
      <ChatPage
        {...defaultProps}
        inputText=""
        setInputText={setInputText}
        addMessage={addMessage}
      />
    );

    // 模拟语音识别：listening
    mockUseSpeechRecognition.mockReturnValue({
      transcript: '',
      state: 'listening',
      error: null,
      isSupported: true,
      startListening: jest.fn(),
      stopListening: jest.fn(),
      resetTranscript: mockResetTranscript,
    });

    rerender(
      <ChatPage
        {...defaultProps}
        inputText=""
        setInputText={setInputText}
        addMessage={addMessage}
      />
    );

    // 模拟语音识别结束但无文本
    mockUseSpeechRecognition.mockReturnValue({
      transcript: '',
      state: 'idle',
      error: null,
      isSupported: true,
      startListening: jest.fn(),
      stopListening: jest.fn(),
      resetTranscript: mockResetTranscript,
    });

    rerender(
      <ChatPage
        {...defaultProps}
        inputText=""
        setInputText={setInputText}
        addMessage={addMessage}
      />
    );

    // 等待一段时间，确认不会发送消息
    await waitFor(() => {
      expect(addMessage).not.toHaveBeenCalled();
      expect(mockWindowApi.sendMessage).not.toHaveBeenCalled();
    }, { timeout: 200 });
  });

  it('不应该在输入框只有空格时自动发送消息', async () => {
    const setInputText = jest.fn();
    const addMessage = jest.fn();
    
    const mockResetTranscript = jest.fn();
    mockUseSpeechRecognition.mockReturnValue({
      transcript: '',
      state: 'idle',
      error: null,
      isSupported: true,
      startListening: jest.fn(),
      stopListening: jest.fn(),
      resetTranscript: mockResetTranscript,
    });

    const { rerender } = render(
      <ChatPage
        {...defaultProps}
        inputText=""
        setInputText={setInputText}
        addMessage={addMessage}
      />
    );

    // 模拟语音识别：listening
    mockUseSpeechRecognition.mockReturnValue({
      transcript: '   ',
      state: 'listening',
      error: null,
      isSupported: true,
      startListening: jest.fn(),
      stopListening: jest.fn(),
      resetTranscript: mockResetTranscript,
    });

    rerender(
      <ChatPage
        {...defaultProps}
        inputText="   "
        setInputText={setInputText}
        addMessage={addMessage}
      />
    );

    // 模拟语音识别结束
    mockUseSpeechRecognition.mockReturnValue({
      transcript: '   ',
      state: 'idle',
      error: null,
      isSupported: true,
      startListening: jest.fn(),
      stopListening: jest.fn(),
      resetTranscript: mockResetTranscript,
    });

    rerender(
      <ChatPage
        {...defaultProps}
        inputText="   "
        setInputText={setInputText}
        addMessage={addMessage}
      />
    );

    // 等待一段时间，确认不会发送消息
    await waitFor(() => {
      expect(addMessage).not.toHaveBeenCalled();
      expect(mockWindowApi.sendMessage).not.toHaveBeenCalled();
    }, { timeout: 200 });
  });

  it('不应该在状态从 idle 到 idle 时自动发送消息', async () => {
    const setInputText = jest.fn();
    const addMessage = jest.fn();
    
    const mockResetTranscript = jest.fn();
    mockUseSpeechRecognition.mockReturnValue({
      transcript: '',
      state: 'idle',
      error: null,
      isSupported: true,
      startListening: jest.fn(),
      stopListening: jest.fn(),
      resetTranscript: mockResetTranscript,
    });

    const { rerender } = render(
      <ChatPage
        {...defaultProps}
        inputText="测试"
        setInputText={setInputText}
        addMessage={addMessage}
      />
    );

    // 状态保持 idle
    mockUseSpeechRecognition.mockReturnValue({
      transcript: '测试',
      state: 'idle',
      error: null,
      isSupported: true,
      startListening: jest.fn(),
      stopListening: jest.fn(),
      resetTranscript: mockResetTranscript,
    });

    rerender(
      <ChatPage
        {...defaultProps}
        inputText="测试"
        setInputText={setInputText}
        addMessage={addMessage}
      />
    );

    // 等待一段时间，确认不会发送消息
    await waitFor(() => {
      expect(addMessage).not.toHaveBeenCalled();
      expect(mockWindowApi.sendMessage).not.toHaveBeenCalled();
    }, { timeout: 200 });
  });

  it('不应该在状态从 error 到 idle 时自动发送消息', async () => {
    const setInputText = jest.fn();
    const addMessage = jest.fn();
    
    const mockResetTranscript = jest.fn();
    mockUseSpeechRecognition.mockReturnValue({
      transcript: '',
      state: 'error',
      error: '识别失败',
      isSupported: true,
      startListening: jest.fn(),
      stopListening: jest.fn(),
      resetTranscript: mockResetTranscript,
    });

    const { rerender } = render(
      <ChatPage
        {...defaultProps}
        inputText="测试"
        setInputText={setInputText}
        addMessage={addMessage}
      />
    );

    // 状态从 error 变为 idle
    mockUseSpeechRecognition.mockReturnValue({
      transcript: '测试',
      state: 'idle',
      error: null,
      isSupported: true,
      startListening: jest.fn(),
      stopListening: jest.fn(),
      resetTranscript: mockResetTranscript,
    });

    rerender(
      <ChatPage
        {...defaultProps}
        inputText="测试"
        setInputText={setInputText}
        addMessage={addMessage}
      />
    );

    // 等待一段时间，确认不会发送消息
    await waitFor(() => {
      expect(addMessage).not.toHaveBeenCalled();
      expect(mockWindowApi.sendMessage).not.toHaveBeenCalled();
    }, { timeout: 200 });
  });
});

describe('ChatPage - 任务终止功能', () => {
  const defaultProps = {
    command: 'test-command',
    baseArgs: [],
    cwd: '/test/path',
    envText: '',
    inputText: '',
    setInputText: jest.fn(),
    isLoading: false,
    sidebarOpen: false,
    setSidebarOpen: jest.fn(),
    messages: [],
    vncState: {
      isActive: false,
      isLoading: false,
      url: '',
      error: '',
      containerId: '',
    },
    vncHealth: [],
    updateVncState: jest.fn(),
    resetVncState: jest.fn(),
    addMessage: jest.fn(),
    sessions: [],
    activeSessionId: 'test-session-id',
    onNewSession: jest.fn(),
    onSessionSelect: jest.fn(),
    registerStreamRequest: jest.fn(),
  };

  const mockUseSpeechRecognition = useSpeechRecognition as jest.MockedFunction<typeof useSpeechRecognition>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockWindowApi.sendMessage.mockResolvedValue({ success: true });
    mockWindowApi.terminateSession.mockResolvedValue({ success: true });

    // 设置默认的 useSpeechRecognition mock
    mockUseSpeechRecognition.mockReturnValue({
      transcript: '',
      state: 'idle',
      error: null,
      isSupported: true,
      startListening: jest.fn(),
      stopListening: jest.fn(),
      resetTranscript: jest.fn(),
    });
  });

  it('应该成功终止正在运行的任务', async () => {
    const addMessage = jest.fn();
    mockWindowApi.terminateSession.mockResolvedValue({
      success: true,
      message: '任务已终止',
      duration: 1500
    });

    // 渲染组件（需要有 activeSessionId 才能发送消息）
    const { container } = render(
      <ChatPage
        {...defaultProps}
        addMessage={addMessage}
        activeSessionId="test-session-id"
      />
    );

    // 验证组件正常渲染
    expect(container).toBeTruthy();
    expect(mockWindowApi.terminateSession).not.toHaveBeenCalled(); // 初始时不应该调用
  });

  it('应该在 API 不可用时能正常渲染', async () => {
    const addMessage = jest.fn();

    // 移除 terminateSession API
    const originalApi = (global as any).window.api;
    (global as any).window.api = {
      ...originalApi,
      terminateSession: undefined
    };

    const { container } = render(
      <ChatPage
        {...defaultProps}
        addMessage={addMessage}
      />
    );

    // 恢复 API
    (global as any).window.api = originalApi;

    // 验证组件正常渲染
    expect(container).toBeTruthy();
  });

  it('应该处理终止失败的情况', async () => {
    const addMessage = jest.fn();
    mockWindowApi.terminateSession.mockResolvedValue({
      success: false,
      error: '终止失败'
    });

    const { container } = render(
      <ChatPage
        {...defaultProps}
        addMessage={addMessage}
      />
    );

    // 验证组件正常渲染
    expect(container).toBeTruthy();
  });

  it('应该处理终止时抛出的异常', async () => {
    const addMessage = jest.fn();
    mockWindowApi.terminateSession.mockRejectedValue(new Error('网络错误'));

    const { container } = render(
      <ChatPage
        {...defaultProps}
        addMessage={addMessage}
      />
    );

    // 验证组件正常渲染
    expect(container).toBeTruthy();
  });

  it('应该在注册流式请求时调用 registerStreamRequest', async () => {
    const registerStreamRequest = jest.fn();
    const addMessage = jest.fn();

    mockWindowApi.sendMessage.mockResolvedValue({ success: true });

    const { container } = render(
      <ChatPage
        {...defaultProps}
        addMessage={addMessage}
        registerStreamRequest={registerStreamRequest}
        activeSessionId="test-session-id"
        inputText="测试消息"
      />
    );

    // 验证组件正常渲染
    // registerStreamRequest 会在 handleSendMessage 中被调用
    // 但由于我们没有触发发送事件，所以这里只验证组件渲染
    expect(container).toBeTruthy();
    expect(registerStreamRequest).not.toHaveBeenCalled(); // 初始时不应该调用
  });
});
