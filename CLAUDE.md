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

- 运行/停止可配置的 CLI 命令（如 `XGopilot`）
- 实时流式输出 stdout/stderr 到 UI
- 向运行中的进程发送 stdin 输入
- 通过原生对话框选择工作目录
- 提供环境变量配置（每行一个 KEY=VALUE）
- 在 localStorage 中持久化最后使用的配置

## 测试驱动开发 (TDD)

### TDD 原则

本项目采用测试驱动开发(Test-Driven Development)方法论，遵循以下核心原则：

1. **先写测试，后写代码**：在实现功能代码之前，先编写测试用例
2. **红-绿-重构循环**：
   - 🔴 **红色阶段**：编写一个失败的测试
   - 🟢 **绿色阶段**：编写最少的代码使测试通过
   - 🔵 **重构阶段**：优化代码，保持测试通过
3. **小步快跑**：每次只添加一个小的功能点，确保快速反馈
4. **测试先行，设计驱动**：通过编写测试来思考 API 设计和接口定义

### TDD 工作流程

```
1. 添加一个测试 → 2. 运行测试(应该失败) → 3. 编写代码 → 4. 运行测试(应该通过) → 5. 重构 → 回到步骤 1
```

### 测试框架

项目已配置以下测试框架：

- **单元测试**：Jest + ts-jest
- **React 组件测试**：React Testing Library
- **用户交互测试**：@testing-library/user-event
- **E2E 测试**：推荐使用 Playwright 或 Cypress(待配置)

### 测试配置

Jest 配置位于 `jest.config.mjs`，已设置以下要求：

- **代码覆盖率阈值**：80%(分支、函数、行、语句)
- **测试文件匹配**：`**/*.test.ts` 和 `**/*.test.tsx`
- **覆盖率报告目录**：`coverage/`

### 测试命令

```bash
npm test              # 运行所有测试
npm run test:watch    # 监听模式运行测试
npm run test:coverage # 生成测试覆盖率报告
```

### 测试分类

#### 1. 单元测试(Unit Tests)

针对独立的函数、类或模块进行测试。

**文件命名**：`*.test.ts` 或 `*.test.tsx`  
**存放位置**：`test/` 目录，按功能模块组织

**示例**：
```typescript
// test/parser/json-stream-parser.test.ts
import { JSONStreamParser } from '../../src/parser/json-stream-parser';

describe('JSONStreamParser', () => {
  let parser: JSONStreamParser;

  beforeEach(() => {
    parser = new JSONStreamParser();
  });

  it('should parse a complete JSON line', () => {
    const result = parser.parseLine('{"type":"message_start"}');
    expect(result).toEqual({ type: 'message_start' });
  });

  it('should handle empty lines', () => {
    const result = parser.parseLine('');
    expect(result).toBeNull();
  });
});
```

#### 2. 组件测试(Component Tests)

针对 React 组件的渲染、交互和状态管理进行测试。

**文件命名**：`ComponentName.test.tsx`  
**存放位置**：`test/components/` 或与组件文件同目录

**示例**：
```typescript
// test/components/Button.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from '../../src/components/Button';

describe('Button Component', () => {
  it('should render with correct text', () => {
    render(<Button>点击我</Button>);
    expect(screen.getByText('点击我')).toBeInTheDocument();
  });

  it('should call onClick handler when clicked', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>点击</Button>);
    
    fireEvent.click(screen.getByText('点击'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('should be disabled when disabled prop is true', () => {
    render(<Button disabled>禁用按钮</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });
});
```

#### 3. Hook 测试(Hook Tests)

针对自定义 React Hooks 进行测试。

**示例**：
```typescript
// test/hooks/useLocalStorage.test.ts
import { renderHook, act } from '@testing-library/react';
import { useLocalStorage } from '../../src/hooks/useLocalStorage';

describe('useLocalStorage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should initialize with default value', () => {
    const { result } = renderHook(() => 
      useLocalStorage('testKey', 'default')
    );
    expect(result.current[0]).toBe('default');
  });

  it('should update localStorage when value changes', () => {
    const { result } = renderHook(() => 
      useLocalStorage('testKey', 'initial')
    );
    
    act(() => {
      result.current[1]('updated');
    });
    
    expect(result.current[0]).toBe('updated');
    expect(localStorage.getItem('testKey')).toBe('"updated"');
  });
});
```

#### 4. 集成测试(Integration Tests)

测试多个模块或组件之间的协作。

**示例**：
```typescript
// test/integration/chat-flow.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChatPage } from '../../src/pages/ChatPage';

describe('Chat Flow Integration', () => {
  it('should send message and receive response', async () => {
    const user = userEvent.setup();
    render(<ChatPage />);
    
    const input = screen.getByPlaceholderText('输入消息...');
    await user.type(input, '你好');
    await user.click(screen.getByRole('button', { name: '发送' }));
    
    await waitFor(() => {
      expect(screen.getByText('你好')).toBeInTheDocument();
    });
  });
});
```

