import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { VncPanel } from '../../src/components/VncPanel'

describe('VncPanel', () => {
  const vncState = {
    isActive: false,
    isLoading: false,
    url: '',
    error: '',
    containerId: ''
  }
  const vncHealth: any[] = []
  const updateVncState = jest.fn()
  const resetVncState = jest.fn()
  const addMessage = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    // @ts-ignore
    delete (window as any).api
  })

  it('renders placeholder when inactive', () => {
    render(
      <VncPanel
        vncState={vncState}
        vncHealth={vncHealth}
        updateVncState={updateVncState}
        resetVncState={resetVncState}
        addMessage={addMessage}
      />
    )
    expect(screen.getByText('VNC桌面环境')).toBeInTheDocument()
    expect(screen.getByText('点击"启动VNC"按钮开始使用虚拟桌面环境')).toBeInTheDocument()
  })

  it('start button adds system message when API is unavailable', () => {
    render(
      <VncPanel
        vncState={vncState}
        vncHealth={vncHealth}
        updateVncState={updateVncState}
        resetVncState={resetVncState}
        addMessage={addMessage}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: '启动VNC' }))
    expect(addMessage).toHaveBeenCalledWith('system', 'VNC API不可用，请确保在Electron环境中运行')
  })

  it('handles start success path', async () => {
    // Mock API
    // @ts-ignore
    (window as any).api = {
      vnc: {
        start: jest.fn().mockResolvedValue({ success: true, vncUrl: 'http://localhost:6080', containerId: 'abc' })
      }
    }

    render(
      <VncPanel
        vncState={vncState}
        vncHealth={vncHealth}
        updateVncState={updateVncState}
        resetVncState={resetVncState}
        addMessage={addMessage}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: '启动VNC' }))

    await waitFor(() => {
      expect(updateVncState).toHaveBeenCalled()
      expect(addMessage).toHaveBeenCalledWith('system', 'VNC桌面环境启动成功')
    })
  })

  it('handles start failure path', async () => {
    // Mock API
    // @ts-ignore
    (window as any).api = {
      vnc: {
        start: jest.fn().mockResolvedValue({ success: false, error: '失败' })
      }
    }

    render(
      <VncPanel
        vncState={vncState}
        vncHealth={vncHealth}
        updateVncState={updateVncState}
        resetVncState={resetVncState}
        addMessage={addMessage}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: '启动VNC' }))

    await waitFor(() => {
      expect(addMessage).toHaveBeenCalledWith('system', 'VNC启动失败: 失败')
    })
  })

  it('handles stop', async () => {
    // @ts-ignore
    (window as any).api = { vnc: { stop: jest.fn().mockResolvedValue({ success: true }) } }

    render(
      <VncPanel
        vncState={{ ...vncState, isActive: true, url: 'http://localhost:6080' }}
        vncHealth={vncHealth}
        updateVncState={updateVncState}
        resetVncState={resetVncState}
        addMessage={addMessage}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: '停止VNC' }))

    await waitFor(() => {
      expect(resetVncState).toHaveBeenCalled()
      expect(addMessage).toHaveBeenCalledWith('system', 'VNC桌面环境已停止')
    })
  })
})

