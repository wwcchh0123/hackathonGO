import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import userEvent from '@testing-library/user-event'
import { SettingsPanel } from '../../src/pages/settings/components/SettingsPanel'

describe('SettingsPanel', () => {
  const props = {
    command: 'claude',
    setCommand: jest.fn(),
    baseArgs: ['-p'],
    setBaseArgs: jest.fn(),
    cwd: '/work',
    setCwd: jest.fn(),
    envText: 'KEY=VALUE',
    setEnvText: jest.fn(),
    onPickCwd: jest.fn(),
  }

  beforeEach(() => jest.clearAllMocks())

  it('renders fields and updates values', async () => {
    const user = userEvent.setup()
    render(<SettingsPanel {...props} />)

    // Command field
    const cmd = screen.getByLabelText('CLI command')
    expect(cmd).toBeInTheDocument()
    await user.clear(cmd)
    await user.type(cmd, 'newcmd')
    expect(props.setCommand).toHaveBeenCalled()

    // Base args
    const args = screen.getByLabelText('Base Arguments')
    await user.clear(args)
    await user.type(args, '--foo --bar')
    expect(props.setBaseArgs).toHaveBeenCalled()

    // Cwd and browse
    const cwdInput = screen.getByLabelText('Working directory')
    await user.clear(cwdInput)
    await user.type(cwdInput, '/new/path')
    expect(props.setCwd).toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: /browse/i }))
    expect(props.onPickCwd).toHaveBeenCalled()

    // Env text
    const env = screen.getByLabelText('Environment (KEY=VALUE per line)')
    await user.type(env, '\nFOO=BAR')
    expect(props.setEnvText).toHaveBeenCalled()
  })
})

