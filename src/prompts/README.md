# System Prompt 模块

这个目录包含 Claude Code 的 System Prompt 管理模块,用于将 Claude Code 从纯编程助手改造为支持计算机控制的通用 agent。

---

## 📁 文件结构

```
src/prompts/
├── README.md                    # 本文档
├── base-system-prompt.ts        # 基础系统提示词 (Layer 1)
├── computer-use-prompt.ts       # Computer Control 专用提示词 (Layer 1)
├── coding-prompt.ts             # Coding 专用提示词 (Layer 1)
└── prompt-builder.ts            # Prompt 构建器 (三层架构)
```

---

## 🏗️ 架构设计

### 三层 Prompt 架构

参考 Anthropic Computer Use Demo 的设计,我们采用三层架构:

```
┌─────────────────────────────────────────────────────────┐
│ Layer 3: 动态运行时层                                   │
│ - 当前日期时间                                           │
│ - 系统架构信息 (x86_64/arm64)                           │
│ - 当前工作目录                                           │
│ - VNC 容器状态                                           │
└─────────────────────────────────────────────────────────┘
                    ↓ 运行时注入 ↓
┌─────────────────────────────────────────────────────────┐
│ Layer 2: 用户自定义层                                   │
│ - 通过 Settings Page 配置                               │
│ - 持久化到 localStorage                                 │
│ - 支持多个预设场景切换                                  │
└─────────────────────────────────────────────────────────┘
                    ↓ 拼接 ↓
┌─────────────────────────────────────────────────────────┐
│ Layer 1: 基础系统层                                     │
│ - base-system-prompt.ts (通用指导)                     │
│ - computer-use-prompt.ts (VNC 模式时添加)              │
│ - coding-prompt.ts (始终添加)                          │
└─────────────────────────────────────────────────────────┘
```

---

## 📝 文件说明

### 1. `base-system-prompt.ts`

**用途**: 所有场景通用的基础提示词

**内容**:
- 🇨🇳 语言和沟通规范 (总是使用中文)
- 🛡️ 安全约束 (禁止操作、需要确认的操作)
- 📋 输出格式规范
- 📁 文件操作指导
- 🔧 Shell 命令执行
- 🔀 Git 操作规范
- ✅ TDD 测试规范
- 📦 项目结构感知

**适用场景**: 所有场景 (VNC + Coding)

---

### 2. `computer-use-prompt.ts`

**用途**: VNC 远程桌面控制专用提示词

**内容**:
- 🖥️ VNC 运行环境说明
- 🖱️ Computer Control 工具详解
  - 鼠标操作 (click, drag, move)
  - 键盘操作 (type, key, hold_key)
  - 屏幕操作 (screenshot, scroll)
  - 等待操作 (wait)
- 🚀 GUI 应用启动指导 (`DISPLAY=:1`)
- 🌐 Firefox 浏览器操作
- 📄 PDF 文件处理 (curl + pdftotext)
- 📊 大量输出处理 (重定向到文件)
- 🎯 UI 交互技巧 (缩放、滚动、等待)
- 🔧 性能优化 (链接工具调用)
- ❌ 常见错误和解决方案

**适用场景**: 仅当 VNC 模式启用时添加

**参考来源**: `/Users/jicarl/qiniu/claude-quickstarts/computer-use-demo`

---

### 3. `coding-prompt.ts`

**用途**: 编程任务专用提示词

**内容**:
- 💻 项目技术栈 (Electron + React + TypeScript)
- 📂 项目结构说明
- ✍️ 编码规范
  - TypeScript 类型注解
  - React 组件和 Hooks
  - 代码风格和命名
- ✅ TDD 测试驱动开发
  - 单元测试、组件测试、Hook 测试
  - 覆盖率要求 (80%)
- 🔀 Git 提交规范
- 🔌 IPC 进程间通信
- 📡 Stream JSON 处理
- ⚡ 性能优化技巧

**适用场景**: 始终启用 (这是项目核心功能)

---

### 4. `prompt-builder.ts`

**用途**: Prompt 构建器,组合三层 Prompt

**核心类**: `PromptBuilder`

**主要方法**:

