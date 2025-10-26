import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { StreamingOutput } from '../../src/components/StreamingOutput'

describe('StreamingOutput', () => {
  beforeEach(() => {
    // @ts-ignore
    (window as any).api = {
      onClaudeStream: (handler: any) => {
        // Immediately simulate a short lifecycle for the given session
        const sessionId = 's1'
        handler(null, { type: 'stream-start', sessionId, timestamp: new Date().toISOString(), data: { command: 'echo 1' } })
        handler(null, { type: 'stream-data', sessionId, timestamp: new Date().toISOString(), data: { stage: 'response', content: '输出内容' } })
        handler(null, { type: 'stream-end', sessionId, timestamp: new Date().toISOString(), data: { success: true } })
        return () => {}
      }
    }
  })

  it('renders nothing when inactive', () => {
    const { container } = render(<StreamingOutput sessionId={'s1'} isActive={false} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders header and logs when active', () => {
    render(<StreamingOutput sessionId={'s1'} isActive={true} />)
    expect(screen.getByText('🤖 Claude Code 执行状态')).toBeInTheDocument()
    // After end, stage chip shows 完成
    expect(screen.getByText('完成')).toBeInTheDocument()
    expect(screen.getByText('输出内容')).toBeInTheDocument()
  })

  it('handles various stages and error', () => {
    // Override API to send multiple stage types including error
    // @ts-ignore
    (window as any).api = {
      onClaudeStream: (handler: any) => {
        const sessionId = 's2'
        handler(null, { type: 'stream-start', sessionId, timestamp: new Date().toISOString(), data: { command: 'build' } })
        handler(null, { type: 'stream-data', sessionId, timestamp: new Date().toISOString(), data: { stage: 'tool', content: '🔧 使用工具' } })
        handler(null, { type: 'stream-data', sessionId, timestamp: new Date().toISOString(), data: { stage: 'tool-result', content: '📋 工具结果' } })
        handler(null, { type: 'stream-data', sessionId, timestamp: new Date().toISOString(), data: { stage: 'warning', content: '⚠️ 警告' } })
        handler(null, { type: 'stream-error', sessionId, timestamp: new Date().toISOString(), data: { content: '错误发生' } })
        return () => {}
      }
    }

    render(<StreamingOutput sessionId={'s2'} isActive={true} />)
    expect(screen.getByText(/Claude Code 执行状态/)).toBeInTheDocument()
    expect(screen.getByText(/使用工具/)).toBeInTheDocument()
    expect(screen.getByText(/工具结果/)).toBeInTheDocument()
    expect(screen.getAllByText(/警告/).length).toBeGreaterThan(0)
    expect(screen.getByText(/错误发生/)).toBeInTheDocument()
  })
})
