import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { VncDisplay } from '../../src/components/VncDisplay'

describe('VncDisplay', () => {
  beforeEach(() => jest.clearAllMocks())

  it('shows loading and renders iframe when url provided', () => {
    render(<VncDisplay url={'http://localhost:6080'} isConnected={false} connectionError={null} />)
    expect(screen.getByText('正在加载VNC界面...')).toBeInTheDocument()
    const iframe = screen.getByTitle('VNC Desktop') as HTMLIFrameElement
    expect(iframe).toBeInTheDocument()
  })

  it('shows connection badge when connected and not loading', () => {
    const { rerender } = render(<VncDisplay url={'http://localhost:6080'} isConnected={false} connectionError={null} />)
    // Simulate iframe load
    const iframe = screen.getByTitle('VNC Desktop')
    fireEvent.load(iframe)
    rerender(<VncDisplay url={'http://localhost:6080'} isConnected={true} connectionError={null} />)
    expect(screen.getByText('已连接')).toBeInTheDocument()
  })

  it('shows error alert and allows retry', () => {
    render(<VncDisplay url={'http://localhost:6080'} isConnected={false} connectionError={'连接失败'} />)
    expect(screen.getByText('连接失败')).toBeInTheDocument()
    const retryBtn = screen.getByRole('button', { name: '重试' })
    expect(retryBtn).toBeInTheDocument()
  })
})

