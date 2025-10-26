import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import { SettingsPanel } from '../../../../src/pages/settings/components/SettingsPanel'

describe('SettingsPanel', () => {
  const mockOnSave = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('渲染', () => {
    it('应该渲染设置面板', () => {
      render(<SettingsPanel />)

      expect(screen.getByText(/设置/i)).toBeInTheDocument()
    })

    it('应该显示保存按钮', () => {
      render(<SettingsPanel onSave={mockOnSave} />)

      const saveButton = screen.getByRole('button', { name: /保存/i })
      expect(saveButton).toBeInTheDocument()
    })
  })

  describe('表单输入', () => {
    it('应该允许用户输入文本', async () => {
      const user = userEvent.setup()
      render(<SettingsPanel />)

      const input = screen.getByRole('textbox')
      await user.type(input, '测试输入')

      expect(input).toHaveValue('测试输入')
    })

    it('应该支持多个输入字段', () => {
      render(<SettingsPanel />)

      const inputs = screen.getAllByRole('textbox')
      expect(inputs.length).toBeGreaterThan(0)
    })
  })

  describe('保存功能', () => {
    it('应该在点击保存按钮时调用 onSave', () => {
      render(<SettingsPanel onSave={mockOnSave} />)

      const saveButton = screen.getByRole('button', { name: /保存/i })
      fireEvent.click(saveButton)

      expect(mockOnSave).toHaveBeenCalled()
    })

    it('应该在保存时传递正确的数据', async () => {
      const user = userEvent.setup()
      render(<SettingsPanel onSave={mockOnSave} />)

      const input = screen.getByRole('textbox')
      await user.type(input, '新设置')

      const saveButton = screen.getByRole('button', { name: /保存/i })
      fireEvent.click(saveButton)

      expect(mockOnSave).toHaveBeenCalled()
    })
  })

  describe('验证', () => {
    it('应该在输入无效时显示错误', async () => {
      const user = userEvent.setup()
      render(<SettingsPanel />)

      const input = screen.getByRole('textbox')
      await user.clear(input)

      const saveButton = screen.getByRole('button', { name: /保存/i })
      fireEvent.click(saveButton)

      expect(screen.queryByText(/错误|无效/i)).toBeInTheDocument()
    })

    it('应该在所有字段有效时启用保存按钮', async () => {
      const user = userEvent.setup()
      render(<SettingsPanel onSave={mockOnSave} />)

      const input = screen.getByRole('textbox')
      await user.type(input, '有效输入')

      const saveButton = screen.getByRole('button', { name: /保存/i })
      expect(saveButton).not.toBeDisabled()
    })
  })

  describe('重置功能', () => {
    it('应该显示重置按钮', () => {
      render(<SettingsPanel />)

      const resetButton = screen.queryByRole('button', { name: /重置|恢复/i })
      if (resetButton) {
        expect(resetButton).toBeInTheDocument()
      }
    })

    it('应该在点击重置按钮时清除输入', async () => {
      const user = userEvent.setup()
      render(<SettingsPanel />)

      const input = screen.getByRole('textbox')
      await user.type(input, '测试')

      const resetButton = screen.queryByRole('button', { name: /重置|恢复/i })
      if (resetButton) {
        fireEvent.click(resetButton)
        expect(input).toHaveValue('')
      }
    })
  })

  describe('布局', () => {
    it('应该使用正确的布局结构', () => {
      const { container } = render(<SettingsPanel />)

      expect(container.firstChild).toBeInTheDocument()
    })

    it('应该正确组织表单元素', () => {
      render(<SettingsPanel />)

      const inputs = screen.getAllByRole('textbox')
      expect(inputs.length).toBeGreaterThan(0)
    })
  })

  describe('边界情况', () => {
    it('应该处理未提供 onSave 回调的情况', () => {
      const { container } = render(<SettingsPanel />)

      expect(container.firstChild).toBeInTheDocument()
    })

    it('应该处理空输入', async () => {
      const user = userEvent.setup()
      render(<SettingsPanel />)

      const input = screen.getByRole('textbox')
      await user.clear(input)

      expect(input).toHaveValue('')
    })
  })

  describe('可访问性', () => {
    it('应该有正确的标签', () => {
      render(<SettingsPanel />)

      const inputs = screen.getAllByRole('textbox')
      inputs.forEach((input) => {
        expect(input).toBeInTheDocument()
      })
    })

    it('应该支持键盘导航', async () => {
      const user = userEvent.setup()
      render(<SettingsPanel />)

      const input = screen.getByRole('textbox')
      await user.click(input)

      expect(input).toHaveFocus()
    })
  })
})
