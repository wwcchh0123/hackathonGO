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

### 前置依赖

#### 必需依赖 ✅

**1. Claude Code CLI**（必须安装，版本 ≥ 2.0）

本项目依赖 Claude Code CLI 作为 AI 智能引擎，必须先安装才能运行。

⚠️ **版本要求**：需要 Claude Code CLI **2.0 及以上版本**，因为项目使用了 `--system-prompt` 参数来动态构建 System Prompt。

```bash
# 安装 Claude Code CLI（确保安装最新版本）
npm install -g @anthropic-ai/claude-code

# 验证安装（版本应 >= 2.0.0）
claude --version

# 如果版本过低，请升级
npm update -g @anthropic-ai/claude-code
```

> 📖 详细安装说明：[Claude Code 官方文档](https://docs.anthropic.com/claude/docs/claude-code)

#### 可选依赖 🔧

**2. VNC Docker 镜像**（可选，虚拟桌面功能需要）

如果需要使用虚拟桌面（Computer Use）功能，需要安装 Docker 和 VNC 镜像：

```bash
# 确保 Docker 已安装并运行
docker --version

# 拉取 VNC 桌面镜像
docker pull aslan-spock-register.qiniu.io/devops/anthropic-quickstarts:computer-use-demo-latest
```

> 💡 **提示**：可以通过设置环境变量 `VNC_DOCKER_IMAGE` 来使用自定义镜像，详见 `.env.example` 文件。
>
> ⚠️ **注意**：如果不安装 VNC 镜像，应用仍可正常运行，但无法使用虚拟桌面相关功能（如浏览器操作、GUI 应用控制等）。

**3. 科大讯飞语音识别**（可选，语音输入功能需要）

如果需要使用语音输入功能，需要配置科大讯飞 API。详见下方配置说明。

> ⚠️ **注意**：如果不配置语音识别，应用仍可正常运行，但无法使用语音输入功能，只能使用文字输入。
>
> 💬 **体验 Demo**：如果需要快速体验语音功能，可以联系 [@CarlJi](https://github.com/CarlJi)（长军）获取测试 Key。

---

### 1. 安装项目依赖

```bash
npm install
```

### 2. 准备环境变量配置

复制环境变量配置文件：

```bash
cp .env.example .env
```

`.env` 文件包含以下可配置项：

- **VNC_DOCKER_IMAGE**：VNC 虚拟桌面 Docker 镜像地址（可选）
- **VITE_XUNFEI_APP_ID**：科大讯飞 APP ID（可选）
- **VITE_XUNFEI_API_SECRET**：科大讯飞 API Secret（可选）
- **VITE_XUNFEI_API_KEY**：科大讯飞 API Key（可选）

### 3. 启动开发环境

```bash
# 同时运行 Web 和 Electron 开发环境
npm run dev

```
