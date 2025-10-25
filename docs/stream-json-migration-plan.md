# Stream JSON 改造设计方案

## 现状分析

当前项目使用 `claude -p` 命令行模式：

- **同步调用**：通过 spawn 执行命令，等待完整响应
- **批量返回**：所有输出一次性返回
- **用户体验**：用户需要等待整个命令执行完成

## 改造目标

将项目改为支持 Stream JSON 格式，实现：

1. **实时反馈**：用户能看到 AI 的思考过程和操作步骤
2. **流式输出**：支持逐步返回结果
3. **更好的错误处理**：可中断操作，逐步验证
4. **MCP 兼容**：为后续 MCP 集成做准备

## 技术方案

### 1. Claude CLI Stream JSON 集成

#### Claude CLI 参数配置

```typescript
// Claude CLI 流式输出参数
const args = [
  ...baseArgs,
  "--format", "json-stream",  // 启用 JSON 流式输出
  "--model", process.env.CLAUDE_MODEL || "claude-3-opus-20240229",
  "--no-color",               // 禁用颜色输出，确保纯 JSON
  "--quiet",                   // 减少非 JSON 输出
  message
];
```

#### Stream JSON 数据格式

Claude CLI 的 JSON Stream 输出格式示例：

```typescript
// 实际的 Claude Stream JSON 格式
type ClaudeStreamEvent = 
  | { type: "message_start"; message: { id: string; role: string; model: string } }
  | { type: "content_block_start"; index: number; content_block: { type: "text"; text: string } }
  | { type: "content_block_delta"; index: number; delta: { type: "text_delta"; text: string } }
  | { type: "content_block_stop"; index: number }
  | { type: "message_delta"; delta: { stop_reason: string | null; stop_sequence: string | null } }
  | { type: "message_stop" }
  | { type: "error"; error: { type: string; message: string } };
```

#### 解析实现

```typescript
import { Transform } from 'stream';

// JSON Stream 解析器
class JSONStreamParser extends Transform {
  private buffer = '';
  
  _transform(chunk: Buffer, encoding: string, callback: Function) {
    this.buffer += chunk.toString();
    const lines = this.buffer.split('\n');
    this.buffer = lines.pop() || ''; // 保留未完成的行
    
    for (const line of lines) {
      if (!line.trim()) continue;
      
      try {
        const event = JSON.parse(line);
        this.push(event);
      } catch (error) {
        console.error('JSON parse error:', error, 'Line:', line);
        // 发送错误事件而不是崩溃
        this.push({ 
          type: 'parse_error', 
          error: { message: error.message, line } 
        });
      }
    }
    callback();
  }
  
  _flush(callback: Function) {
    if (this.buffer.trim()) {
      try {
        const event = JSON.parse(this.buffer);
        this.push(event);
      } catch (error) {
        console.error('Final buffer parse error:', error);
      }
    }
    callback();
  }
}

// 使用解析器
const parser = new JSONStreamParser();

childProcess.stdout
  .pipe(parser)
  .on('data', (event: ClaudeStreamEvent) => {
    // 转换为统一的内部格式
    const streamMessage = transformClaudeEvent(event);
    mainWindow.webContents.send('stream-chunk', streamMessage);
  });

// 错误流处理
childProcess.stderr.on('data', (data) => {
  console.error('Claude CLI Error:', data.toString());
  mainWindow.webContents.send('stream-error', {
    type: 'cli_error',
    message: data.toString()
  });
});
```

### 2. IPC 通信改造

#### 现有模式（请求-响应）

```typescript
// main.js
ipcMain.handle("send-message", async (event, options) => {
  // 执行命令
  return result; // 一次性返回
});

// renderer
const result = await window.api.sendMessage(options);
```

#### 流式模式（事件驱动）

```typescript
// main.js
ipcMain.on("start-stream", async (event, options) => {
  const streamId = crypto.randomUUID();

  // 开始流式处理
  startStreamingResponse(streamId, options, (chunk) => {
    event.sender.send("stream-data", { streamId, chunk });
  });

  // 返回流 ID
  event.sender.send("stream-started", { streamId });
});

// preload.js
contextBridge.exposeInMainWorld("api", {
  startStream: (options) => ipcRenderer.send("start-stream", options),
  onStreamData: (callback) => ipcRenderer.on("stream-data", callback),
  onStreamEnd: (callback) => ipcRenderer.on("stream-end", callback),
  onStreamError: (callback) => ipcRenderer.on("stream-error", callback),
});

// renderer
window.api.startStream({ message: userMessage });
window.api.onStreamData((event, data) => {
  // 处理流式数据
  handleStreamChunk(data.chunk);
});
```

### 3. 数据格式定义

