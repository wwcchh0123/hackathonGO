#!/usr/bin/env node

import { Transform } from 'stream';

// 模拟 JSONStreamParser 的 Transform Stream 实现
class JSONStreamParser extends Transform {
  constructor() {
    super({ objectMode: true });
    this.buffer = '';
  }
  
  parseLine(line) {
    if (!line.trim()) {
      return null;
    }
    
    try {
      return JSON.parse(line);
    } catch (error) {
      return {
        type: 'parse_error',
        error: error.message
      };
    }
  }
  
  _transform(chunk, encoding, callback) {
    this.buffer += chunk.toString();
    const lines = this.buffer.split('\n');
    this.buffer = lines.pop() || '';
    
    for (const line of lines) {
      const result = this.parseLine(line);
      if (result !== null) {
        this.push(result);
      }
    }
    
    callback();
  }
  
  _flush(callback) {
    if (this.buffer.trim()) {
      const result = this.parseLine(this.buffer);
      if (result !== null) {
        this.push(result);
      }
    }
    callback();
  }
}

console.log('🧪 手动测试 Stream 缓冲区处理\n');

// 测试场景 1: 处理分块数据
console.log('📋 测试 1: 处理分块数据');
console.log('----------------------------');
{
  const parser = new JSONStreamParser();
  const events = [];
  
  parser.on('data', (event) => {
    console.log('  收到事件:', JSON.stringify(event));
    events.push(event);
  });
  
  parser.on('end', () => {
    console.log(`  ✅ 共收到 ${events.length} 个事件\n`);
  });
  
  // 模拟分块
  console.log('  写入: {"type":"mess');
  parser.write('{"type":"mess');
  
  console.log('  写入: age_start"}\\n');
  parser.write('age_start"}\n');
  
  parser.end();
}

// 测试场景 2: 处理多个事件在一个块中
console.log('📋 测试 2: 一个块中的多个事件');
console.log('----------------------------');
{
  const parser = new JSONStreamParser();
  const events = [];
  
  parser.on('data', (event) => {
    console.log('  收到事件:', JSON.stringify(event));
    events.push(event);
  });
  
  parser.on('end', () => {
    console.log(`  ✅ 共收到 ${events.length} 个事件\n`);
  });
  
  console.log('  写入: {"type":"event1"}\\n{"type":"event2"}\\n');
  parser.write('{"type":"event1"}\n{"type":"event2"}\n');
  parser.end();
}

// 测试场景 3: 极端分块（一个字符一个字符）
console.log('📋 测试 3: 极端分块（逐字符）');
console.log('----------------------------');
{
  const parser = new JSONStreamParser();
  const events = [];
  
  parser.on('data', (event) => {
    console.log('  收到事件:', JSON.stringify(event));
    events.push(event);
  });
  
  parser.on('end', () => {
    console.log(`  ✅ 共收到 ${events.length} 个事件\n`);
  });
  
  const json = '{"type":"content_block_delta","delta":{"text":"Hi"}}\n';
  console.log(`  逐字符写入: ${json.replace('\n', '\\n')}`);
  
  for (const char of json) {
    parser.write(char);
  }
  parser.end();
}

// 测试场景 4: 混合有效和无效 JSON
console.log('📋 测试 4: 混合有效和无效 JSON');
console.log('----------------------------');
{
  const parser = new JSONStreamParser();
  const events = [];
  
  parser.on('data', (event) => {
    if (event.type === 'parse_error') {
      console.log('  ❌ 解析错误:', event.error);
    } else {
      console.log('  ✅ 有效事件:', JSON.stringify(event));
    }
    events.push(event);
  });
  
  parser.on('end', () => {
    const validCount = events.filter(e => e.type !== 'parse_error').length;
    const errorCount = events.filter(e => e.type === 'parse_error').length;
    console.log(`  📊 统计: ${validCount} 个有效事件, ${errorCount} 个错误\n`);
  });
  
  parser.write('{"type":"valid1"}\n');
  parser.write('{broken json}\n');
  parser.write('{"type":"valid2"}\n');
  parser.end();
}

// 测试场景 5: 模拟真实的 Claude Stream
console.log('📋 测试 5: 模拟 Claude Stream');
console.log('----------------------------');
{
  const parser = new JSONStreamParser();
  let messageStarted = false;
  let fullText = '';
  
  parser.on('data', (event) => {
    switch(event.type) {
      case 'message_start':
        console.log('  🚀 消息开始:', event.message);
        messageStarted = true;
        break;
      case 'content_block_delta':
        if (event.delta && event.delta.text) {
          fullText += event.delta.text;
          process.stdout.write(`  ✍️  ${event.delta.text}`);
        }
        break;
      case 'message_stop':
        console.log('\n  🏁 消息结束');
        break;
      default:
        console.log('  📦 其他事件:', event.type);
    }
  });
  
  parser.on('end', () => {
    console.log(`  📝 完整文本: "${fullText}"\n`);
  });
  
  // 模拟 Claude 的流式响应
  const chunks = [
    '{"type":"message_start","message":{"id":"msg_123","model":"claude-3"}}\n',
    '{"type":"content_block_start","index":0,"content_block":{"type":"text"}}\n',
    '{"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"Hello"}}\n',
    '{"type":"content_block_delta","index":0,',
    '"delta":{"type":"text_delta","text":" "}}\n',
    '{"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"World"}}\n',
    '{"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"!"}}\n',
    '{"type":"content_block_stop","index":0}\n',
    '{"type":"message_stop"}\n'
  ];
  
  console.log('  模拟流式输入...');
  chunks.forEach((chunk, i) => {
    setTimeout(() => {
      parser.write(chunk);
      if (i === chunks.length - 1) {
        parser.end();
      }
    }, i * 50); // 每50ms一个块
  });
}

setTimeout(() => {
  console.log('\n✨ 所有测试完成！');
  console.log('\n📝 总结:');
  console.log('- Transform Stream 可以处理分块数据');
  console.log('- 自动缓冲不完整的行');
  console.log('- 支持管道操作 (pipe)');
  console.log('- 优雅处理解析错误');
  console.log('\n下一步: 实现 Claude Event 转换器');
}, 1000);