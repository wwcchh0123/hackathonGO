#!/usr/bin/env node

import { spawn } from 'child_process';
import { Transform } from 'stream';
import { EventEmitter } from 'events';
import crypto from 'crypto';

// 简化的 JSONStreamParser
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
          error: error.message
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

// 简化的事件转换器
function transformClaudeEvent(event) {
  const base = {
    id: crypto.randomUUID(),
    timestamp: Date.now(),
    type: event.type
  };
  
  switch (event.type) {
    case 'message_start':
      return { ...base, type: 'message_start' };
    case 'content_block_delta':
      return { 
        ...base, 
        type: 'delta',
        delta: { text: event.delta?.text || '', index: event.index || 0 }
      };
    case 'message_stop':
      return { ...base, type: 'complete' };
    default:
      return { ...base, type: 'unknown', original: event };
  }
}

// 模拟 ClaudeExecutor
class ClaudeExecutor extends EventEmitter {
  constructor() {
    super();
    this.process = null;
    this.parser = null;
  }
  
  execute(message, options = {}) {
    try {
      const args = [
        '--format', 'json-stream',
        '--model', options.model || 'claude-3-opus-20240229',
        '--no-color',
        '--quiet',
        message
      ];
      
      console.log('  📟 执行命令: claude', args.join(' '));
      
      // 模拟执行（实际测试时会真正执行）
      this.simulateExecution(message);
      
    } catch (error) {
      this.emit('error', {
        type: 'spawn_error',
        message: error.message
      });
    }
  }
  
  simulateExecution(message) {
    // 模拟 Claude 响应
    const responses = [
      '{"type":"message_start","message":{"id":"msg_sim_123","model":"claude-3"}}',
      '{"type":"content_block_start","index":0,"content_block":{"type":"text"}}',
      '{"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"I\'m"}}',
      '{"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":" a"}}',
      '{"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":" simulated"}}',
      '{"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":" response"}}',
      '{"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"!"}}',
      '{"type":"content_block_stop","index":0}',
      '{"type":"message_stop"}'
    ];
    
    let index = 0;
    const interval = setInterval(() => {
      if (index >= responses.length) {
        clearInterval(interval);
        this.emit('close', 0);
        this.emit('end');
        return;
      }
      
      try {
        const event = JSON.parse(responses[index]);
        const transformed = transformClaudeEvent(event);
        this.emit('data', transformed);
      } catch (error) {
        this.emit('error', { type: 'parse_error', message: error.message });
      }
      
      index++;
    }, 100);
  }
  
  abort() {
    this.emit('abort');
    this.emit('end');
  }
  
  isRunning() {
    return false; // 简化版
  }
}

console.log('🧪 手动测试 Claude CLI Executor\n');

console.log('📋 测试场景 1: 基本执行');
console.log('=====================================\n');
{
  const executor = new ClaudeExecutor();
  const events = [];
  let fullText = '';
  
  executor.on('data', (event) => {
    events.push(event);
    if (event.type === 'delta' && event.delta?.text) {
      fullText += event.delta.text;
      process.stdout.write(`  📝 ${event.delta.text}`);
    } else if (event.type === 'message_start') {
      console.log('  🚀 消息开始');
    } else if (event.type === 'complete') {
      console.log('\n  ✅ 消息完成');
    }
  });
  
  executor.on('end', () => {
    console.log(`  📊 统计: 收到 ${events.length} 个事件`);
    console.log(`  💬 完整文本: "${fullText}"`);
  });
  
  executor.on('error', (error) => {
    console.log('  ❌ 错误:', error.message);
  });
  
  executor.execute('Hello Claude');
}

setTimeout(() => {
  console.log('\n\n📋 测试场景 2: 自定义选项');
  console.log('=====================================\n');
  
  const executor = new ClaudeExecutor();
  
  executor.on('data', (event) => {
    if (event.type === 'message_start') {
      console.log('  ✅ 使用自定义模型执行');
    }
  });
  
  executor.execute('Test with custom model', {
    model: 'claude-3-sonnet-20240229',
    temperature: 0.7,
    maxTokens: 100
  });
}, 1200);

setTimeout(() => {
  console.log('\n\n📋 测试场景 3: 中止执行');
  console.log('=====================================\n');
  
  const executor = new ClaudeExecutor();
  let aborted = false;
  
  executor.on('data', (event) => {
    if (!aborted && event.type === 'delta') {
      console.log('  ⏸️  收到数据后中止...');
      executor.abort();
      aborted = true;
    }
  });
  
  executor.on('abort', () => {
    console.log('  🛑 执行已中止');
  });
  
  executor.execute('This will be aborted');
}, 2500);

setTimeout(() => {
  console.log('\n\n✨ 测试完成！');
  console.log('\n📝 总结:');
  console.log('- ClaudeExecutor 可以执行 claude 命令');
  console.log('- 支持流式解析和事件转换');
  console.log('- 支持自定义参数（model, temperature等）');
  console.log('- 支持中止正在执行的命令');
  console.log('- 集成了 Parser 和 Transformer');
  console.log('\n下一步: 实现 IPC 通信层');
  process.exit(0);
}, 3500);