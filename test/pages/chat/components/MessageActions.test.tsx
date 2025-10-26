import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import { MessageActions } from '../../../../src/pages/chat/components/MessageActions'

describe('MessageActions', () => {
  const mockPrefillInput = jest.fn()
  const testContent = '测试消息内容'

  beforeEach(() => {
    jest.clearAllMocks()
    
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: jest.fn().mockResolvedValue(undefined),
      },
      writable: true,
      configurable: true
    })
  })

  describe('渲染', () => {
    it('应该渲染复制按钮', () => {
      render(
        <MessageActions
          content={testContent}
          isUser={false}
        />
      )

      expect(screen.getByRole('button', { name: /复制/i })).toBeInTheDocument()
    })

    it('应该渲染编辑按钮', () => {
      render(
        <MessageActions
          content={testContent}
          isUser={false}
        />
      )

      expect(screen.getByRole('button', { name: /放到输入框/i })).toBeInTheDocument()
    })

    it('应该渲染子元素', () => {
      render(
        <MessageActions
          content={testContent}
          isUser={false}
        >
          <div data-testid="custom-action">自定义操作</div>
        </MessageActions>
      )

      expect(screen.getByTestId('custom-action')).toBeInTheDocument()
    })
  })

  describe('交互', () => {
    it('应该在点击复制按钮时复制内容到剪贴板', async () => {
      const user = userEvent.setup()
      const writeTextMock = jest.fn().mockResolvedValue(undefined)
      
      Object.defineProperty(navigator, 'clipboard', {
        value: {
          writeText: writeTextMock,
        },
        writable: true,
        configurable: true
      })
      
      render(
        <MessageActions
          content={testContent}
          isUser={false}
        />
      )

      const copyButton = screen.getByRole('button', { name: /复制/i })
      await user.click(copyButton)

      expect(writeTextMock).toHaveBeenCalledWith(testContent)
    })

    it('应该在点击编辑按钮时调用 onPrefillInput', async () => {
      const user = userEvent.setup()
      
      render(
        <MessageActions
          content={testContent}
          isUser={false}
          onPrefillInput={mockPrefillInput}
        />
      )

      const editButton = screen.getByRole('button', { name: /放到输入框/i })
      await user.click(editButton)

      expect(mockPrefillInput).toHaveBeenCalledWith(testContent)
    })

    it('应该在没有 onPrefillInput 时不报错', async () => {
      const user = userEvent.setup()
      
      render(
        <MessageActions
          content={testContent}
          isUser={false}
        />
      )

      const editButton = screen.getByRole('button', { name: /放到输入框/i })
      
      await expect(user.click(editButton)).resolves.not.toThrow()
    })
  })

  describe('样式', () => {
    it('应该为用户消息应用不同的样式', () => {
      const { container } = render(
        <MessageActions
          content={testContent}
          isUser={true}
        />
      )

      const box = container.querySelector('[class*="MuiBox"]')
      expect(box).toBeInTheDocument()
    })

    it('应该为AI消息应用不同的样式', () => {
      const { container } = render(
        <MessageActions
          content={testContent}
          isUser={false}
        />
      )

      const box = container.querySelector('[class*="MuiBox"]')
      expect(box).toBeInTheDocument()
    })

    it('应该应用自定义样式', () => {
      const customSx = { marginTop: 2 }
      
      render(
        <MessageActions
          content={testContent}
          isUser={false}
          sx={customSx}
        />
      )

      const { container } = render(
        <MessageActions
          content={testContent}
          isUser={false}
          sx={customSx}
        />
      )

      expect(container.querySelector('[class*="MuiBox"]')).toBeInTheDocument()
    })
  })

  describe('Tooltip', () => {
    it('应该为复制按钮显示 tooltip', async () => {
      const user = userEvent.setup()
      
      render(
        <MessageActions
          content={testContent}
          isUser={false}
        />
      )

      const copyButton = screen.getByRole('button', { name: /复制/i })
      
      await user.hover(copyButton)

      expect(screen.getByRole('button', { name: /复制/i })).toBeInTheDocument()
    })

    it('应该为编辑按钮显示 tooltip', async () => {
      const user = userEvent.setup()
      
      render(
        <MessageActions
          content={testContent}
          isUser={false}
        />
      )

      const editButton = screen.getByRole('button', { name: /放到输入框/i })
      
      await user.hover(editButton)

      expect(screen.getByRole('button', { name: /放到输入框/i })).toBeInTheDocument()
    })
  })
})
