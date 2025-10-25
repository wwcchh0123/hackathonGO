# Claude Code 项目配置

## 项目概述

本项目是一个基于 Electron + React + MUI + TypeScript + Vite 构建的 Claude Code CLI 桌面包装应用。

## 重要指示

### 语言要求
- **所有的交互都用中文**
- 所有代码注释使用中文
- 所有文档使用中文编写
- 所有提交信息使用中文

## 技术栈

- **前端框架**: React 18
- **UI 组件库**: Material-UI (MUI) v6
- **路由**: React Router DOM v7
- **桌面框架**: Electron 30
- **构建工具**: Vite 5
- **开发语言**: TypeScript 5

## 项目结构

```
.
├── electron/           # Electron 主进程和预加载脚本
│   ├── main.js        # 主进程入口
│   └── preload.js     # 预加载脚本
├── src/               # React 应用源代码
│   ├── App.tsx        # 应用主组件
│   ├── components/    # 可复用组件
│   ├── hooks/         # 自定义 React Hooks
│   ├── pages/         # 页面组件
│   ├── types/         # TypeScript 类型定义
│   └── main.tsx       # React 入口文件
├── index.html         # HTML 模板
├── package.json       # 项目依赖配置
├── tsconfig.json      # TypeScript 配置
└── vite.config.ts     # Vite 构建配置
```

## 开发指南

### 安装依赖
```bash
npm install
```

### 开发模式
```bash
# 同时运行 Web 和 Electron 开发环境
npm run dev

# 仅运行 Web 开发服务器
npm run dev:web

# 仅运行 Electron
npm run dev:electron
```

### 构建
```bash
npm run build
```

### 生产环境运行
```bash
npm start
```

## 编码规范

### TypeScript
- 使用严格模式
- 为所有函数和变量提供明确的类型注解
- 避免使用 `any` 类型，优先使用更具体的类型

### React
- 优先使用函数组件和 Hooks
- 组件文件使用 `.tsx` 扩展名
- 遵循 React Hooks 的规则（不在循环、条件或嵌套函数中调用）

### 代码风格
- 使用 2 空格缩进
- 使用单引号（除非 JSX 属性）
- 文件结尾保留一个空行
- 导入语句按照以下顺序分组：
  1. React 相关
  2. 第三方库
  3. 本地组件/工具
  4. 类型定义

### 命名规范
- 组件名使用 PascalCase（如 `UserProfile.tsx`）
- 文件名使用 camelCase 或 kebab-case（如 `useLocalStorage.ts` 或 `user-profile.tsx`）
- 常量使用 UPPER_CASE（如 `API_BASE_URL`）
- 函数和变量使用 camelCase（如 `getUserData`）

## Git 提交规范

使用语义化提交信息格式：

```
<类型>(<范围>): <简短描述>

[可选的详细描述]
```

### 类型说明
- `feat`: 新功能
- `fix`: 错误修复
- `docs`: 文档更新
- `style`: 代码格式调整（不影响代码运行）
- `refactor`: 重构（既不是新增功能，也不是修复错误）
- `perf`: 性能优化
- `test`: 测试相关
- `chore`: 构建过程或辅助工具的变动

### 示例
```
feat(chat): 实现会话管理功能并重构页面结构
fix(electron): 修复 IPC 通信超时问题
docs(readme): 更新安装说明
```

## 注意事项

1. **IPC 通信**: Electron 主进程和渲染进程之间的通信需要通过 IPC 机制
2. **安全性**: 使用 preload 脚本暴露 API，避免直接在渲染进程中使用 Node.js API
3. **环境变量**: 开发环境使用 `ELECTRON_DEV=true` 标识
4. **路径处理**: 使用 `path` 模块处理文件路径，确保跨平台兼容性

## 功能特性

- 运行/停止可配置的 CLI 命令（如 `claude-code`）
- 实时流式输出 stdout/stderr 到 UI
- 向运行中的进程发送 stdin 输入
- 通过原生对话框选择工作目录
- 提供环境变量配置（每行一个 KEY=VALUE）
- 在 localStorage 中持久化最后使用的配置

## 测试

目前项目尚未配置测试框架。如需添加测试，建议使用：
- 单元测试: Jest + React Testing Library
- E2E 测试: Playwright 或 Cypress

## 构建和打包

当前项目使用 Vite 构建 Web 资源。如需打包为独立的桌面应用，可以后续添加：
- electron-builder
- electron-forge

## 相关资源

- [Electron 官方文档](https://www.electronjs.org/zh/docs/latest/)
- [React 官方文档](https://zh-hans.react.dev/)
- [MUI 文档](https://mui.com/zh/)
- [Vite 文档](https://cn.vitejs.dev/)
