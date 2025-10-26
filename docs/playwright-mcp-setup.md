# Playwright MCP 持久化浏览器配置指南

## 问题描述

Playwright 默认使用临时浏览器上下文,每次启动都是全新状态(类似无痕模式),导致无法使用已登录站点的信息。

## 解决方案

本项目提供了 `mcp-playwright-server.js`,实现了 **持久化浏览器上下文**,可以保存:
- Cookies
- LocalStorage
- SessionStorage
- 登录状态
- 浏览历史

## 安装依赖

首先需要安装 Playwright:

```bash
npm install playwright
# 或者
npx playwright install chromium
```

## 配置方法

### 方法 1: 在 Claude Desktop 中配置

编辑 Claude Desktop 的 MCP 配置文件:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

添加以下配置:

```json
{
  "mcpServers": {
    "playwright-browser": {
      "command": "node",
      "args": ["/path/to/hackathonGO/mcp-playwright-server.js"],
      "env": {
        "PLAYWRIGHT_USER_DATA_DIR": "/path/to/browser-profile",
        "PLAYWRIGHT_HEADLESS": "false"
      }
    }
  }
}
```

### 方法 2: 在本项目中集成

如果要在本 Electron 应用中集成,可以修改 `electron/main.js`:

```javascript
import { spawn } from 'child_process';
import path from 'path';

// 启动 Playwright MCP 服务器
const playwrightMcp = spawn('node', [
  path.join(__dirname, '../mcp-playwright-server.js')
], {
  env: {
    ...process.env,
    PLAYWRIGHT_USER_DATA_DIR: path.join(app.getPath('userData'), 'playwright-profile'),
    PLAYWRIGHT_HEADLESS: 'false'
  },
  stdio: ['pipe', 'pipe', 'pipe']
});
```

## 环境变量说明

| 环境变量 | 说明 | 默认值 |
|---------|------|-------|
| `PLAYWRIGHT_USER_DATA_DIR` | 用户数据存储目录 | `./.playwright-user-data` |
| `PLAYWRIGHT_HEADLESS` | 是否无头模式 | `true` |

## 可用工具

### 1. playwright_launch_browser

启动持久化浏览器(支持保存登录状态)

**参数**:
- `url` (可选): 要打开的URL
- `browserType` (可选): 浏览器类型 (`chromium`/`firefox`/`webkit`)
- `headless` (可选): 是否无头模式
- `slowMo` (可选): 慢速模式延迟(毫秒)

**示例**:
```javascript
{
  "url": "https://www.baidu.com",
  "browserType": "chromium",
  "headless": false
}
```

### 2. playwright_navigate

在持久化浏览器中导航到指定URL

**参数**:
- `url` (必需): 目标URL

**示例**:
```javascript
{
  "url": "https://github.com/login"
}
```

### 3. playwright_execute_script

在浏览器中执行JavaScript脚本

**参数**:
- `script` (必需): JavaScript代码

**示例**:
```javascript
{
  "script": "return document.title;"
}
```

### 4. playwright_clear_data

清除浏览器用户数据(cookies、localStorage等)

**参数**: 无

## 使用流程

### 场景 1: 登录网站并保存状态

1. **启动浏览器并打开登录页面**:
   ```
   使用 playwright_launch_browser 工具打开 https://example.com/login
   ```

2. **手动登录** (在打开的浏览器窗口中):
   - 输入用户名和密码
   - 完成登录

3. **下次自动使用已登录状态**:
   ```
   再次使用 playwright_launch_browser 或 playwright_navigate
   将自动使用保存的登录状态
   ```

### 场景 2: 自动化操作已登录网站

```
1. playwright_launch_browser { "url": "https://example.com/dashboard" }
   → 自动使用已保存的登录状态

2. playwright_execute_script { "script": "..." }
   → 执行需要登录权限的操作
```

### 场景 3: 清除所有数据重新开始

```
playwright_clear_data
→ 删除所有 cookies 和登录状态
```

## 对比传统方式

### 传统 Playwright (临时上下文)

```javascript
const browser = await chromium.launch();
const context = await browser.newContext();
const page = await context.newPage();
// ❌ 每次都是全新状态,需要重新登录
```

### 持久化上下文 (本方案)

```javascript
const context = await chromium.launchPersistentContext(userDataDir);
const page = context.pages()[0];
// ✅ 保留登录状态,自动恢复会话
```

## 安全注意事项

1. **用户数据目录保护**:
   - 不要将用户数据目录提交到版本控制
   - 确保目录权限设置正确
   - 定期备份重要数据

2. **敏感信息**:
   - 注意 cookies 中可能包含敏感信息
   - 使用 `playwright_clear_data` 清除不需要的数据

3. **多用户环境**:
   - 每个用户应使用独立的用户数据目录
   - 避免共享浏览器配置文件

## 故障排查

### 问题 1: 浏览器启动失败

**原因**: Playwright 未正确安装

**解决**:
```bash
npx playwright install chromium
```

### 问题 2: 用户数据未保存

**原因**: 用户数据目录路径错误或权限不足

**解决**:
1. 检查 `PLAYWRIGHT_USER_DATA_DIR` 环境变量
2. 确保目录可写
3. 查看日志文件 `mcp-playwright-server.log`

### 问题 3: 登录状态丢失

**原因**: 网站强制 session 过期

**解决**:
1. 检查网站的 session 有效期
2. 定期刷新登录状态
3. 使用 `playwright_execute_script` 执行保活操作

## 日志查看

服务器日志保存在项目根目录:

```bash
tail -f mcp-playwright-server.log
```

## 高级配置

### 自定义浏览器启动选项

修改 `mcp-playwright-server.js` 中的 `launchBrowser` 方法:

```javascript
const context = await chromium.launchPersistentContext(userDataDir, {
  headless: false,
  viewport: { width: 1920, height: 1080 },
  acceptDownloads: true,
  slowMo: 100,
  // 添加更多选项
  args: [
    '--disable-blink-features=AutomationControlled',
    '--disable-dev-shm-usage'
  ]
});
```

### 使用不同的浏览器

支持三种浏览器:
- `chromium` (默认,推荐)
- `firefox`
- `webkit` (Safari引擎)

```javascript
{
  "browserType": "firefox"
}
```

## 参考资料

- [Playwright 官方文档](https://playwright.dev/)
- [Persistent Context API](https://playwright.dev/docs/api/class-browsertype#browser-type-launch-persistent-context)
- [MCP 协议规范](https://modelcontextprotocol.io/)

## 常见问题 (FAQ)

**Q: 持久化上下文和普通浏览器有什么区别?**

A: 持久化上下文使用独立的用户数据目录,不会影响系统默认浏览器。它相当于一个完全独立的浏览器配置。

**Q: 可以同时使用多个持久化上下文吗?**

A: 可以,只需为每个上下文指定不同的用户数据目录。

**Q: 如何在持久化上下文中安装浏览器扩展?**

A: 可以在启动选项中添加扩展路径:
```javascript
args: ['--load-extension=/path/to/extension']
```

**Q: 持久化上下文会占用多少磁盘空间?**

A: 通常在 50-200MB 之间,取决于浏览历史和缓存数据。
