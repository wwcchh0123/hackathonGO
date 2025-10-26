# Agent for Desktop (Electron + React)

Desktop UI wrapper for Claude Code CLI with MCP support, built using Electron, React, MUI, TypeScript, and Vite.

## 功能特性

- ✅ 运行/停止可配置的 CLI（如 `claude-code`）
- ✅ 实时流式输出 stdout/stderr 到 UI
- ✅ 向运行中的进程发送 stdin 输入
- ✅ 通过原生对话框选择工作目录
- ✅ 提供环境变量配置（每行一个 KEY=VALUE）
- ✅ 在 localStorage 中持久化最后使用的配置
- ✅ **语音识别输入**（基于科大讯飞 WebAPI）

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置语音识别（可选）

如果需要使用语音输入功能，需要配置科大讯飞 API：

1. 复制环境变量配置文件：
```bash
cp .env.example .env
```

2. 到 [科大讯飞控制台](https://console.xfyun.cn/) 注册并获取凭证

3. 编辑 `.env` 文件，填入你的凭证：
```env
VITE_XUNFEI_APP_ID=你的APPID
VITE_XUNFEI_API_SECRET=你的APISecret
VITE_XUNFEI_API_KEY=你的APIKey
```

**详细配置指南**：查看 [科大讯飞语音识别配置指南](docs/xunfei-setup-guide.md)

### 3. 启动开发环境

```bash
# 同时运行 Web 和 Electron 开发环境
npm run dev

# 仅运行 Web 开发服务器
npm run dev:web

# 仅运行 Electron
npm run dev:electron
```

## 使用说明

1. 在 UI 中设置 CLI 命令（如 `claude-code` 或 `npx claude-code`）
2. 根据需要添加 `--mcp` 参数
3. 设置工作目录
4. 点击运行
5. 点击麦克风图标开始语音输入（需要先配置科大讯飞 API）

## 技术栈

- **前端框架**：React 18
- **UI 组件库**：Material-UI (MUI) v6
- **路由**：React Router DOM v7
- **桌面框架**：Electron 30
- **构建工具**：Vite 5
- **开发语言**：TypeScript 5
- **语音识别**：科大讯飞 WebAPI

## 文档

- [科大讯飞语音识别配置指南](docs/xunfei-setup-guide.md)
- [Playwright MCP 持久化浏览器配置指南](docs/playwright-mcp-setup.md)
- [项目编码规范](CLAUDE.md)

## 注意事项

- 本应用通过 Node 的 child_process 启动 CLI，需确保 CLI 已安装并在 PATH 中可访问
- 语音识别功能需要配置科大讯飞 API 凭证
- 生产环境打包（electron-builder/electron-forge）可后续添加
