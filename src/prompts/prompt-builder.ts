/**
 * System Prompt 构建器
 *
 * 将基础 prompt、Computer Use prompt、Coding prompt 和动态信息组合成完整的 System Prompt
 */

import BASE_SYSTEM_PROMPT from './base-system-prompt'
import COMPUTER_USE_PROMPT from './computer-use-prompt'

/**
 * Prompt 构建器配置选项
 */
export interface PromptBuilderOptions {
  /** VNC 模式是否启用 */
  vncEnabled: boolean

  /** 当前日期 (中文格式) */
  currentDate: string

  /** 工作目录 */
  workingDirectory?: string

  /** 系统架构 (如 x86_64, arm64) */
  systemArchitecture?: string

  /** VNC 端口配置 */
  vncPorts?: {
    vnc: number
    web: number
  }

  /** 用户自定义指令 (从 Settings 读取) */
  customInstructions?: string

  /** 会话 ID */
  sessionId?: string
}

/**
 * System Prompt 构建器
 *
 * 使用三层架构:
 * - Layer 1: 基础系统 Prompt (环境声明、工具指导)
 * - Layer 2: 用户自定义 Prompt (通过 Settings 配置)
 * - Layer 3: 动态运行时 Prompt (日期、VNC 状态等)
 */
export class PromptBuilder {
  private options: PromptBuilderOptions

  constructor(options: PromptBuilderOptions) {
    this.options = options
  }

  /**
   * Layer 1: 基础系统 Prompt
   *
   * 包含:
   * - 基础系统提示词 (所有场景通用)
   * - Computer Use 提示词 (VNC 模式启用时)
   */
  private buildBasePrompt(): string {
    const parts: string[] = []

    // 1. 基础系统提示词 (必需)
    parts.push(BASE_SYSTEM_PROMPT)

    // 2. Computer Use 提示词 (VNC 模式时添加)
    if (this.options.vncEnabled) {
      // 替换占位符 {systemArchitecture}
      const computerPrompt = COMPUTER_USE_PROMPT.replace(
        '{systemArchitecture}',
        this.options.systemArchitecture || 'x86_64'
      )
      parts.push(computerPrompt)
    }

    return parts.join('\n\n')
  }

  /**
   * Layer 2: 用户自定义 Prompt
   *
   * 从 Settings Page 读取的自定义指令
   */
  private buildCustomPrompt(): string {
    if (!this.options.customInstructions || this.options.customInstructions.trim() === '') {
      return ''
    }

    return `
${'='.repeat(80)}

## 用户自定义指令

${this.options.customInstructions.trim()}

${'='.repeat(80)}
`
  }

  /**
   * Layer 3: 动态运行时 Prompt
   *
   * 包含运行时信息:
   * - 当前日期
   * - 工作目录
   */
  private buildDynamicPrompt(): string {
    const {
      currentDate,
      workingDirectory,
    } = this.options

    const parts: string[] = []

    // 当前日期
    parts.push(`* 当前日期是 ${currentDate}。`)

    // 工作目录（如果有）
    if (workingDirectory) {
      parts.push(`* 当前工作目录是 \`${workingDirectory}\`。`)
    }

    return parts.length > 0 ? `\n<RUNTIME>\n${parts.join('\n')}\n</RUNTIME>` : ''
  }

  /**
   * 构建完整的 System Prompt
   *
   * 按照三层架构顺序组合:
   * 1. 基础系统 Prompt
   * 2. 用户自定义 Prompt
   * 3. 动态运行时 Prompt
   *
   * @returns 完整的 System Prompt 字符串
   */
  public build(): string {
    const parts = [
      this.buildBasePrompt(),
      this.buildCustomPrompt(),
      this.buildDynamicPrompt(),
    ]

    return parts
      .filter(Boolean) // 过滤空字符串
      .join('\n\n')
  }

  /**
   * 构建完整消息 (System Prompt + 用户消息)
   *
   * 这是发送给 Claude Code CLI 的最终消息
   *
   * @param userMessage - 用户输入的消息
   * @returns 完整的消息字符串
   */
  public buildFullMessage(userMessage: string): string {
    const systemPrompt = this.build()

    return `${systemPrompt}

${'='.repeat(80)}

## 用户消息

${userMessage.trim()}

${'='.repeat(80)}
`
  }

  /**
   * 获取 System Prompt 的统计信息 (用于调试)
   */
  public getStats() {
    const fullPrompt = this.build()
    const lines = fullPrompt.split('\n').length
    const chars = fullPrompt.length
    // 粗略估算 token 数量 (1 token ≈ 4 字符)
    const estimatedTokens = Math.ceil(chars / 4)

    return {
      lines,
      chars,
      estimatedTokens,
      layers: {
        base: this.buildBasePrompt().length,
        custom: this.buildCustomPrompt().length,
        dynamic: this.buildDynamicPrompt().length,
      },
    }
  }

  /**
   * 预览 System Prompt (格式化输出到控制台)
   */
  public preview(): void {
    const stats = this.getStats()
    console.group('📋 System Prompt Preview')
    console.log('统计信息:', stats)
    console.log('\n完整内容:')
    console.log(this.build())
    console.groupEnd()
  }
}

/**
 * 工具函数: 快速创建 PromptBuilder 实例
 *
 * @example
 * ```typescript
 * const prompt = createPromptBuilder({
 *   vncEnabled: true,
 *   currentDate: new Date().toLocaleDateString('zh-CN')
 * })
 *
 * const fullMessage = prompt.buildFullMessage('请打开 Firefox')
 * ```
 */
export function createPromptBuilder(options: PromptBuilderOptions): PromptBuilder {
  return new PromptBuilder(options)
}

/**
 * 工具函数: 从当前环境自动构建 Prompt
 *
 * @param vncEnabled - VNC 是否启用
 * @param vncPorts - VNC 端口配置
 * @param customInstructions - 用户自定义指令
 * @returns PromptBuilder 实例
 */
export function createPromptBuilderFromEnv(
  vncEnabled: boolean,
  vncPorts?: { vnc: number; web: number },
  customInstructions?: string
): PromptBuilder {
  return new PromptBuilder({
    vncEnabled,
    vncPorts,
    customInstructions,
    currentDate: new Date().toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long',
    }),
    systemArchitecture: typeof navigator !== 'undefined' ? navigator.platform : undefined,
    workingDirectory: undefined, // 将由调用方传入
    sessionId: undefined, // 将由调用方传入
  })
}

export default PromptBuilder
