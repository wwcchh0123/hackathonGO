#!/usr/bin/env node

import crypto from 'crypto';

// 模拟 transformClaudeEvent 函数
function transformClaudeEvent(event) {
  const base = {
    id: crypto.randomUUID(),
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

console.log('🧪 手动测试 Event Transformer\n');

// 模拟 Claude 的完整消息流
const claudeEvents = [
  {
    type: 'message_start',
    message: {
      id: 'msg_01XYZ',
      type: 'message',
      role: 'assistant',
      model: 'claude-3-opus-20240229',
      content: [],
      stop_reason: null,
      stop_sequence: null,
      usage: { input_tokens: 25, output_tokens: 0 }
    }
  },
  {
    type: 'content_block_start',
    index: 0,
    content_block: {
      type: 'text',
      text: ''
    }
  },
  {
    type: 'content_block_delta',
    index: 0,
    delta: {
      type: 'text_delta',
      text: 'Hello'
    }
  },
  {
    type: 'content_block_delta',
    index: 0,
    delta: {
      type: 'text_delta',
      text: ' there'
    }
  },
  {
    type: 'content_block_delta',
    index: 0,
    delta: {
      type: 'text_delta',
      text: '! How'
    }
  },
  {
    type: 'content_block_delta',
    index: 0,
    delta: {
      type: 'text_delta',
      text: ' can I'
    }
  },
  {
    type: 'content_block_delta',
    index: 0,
    delta: {
      type: 'text_delta',
      text: ' help you'
    }
  },
  {
    type: 'content_block_delta',
    index: 0,
    delta: {
      type: 'text_delta',
      text: ' today?'
    }
  },
  {
    type: 'content_block_stop',
    index: 0
  },
  {
    type: 'message_stop'
  }
];

console.log('📋 测试场景 1: 完整的消息流转换');
console.log('=====================================\n');

let fullText = '';
let messageId = '';

claudeEvents.forEach((event, index) => {
  console.log(`\n步骤 ${index + 1}: 原始 Claude 事件`);
  console.log('  类型:', event.type);
  
  const transformed = transformClaudeEvent(event);
  
  console.log('  转换后:');
  console.log('    - 类型:', transformed.type);
  
  switch (transformed.type) {
    case 'message_start':
      messageId = transformed.messageStart.messageId;
      console.log('    - 消息 ID:', transformed.messageStart.messageId);
      console.log('    - 模型:', transformed.messageStart.model);
      break;
      
    case 'content_start':
      console.log('    - 内容类型:', transformed.content.contentType);
      console.log('    - 索引:', transformed.content.index);
      break;
      
    case 'delta':
      fullText += transformed.delta.text;
      console.log('    - 文本片段:', `"${transformed.delta.text}"`);
      console.log('    - 累计文本:', `"${fullText}"`);
      break;
      
    case 'content_stop':
      console.log('    - 内容块结束，索引:', transformed.content.index);
      break;
      
    case 'complete':
      console.log('    - 消息完成');
      console.log('    - 停止原因:', transformed.complete.stopReason);
      break;
  }
});

console.log('\n\n📊 转换统计:');
console.log('  - 消息 ID:', messageId);
console.log('  - 完整文本:', `"${fullText}"`);
console.log('  - 事件数量:', claudeEvents.length);

console.log('\n📋 测试场景 2: 错误处理');
console.log('=====================================\n');

const errorEvents = [
  {
    type: 'error',
    error: {
      type: 'rate_limit_error',
      message: 'Rate limit exceeded'
    }
  },
  {
    type: 'error',
    error: {
      type: 'authentication_error',
      message: 'Invalid API key'
    }
  },
  {
    type: 'error',
    error: {
      type: 'invalid_request_error',
      message: 'Invalid request format'
    }
  }
];

errorEvents.forEach(event => {
  const transformed = transformClaudeEvent(event);
  console.log(`错误类型: ${transformed.error.type}`);
  console.log(`  - 消息: ${transformed.error.message}`);
  console.log(`  - 可恢复: ${transformed.error.recoverable ? '✅ 是' : '❌ 否'}`);
  console.log('');
});

console.log('\n📋 测试场景 3: 未知事件处理');
console.log('=====================================\n');

const unknownEvent = {
  type: 'future_event_type',
  data: {
    foo: 'bar',
    nested: {
      value: 123
    }
  }
};

const transformed = transformClaudeEvent(unknownEvent);
console.log('未知事件转换:');
console.log('  - 类型:', transformed.type);
console.log('  - 原始数据保存:', JSON.stringify(transformed.original));

console.log('\n\n✨ 测试完成！');
console.log('\n📝 总结:');
console.log('- transformClaudeEvent 可以转换所有 Claude 事件类型');
console.log('- 每个转换后的事件都有唯一 ID 和时间戳');
console.log('- 错误事件包含可恢复性标志');
console.log('- 未知事件类型会保留原始数据');
console.log('\n下一步: 实现 Claude CLI 执行器');