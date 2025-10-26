import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import { ChatInput } from '../../../../src/pages/chat/components/ChatInput'

describe('ChatInput', () => {
  const mockSetInputText = jest.fn()
  const mockOnSendMessage = jest.fn()
  const mockOnStartVoice = jest.fn()
  const mockOnStopVoice = jest.fn()
  const mockOnToggleVnc = jest.fn()
  const mockOnStopTask = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    jest.spyOn(console, 'error').mockImplementation()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  const defaultProps = {
    inputText: '',
    setInputText: mockSetInputText,
    onSendMessage: mockOnSendMessage,
    isLoading: false
  }

  describe('渲染', () => {
    it('应该渲染输入框', () => {
      render(<ChatInput {...defaultProps} />)

      const textField = screen.getByRole('textbox')
      expect(textField).toBeInTheDocument()
    })

    it('应该渲染发送按钮', () => {
      render(<ChatInput {...defaultProps} />)

      const sendButton = screen.getByRole('button', { name: /发送/i })
      expect(sendButton).toBeInTheDocument()
    })

    it('应该渲染虚拟电脑开关', () => {
      render(<ChatInput {...defaultProps} />)

      expect(screen.getByText('虚拟电脑')).toBeInTheDocument()
      const vncSwitch = screen.getByRole('checkbox', { name: '虚拟电脑开关' })
      expect(vncSwitch).toBeInTheDocument()
    })

    it('应该在支持语音时渲染麦克风按钮', () => {
      render(
        <ChatInput
          {...defaultProps}
          isVoiceSupported={true}
          onStartVoice={mockOnStartVoice}
        />
      )

      const micButton = screen.getByLabelText(/语音输入/i)
      expect(micButton).toBeInTheDocument()
    })

    it('应该在不支持语音时隐藏麦克风按钮', () => {
      render(
        <ChatInput
          {...defaultProps}
          isVoiceSupported={false}
          onStartVoice={mockOnStartVoice}
        />
      )

      const micButton = screen.queryByLabelText(/语音输入/i)
      expect(micButton).not.toBeInTheDocument()
    })

    it('应该在流式输出激活时显示停止按钮', () => {
      render(
        <ChatInput
          {...defaultProps}
          isStreamingActive={true}
          onStopTask={mockOnStopTask}
        />
      )

      const stopButton = screen.getByLabelText(/停止任务/i)
      expect(stopButton).toBeInTheDocument()
    })
  })

  describe('文本输入', () => {
    it('应该显示当前输入文本', () => {
      render(<ChatInput {...defaultProps} inputText="测试文本" />)

      const textField = screen.getByRole('textbox')
      expect(textField).toHaveValue('测试文本')
    })

    it('应该在输入变化时调用 setInputText', async () => {
      const user = userEvent.setup()
      render(<ChatInput {...defaultProps} />)

      const textField = screen.getByRole('textbox')
      await user.type(textField, '你好')

      expect(mockSetInputText).toHaveBeenCalled()
    })

    it('应该支持多行输入', () => {
      render(<ChatInput {...defaultProps} />)

      const textField = screen.getByRole('textbox')
      expect(textField.tagName).toBe('TEXTAREA')
    })
  })

  describe('发送消息', () => {
    it('应该在点击发送按钮时调用 onSendMessage', () => {
      render(<ChatInput {...defaultProps} inputText="测试消息" />)

      const sendButton = screen.getByRole('button', { name: /发送/i })
      fireEvent.click(sendButton)

      expect(mockOnSendMessage).toHaveBeenCalled()
    })

    it('应该在按下 Enter 键(非 Shift)时发送消息', () => {
      render(<ChatInput {...defaultProps} inputText="测试消息" />)

      const textField = screen.getByRole('textbox')
      fireEvent.keyDown(textField, { key: 'Enter', code: 'Enter' })

      expect(mockOnSendMessage).toHaveBeenCalled()
    })

    it('应该在按下 Shift+Enter 时不发送消息(换行)', () => {
      render(<ChatInput {...defaultProps} inputText="测试消息" />)

      const textField = screen.getByRole('textbox')
      fireEvent.keyDown(textField, {
        key: 'Enter',
        code: 'Enter',
        shiftKey: true
      })

      expect(mockOnSendMessage).not.toHaveBeenCalled()
    })

    it('应该在加载时禁用发送按钮', () => {
      render(<ChatInput {...defaultProps} isLoading={true} />)

      const sendButton = screen.getByRole('button', { name: /发送/i })
      expect(sendButton).toBeDisabled()
    })

    it('应该在输入为空时禁用发送按钮', () => {
      render(<ChatInput {...defaultProps} inputText="" />)

      const sendButton = screen.getByRole('button', { name: /发送/i })
      expect(sendButton).toBeDisabled()
    })

    it('应该在输入不为空时启用发送按钮', () => {
      render(<ChatInput {...defaultProps} inputText="测试" />)

      const sendButton = screen.getByRole('button', { name: /发送/i })
      expect(sendButton).not.toBeDisabled()
    })
  })

  describe('语音输入', () => {
    it('应该在点击麦克风按钮时开始语音输入', () => {
      render(
        <ChatInput
          {...defaultProps}
          isVoiceSupported={true}
          onStartVoice={mockOnStartVoice}
          onStopVoice={mockOnStopVoice}
        />
      )

      const micButton = screen.getByLabelText(/语音输入/i)
      fireEvent.click(micButton)

      expect(mockOnStartVoice).toHaveBeenCalled()
    })

    it('应该在正在监听时点击麦克风按钮停止录音', () => {
      render(
        <ChatInput
          {...defaultProps}
          isVoiceSupported={true}
          isListening={true}
          onStartVoice={mockOnStartVoice}
          onStopVoice={mockOnStopVoice}
        />
      )

      const micButton = screen.getByLabelText(/语音输入/i)
      fireEvent.click(micButton)

      expect(mockOnStopVoice).toHaveBeenCalled()
      expect(mockOnStartVoice).not.toHaveBeenCalled()
    })

    it('应该在正在监听时显示不同的麦克风图标', () => {
      render(
        <ChatInput
          {...defaultProps}
          isVoiceSupported={true}
          isListening={true}
          onStartVoice={mockOnStartVoice}
          onStopVoice={mockOnStopVoice}
        />
      )

      const micOffIcon = document.querySelector('[data-testid="MicOffIcon"]')
      expect(micOffIcon).toBeInTheDocument()
    })

    it('应该在不支持语音时显示提示', async () => {
      render(
        <ChatInput
          {...defaultProps}
          isVoiceSupported={false}
          onStartVoice={mockOnStartVoice}
        />
      )

      const micButton = screen.queryByLabelText(/语音输入/i)
      expect(micButton).not.toBeInTheDocument()
    })
  })

  describe('语音错误处理', () => {
    it('应该显示语音错误提示', () => {
      render(
        <ChatInput
          {...defaultProps}
          voiceError="麦克风权限被拒绝"
          isVoiceSupported={true}
        />
      )

      expect(screen.getByText('麦克风权限被拒绝')).toBeInTheDocument()
    })

    it('应该在有错误时记录到控制台', () => {
      render(
        <ChatInput
          {...defaultProps}
          voiceError="测试错误"
          isVoiceSupported={true}
        />
      )

      expect(console.error).toHaveBeenCalledWith(
        '语音识别错误:',
        '测试错误'
      )
    })

    it('应该在错误清除时隐藏错误提示', () => {
      const { rerender } = render(
        <ChatInput
          {...defaultProps}
          voiceError="测试错误"
          isVoiceSupported={true}
        />
      )

      expect(screen.getByText('测试错误')).toBeInTheDocument()

      rerender(
        <ChatInput
          {...defaultProps}
          voiceError={null}
          isVoiceSupported={true}
        />
      )

      expect(screen.queryByText('测试错误')).not.toBeInTheDocument()
    })
  })

  describe('虚拟电脑开关', () => {
    it('应该在 showVnc 为 true 时选中开关', () => {
      render(
        <ChatInput
          {...defaultProps}
          showVnc={true}
          onToggleVnc={mockOnToggleVnc}
        />
      )

      const vncSwitch = screen.getByRole('checkbox', { name: '虚拟电脑开关' })
      expect(vncSwitch).toBeChecked()
    })

    it('应该在 showVnc 为 false 时不选中开关', () => {
      render(
        <ChatInput
          {...defaultProps}
          showVnc={false}
          onToggleVnc={mockOnToggleVnc}
        />
      )

      const vncSwitch = screen.getByRole('checkbox', { name: '虚拟电脑开关' })
      expect(vncSwitch).not.toBeChecked()
    })

    it('应该在点击开关时调用 onToggleVnc', () => {
      render(
        <ChatInput
          {...defaultProps}
          showVnc={false}
          onToggleVnc={mockOnToggleVnc}
        />
      )

      const vncSwitch = screen.getByRole('checkbox', { name: '虚拟电脑开关' })
      fireEvent.click(vncSwitch)

      expect(mockOnToggleVnc).toHaveBeenCalled()
    })
  })

  describe('停止任务', () => {
    it('应该在点击停止按钮时调用 onStopTask', () => {
      render(
        <ChatInput
          {...defaultProps}
          isStreamingActive={true}
          onStopTask={mockOnStopTask}
        />
      )

      const stopButton = screen.getByLabelText(/停止任务/i)
      fireEvent.click(stopButton)

      expect(mockOnStopTask).toHaveBeenCalled()
    })

    it('应该在未激活流式输出时隐藏停止按钮', () => {
      render(
        <ChatInput
          {...defaultProps}
          isStreamingActive={false}
          onStopTask={mockOnStopTask}
        />
      )

      const stopButton = screen.queryByLabelText(/停止任务/i)
      expect(stopButton).not.toBeInTheDocument()
    })

    it('应该显示停止图标', () => {
      render(
        <ChatInput
          {...defaultProps}
          isStreamingActive={true}
          onStopTask={mockOnStopTask}
        />
      )

      const stopIcon = document.querySelector('[data-testid="StopIcon"]')
      expect(stopIcon).toBeInTheDocument()
    })
  })

  describe('加载状态', () => {
    it('应该在加载时禁用输入框', () => {
      render(<ChatInput {...defaultProps} isLoading={true} />)

      const textField = screen.getByRole('textbox')
      expect(textField).toBeDisabled()
    })

    it('应该在加载时禁用所有按钮', () => {
      render(
        <ChatInput
          {...defaultProps}
          isLoading={true}
          isVoiceSupported={true}
          onStartVoice={mockOnStartVoice}
        />
      )

      const sendButton = screen.getByRole('button', { name: /发送/i })
      expect(sendButton).toBeDisabled()
    })
  })

  describe('布局和样式', () => {
    it('应该显示输入框占位符', () => {
      render(<ChatInput {...defaultProps} />)

      const textField = screen.getByPlaceholderText(/输入消息/i)
      expect(textField).toBeInTheDocument()
    })

    it('应该使用正确的输入框最大行数', () => {
      render(<ChatInput {...defaultProps} />)

      const textField = screen.getByRole('textbox')
      expect(textField).toHaveAttribute('rows')
    })
  })

  describe('键盘快捷键', () => {
    it('应该在未加载且有内容时响应 Enter 键', () => {
      render(<ChatInput {...defaultProps} inputText="测试" />)

      const textField = screen.getByRole('textbox')
      fireEvent.keyDown(textField, { key: 'Enter', code: 'Enter' })

      expect(mockOnSendMessage).toHaveBeenCalled()
    })

    it('应该在加载时忽略 Enter 键', () => {
      render(
        <ChatInput {...defaultProps} inputText="测试" isLoading={true} />
      )

      const textField = screen.getByRole('textbox')
      fireEvent.keyDown(textField, { key: 'Enter', code: 'Enter' })

      expect(mockOnSendMessage).not.toHaveBeenCalled()
    })

    it('应该在输入为空时忽略 Enter 键', () => {
      render(<ChatInput {...defaultProps} inputText="" />)

      const textField = screen.getByRole('textbox')
      fireEvent.keyDown(textField, { key: 'Enter', code: 'Enter' })

      expect(mockOnSendMessage).not.toHaveBeenCalled()
    })
  })

  describe('可访问性', () => {
    it('应该有正确的 aria 标签', () => {
      render(
        <ChatInput
          {...defaultProps}
          isVoiceSupported={true}
          onStartVoice={mockOnStartVoice}
        />
      )

      expect(screen.getByLabelText(/语音输入/i)).toBeInTheDocument()
      expect(
        screen.getByRole('checkbox', { name: '虚拟电脑开关' })
      ).toBeInTheDocument()
    })

    it('应该有正确的按钮标签', () => {
      render(<ChatInput {...defaultProps} inputText="测试" />)

      expect(screen.getByRole('button', { name: /发送/i })).toBeInTheDocument()
    })
  })

  describe('交互行为', () => {
    it('应该支持复制粘贴', async () => {
      const user = userEvent.setup()
      render(<ChatInput {...defaultProps} />)

      const textField = screen.getByRole('textbox')

      await user.click(textField)
      await user.paste('粘贴的文本')

      expect(mockSetInputText).toHaveBeenCalled()
    })

    it('应该在焦点状态下正常工作', async () => {
      const user = userEvent.setup()
      render(<ChatInput {...defaultProps} />)

      const textField = screen.getByRole('textbox')

      await user.click(textField)
      expect(textField).toHaveFocus()

      await user.type(textField, '测试')
      expect(mockSetInputText).toHaveBeenCalled()
    })
  })
})
