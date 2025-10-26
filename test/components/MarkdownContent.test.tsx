import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { MarkdownContent } from '../../src/components/MarkdownContent'

// Mock ESM react-markdown to avoid Jest ESM parsing issues
jest.mock('react-markdown', () => ({
  __esModule: true,
  default: ({ children }: any, _opts?: any) => <div>{children}</div>,
}))
jest.mock('remark-gfm', () => ({ __esModule: true, default: () => null }))
jest.mock('rehype-highlight', () => ({ __esModule: true, default: () => null }))

describe('MarkdownContent', () => {
  it('renders basic markdown as plain text when mocked', () => {
    const md = `# Title\n\nSome text.\n\n\`inline code\``
    render(<MarkdownContent content={md} />)
    expect(screen.getByText(/Title/)).toBeInTheDocument()
    expect(screen.getByText(/inline code/)).toBeInTheDocument()
  })

  it('renders image alt text when mocked', () => {
    const md = `![alt](http://example.com/image.png)`
    render(<MarkdownContent content={md} />)
    expect(screen.getByText(/alt/)).toBeInTheDocument()
  })

  it('renders code block fence when mocked', () => {
    const md = '```js\nconsole.log(1)\n```'
    render(<MarkdownContent content={md} />)
    expect(screen.getByText(/console\.log\(1\)/)).toBeInTheDocument()
  })
})
