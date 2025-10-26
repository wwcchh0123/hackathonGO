import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { MarkdownContent } from '../../src/components/MarkdownContent'

// Mock heavy ESM plugins to focus on our render paths
jest.mock('react-markdown', () => ({ __esModule: true, default: ({ children }: any) => <div>{children}</div> }))
jest.mock('remark-gfm', () => ({ __esModule: true, default: () => null }))
jest.mock('rehype-highlight', () => ({ __esModule: true, default: () => null }))

describe('MarkdownContent more cases', () => {
  it('renders inline code and image alt text', () => {
    const md = '文本 `inline` \n\n![alt](url)'
    render(<MarkdownContent content={md} />)
    expect(screen.getByText(/inline/)).toBeInTheDocument()
    expect(screen.getByText(/alt/)).toBeInTheDocument()
  })
})

