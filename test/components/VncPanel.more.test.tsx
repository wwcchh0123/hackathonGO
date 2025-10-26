import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { VncPanel } from '../../src/components/VncPanel'

describe('VncPanel more branches', () => {
  const vncStateBase = {
    isActive: true,
    isLoading: false,
    url: 'http://localhost:6080',
    error: '',
    containerId: 'abc'
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

  it('sets connectionError when fetch returns non-OK', async () => {
    const mockFetch = jest.fn().mockResolvedValue({ ok: false, status: 500 })
    // @ts-ignore
    global.fetch = mockFetch

    render(
      <VncPanel
        vncState={vncStateBase}
        vncHealth={vncHealth}
        updateVncState={updateVncState}
        resetVncState={resetVncState}
        addMessage={addMessage}
      />
    )

    await waitFor(() => {
      expect(screen.getByText('连接失败')).toBeInTheDocument()
    })
  })

  it('sets connectionError when fetch throws', async () => {
    const mockFetch = jest.fn().mockRejectedValue(new Error('boom'))
    // @ts-ignore
    global.fetch = mockFetch

    render(
      <VncPanel
        vncState={vncStateBase}
        vncHealth={vncHealth}
        updateVncState={updateVncState}
        resetVncState={resetVncState}
        addMessage={addMessage}
      />
    )

    await waitFor(() => {
      expect(screen.getByText('连接失败')).toBeInTheDocument()
    })
  })

  it('refresh triggers addMessage when active', () => {
    // Ok fetch to mark connected
    // @ts-ignore
    global.fetch = jest.fn().mockResolvedValue({ ok: true })
    render(
      <VncPanel
        vncState={vncStateBase}
        vncHealth={vncHealth}
        updateVncState={updateVncState}
        resetVncState={resetVncState}
        addMessage={addMessage}
      />
    )
    const refreshBtn = screen.getByTitle('刷新连接')
    fireEvent.click(refreshBtn)
    expect(addMessage).toHaveBeenCalledWith('system', '正在刷新VNC连接...')
  })
})