```typescript
// 内部统一的 Stream 消息类型
interface StreamMessage {
  id: string;
  timestamp: number;
  type: "message_start" | "content" | "delta" | "error" | "complete";
  
  // 消息开始
  messageStart?: {
    model: string;
    messageId: string;
  };
  
  // 内容块
  content?: {
    text: string;
    index: number;
  };
  
  // 增量更新
  delta?: {
    text: string;
    index: number;
  };
  
  // 错误信息
  error?: {
    type: string;
    message: string;
    recoverable: boolean;
  };
  
  // 完成信息
  complete?: {
    stopReason: string | null;
    usage?: {
      inputTokens: number;
      outputTokens: number;
    };
  };
}

// Claude Event 转换器
function transformClaudeEvent(event: ClaudeStreamEvent): StreamMessage {
  const timestamp = Date.now();
  const id = crypto.randomUUID();
  
  switch (event.type) {
    case 'message_start':
      return {
        id,
        timestamp,
        type: 'message_start',
        messageStart: {
          model: event.message.model,
          messageId: event.message.id
        }
      };
      
    case 'content_block_delta':
      return {
        id,
        timestamp,
        type: 'delta',
        delta: {
          text: event.delta.text,
          index: event.index
        }
      };
      
    case 'error':
      return {
        id,
        timestamp,
        type: 'error',
        error: {
          type: event.error.type,
          message: event.error.message,
          recoverable: event.error.type !== 'authentication_error'
        }
      };
      
    case 'message_stop':
      return {
        id,
        timestamp,
        type: 'complete',
        complete: {
          stopReason: 'end_turn'
        }
      };
      
    default:
      return {
        id,
        timestamp,
        type: 'content',
        content: {
          text: JSON.stringify(event),
          index: 0
        }
      };
  }
}
```

### 4. 前端改造

#### 状态管理

```typescript
// 使用 useReducer 管理流式状态
interface StreamState {
  messages: Message[];
  currentStream: {
    id: string;
    chunks: StreamMessage[];
    isStreaming: boolean;
    error?: Error;
  } | null;
}

const streamReducer = (state: StreamState, action: StreamAction) => {
  switch (action.type) {
    case "STREAM_START":
      return {
        ...state,
        currentStream: {
          id: action.streamId,
          chunks: [],
          isStreaming: true,
        },
      };
    case "STREAM_CHUNK":
      // 追加 chunk 到当前流
      return {
        ...state,
        currentStream: {
          ...state.currentStream,
          chunks: [...state.currentStream.chunks, action.chunk],
        },
      };
    case "STREAM_END":
      // 将流内容转换为消息
      const message = compileStreamToMessage(state.currentStream);
      return {
        ...state,
        messages: [...state.messages, message],
        currentStream: null,
      };
    // ...
  }
};
```

#### UI 组件改造

```typescript
// MessageBubble.tsx - 支持流式渲染
export const StreamingMessage: React.FC<{ chunks: StreamMessage[] }> = ({
  chunks,
}) => {
  const content = useMemo(() => {
    return chunks.map((chunk) => {
      switch (chunk.type) {
        case "token":
          return chunk.token;
        case "thinking":
          return <ThinkingIndicator text={chunk.thought} />;
        case "action":
          return <ActionStatus action={chunk.action} />;
        case "result":
          return <ResultDisplay result={chunk.result} />;
        default:
          return null;
      }
    });
  }, [chunks]);

  return (
    <Box className="streaming-message">
      {content}
      <CursorBlink />
    </Box>
  );
};
```

### 5. 流控制与背压处理

```typescript
class StreamController {
  private isPaused = false;
  private pendingChunks: StreamMessage[] = [];
  private maxBufferSize = 100;
  
  constructor(private childProcess: ChildProcess) {
    this.setupBackpressure();
  }
  
  private setupBackPressure() {
    // 监听前端的反压信号
    ipcMain.on('stream-pause', (event, streamId) => {
      this.pause();
    });
    
    ipcMain.on('stream-resume', (event, streamId) => {
      this.resume();
    });
  }
  
  pause() {
    this.isPaused = true;
    // 暂停读取子进程输出
    this.childProcess.stdout?.pause();
  }
  
  resume() {
    this.isPaused = false;
    // 恢复读取并发送缓存的数据
    this.flushPending();
    this.childProcess.stdout?.resume();
  }
  
  private flushPending() {
    while (this.pendingChunks.length > 0 && !this.isPaused) {
      const chunk = this.pendingChunks.shift();
      this.sendToRenderer(chunk);
    }
  }
  
  sendToRenderer(chunk: StreamMessage) {
    if (this.isPaused) {
      if (this.pendingChunks.length < this.maxBufferSize) {
        this.pendingChunks.push(chunk);
      } else {
        console.warn('Buffer overflow, dropping chunk');
      }
    } else {
      mainWindow.webContents.send('stream-chunk', chunk);
    }
  }
  
  // 中断流
  abort() {
    this.childProcess.kill('SIGTERM');
    this.pendingChunks = [];
    mainWindow.webContents.send('stream-aborted');
  }
}
```

### 6. 环境变量配置

