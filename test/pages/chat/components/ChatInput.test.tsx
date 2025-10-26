import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { ChatInput } from '../../../../src/pages/chat/components/ChatInput'

describe('ChatInput', () => {
  const baseProps = {
    inputText: 'hello',
    setInputText: jest.fn(),
    onSendMessage: jest.fn(),
    isLoading: false,
    isListening: false,
    onStartVoice: jest.fn(),
    onStopVoice: jest.fn(),
    voiceError: null,
    isVoiceSupported: true,
    showVnc: false,
    onToggleVnc: jest.fn(),
    isStreamingActive: false,
    onStopTask: jest.fn(),
  }

  beforeEach(() => jest.clearAllMocks())

  it('renders input and handles send via Enter', () => {
    render(<ChatInput {...baseProps} />)
    const input = screen.getByRole('textbox')
    fireEvent.keyDown(input, { key: 'Enter', shiftKey: false })
    expect(baseProps.onSendMessage).toHaveBeenCalled()
  })

  it('toggles voice listening', () => {
    render(<ChatInput {...baseProps} />)
    const micButton = screen.getByRole('button', { name: /点击开始语音输入|点击停止录音|当前浏览器不支持语音输入/ })
    fireEvent.click(micButton)
    expect(baseProps.onStartVoice).toHaveBeenCalled()
  })

  it('stop task button when streaming active', () => {
    render(<ChatInput {...baseProps} isStreamingActive={true} />)
    const stopButton = screen.getByLabelText('停止任务')
    fireEvent.click(stopButton)
    expect(baseProps.onStopTask).toHaveBeenCalled()
  })

  it('toggle VNC switch', () => {
    render(<ChatInput {...baseProps} />)
    const switchEl = screen.getByRole('switch', { name: '虚拟电脑' })
    fireEvent.click(switchEl)
    expect(baseProps.onToggleVnc).toHaveBeenCalled()
  })

  it('shows voice error and listening UI, toggles stop', () => {
    const props = { ...baseProps, voiceError: '错误', isListening: true }
    render(<ChatInput {...props} />)
    expect(screen.getByText('错误')).toBeInTheDocument()
    expect(screen.getByText('正在录音,请说话...')).toBeInTheDocument()
    const micButton = screen.getByRole('button', { name: /点击停止录音/ })
    fireEvent.click(micButton)
    expect(baseProps.onStopVoice).toHaveBeenCalled()
    // Send button should be disabled while listening
    const sendButton = screen.getByRole('button', { name: '发送消息 (Enter)' })
    expect(sendButton).toBeDisabled()
  })
})
