import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { VncToolbar } from '../../src/components/VncToolbar'

const baseState = {
  isActive: false,
  isLoading: false,
  url: '',
  error: '',
  containerId: ''
}

describe('VncToolbar', () => {
  it('renders idle state with start button', () => {
    const onStart = jest.fn()
    render(
      <VncToolbar
        vncState={baseState}
        isConnected={false}
        onStart={onStart}
        onStop={jest.fn()}
        onRefresh={jest.fn()}
      />
    )

    expect(screen.getByText('虚拟桌面')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '启动VNC' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '启动VNC' }))
    expect(onStart).toHaveBeenCalled()
  })

  it('shows loading state', () => {
    render(
      <VncToolbar
        vncState={{ ...baseState, isLoading: true }}
        isConnected={false}
        onStart={jest.fn()}
        onStop={jest.fn()}
        onRefresh={jest.fn()}
      />
    )
    expect(screen.getByText('启动中')).toBeInTheDocument()
    expect(screen.getByText('启动中...')).toBeInTheDocument()
  })

  it('renders active state with refresh and stop', () => {
    const onStop = jest.fn()
    const onRefresh = jest.fn()
    render(
      <VncToolbar
        vncState={{ ...baseState, isActive: true }}
        isConnected={true}
        onStart={jest.fn()}
        onStop={onStop}
        onRefresh={onRefresh}
      />
    )

    const stopBtn = screen.getByRole('button', { name: '停止VNC' })
    expect(stopBtn).toBeInTheDocument()
    fireEvent.click(stopBtn)
    expect(onStop).toHaveBeenCalled()

    const refreshBtn = screen.getByTitle('刷新连接')
    fireEvent.click(refreshBtn)
    expect(onRefresh).toHaveBeenCalled()
  })

  it('shows error state', () => {
    render(
      <VncToolbar
        vncState={{ ...baseState, error: '错误信息' }}
        isConnected={false}
        onStart={jest.fn()}
        onStop={jest.fn()}
        onRefresh={jest.fn()}
      />
    )
    expect(screen.getByText('错误')).toBeInTheDocument()
  })

  it('shows disconnected state when active but not connected', () => {
    render(
      <VncToolbar
        vncState={{ ...baseState, isActive: true }}
        isConnected={false}
        onStart={jest.fn()}
        onStop={jest.fn()}
        onRefresh={jest.fn()}
      />
    )
    expect(screen.getByText('连接中断')).toBeInTheDocument()
  })

  it('shows container chip when containerId present', () => {
    render(
      <VncToolbar
        vncState={{ ...baseState, containerId: 'abcdef1234567890' }}
        isConnected={false}
        onStart={jest.fn()}
        onStop={jest.fn()}
        onRefresh={jest.fn()}
      />
    )
    expect(screen.getByText(/ID: abcdef12/)).toBeInTheDocument()
  })
})
