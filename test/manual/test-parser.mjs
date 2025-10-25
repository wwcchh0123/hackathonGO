#!/usr/bin/env node

import { JSONStreamParser } from '../../src/parser/json-stream-parser.js';

console.log('🧪 手动测试 JSON Stream Parser\n');

const parser = new JSONStreamParser();

// 测试用例
const testCases = [
  {
    name: '✅ 有效的 message_start 事件',
    input: '{"type":"message_start","message":{"id":"msg_123","model":"claude-3"}}',
  },
  {
    name: '✅ 有效的 content_block_delta 事件',
    input: '{"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"Hello world"}}',
  },
  {
    name: '❌ 无效的 JSON',
    input: '{invalid json}',
  },
  {
    name: '⚪ 空行',
    input: '',
  },
  {
    name: '✅ 错误事件',
    input: '{"type":"error","error":{"type":"rate_limit","message":"Too many requests"}}',
  }
];

console.log('开始测试...\n');

testCases.forEach(({ name, input }, index) => {
  console.log(`测试 ${index + 1}: ${name}`);
  console.log(`输入: ${input || '(空字符串)'}`);
  
  const result = parser.parseLine(input);
  
  console.log(`输出:`, result);
  console.log('---\n');
});

console.log('✨ 测试完成！');
console.log('\n📝 总结:');
console.log('- parseLine() 方法可以解析单行 JSON');
console.log('- 空行返回 null');
console.log('- 无效 JSON 返回 parse_error 对象');
console.log('\n下一步: 实现 Stream 缓冲区处理，支持分块数据');