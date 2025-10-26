# XGopilot for Desktop

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org)
[![npm Version](https://img.shields.io/badge/npm-v0.1.0-orange.svg)](package.json)
[![Build Status](https://img.shields.io/badge/build-passing-success.svg)](https://github.com/CarlJi/hackathonGO/actions)
[![codecov](https://codecov.io/gh/wwcchh0123/hackathonGO/branch/main/graph/badge.svg)](https://codecov.io/gh/wwcchh0123/hackathonGO)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)
[![Electron](https://img.shields.io/badge/Electron-30-47848F.svg)](https://www.electronjs.org/)
[![React](https://img.shields.io/badge/React-18-61DAFB.svg)](https://reactjs.org/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

能说会做的 AI 桌面 Agent, 重新定义人机协作。

内置虚拟主机沙箱，让 AI 在安全隔离的环境中自由施展——测试脚本、部署服务、自动化实验，无需担心系统风险。想象力即边界，安全与创新并存。

## 项目详情

- 架构说明请参考：[架构设计文档](docs/ARCHITECTURE_DETAILED.md)

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

## 技术栈

- **前端框架**：React 18
- **UI 组件库**：Material-UI (MUI) v6
- **路由**：React Router DOM v7
- **桌面框架**：Electron 30
- **构建工具**：Vite 5
- **开发语言**：TypeScript 5
- **语音识别**：科大讯飞 WebAPI
