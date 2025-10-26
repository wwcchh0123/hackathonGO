import { PromptBuilder } from '../../src/prompts/prompt-builder'

describe('PromptBuilder extras', () => {
  it('buildFullMessage includes separators and user message', () => {
    const builder = new PromptBuilder({ vncEnabled: false, currentDate: '2024-01-01' })
    const full = builder.buildFullMessage('Hello World')
    expect(full).toContain('用户消息')
    expect(full).toContain('Hello World')
    expect(full).toContain('='.repeat(80))
  })

  it('getStats returns expected fields', () => {
    const builder = new PromptBuilder({ vncEnabled: true, currentDate: '2024-01-01', customInstructions: 'X', workingDirectory: '/w' })
    const stats = builder.getStats()
    expect(stats).toHaveProperty('lines')
    expect(stats).toHaveProperty('chars')
    expect(stats).toHaveProperty('estimatedTokens')
    expect(stats.layers.base).toBeGreaterThan(0)
  })

  it('preview logs to console', () => {
    const group = jest.spyOn(console, 'group').mockImplementation(() => {})
    const log = jest.spyOn(console, 'log').mockImplementation(() => {})
    const end = jest.spyOn(console, 'groupEnd').mockImplementation(() => {})
    const builder = new PromptBuilder({ vncEnabled: false, currentDate: '2024-01-01' })
    builder.preview()
    expect(group).toHaveBeenCalled()
    expect(log).toHaveBeenCalled()
    expect(end).toHaveBeenCalled()
    group.mockRestore(); log.mockRestore(); end.mockRestore()
  })

  it('createPromptBuilderFromEnv builds without platform gracefully', () => {
    const original = (global as any).navigator
    ;(global as any).navigator = undefined
    const mod = require('../../src/prompts/prompt-builder')
    const pb = mod.createPromptBuilderFromEnv(true, { vnc: 5900, web: 6080 }, 'CI')
    const prompt = pb.build()
    expect(prompt).toContain('虚拟桌面') // basic content ensured
    ;(global as any).navigator = original
  })
})
