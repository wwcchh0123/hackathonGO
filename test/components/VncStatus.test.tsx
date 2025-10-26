import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { VncStatus } from '../../src/components/VncStatus'

const baseState = {
  isActive: true,
  isLoading: false,
  url: 'http://localhost:6080',
  error: '',
  containerId: 'abcdef1234567890'
}

describe('VncStatus', () => {
  it('returns null when inactive', () => {
    const { container } = render(
      <VncStatus
        vncState={{ ...baseState, isActive: false }}
        vncHealth={[]}
        isConnected={false}
        connectionError={null}
      />
    )
    expect(container.firstChild).toBeNull()
  })

  it('shows connection status chip', () => {
    render(
      <VncStatus
        vncState={baseState}
        vncHealth={[]}
        isConnected={true}
        connectionError={null}
      />
    )
    expect(screen.getByText('已连接')).toBeInTheDocument()
  })

  it('shows connection failed when error present', () => {
    render(
      <VncStatus
        vncState={baseState}
        vncHealth={[]}
        isConnected={false}
        connectionError={'连接失败'}
      />
    )
    expect(screen.getByText('连接失败')).toBeInTheDocument()
  })

  it('renders unknown health status chip', () => {
    const health = [ { name: 'other', port: 1234, status: 'unknown' } ]
    render(
      <VncStatus
        vncState={baseState}
        vncHealth={health as any}
        isConnected={true}
        connectionError={null}
      />
    )
    expect(screen.getByText('other:1234')).toBeInTheDocument()
  })

  it('renders container id chip and url', () => {
    render(
      <VncStatus
        vncState={baseState}
        vncHealth={[]}
        isConnected={false}
        connectionError={'连接失败'}
      />
    )
    expect(screen.getByText(/abcdef123456/)).toBeInTheDocument()
    expect(screen.getByText('http://localhost:6080')).toBeInTheDocument()
  })

  it('renders service health chips', () => {
    const health = [
      { name: 'novnc', port: 6080, status: 'healthy' },
      { name: 'tools', port: 6100, status: 'unhealthy' },
    ]
    render(
      <VncStatus
        vncState={baseState}
        vncHealth={health as any}
        isConnected={false}
        connectionError={null}
      />
    )
    expect(screen.getByText('novnc:6080')).toBeInTheDocument()
    expect(screen.getByText('tools:6100')).toBeInTheDocument()
  })
})
