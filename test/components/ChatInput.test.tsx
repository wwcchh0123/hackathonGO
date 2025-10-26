import { render, screen, fireEvent } from '@testing-library/react';
import { ChatInput } from '../../src/pages/chat/components/ChatInput';

describe('ChatInput Component', () => {
  const defaultProps = {
    inputText: '',
    setInputText: jest.fn(),
    onSendMessage: jest.fn(),
    isLoading: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render input field and send button', () => {
    render(<ChatInput {...defaultProps} />);
    
    expect(screen.getByPlaceholderText(/输入消息/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /发送消息/ })).toBeInTheDocument();
  });

  it('should call onSendMessage when send button is clicked', () => {
    const onSendMessage = jest.fn();
    render(<ChatInput {...defaultProps} inputText="测试消息" onSendMessage={onSendMessage} />);
    
    const sendButton = screen.getByRole('button', { name: /发送消息/ });
    fireEvent.click(sendButton);
    
    expect(onSendMessage).toHaveBeenCalledTimes(1);
  });

  it('should disable send button when input is empty', () => {
    render(<ChatInput {...defaultProps} inputText="" />);
    
    const sendButton = screen.getByRole('button', { name: /发送消息/ });
    expect(sendButton).toBeDisabled();
  });

  it('should disable send button when isLoading is true', () => {
    render(<ChatInput {...defaultProps} inputText="测试" isLoading={true} />);
    
    const sendButton = screen.getByRole('button', { name: /发送消息/ });
    expect(sendButton).toBeDisabled();
  });

  it('should show stop button when task is running', () => {
    render(
      <ChatInput
        {...defaultProps}
        isTaskRunning={true}
        onStopTask={jest.fn()}
      />
    );
    
    expect(screen.getByRole('button', { name: /停止当前任务/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /发送消息/ })).not.toBeInTheDocument();
  });

  it('should hide send button when task is running', () => {
    render(
      <ChatInput
        {...defaultProps}
        isTaskRunning={true}
        onStopTask={jest.fn()}
      />
    );
    
    expect(screen.queryByRole('button', { name: /发送消息/ })).not.toBeInTheDocument();
  });

  it('should call onStopTask when stop button is clicked', () => {
    const onStopTask = jest.fn();
    render(
      <ChatInput
        {...defaultProps}
        isTaskRunning={true}
        onStopTask={onStopTask}
      />
    );
    
    const stopButton = screen.getByRole('button', { name: /停止当前任务/ });
    fireEvent.click(stopButton);
    
    expect(onStopTask).toHaveBeenCalledTimes(1);
  });

  it('should disable stop button when isStopping is true', () => {
    render(
      <ChatInput
        {...defaultProps}
        isTaskRunning={true}
        onStopTask={jest.fn()}
        isStopping={true}
      />
    );
    
    const stopButton = screen.getByRole('button', { name: /正在停止/ });
    expect(stopButton).toBeDisabled();
  });

  it('should call setInputText when typing in input field', () => {
    const setInputText = jest.fn();
    render(<ChatInput {...defaultProps} setInputText={setInputText} />);
    
    const input = screen.getByPlaceholderText(/输入消息/);
    fireEvent.change(input, { target: { value: '新消息' } });
    
    expect(setInputText).toHaveBeenCalledWith('新消息');
  });

  it('should call onSendMessage when Enter key is pressed', () => {
    const onSendMessage = jest.fn();
    render(<ChatInput {...defaultProps} inputText="测试" onSendMessage={onSendMessage} />);
    
    const input = screen.getByPlaceholderText(/输入消息/);
    fireEvent.keyDown(input, { key: 'Enter', shiftKey: false });
    
    expect(onSendMessage).toHaveBeenCalledTimes(1);
  });

  it('should not call onSendMessage when Shift+Enter is pressed', () => {
    const onSendMessage = jest.fn();
    render(<ChatInput {...defaultProps} inputText="测试" onSendMessage={onSendMessage} />);
    
    const input = screen.getByPlaceholderText(/输入消息/);
    fireEvent.keyDown(input, { key: 'Enter', shiftKey: true });
    
    expect(onSendMessage).not.toHaveBeenCalled();
  });

  it('should show voice button when voice is supported', () => {
    render(
      <ChatInput
        {...defaultProps}
        isVoiceSupported={true}
        onStartVoice={jest.fn()}
      />
    );
    
    expect(screen.getByRole('button', { name: /语音输入/ })).toBeInTheDocument();
  });

  it('should not show voice button when voice is not supported', () => {
    render(
      <ChatInput
        {...defaultProps}
        isVoiceSupported={false}
      />
    );
    
    expect(screen.queryByRole('button', { name: /语音输入/ })).not.toBeInTheDocument();
  });
});
