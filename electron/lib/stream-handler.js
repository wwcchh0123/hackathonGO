import { spawn } from 'child_process';
import { randomUUID } from 'crypto';
import { EventEmitter } from 'events';
import { Transform } from 'stream';

// JSON Stream Parser
class JSONStreamParser extends Transform {
  constructor() {
    super({ objectMode: true });
    this.buffer = '';
  }
  
  _transform(chunk, encoding, callback) {
    this.buffer += chunk.toString();
    const lines = this.buffer.split('\n');
    this.buffer = lines.pop() || '';
    
    for (const line of lines) {
      if (!line.trim()) continue;
      
      try {
        const event = JSON.parse(line);
        this.push(event);
      } catch (error) {
        this.push({
          type: 'parse_error',
          error: error.message,
          line
        });
      }
    }
    
    callback();
  }
  
  _flush(callback) {
    if (this.buffer.trim()) {
      try {
        const event = JSON.parse(this.buffer);
        this.push(event);
      } catch (error) {
        this.push({
          type: 'parse_error',
          error: error.message
        });
      }
    }
    callback();
  }
}

// Event Transformer
function transformClaudeEvent(event) {
  const base = {
    id: randomUUID(),
    timestamp: Date.now(),
    type: ''
  };

  switch (event.type) {
    case 'message_start':
      return {
        ...base,
        type: 'message_start',
        messageStart: {
          messageId: event.message?.id || '',
          model: event.message?.model || ''
        }
      };
      
    case 'content_block_start':
      return {
        ...base,
        type: 'content_start',
        content: {
          index: event.index || 0,
          contentType: event.content_block?.type || 'text'
        }
      };
      
    case 'content_block_delta':
      return {
        ...base,
        type: 'delta',
        delta: {
          text: event.delta?.text || '',
          index: event.index || 0
        }
      };
      
    case 'content_block_stop':
      return {
        ...base,
        type: 'content_stop',
        content: {
          index: event.index || 0
        }
      };
      
    case 'message_stop':
      return {
        ...base,
        type: 'complete',
        complete: {
          stopReason: 'end_turn'
        }
      };
      
    case 'error':
      return {
        ...base,
        type: 'error',
        error: {
          type: event.error?.type || 'unknown_error',
          message: event.error?.message || 'Unknown error occurred',
          recoverable: event.error?.type !== 'authentication_error'
        }
      };
      
    default:
      return {
        ...base,
        type: 'unknown',
        original: event
      };
  }
}

// Claude Executor
class ClaudeExecutor extends EventEmitter {
  constructor() {
    super();
    this.process = null;
    this.parser = null;
  }
  