```typescript
// 创建构建器实例
const builder = new PromptBuilder({
  vncEnabled: true,
  currentDate: '2025年10月26日 星期日',
  workingDirectory: '/path/to/project',
  customInstructions: '...',
  vncPorts: { vnc: 5900, web: 6080 },
  sessionId: 'session-123'
})

// 构建完整 System Prompt
const systemPrompt = builder.build()

// 构建完整消息 (System Prompt + 用户消息)
const fullMessage = builder.buildFullMessage('请打开 Firefox')

// 获取统计信息 (调试用)
const stats = builder.getStats()
console.log(stats.estimatedTokens) // 估算 token 数量

// 预览到控制台
builder.preview()
```

**工具函数**:

```typescript
// 快速创建实例
const builder = createPromptBuilder({ vncEnabled: true, ... })

// 从环境自动创建
const builder = createPromptBuilderFromEnv(vncEnabled, vncPorts, customInstructions)
```

---

## 🚀 使用方法

### 在 ChatPage 中集成

修改 `src/pages/chat/ChatPage.tsx`:

```typescript
import { PromptBuilder } from '../../prompts/prompt-builder'

const ChatPage: React.FC = () => {
  // ... 其他状态 ...

  const handleSendMessage = async (message: string) => {
    try {
      // 1. 读取用户自定义配置
      const customInstructions = localStorage.getItem('customSystemPrompt') || ''

      // 2. 检测 VNC 状态
      const vncStatus = await window.api.vnc.status()

      // 3. 构建 Prompt
      const promptBuilder = new PromptBuilder({
        vncEnabled: vncStatus.running,
        currentDate: new Date().toLocaleDateString('zh-CN', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          weekday: 'long',
        }),
        workingDirectory: cwd,
        systemArchitecture: navigator.platform,
        vncPorts: vncStatus.ports,
        customInstructions,
        sessionId,
      })

      // 4. 构建完整消息
      const fullMessage = promptBuilder.buildFullMessage(message)

      // 5. (可选) 预览到控制台
      if (process.env.NODE_ENV === 'development') {
        promptBuilder.preview()
      }

      // 6. 发送到 Claude Code CLI
      const result = await window.api.sendMessage({
        command,
        baseArgs,
        message: fullMessage, // ← 包含 System Prompt
        cwd,
        env,
        sessionId,
      })

      // 7. 处理响应...
    } catch (error) {
      console.error('发送消息失败:', error)
    }
  }

  // ... 其他代码 ...
}
```

---

## ⚙️ 配置用户自定义 Prompt

### 在 Settings Page 添加配置项

修改 `src/pages/settings/SettingsPage.tsx`:

```typescript
import React, { useState, useEffect } from 'react'
import { TextField, Button, Select, MenuItem } from '@mui/material'

const SettingsPage: React.FC = () => {
  const [customPrompt, setCustomPrompt] = useState('')

  // 加载保存的配置
  useEffect(() => {
    const saved = localStorage.getItem('customSystemPrompt')
    if (saved) {
      setCustomPrompt(saved)
    }
  }, [])

  // 保存配置
  const handleSave = () => {
    localStorage.setItem('customSystemPrompt', customPrompt)
    alert('配置已保存!')
  }

  // 重置为默认
  const handleReset = () => {
    setCustomPrompt('')
    localStorage.removeItem('customSystemPrompt')
  }

  return (
    <div>
      <h2>系统提示词配置</h2>

      <TextField
        label="自定义指令 (追加到基础提示词后)"
        multiline
        rows={15}
        value={customPrompt}
        onChange={(e) => setCustomPrompt(e.target.value)}
        placeholder={`示例:\n\n<自定义指导>\n* 总是使用中文回复\n* 优先使用开源工具\n* 遇到错误时提供详细的调试步骤\n</自定义指导>`}
        fullWidth
      />

      <Button variant="contained" onClick={handleSave}>
        保存
      </Button>
      <Button variant="outlined" onClick={handleReset}>
        重置为默认
      </Button>
    </div>
  )
}

export default SettingsPage
```

---

## 📊 Token 消耗估算

### 各层 Prompt 的大小

