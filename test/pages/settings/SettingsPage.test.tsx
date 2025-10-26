import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import userEvent from '@testing-library/user-event'
import { SettingsPage } from '../../../src/pages/settings/SettingsPage'

describe('SettingsPage', () => {
  const defaultProps = {
    command: 'claude',
    setCommand: jest.fn(),
    baseArgs: [],
    setBaseArgs: jest.fn(),
    cwd: '/home/user/project',
    setCwd: jest.fn(),
    envText: '',
    setEnvText: jest.fn(),
    onPickCwd: jest.fn(),
    onBack: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('渲染', () => {
    it('应该渲染设置页面标题', () => {
      render(<SettingsPage {...defaultProps} />)
      expect(screen.getByText('Settings')).toBeInTheDocument()
    })

    it('应该渲染返回按钮', () => {
      render(<SettingsPage {...defaultProps} />)
      const buttons = screen.getAllByRole('button')
      expect(buttons.length).toBeGreaterThan(0)
    })

    it('应该渲染 CLI Configuration 部分', () => {
      render(<SettingsPage {...defaultProps} />)
      expect(screen.getByText('CLI Configuration')).toBeInTheDocument()
    })

    it('应该渲染 Command 输入框', () => {
      render(<SettingsPage {...defaultProps} />)
      expect(screen.getByLabelText('Command')).toBeInTheDocument()
    })

    it('应该渲染 Working Directory 部分', () => {
      render(<SettingsPage {...defaultProps} />)
      expect(screen.getByText('Working Directory')).toBeInTheDocument()
    })
  })

  describe('Command 输入', () => {
    it('应该显示当前 command 值', () => {
      render(<SettingsPage {...defaultProps} command="XGopilot" />)
      const input = screen.getByLabelText('Command') as HTMLInputElement
      expect(input.value).toBe('XGopilot')
    })

    it('应该在输入时调用 setCommand', async () => {
      const user = userEvent.setup()
      render(<SettingsPage {...defaultProps} />)
      
      const input = screen.getByLabelText('Command')
      await user.clear(input)
      await user.type(input, 'new-command')
      
      expect(defaultProps.setCommand).toHaveBeenCalled()
    })

    it('应该显示 placeholder', () => {
      render(<SettingsPage {...defaultProps} command="" />)
      const input = screen.getByPlaceholderText('claude')
      expect(input).toBeInTheDocument()
    })
  })

  describe('Working Directory', () => {
    it('应该显示当前工作目录', () => {
      const cwd = '/test/directory'
      render(<SettingsPage {...defaultProps} cwd={cwd} />)
      
      const input = screen.getByPlaceholderText('Optional working directory') as HTMLInputElement
      expect(input.value).toBe(cwd)
    })

    it('应该在输入时调用 setCwd', async () => {
      const user = userEvent.setup()
      render(<SettingsPage {...defaultProps} />)
      
      const input = screen.getByPlaceholderText('Optional working directory')
      await user.clear(input)
      await user.type(input, '/new/path')
      
      expect(defaultProps.setCwd).toHaveBeenCalled()
    })

    it('应该有选择目录的按钮', () => {
      render(<SettingsPage {...defaultProps} />)
      const browseButton = screen.getByRole('button', { name: /browse/i })
      expect(browseButton).toBeInTheDocument()
    })

    it('点击 Browse 按钮应该调用 onPickCwd', () => {
      render(<SettingsPage {...defaultProps} />)
      const browseButton = screen.getByRole('button', { name: /browse/i })
      
      fireEvent.click(browseButton)
      expect(defaultProps.onPickCwd).toHaveBeenCalled()
    })
  })

  describe('返回功能', () => {
    it('点击返回按钮应该调用 onBack', () => {
      render(<SettingsPage {...defaultProps} />)
      const buttons = screen.getAllByRole('button')
      const backButton = buttons[0]
      
      fireEvent.click(backButton)
      expect(defaultProps.onBack).toHaveBeenCalled()
    })

    it('onBack 应该只被调用一次', () => {
      render(<SettingsPage {...defaultProps} />)
      const buttons = screen.getAllByRole('button')
      const backButton = buttons[0]
      
      fireEvent.click(backButton)
      expect(defaultProps.onBack).toHaveBeenCalledTimes(1)
    })
  })

  describe('环境变量配置', () => {
    it('应该显示环境变量文本框', () => {
      render(<SettingsPage {...defaultProps} />)
      const textarea = screen.getByPlaceholderText('KEY=VALUE (one per line)')
      expect(textarea).toBeTruthy()
    })

    it('应该显示当前环境变量值', () => {
      const envText = 'NODE_ENV=production\nAPI_KEY=secret'
      render(<SettingsPage {...defaultProps} envText={envText} />)
      
      const textarea = screen.getByPlaceholderText('KEY=VALUE (one per line)') as HTMLTextAreaElement
      expect(textarea.value).toBe(envText)
    })

    it('应该在输入时调用 setEnvText', async () => {
      const user = userEvent.setup()
      render(<SettingsPage {...defaultProps} />)
      
      const textarea = screen.getByPlaceholderText('KEY=VALUE (one per line)')
      await user.type(textarea, 'NEW_VAR=value')
      
      expect(defaultProps.setEnvText).toHaveBeenCalled()
    })

    it('应该支持多行输入', () => {
      const envText = 'VAR1=value1\nVAR2=value2\nVAR3=value3'
      render(<SettingsPage {...defaultProps} envText={envText} />)
      
      const textarea = screen.getByPlaceholderText('KEY=VALUE (one per line)') as HTMLTextAreaElement
      expect(textarea.value.split('\n')).toHaveLength(3)
    })
  })

  describe('边界情况', () => {
    it('应该处理空的 command', () => {
      render(<SettingsPage {...defaultProps} command="" />)
      const input = screen.getByLabelText('Command') as HTMLInputElement
      expect(input.value).toBe('')
    })

    it('应该处理空的 cwd', () => {
      render(<SettingsPage {...defaultProps} cwd="" />)
      const input = screen.getByPlaceholderText('Optional working directory') as HTMLInputElement
      expect(input.value).toBe('')
    })

    it('应该处理空的 envText', () => {
      render(<SettingsPage {...defaultProps} envText="" />)
      const textarea = screen.getByPlaceholderText('KEY=VALUE (one per line)') as HTMLTextAreaElement
      expect(textarea.value).toBe('')
    })

    it('应该处理很长的路径', () => {
      const longPath = '/very/long/path/to/some/directory/that/has/many/nested/folders/here'
      render(<SettingsPage {...defaultProps} cwd={longPath} />)
      
      const input = screen.getByPlaceholderText('Optional working directory') as HTMLInputElement
      expect(input.value).toBe(longPath)
    })

    it('应该处理特殊字符的命令', () => {
      const specialCommand = 'node --experimental-modules'
      render(<SettingsPage {...defaultProps} command={specialCommand} />)
      
      const input = screen.getByLabelText('Command') as HTMLInputElement
      expect(input.value).toBe(specialCommand)
    })
  })

  describe('Base Arguments', () => {
    it('应该显示 base arguments 输入框', () => {
      render(<SettingsPage {...defaultProps} />)
      const input = screen.getByLabelText(/Base Arguments/i)
      expect(input).toBeTruthy()
    })

    it('应该在输入时调用 setBaseArgs', async () => {
      const user = userEvent.setup()
      render(<SettingsPage {...defaultProps} />)
      
      const input = screen.getByLabelText(/Base Arguments/i)
      await user.type(input, '--verbose')
      
      expect(defaultProps.setBaseArgs).toHaveBeenCalled()
    })
  })

  describe('样式和布局', () => {
    it('应该渲染主容器', () => {
      const { container } = render(<SettingsPage {...defaultProps} />)
      const mainBox = container.firstChild as HTMLElement
      expect(mainBox).toBeTruthy()
    })

    it('应该有正确的 Container maxWidth', () => {
      const { container } = render(<SettingsPage {...defaultProps} />)
      const containers = container.querySelectorAll('.MuiContainer-root')
      expect(containers.length).toBeGreaterThan(0)
    })

    it('应该使用 Paper 组件包装配置项', () => {
      const { container } = render(<SettingsPage {...defaultProps} />)
      const paper = container.querySelector('.MuiPaper-root')
      expect(paper).toBeTruthy()
    })
  })

  describe('用户交互', () => {
    it('应该允许同时修改多个字段', async () => {
      const user = userEvent.setup()
      render(<SettingsPage {...defaultProps} />)
      
      const commandInput = screen.getByLabelText('Command')
      const cwdInput = screen.getByPlaceholderText('Optional working directory')
      
      await user.clear(commandInput)
      await user.type(commandInput, 'new-cmd')
      await user.clear(cwdInput)
      await user.type(cwdInput, '/new/dir')
      
      expect(defaultProps.setCommand).toHaveBeenCalled()
      expect(defaultProps.setCwd).toHaveBeenCalled()
    })

    it('输入框应该可以获得焦点', () => {
      render(<SettingsPage {...defaultProps} />)
      const commandInput = screen.getByLabelText('Command')
      
      commandInput.focus()
      expect(document.activeElement).toBe(commandInput)
    })
  })
})