  execute(message, options = {}) {
    try {
      console.log('📝 [Claude Execute] Starting execution...');
      console.log('📝 [Claude Execute] Message:', message);
      console.log('📝 [Claude Execute] Options:', JSON.stringify(options, null, 2));
      
      // 传递完整的 options 给 buildArguments
      const args = this.buildArguments(message, options);
      
      // 合并环境变量，优先使用传入的 env
      const env = {
        ...process.env,
        ...options.env,
        ...(options.apiKey && { ANTHROPIC_API_KEY: options.apiKey })
      };
      
      // 检查关键环境变量（仅用于日志）
      console.log('📝 [Claude Execute] Environment check:');
      
      // 打印所有 ANTHROPIC 开头的环境变量
      const anthropicVars = Object.keys(env)
        .filter(key => key.startsWith('ANTHROPIC'))
        .sort();
      
      if (anthropicVars.length > 0) {
        console.log('📋 [Claude Execute] ANTHROPIC environment variables:');
        anthropicVars.forEach(key => {
          const value = env[key];
          if (key === 'ANTHROPIC_API_KEY') {
            console.log(`  - ${key}: ${value ? `✓ Set (${value.substring(0, 10)}...)` : '✗ Not set'}`);
          } else {
            console.log(`  - ${key}: ${value || 'Not set'}`);
          }
        });
      } else {
        console.log('  ⚠️ No ANTHROPIC environment variables found');
      }
      
      console.log('  - All custom env vars:', Object.keys(options.env || {}).join(', ') || 'None');
      
      // 使用用户配置的命令
      const command = options.command || 'claude';
      
      console.log('🚀 [Claude Execute] Spawning process...');
      console.log('  - Command:', command);
      console.log('  - Arguments:', args.join(' '));
      console.log('  - Working directory:', options.cwd || process.cwd());
      
      // 打印完整的调用命令（模拟 shell 命令格式）
      const anthropicEnvs = Object.keys(env)
        .filter(key => key.startsWith('ANTHROPIC'))
        .map(key => {
          const value = env[key];
          if (key === 'ANTHROPIC_API_KEY') {
            return `${key}="${value ? value.substring(0, 10) + '...' : ''}"`;
          }
          return `${key}="${value}"`;
        })
        .join(' ');
      
      console.log('🔧 [Claude Execute] Full command (with ANTHROPIC env vars):');
      console.log(`  ${anthropicEnvs} ${command} ${args.join(' ')}`);
      console.log('');
      console.log('📋 [Claude Execute] Equivalent shell command:');
      console.log(`  ANTHROPIC_API_KEY="..." ANTHROPIC_BASE_URL="${env.ANTHROPIC_BASE_URL || ''}" ${command} ${args.join(' ')}`);
      
      this.process = spawn(command, args, {
        env,
        cwd: options.cwd || process.cwd(),
        stdio: ['pipe', 'pipe', 'pipe'],
        shell: false  // 明确不使用 shell
      });
      
      console.log('✅ [Claude Execute] Process spawned with PID:', this.process.pid);
      
      // 监听 spawn 事件确认进程启动
      this.process.on('spawn', () => {
        console.log('🟢 [Claude Execute] Process spawn confirmed');
      });
      
      // 监听 disconnect 事件
      this.process.on('disconnect', () => {
        console.log('🔌 [Claude Execute] Process disconnected');
      });
      
      // 设置超时检测 - 如果10秒内没有任何输出，发出警告
      let hasReceivedOutput = false;
      const timeoutCheck = setTimeout(() => {
        if (!hasReceivedOutput && this.process && !this.process.killed) {
          console.warn('⏰ [Claude Execute] No output received after 10 seconds');
          console.warn('⏰ [Claude Execute] Possible causes:');
          console.warn('  1. Claude CLI is waiting for authentication (check if you need to run "claude login")');
          console.warn('  2. ANTHROPIC_API_KEY is not set');
          console.warn('  3. Network issues or API unavailable');
          
          // 发送一个错误事件
          this.emit('error', {
            type: 'timeout_warning',
            message: 'No response from Claude CLI after 10 seconds. Please check if Claude CLI is properly authenticated.'
          });
        }
      }, 120000);
      
      // 清理超时检查
      this.process.once('close', () => {
        clearTimeout(timeoutCheck);
      });
      
      this.parser = new JSONStreamParser();
      
      this.parser.on('data', (event) => {
        console.log('📥 [Claude Output] Received event:', JSON.stringify(event).substring(0, 200));
        const transformed = transformClaudeEvent(event);
        console.log('🔄 [Claude Output] Transformed event type:', transformed.type);
        this.emit('data', transformed);
      });
      
      if (this.process.stdout) {
        console.log('📊 [Claude Execute] stdout stream available');
        
        this.process.stdout.on('data', (chunk) => {
          hasReceivedOutput = true;  // 标记已收到输出
          const output = chunk.toString();
          console.log('📤 [Claude STDOUT] Received', chunk.length, 'bytes');
          console.log('📤 [Claude STDOUT] Raw output:', output.substring(0, 500));
          
          // 如果输出太长，显示更多
          if (output.length > 500) {
            console.log('📤 [Claude STDOUT] ... (total length:', output.length, ')');
          }
        });
        
        this.process.stdout.on('end', () => {
          console.log('📤 [Claude STDOUT] Stream ended');
        });
        
        this.process.stdout.pipe(this.parser);
      } else {
        console.error('⚠️ [Claude Execute] No stdout stream!');
      }
      
      if (this.process.stderr) {
        console.log('📊 [Claude Execute] stderr stream available');
        
        this.process.stderr.on('data', (data) => {
          const errorMsg = data.toString();
          console.error('❌ [Claude STDERR] Received', data.length, 'bytes:', errorMsg);
          this.emit('error', {
            type: 'cli_error',
            message: errorMsg
          });
        });
        
        this.process.stderr.on('end', () => {
          console.log('❌ [Claude STDERR] Stream ended');
        });
      } else {
        console.error('⚠️ [Claude Execute] No stderr stream!');
      }
      
      this.process.on('close', (code) => {
        console.log(`🔚 [Claude Execute] Process closed with code: ${code}`);
        this.process = null;
        this.emit('close', code);
        this.emit('end');
        this.cleanup();
      });
      
      this.process.on('error', (error) => {
        console.error('💥 [Claude Execute] Process error:', error.message);
        this.emit('error', {
          type: 'process_error',
          message: error.message
        });
      });
      
    } catch (error) {
      this.emit('error', {
        type: 'spawn_error',
        message: error.message
      });
    }
  }
  
