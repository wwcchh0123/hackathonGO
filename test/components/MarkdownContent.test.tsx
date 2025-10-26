import React from 'react'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { MarkdownContent } from '../../src/components/MarkdownContent'

describe('MarkdownContent', () => {
  describe('基础渲染', () => {
    it('应该渲染纯文本', () => {
      render(<MarkdownContent content="Hello World" />)

      expect(screen.getByText('Hello World')).toBeInTheDocument()
    })

    it('应该渲染空内容', () => {
      const { container } = render(<MarkdownContent content="" />)

      expect(container.firstChild).toBeInTheDocument()
    })
  })

  describe('Markdown 语法', () => {
    it('应该渲染标题', () => {
      render(<MarkdownContent content="# 标题 1\n## 标题 2" />)

      const h1 = screen.getByRole('heading', { level: 1 })
      const h2 = screen.getByRole('heading', { level: 2 })

      expect(h1).toHaveTextContent('标题 1')
      expect(h2).toHaveTextContent('标题 2')
    })

    it('应该渲染粗体文本', () => {
      render(<MarkdownContent content="**粗体文本**" />)

      const boldText = screen.getByText('粗体文本')
      expect(boldText.tagName).toBe('STRONG')
    })

    it('应该渲染斜体文本', () => {
      render(<MarkdownContent content="*斜体文本*" />)

      const italicText = screen.getByText('斜体文本')
      expect(italicText.tagName).toBe('EM')
    })

    it('应该渲染链接', () => {
      render(<MarkdownContent content="[链接文本](https://example.com)" />)

      const link = screen.getByRole('link', { name: '链接文本' })
      expect(link).toHaveAttribute('href', 'https://example.com')
    })

    it('应该渲染无序列表', () => {
      render(<MarkdownContent content="- 项目 1\n- 项目 2\n- 项目 3" />)

      const list = screen.getByRole('list')
      const items = screen.getAllByRole('listitem')

      expect(list).toBeInTheDocument()
      expect(items).toHaveLength(3)
      expect(items[0]).toHaveTextContent('项目 1')
    })

    it('应该渲染有序列表', () => {
      render(<MarkdownContent content="1. 第一\n2. 第二\n3. 第三" />)

      const list = screen.getByRole('list')
      const items = screen.getAllByRole('listitem')

      expect(list).toBeInTheDocument()
      expect(items).toHaveLength(3)
    })

    it('应该渲染引用块', () => {
      render(<MarkdownContent content="> 这是一个引用" />)

      const blockquote = screen.getByText('这是一个引用')
      expect(blockquote.closest('blockquote')).toBeInTheDocument()
    })

    it('应该渲染水平分割线', () => {
      render(<MarkdownContent content="文本\n\n---\n\n更多文本" />)

      const hr = document.querySelector('hr')
      expect(hr).toBeInTheDocument()
    })
  })

  describe('代码块', () => {
    it('应该渲染内联代码', () => {
      render(<MarkdownContent content="这是 `内联代码` 示例" />)

      const code = screen.getByText('内联代码')
      expect(code.tagName).toBe('CODE')
      expect(code.closest('pre')).not.toBeInTheDocument()
    })

    it('应该渲染代码块', () => {
      const codeContent = '```\nconst x = 1;\n```'
      render(<MarkdownContent content={codeContent} />)

      const code = screen.getByText('const x = 1;')
      expect(code.tagName).toBe('CODE')
      expect(code.closest('pre')).toBeInTheDocument()
    })

    it('应该渲染带语言标识的代码块', () => {
      const codeContent = '```javascript\nconst x = 1;\n```'
      render(<MarkdownContent content={codeContent} />)

      const code = screen.getByText('const x = 1;')
      const codeElement = code.closest('code')

      expect(codeElement).toHaveClass('language-javascript')
    })

    it('应该渲染多行代码块', () => {
      const codeContent = '```\nline 1\nline 2\nline 3\n```'
      render(<MarkdownContent content={codeContent} />)

      const code = screen.getByText(/line 1/)
      expect(code).toBeInTheDocument()
    })

    it('应该为代码块应用样式', () => {
      const codeContent = '```\nconst x = 1;\n```'
      const { container } = render(<MarkdownContent content={codeContent} />)

      const pre = container.querySelector('pre')
      expect(pre).toHaveStyle({ padding: 0 })
    })
  })

  describe('图片', () => {
    it('应该渲染图片', () => {
      render(
        <MarkdownContent content="![替代文本](https://example.com/image.png)" />
      )

      const img = screen.getByRole('img', { name: '替代文本' })
      expect(img).toHaveAttribute('src', 'https://example.com/image.png')
    })

    it('应该为图片应用样式', () => {
      render(<MarkdownContent content="![图片](https://example.com/img.png)" />)

      const img = screen.getByRole('img')
      expect(img).toHaveStyle({
        maxWidth: '100%',
        borderRadius: '4px'
      })
    })

    it('应该支持图片点击', () => {
      render(<MarkdownContent content="![图片](https://example.com/img.png)" />)

      const img = screen.getByRole('img')
      expect(img).toHaveStyle({ cursor: 'pointer' })
    })
  })

  describe('GitHub Flavored Markdown (GFM)', () => {
    it('应该渲染表格', () => {
      const tableContent = `
| 列1 | 列2 |
|-----|-----|
| A   | B   |
| C   | D   |
      `
      render(<MarkdownContent content={tableContent} />)

      const table = screen.getByRole('table')
      expect(table).toBeInTheDocument()
    })

    it('应该渲染删除线', () => {
      render(<MarkdownContent content="~~删除的文本~~" />)

      const del = screen.getByText('删除的文本')
      expect(del.tagName).toBe('DEL')
    })

    it('应该渲染任务列表', () => {
      const taskListContent = `
- [x] 已完成任务
- [ ] 未完成任务
      `
      render(<MarkdownContent content={taskListContent} />)

      const checkboxes = document.querySelectorAll('input[type="checkbox"]')
      expect(checkboxes).toHaveLength(2)
      expect(checkboxes[0]).toBeChecked()
      expect(checkboxes[1]).not.toBeChecked()
    })

    it('应该支持自动链接', () => {
      render(<MarkdownContent content="https://example.com" />)

      const link = screen.getByRole('link')
      expect(link).toHaveAttribute('href', 'https://example.com')
    })
  })

  describe('复杂内容', () => {
    it('应该渲染混合内容', () => {
      const complexContent = `
# 标题

这是一个段落，包含 **粗体** 和 *斜体* 文本。

- 列表项 1
- 列表项 2

\`\`\`javascript
const code = "hello";
\`\`\`

[链接](https://example.com)
      `
      render(<MarkdownContent content={complexContent} />)

      expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()
      expect(screen.getByText('粗体')).toBeInTheDocument()
      expect(screen.getByText('斜体')).toBeInTheDocument()
      expect(screen.getAllByRole('listitem')).toHaveLength(2)
      expect(screen.getByText(/const code/)).toBeInTheDocument()
      expect(screen.getByRole('link')).toBeInTheDocument()
    })

    it('应该处理嵌套列表', () => {
      const nestedList = `
- 项目 1
  - 子项目 1.1
  - 子项目 1.2
- 项目 2
      `
      render(<MarkdownContent content={nestedList} />)

      const lists = document.querySelectorAll('ul')
      expect(lists.length).toBeGreaterThan(1)
    })

    it('应该处理代码块中的特殊字符', () => {
      const codeContent = '```\n<div>HTML</div>\n&nbsp;\n```'
      render(<MarkdownContent content={codeContent} />)

      expect(screen.getByText(/<div>HTML<\/div>/)).toBeInTheDocument()
    })
  })

  describe('边界情况', () => {
    it('应该处理空字符串', () => {
      const { container } = render(<MarkdownContent content="" />)

      expect(container.firstChild).toBeInTheDocument()
    })

    it('应该处理仅包含空白的内容', () => {
      render(<MarkdownContent content="   \n   \n   " />)

      expect(document.body).toBeInTheDocument()
    })

    it('应该处理无效的 Markdown 语法', () => {
      render(<MarkdownContent content="**不完整的粗体" />)

      expect(screen.getByText(/不完整的粗体/)).toBeInTheDocument()
    })

    it('应该处理超长文本', () => {
      const longText = 'a'.repeat(10000)
      render(<MarkdownContent content={longText} />)

      expect(screen.getByText(longText)).toBeInTheDocument()
    })
  })

  describe('代码高亮', () => {
    it('应该为不同语言的代码块应用正确的类名', () => {
      const languages = ['javascript', 'python', 'typescript', 'java']

      languages.forEach((lang) => {
        const { container } = render(
          <MarkdownContent content={`\`\`\`${lang}\ncode\n\`\`\``} />
        )

        const code = container.querySelector('code')
        expect(code).toHaveClass(`language-${lang}`)
      })
    })
  })

  describe('自定义组件', () => {
    it('应该使用自定义图片组件', () => {
      render(<MarkdownContent content="![测试](https://example.com/test.png)" />)

      const img = screen.getByRole('img')
      expect(img).toHaveStyle({ maxWidth: '100%' })
    })

    it('应该使用自定义代码组件', () => {
      render(<MarkdownContent content="`inline`" />)

      const code = screen.getByText('inline')
      expect(code.tagName).toBe('CODE')
    })
  })

  describe('安全性', () => {
    it('应该防止 XSS 攻击', () => {
      const maliciousContent = '<script>alert("XSS")</script>'
      render(<MarkdownContent content={maliciousContent} />)

      const scripts = document.querySelectorAll('script')
      expect(scripts).toHaveLength(0)
    })

    it('应该清理危险的 HTML', () => {
      const dangerousHtml = '<img src="x" onerror="alert(1)">'
      render(<MarkdownContent content={dangerousHtml} />)

      const img = document.querySelector('img[onerror]')
      expect(img).not.toBeInTheDocument()
    })
  })
})
