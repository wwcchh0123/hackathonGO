#!/usr/bin/env node

import { EventEmitter } from 'events';
import crypto from 'crypto';

// 模拟 Electron IPC Event
class MockIPCEvent {
  constructor() {
    this.sender = {
      send: (channel, data) => {
        console.log(`  📤 IPC: ${channel}`, JSON.stringify(data));
      }
    };
  }
}

// 模拟 ClaudeExecutor
class MockClaudeExecutor extends EventEmitter {
  execute(message, options) {
    console.log(`  🚀 执行: ${message}`);
    console.log(`  ⚙️  选项:`, options);
    
    // 模拟异步响应
    setTimeout(() => {
      this.emit('data', { type: 'message_start', id: 'msg_123' });
      this.emit('data', { type: 'delta', text: 'Hello' });
      this.emit('data', { type: 'delta', text: ' World' });
      this.emit('data', { type: 'complete' });
      this.emit('end');
    }, 100);
  }
  
  abort() {
    console.log('  🛑 执行已中止');
    this.emit('abort');
  }
  
  cleanup() {
    this.removeAllListeners();
  }
}

// 模拟 StreamHandler
class StreamHandler {
  constructor() {
    this.streams = new Map();
  }
  
  startStream(event, options) {
    const streamId = crypto.randomUUID();
    const executor = new MockClaudeExecutor();
    
    const stream = {
      id: streamId,
      executor,
      event,
      isPaused: false,
      buffer: []
    };
    
    this.streams.set(streamId, stream);
    
    // 设置事件处理
    executor.on('data', (chunk) => {
      if (stream.isPaused) {
        stream.buffer.push(chunk);
        console.log(`  ⏸️  缓冲数据 (已缓冲 ${stream.buffer.length} 个)`);
      } else {
        event.sender.send('stream-data', { streamId, chunk });
      }
    });
    
    executor.on('error', (error) => {
      event.sender.send('stream-error', { streamId, error });
    });
    
    executor.on('end', () => {
      event.sender.send('stream-end', { streamId });
      this.streams.delete(streamId);
    });
    
    // 执行命令
    const { message, ...executorOptions } = options;
    executor.execute(message, executorOptions);
    
    // 通知渲染进程
    event.sender.send('stream-started', { streamId });
    
    return streamId;
  }
  
  pauseStream(streamId) {
    const stream = this.streams.get(streamId);
    if (stream) {
      stream.isPaused = true;
      console.log(`  ⏸️  流已暂停`);
      return true;
    }
    return false;
  }
  
  resumeStream(streamId) {
    const stream = this.streams.get(streamId);
    if (stream) {
      stream.isPaused = false;
      console.log(`  ▶️  流已恢复`);
      
      // 发送缓冲的数据
      while (stream.buffer.length > 0) {
        const chunk = stream.buffer.shift();
        stream.event.sender.send('stream-data', { streamId, chunk });
      }
      return true;
    }
    return false;
  }
  
  abortStream(streamId) {
    const stream = this.streams.get(streamId);
    if (stream) {
      stream.executor.abort();
      stream.event.sender.send('stream-aborted', { streamId });
      this.streams.delete(streamId);
      return true;
    }
    return false;
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

console.log('🧪 手动测试 IPC Stream Handler\n');

console.log('📋 测试场景 1: 基本流处理');
console.log('=====================================\n');
{
  const handler = new StreamHandler();
  const event = new MockIPCEvent();
  
  const streamId = handler.startStream(event, {
    message: 'Hello Claude',
    model: 'claude-3-opus-20240229'
  });
  
  console.log(`  🆔 Stream ID: ${streamId}`);
  
  setTimeout(() => {
    console.log(`  📊 活跃流: ${handler.getActiveStreams().length} 个\n`);
  }, 200);
}

setTimeout(() => {
  console.log('📋 测试场景 2: 暂停和恢复');
  console.log('=====================================\n');
  
  const handler = new StreamHandler();
  const event = new MockIPCEvent();
  
  const streamId = handler.startStream(event, {
    message: 'Test pause/resume'
  });
  
  // 立即暂停
  setTimeout(() => {
    handler.pauseStream(streamId);
  }, 50);
  
  // 1秒后恢复
  setTimeout(() => {
    handler.resumeStream(streamId);
  }, 300);
}, 500);

setTimeout(() => {
  console.log('\n📋 测试场景 3: 多流并发');
  console.log('=====================================\n');
  
  const handler = new StreamHandler();
  const event = new MockIPCEvent();
  
  const stream1 = handler.startStream(event, { message: 'Stream 1' });
  const stream2 = handler.startStream(event, { message: 'Stream 2' });
  const stream3 = handler.startStream(event, { message: 'Stream 3' });
  
  console.log(`  📊 活跃流: ${handler.getActiveStreams().length} 个`);
  console.log(`  🆔 IDs: ${handler.getActiveStreams().join(', ')}`);
  
  // 中止第二个流
  setTimeout(() => {
    console.log(`\n  🛑 中止 Stream 2...`);
    handler.abortStream(stream2);
    console.log(`  📊 剩余活跃流: ${handler.getActiveStreams().length} 个`);
  }, 100);
}, 1200);

setTimeout(() => {
  console.log('\n📋 测试场景 4: 清理');
  console.log('=====================================\n');
  
  const handler = new StreamHandler();
  const event = new MockIPCEvent();
  
  // 创建多个流
  for (let i = 0; i < 3; i++) {
    handler.startStream(event, { message: `Stream ${i}` });
  }
  
  console.log(`  📊 创建了 ${handler.getActiveStreams().length} 个流`);
  
  // 清理所有
  handler.cleanup();
  console.log(`  🧹 清理后: ${handler.getActiveStreams().length} 个流`);
}, 2000);

setTimeout(() => {
  console.log('\n\n✨ 测试完成！');
  console.log('\n📝 总结:');
  console.log('- StreamHandler 管理多个并发流');
  console.log('- 支持暂停/恢复流，带缓冲机制');
  console.log('- 将 ClaudeExecutor 事件转发到 IPC');
  console.log('- 支持中止单个流或清理所有流');
  console.log('- 每个流有唯一 ID 用于跟踪');
  console.log('\n下一步: 实现前端 React Hook');
  process.exit(0);
}, 2500);