| 层级 | 文件 | 估算 Tokens | 说明 |
|------|------|------------|------|
| Layer 1 - Base | base-system-prompt.ts | ~800 | 基础系统提示词 |
| Layer 1 - Computer | computer-use-prompt.ts | ~1500 | VNC 模式时添加 |
| Layer 1 - Coding | coding-prompt.ts | ~1200 | 始终添加 |
| Layer 2 - Custom | 用户自定义 | ~0-500 | 可选 |
| Layer 3 - Dynamic | 运行时信息 | ~100 | 动态生成 |
| **总计 (VNC 模式)** | - | **~3600** | 最大情况 |
| **总计 (纯 Coding)** | - | **~2100** | 无 VNC |

### 优化建议

1. **按需加载**: 仅在 VNC 启用时添加 Computer Use Prompt
2. **精简自定义指令**: 建议用户自定义部分控制在 500 tokens 以内
3. **Claude 200K Context**: 3600 tokens 占比不到 2%,完全可接受

---

## 🧪 测试

### 单元测试示例

```typescript
// test/prompts/prompt-builder.test.ts
import { PromptBuilder } from '../../src/prompts/prompt-builder'

describe('PromptBuilder', () => {
  it('should include Computer Use prompt when VNC is enabled', () => {
    const builder = new PromptBuilder({
      vncEnabled: true,
      currentDate: '2025年10月26日',
    })

    const prompt = builder.build()
    expect(prompt).toContain('Computer Control')
    expect(prompt).toContain('DISPLAY=:1')
  })

  it('should not include Computer Use prompt when VNC is disabled', () => {
    const builder = new PromptBuilder({
      vncEnabled: false,
      currentDate: '2025年10月26日',
    })

    const prompt = builder.build()
    expect(prompt).not.toContain('Computer Control')
  })

  it('should include custom instructions', () => {
    const builder = new PromptBuilder({
      vncEnabled: false,
      currentDate: '2025年10月26日',
      customInstructions: '总是使用中文',
    })

    const prompt = builder.build()
    expect(prompt).toContain('总是使用中文')
  })

  it('should calculate stats correctly', () => {
    const builder = new PromptBuilder({
      vncEnabled: true,
      currentDate: '2025年10月26日',
    })

    const stats = builder.getStats()
    expect(stats.estimatedTokens).toBeGreaterThan(0)
    expect(stats.layers.base).toBeGreaterThan(0)
  })
})
```

---

## 🐛 调试技巧

### 1. 预览完整 Prompt

```typescript
const builder = new PromptBuilder({ ... })
builder.preview() // 输出到控制台
```

### 2. 检查 Token 消耗

```typescript
const stats = builder.getStats()
console.log(`估算 Tokens: ${stats.estimatedTokens}`)
console.log(`各层大小:`, stats.layers)
```

### 3. 验证 Prompt 是否生效

发送测试消息:

```
用户: "你的系统提示词是什么?"
Claude: [应该能回答出关键信息,如 "我是一个专业的智能助手..."]
```

### 4. 测试 VNC 模式识别

```
用户: "请打开 Firefox"
Claude: [应该使用 (DISPLAY=:1 firefox &) 命令]
```

---

## 📚 参考资源

### 官方文档
- [Claude API - System Prompts](https://docs.anthropic.com/claude/docs/system-prompts)
- [Computer Use - Quickstart](https://docs.anthropic.com/claude/docs/computer-use)

### 项目参考
- Computer Use Demo: `/Users/jicarl/qiniu/claude-quickstarts/computer-use-demo`
- 详细分析: `/Users/jicarl/qiniu/hackathonGO/docs/SYSTEM_PROMPT_ADAPTATION_GUIDE.md`

### 相关文档
- `docs/system_prompt_analysis.md` - Computer Use Demo 详细分析
- `docs/SYSTEM_PROMPT_KEY_FINDINGS.md` - 核心发现总结

---

## ✅ 下一步行动

### 立即执行
1. ✅ 阅读本文档
2. ✅ 查看各个 prompt 文件的内容
3. ✅ 理解三层架构设计

### 本周完成
4. ⏸️ 集成到 ChatPage.tsx
5. ⏸️ 添加 Settings Page 配置项
6. ⏸️ 测试 VNC 模式下的效果
7. ⏸️ 测试 Coding 模式下的效果

### 未来优化
8. ⏸️ 实现预设模板库
9. ⏸️ 添加 Prompt 版本管理
10. ⏸️ 收集用户反馈并迭代

---

**版本**: 1.0
**最后更新**: 2025-10-26
**作者**: Claude Code Assistant
