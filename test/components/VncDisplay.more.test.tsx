import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { VncDisplay } from '../../src/components/VncDisplay'

describe('VncDisplay more branches', () => {
  beforeEach(() => jest.clearAllMocks())

  it('shows warning alert when connectionError provided', () => {
    render(<VncDisplay url={'http://localhost:6080'} isConnected={false} connectionError={'连接失败: HTTP 500'} />)
    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByText(/连接失败/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '重试' })).toBeInTheDocument()
  })

  it('shows connected badge after iframe load', () => {
    render(<VncDisplay url={'http://localhost:6080'} isConnected={true} connectionError={null} />)
    const iframe = screen.getByTitle('VNC Desktop')
    fireEvent.load(iframe)
    expect(screen.getByText('已连接')).toBeInTheDocument()
  })
})
