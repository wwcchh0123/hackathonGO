# 九点半 (Nine-Half Clock)

一个基于 Electron + React + MUI 的桌面 Agent 应用，采用 Claude Code 官方风格界面。

## 功能特性

- **聊天页面**: 支持与 AI 模型进行对话交流
- **设置页面**: 
  - 大模型配置管理
  - 系统提示词编辑
  - MCP 服务配置
- **本地存储**: 聊天记录和用户配置存储在 `~/.nine_half_clock/` 文件夹下
- **Claude Code 风格**: 深色主题，现代化界面设计

## 安装依赖

```bash
npm install
```

## 开发模式

```bash
npm run dev
```

这将同时启动 Vite 开发服务器和 Electron 应用。

## 构建应用

```bash
# 构建 Web 资源
npm run build

# 构建 Electron 应用
npm run build:electron
```

## 项目结构

```
.
├── electron/           # Electron 主进程代码
│   ├── main.js        # 主进程入口
│   └── preload.js     # 预加载脚本
├── src/               # React 应用代码
│   ├── components/    # 组件
│   ├── contexts/      # Context 状态管理
│   ├── pages/         # 页面
│   ├── App.jsx        # 应用入口
│   └── main.jsx       # React 入口
├── index.html         # HTML 模板
├── package.json       # 项目配置
└── vite.config.js     # Vite 配置
```

## 技术栈

- **前端框架**: React 18
- **UI 组件库**: Material-UI (MUI) 5
- **桌面框架**: Electron 29
- **构建工具**: Vite 5
- **路由**: React Router 6

## 数据存储

应用数据存储在用户主目录下的 `.nine_half_clock/` 文件夹中：

- `chat_history.json`: 聊天记录
- `user_config.json`: 用户配置（大模型、系统提示词、MCP 服务）

## 开发说明

1. 修改代码后，Vite 会自动热重载
2. Electron 窗口会自动刷新以显示最新更改
3. 在开发模式下会自动打开 DevTools

## License

MIT