### 测试最佳实践

#### 1. 测试命名规范

使用清晰、描述性的测试名称，遵循以下格式：

```typescript
// 推荐：should + 预期行为 + when/if + 条件(可选)
it('should return null when input is empty', () => { ... });
it('should throw error if user is not authenticated', () => { ... });
it('should update state when button is clicked', () => { ... });

// 避免：模糊的测试名称
it('works', () => { ... });
it('test 1', () => { ... });
```

#### 2. 测试结构(AAA 模式)

```typescript
it('should calculate total price correctly', () => {
  // Arrange(准备)：设置测试数据和环境
  const items = [
    { name: '商品A', price: 100 },
    { name: '商品B', price: 200 }
  ];
  const calculator = new PriceCalculator();

  // Act(执行)：执行被测试的操作
  const total = calculator.calculateTotal(items);

  // Assert(断言)：验证结果
  expect(total).toBe(300);
});
```

#### 3. 测试隔离

- 每个测试应该独立运行，不依赖其他测试
- 使用 `beforeEach` 和 `afterEach` 进行测试环境的准备和清理
- 避免测试之间共享可变状态

```typescript
describe('UserService', () => {
  let userService: UserService;
  let mockDatabase: jest.Mock;

  beforeEach(() => {
    mockDatabase = jest.fn();
    userService = new UserService(mockDatabase);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // 各个测试...
});
```

#### 4. 使用 Mock 和 Stub

对外部依赖(API、数据库、文件系统等)进行 Mock：

```typescript
// Mock 模块
jest.mock('../../src/api/client', () => ({
  fetchUser: jest.fn()
}));

// Mock 函数
const mockFetch = jest.fn();
global.fetch = mockFetch;

// 设置 Mock 返回值
mockFetch.mockResolvedValue({
  json: async () => ({ id: 1, name: '张三' })
});
```

#### 5. 测试边界条件

确保测试覆盖以下场景：

- ✅ 正常情况(Happy Path)
- ✅ 边界值(空字符串、0、null、undefined)
- ✅ 异常情况(错误输入、网络失败)
- ✅ 边界条件(最大值、最小值)

```typescript
describe('validateAge', () => {
  it('should accept valid age', () => {
    expect(validateAge(25)).toBe(true);
  });

  it('should reject negative age', () => {
    expect(validateAge(-1)).toBe(false);
  });

  it('should reject age over 150', () => {
    expect(validateAge(151)).toBe(false);
  });

  it('should handle age 0', () => {
    expect(validateAge(0)).toBe(true);
  });

  it('should handle null', () => {
    expect(validateAge(null)).toBe(false);
  });
});
```

#### 6. 避免测试实现细节

测试应该关注行为而非实现：

```typescript
// ❌ 不好：测试实现细节
it('should call internal helper method', () => {
  const spy = jest.spyOn(component, '_internalMethod');
  component.doSomething();
  expect(spy).toHaveBeenCalled();
});

// ✅ 好：测试行为结果
it('should display success message after submission', () => {
  component.doSomething();
  expect(screen.getByText('提交成功')).toBeInTheDocument();
});
```

#### 7. 保持测试简洁

- 每个测试只验证一个行为
- 避免过长的测试用例
- 如果测试太复杂，考虑重构被测试的代码

### 测试覆盖率要求

- **最低覆盖率**：80%(分支、函数、行、语句)
- **新代码要求**：所有新增代码必须有对应的测试
- **关键路径**：核心业务逻辑的覆盖率应达到 90%+

### TDD 实践检查清单

在提交代码前，确保：

- [ ] 所有测试都通过(`npm test`)
- [ ] 代码覆盖率达到 80% 以上(`npm run test:coverage`)
- [ ] 测试用例覆盖了正常情况和边界情况
- [ ] 测试名称清晰、描述性强
- [ ] 没有被跳过的测试(`test.skip` 或 `it.skip`)
- [ ] Mock 和 Stub 使用合理
- [ ] 测试代码遵循项目编码规范

### 持续集成(CI)

测试将在以下情况自动运行：

- 提交到任何分支时
- 创建 Pull Request 时
- PR 更新时

CI 构建失败时，禁止合并代码。

### 参考资源

- [Jest 官方文档](https://jestjs.io/zh-Hans/)
- [React Testing Library 文档](https://testing-library.com/docs/react-testing-library/intro/)
- [测试驱动开发(TDD)最佳实践](https://martinfowler.com/bliki/TestDrivenDevelopment.html)

## 构建和打包

当前项目使用 Vite 构建 Web 资源。如需打包为独立的桌面应用，可以后续添加：
- electron-builder
- electron-forge

## 相关资源

- [Electron 官方文档](https://www.electronjs.org/zh/docs/latest/)
- [React 官方文档](https://zh-hans.react.dev/)
- [MUI 文档](https://mui.com/zh/)
- [Vite 文档](https://cn.vitejs.dev/)