  buildArguments(message, options) {
    const args = [];
    
    // 流式模式必需的参数
    args.push('-p');  // print mode
    args.push('--dangerously-skip-permissions');  // 跳过权限检查
    args.push('--verbose');  // 流式 JSON 模式需要 verbose
    args.push('--output-format', 'stream-json');
    
    // 注意：model 和 base-url 通常通过环境变量设置
    // 但如果在 options 中明确指定，仍然可以通过命令行参数覆盖
    
    if (options.model) {
      args.push('--model', options.model);
    }
    
    if (options.baseUrl) {
      args.push('--base-url', options.baseUrl);
    }
    
    if (options.maxTokens) {
      args.push('--max-tokens', options.maxTokens.toString());
    }
    
    if (options.temperature !== undefined) {
      args.push('--temperature', options.temperature.toString());
    }
    
    // Message (prompt) must be last
    args.push(message);
    
    return args;
  }
  
  abort() {
    if (this.process) {
      this.process.kill('SIGTERM');
      this.emit('abort');
      this.cleanup();
    }
  }
  
  cleanup() {
    if (this.process && !this.process.killed) {
      this.process.kill('SIGTERM');
    }
    
    if (this.parser) {
      this.parser.removeAllListeners();
      this.parser.destroy();
      this.parser = null;
    }
    
    this.process = null;
    this.removeAllListeners();
  }
}

// Stream Handler
export class StreamHandler {
  constructor() {
    this.streams = new Map();
  }
  
  startStream(event, options) {
    const streamId = randomUUID();
    console.log('🎬 [StreamHandler] Starting new stream:', streamId);
    console.log('🎬 [StreamHandler] Options:', JSON.stringify(options, null, 2));
    
    const executor = new ClaudeExecutor();
    
    const stream = {
      id: streamId,
      executor,
      event,
      isPaused: false,
      buffer: []
    };
    
    this.streams.set(streamId, stream);
    
    executor.on('data', (chunk) => {
      console.log(`📨 [StreamHandler] Stream ${streamId} data chunk type:`, chunk.type);
      this.handleData(streamId, chunk);
    });
    
    executor.on('error', (error) => {
      console.error(`⚠️ [StreamHandler] Stream ${streamId} error:`, error);
      this.handleError(streamId, error);
    });
    
    executor.on('end', () => {
      console.log(`🏁 [StreamHandler] Stream ${streamId} ended`);
      this.handleEnd(streamId);
    });
    
    executor.on('close', (code) => {
      console.log(`🚪 [StreamHandler] Stream ${streamId} closed with code:`, code);
      this.handleClose(streamId, code);
    });
    
    // 传递所有选项给 executor
    executor.execute(options.message, options);
    
    event.sender.send('stream-started', { streamId });
    console.log(`✅ [StreamHandler] Stream ${streamId} started successfully`);
    
    return streamId;
  }
  
  handleData(streamId, chunk) {
    const stream = this.streams.get(streamId);
    if (!stream) return;
    
    if (stream.isPaused) {
      stream.buffer.push(chunk);
    } else {
      stream.event.sender.send('stream-data', { streamId, chunk });
    }
  }
  
  handleError(streamId, error) {
    const stream = this.streams.get(streamId);
    if (!stream) return;
    
    stream.event.sender.send('stream-error', { streamId, error });
  }
  
  handleEnd(streamId) {
    const stream = this.streams.get(streamId);
    if (!stream) return;
    
    stream.event.sender.send('stream-end', { streamId });
    this.streams.delete(streamId);
  }
  
  handleClose(streamId, code) {
    const stream = this.streams.get(streamId);
    if (!stream) return;
    
    stream.event.sender.send('stream-close', { streamId, code });
  }
  
  abortStream(streamId) {
    const stream = this.streams.get(streamId);
    if (!stream) return false;
    
    stream.executor.abort();
    stream.event.sender.send('stream-aborted', { streamId });
    this.streams.delete(streamId);
    
    return true;
  }
  
  pauseStream(streamId) {
    const stream = this.streams.get(streamId);
    if (!stream) return false;
    
    stream.isPaused = true;
    return true;
  }
  
  resumeStream(streamId) {
    const stream = this.streams.get(streamId);
    if (!stream) return false;
    
    stream.isPaused = false;
    
    while (stream.buffer.length > 0 && !stream.isPaused) {
      const chunk = stream.buffer.shift();
      stream.event.sender.send('stream-data', { streamId, chunk });
    }
    
    return true;
  }
  
  getActiveStreams() {
    return Array.from(this.streams.keys());
  }
  
  cleanup() {
    for (const [streamId, stream] of this.streams) {
      stream.executor.abort();
      stream.executor.cleanup();
    }
    
    this.streams.clear();
  }
}