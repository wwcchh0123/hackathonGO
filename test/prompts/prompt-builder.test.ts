import { PromptBuilder, PromptBuilderOptions } from '../../src/prompts/prompt-builder'

describe('PromptBuilder', () => {
  const defaultOptions: PromptBuilderOptions = {
    vncEnabled: false,
    currentDate: '2024年1月1日',
  }

  describe('基础功能', () => {
    it('应该创建 PromptBuilder 实例', () => {
      const builder = new PromptBuilder(defaultOptions)
      expect(builder).toBeDefined()
    })

    it('应该构建基础 prompt', () => {
      const builder = new PromptBuilder(defaultOptions)
      const prompt = builder.build()
      
      expect(prompt).toBeTruthy()
      expect(typeof prompt).toBe('string')
    })

    it('应该包含日期信息', () => {
      const builder = new PromptBuilder({
        ...defaultOptions,
        currentDate: '2024年12月25日',
      })
      const prompt = builder.build()
      
      expect(prompt).toContain('2024年12月25日')
    })
  })

  describe('VNC 模式', () => {
    it('VNC 未启用时不应该包含 Computer Use prompt', () => {
      const builder = new PromptBuilder({
        ...defaultOptions,
        vncEnabled: false,
      })
      const prompt = builder.build()
      
      expect(prompt).not.toContain('Computer Use')
    })

    it('VNC 启用时应该包含额外的内容', () => {
      const builder = new PromptBuilder({
        ...defaultOptions,
        vncEnabled: true,
      })
      const enabledPrompt = builder.build()
      
      const builderDisabled = new PromptBuilder({
        ...defaultOptions,
        vncEnabled: false,
      })
      const disabledPrompt = builderDisabled.build()
      
      expect(enabledPrompt.length).toBeGreaterThan(disabledPrompt.length)
    })

    it('应该替换系统架构占位符', () => {
      const builder = new PromptBuilder({
        ...defaultOptions,
        vncEnabled: true,
        systemArchitecture: 'arm64',
      })
      const prompt = builder.build()
      
      expect(prompt).toContain('arm64')
    })

    it('未指定架构时应该使用默认值 x86_64', () => {
      const builder = new PromptBuilder({
        ...defaultOptions,
        vncEnabled: true,
      })
      const prompt = builder.build()
      
      expect(prompt).toContain('x86_64')
    })

    it('应该接受 VNC 端口配置', () => {
      const builder = new PromptBuilder({
        ...defaultOptions,
        vncEnabled: true,
        vncPorts: { vnc: 5900, web: 6080 },
      })
      const prompt = builder.build()
      
      expect(prompt).toBeTruthy()
    })
  })

  describe('自定义指令', () => {
    it('应该包含用户自定义指令', () => {
      const customInstructions = '请使用中文回复'
      const builder = new PromptBuilder({
        ...defaultOptions,
        customInstructions,
      })
      const prompt = builder.build()
      
      expect(prompt).toContain(customInstructions)
    })

    it('空白自定义指令不应该添加到 prompt', () => {
      const builder = new PromptBuilder({
        ...defaultOptions,
        customInstructions: '   ',
      })
      const prompt = builder.build()
      
      expect(prompt).not.toContain('用户自定义指令')
    })

    it('应该正确格式化自定义指令', () => {
      const builder = new PromptBuilder({
        ...defaultOptions,
        customInstructions: '测试指令',
      })
      const prompt = builder.build()
      
      expect(prompt).toContain('='.repeat(80))
      expect(prompt).toContain('用户自定义指令')
    })

    it('应该去除自定义指令的前后空白', () => {
      const builder = new PromptBuilder({
        ...defaultOptions,
        customInstructions: '  测试指令  ',
      })
      const prompt = builder.build()
      
      expect(prompt).toContain('测试指令')
      expect(prompt.trim()).toBeTruthy()
    })
  })

  describe('工作目录', () => {
    it('应该包含工作目录信息', () => {
      const builder = new PromptBuilder({
        ...defaultOptions,
        workingDirectory: '/home/user/project',
      })
      const prompt = builder.build()
      
      expect(prompt).toContain('/home/user/project')
    })

    it('未指定工作目录时不应该显示', () => {
      const builder = new PromptBuilder(defaultOptions)
      const prompt = builder.build()
      
      expect(prompt).not.toContain('工作目录: undefined')
    })
  })

  describe('会话信息', () => {
    it('应该接受会话 ID 配置', () => {
      const builder = new PromptBuilder({
        ...defaultOptions,
        sessionId: 'session-123',
      })
      const prompt = builder.build()
      
      expect(prompt).toBeTruthy()
    })

    it('未指定会话 ID 时应该正常工作', () => {
      const builder = new PromptBuilder(defaultOptions)
      const prompt = builder.build()
      
      expect(prompt).toBeTruthy()
    })
  })

  describe('Prompt 结构', () => {
    it('应该按正确顺序组织 prompt 层级', () => {
      const builder = new PromptBuilder({
        vncEnabled: true,
        currentDate: '2024年1月1日',
        customInstructions: '自定义指令',
        workingDirectory: '/workspace',
      })
      const prompt = builder.build()
      
      // 基础 prompt 应该在前面
      const baseIndex = prompt.indexOf('Claude')
      // 自定义指令应该在后面
      const customIndex = prompt.indexOf('自定义指令')
      
      expect(baseIndex).toBeLessThan(customIndex)
    })

    it('应该使用换行符分隔不同部分', () => {
      const builder = new PromptBuilder({
        ...defaultOptions,
        vncEnabled: true,
        customInstructions: '测试',
      })
      const prompt = builder.build()
      
      expect(prompt).toContain('\n\n')
    })
  })

  describe('边界情况', () => {
    it('应该处理空配置', () => {
      const builder = new PromptBuilder({
        vncEnabled: false,
        currentDate: '',
      })
      const prompt = builder.build()
      
      expect(prompt).toBeTruthy()
    })

    it('应该处理极长的自定义指令', () => {
      const longInstruction = 'A'.repeat(10000)
      const builder = new PromptBuilder({
        ...defaultOptions,
        customInstructions: longInstruction,
      })
      const prompt = builder.build()
      
      expect(prompt).toContain(longInstruction)
    })

    it('应该处理特殊字符', () => {
      const builder = new PromptBuilder({
        ...defaultOptions,
        customInstructions: '特殊字符: <>&"\'',
        workingDirectory: '/path/with spaces/测试',
      })
      const prompt = builder.build()
      
      expect(prompt).toContain('特殊字符')
      expect(prompt).toContain('/path/with spaces/测试')
    })

    it('应该处理多行自定义指令', () => {
      const multiline = '第一行\n第二行\n第三行'
      const builder = new PromptBuilder({
        ...defaultOptions,
        customInstructions: multiline,
      })
      const prompt = builder.build()
      
      expect(prompt).toContain('第一行')
      expect(prompt).toContain('第二行')
      expect(prompt).toContain('第三行')
    })
  })

  describe('组合配置', () => {
    it('应该正确处理所有配置项的组合', () => {
      const builder = new PromptBuilder({
        vncEnabled: true,
        currentDate: '2024年6月15日',
        workingDirectory: '/workspace',
        systemArchitecture: 'arm64',
        vncPorts: { vnc: 5900, web: 6080 },
        customInstructions: '请详细解释',
        sessionId: 'test-session',
      })
      const prompt = builder.build()
      
      expect(prompt).toContain('2024年6月15日')
      expect(prompt).toContain('/workspace')
      expect(prompt).toContain('arm64')
      expect(prompt).toContain('请详细解释')
    })
  })

  describe('不可变性', () => {
    it('多次调用 build 应该返回相同的结果', () => {
      const builder = new PromptBuilder({
        ...defaultOptions,
        customInstructions: '测试',
      })
      
      const prompt1 = builder.build()
      const prompt2 = builder.build()
      
      expect(prompt1).toBe(prompt2)
    })
  })
})