```typescript
// config/stream.config.ts
export interface StreamConfig {
  // Claude CLI 配置
  claudePath: string;
  claudeModel: string;
  claudeApiKey?: string;
  claudeBaseUrl?: string;
  
  // 流式配置
  enableStream: boolean;
  streamFormat: 'json-stream' | 'text';
  bufferSize: number;
  timeoutMs: number;
  
  // 重试配置
  maxRetries: number;
  retryDelayMs: number;
}

export function loadStreamConfig(): StreamConfig {
  return {
    // Claude CLI 配置
    claudePath: process.env.CLAUDE_CLI_PATH || 'claude',
    claudeModel: process.env.CLAUDE_MODEL || 'claude-3-opus-20240229',
    claudeApiKey: process.env.ANTHROPIC_API_KEY,
    claudeBaseUrl: process.env.ANTHROPIC_BASE_URL,
    
    // 流式配置
    enableStream: process.env.ENABLE_STREAM !== 'false',
    streamFormat: (process.env.STREAM_FORMAT as any) || 'json-stream',
    bufferSize: parseInt(process.env.STREAM_BUFFER_SIZE || '100'),
    timeoutMs: parseInt(process.env.STREAM_TIMEOUT_MS || '30000'),
    
    // 重试配置
    maxRetries: parseInt(process.env.MAX_RETRIES || '3'),
    retryDelayMs: parseInt(process.env.RETRY_DELAY_MS || '1000')
  };
}

// 使用配置
const config = loadStreamConfig();

const args = [
  config.claudePath,
  '--format', config.streamFormat,
  '--model', config.claudeModel,
];

if (config.claudeApiKey) {
  process.env.ANTHROPIC_API_KEY = config.claudeApiKey;
}

if (config.claudeBaseUrl) {
  args.push('--base-url', config.claudeBaseUrl);
}
```

### 7. 实现步骤

#### 第一阶段：基础流式支持

1. [ ] 改造 IPC 通信机制，支持事件驱动
2. [ ] 实现前端流式数据接收和展示
3. [ ] 添加流式消息的基础 UI 组件

#### 第二阶段：Claude CLI 流式完善

1. [ ] 优化 JSON Stream 解析性能
2. [ ] 完善错误重试机制
3. [ ] 添加流式日志和调试工具

#### 第三阶段：优化体验

1. [ ] 添加流中断功能
2. [ ] 实现重试机制
3. [ ] 优化流式渲染性能

#### 第四阶段：MCP 准备

1. [ ] 设计 MCP Server 接口
2. [ ] 实现工具调用的流式展示
3. [ ] 添加操作确认机制

## 迁移策略

### 直接切换到流式模式

由于流式输出能显著提升用户体验，建议直接切换：

1. 所有新会话默认使用 JSON Stream 模式
2. 统一使用流式处理架构
3. 简化代码维护，避免多模式兼容的复杂性

## 性能优化

### 缓冲区管理

```typescript
class StreamBuffer {
  private buffer: StreamMessage[] = [];
  private flushTimer: NodeJS.Timeout | null = null;

  add(chunk: StreamMessage) {
    this.buffer.push(chunk);
    this.scheduleFlush();
  }

  private scheduleFlush() {
    if (this.flushTimer) return;

    this.flushTimer = setTimeout(() => {
      this.flush();
      this.flushTimer = null;
    }, 16); // 60fps
  }

  private flush() {
    // 批量更新 UI
    batchUpdate(this.buffer);
    this.buffer = [];
  }
}
```

### 虚拟滚动

对于长对话，实现虚拟滚动以优化性能。

## 错误处理

### 连接中断

```typescript
// 自动重连机制
class StreamConnection {
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 3;

  async reconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      throw new Error("Max reconnection attempts reached");
    }

    this.reconnectAttempts++;
    await this.connect();
  }
}
```

### 超时控制

```typescript
// 流式超时
const streamTimeout = setTimeout(() => {
  if (isStreaming) {
    handleStreamTimeout();
  }
}, 30000); // 30秒超时
```

## 测试计划

### 单元测试

- [ ] Stream JSON 解析器测试
- [ ] 流式状态管理测试
- [ ] IPC 通信测试

### 集成测试

- [ ] 端到端流式通信测试
- [ ] 错误恢复测试
- [ ] 性能压力测试

### 用户测试

- [ ] 流式输出体验
- [ ] 中断操作测试
- [ ] 网络不稳定测试

## 风险评估

### 技术风险

1. **API 成本增加**：流式调用可能产生更多 token 消耗
2. **复杂度提升**：流式处理比批量处理复杂
3. **兼容性问题**：需要处理不同版本的 API 响应

### 缓解措施

1. 添加 token 使用量监控
2. 充分的错误处理和日志
3. 版本检测和适配层

## 时间估算

- 第一阶段：2-3 天
- 第二阶段：2-3 天
- 第三阶段：1-2 天
- 第四阶段：2-3 天

**总计：7-11 天**

## 参考资源

- [Claude CLI Documentation](https://docs.anthropic.com/claude/docs/claude-cli)
- [Electron IPC Best Practices](https://www.electronjs.org/docs/latest/tutorial/ipc)
- [React Streaming Patterns](https://react.dev/reference/react/use#streaming-data-from-server-to-client)
- [MCP Protocol Spec](https://modelcontextprotocol.io/specification)
- [Node.js Stream API](https://nodejs.org/api/stream.html)
