import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import { AppHeader } from '../../../src/components/shared/AppHeader'

describe('AppHeader', () => {
  const mockNavigateToSettings = jest.fn()
  const mockToggleSidebar = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('渲染', () => {
    it('应该渲染应用标题', () => {
      render(
        <AppHeader
          currentPage="chat"
          onNavigateToSettings={mockNavigateToSettings}
        />
      )

      expect(screen.getByText('XGopilot for Desktop')).toBeInTheDocument()
    })

    it('应该渲染应用图标', () => {
      render(
        <AppHeader
          currentPage="chat"
          onNavigateToSettings={mockNavigateToSettings}
        />
      )

      const img = screen.getByAltText('App Icon')
      expect(img).toBeInTheDocument()
    })

    it('应该在聊天页面渲染设置按钮', () => {
      render(
        <AppHeader
          currentPage="chat"
          onNavigateToSettings={mockNavigateToSettings}
        />
      )

      const settingsButton = screen.getByRole('button', { name: '' })
      expect(settingsButton).toBeInTheDocument()
    })

    it('应该在设置页面不渲染设置按钮', () => {
      render(
        <AppHeader
          currentPage="settings"
          onNavigateToSettings={mockNavigateToSettings}
        />
      )

      const buttons = screen.queryAllByRole('button')
      expect(buttons).toHaveLength(0)
    })

    it('应该在提供 onToggleSidebar 时渲染侧边栏切换按钮', () => {
      render(
        <AppHeader
          currentPage="chat"
          onNavigateToSettings={mockNavigateToSettings}
          onToggleSidebar={mockToggleSidebar}
        />
      )

      const buttons = screen.getAllByRole('button')
      expect(buttons).toHaveLength(2)
    })

    it('应该在设置页面不渲染侧边栏切换按钮', () => {
      render(
        <AppHeader
          currentPage="settings"
          onNavigateToSettings={mockNavigateToSettings}
          onToggleSidebar={mockToggleSidebar}
        />
      )

      const buttons = screen.queryAllByRole('button')
      expect(buttons).toHaveLength(0)
    })
  })

  describe('交互', () => {
    it('应该在点击设置按钮时调用 onNavigateToSettings', async () => {
      const user = userEvent.setup()
      
      render(
        <AppHeader
          currentPage="chat"
          onNavigateToSettings={mockNavigateToSettings}
        />
      )

      const settingsButton = screen.getByRole('button')
      await user.click(settingsButton)

      expect(mockNavigateToSettings).toHaveBeenCalledTimes(1)
    })

    it('应该在点击菜单按钮时调用 onToggleSidebar', async () => {
      const user = userEvent.setup()
      
      render(
        <AppHeader
          currentPage="chat"
          onNavigateToSettings={mockNavigateToSettings}
          onToggleSidebar={mockToggleSidebar}
        />
      )

      const buttons = screen.getAllByRole('button')
      const menuButton = buttons[0]
      
      await user.click(menuButton)

      expect(mockToggleSidebar).toHaveBeenCalledTimes(1)
    })
  })

  describe('样式', () => {
    it('应该应用正确的样式', () => {
      const { container } = render(
        <AppHeader
          currentPage="chat"
          onNavigateToSettings={mockNavigateToSettings}
        />
      )

      const appBar = container.querySelector('.MuiAppBar-root')
      expect(appBar).toBeInTheDocument()
    })
  })
})
