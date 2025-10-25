/**
 * Claude Code 流式输出转换器测试
 */

import {
  ClaudeCodeStreamProcessor,
  parseClaudeCodeStreamLine
} from '../../src/transformer/claude-code-transformer';

describe('ClaudeCodeStreamProcessor', () => {
  let processor: ClaudeCodeStreamProcessor;

  beforeEach(() => {
    processor = new ClaudeCodeStreamProcessor();
  });

  describe('processLine', () => {
    it('应该解析有效的 JSON 行', () => {
      const line = JSON.stringify({
        type: 'assistant',
        message: {
          id: 'msg_123',
          type: 'message',
          role: 'assistant',
          model: 'claude-sonnet-4',
          content: [
            {
              type: 'text',
              text: '你好！'
            }
          ],
          stop_reason: null
        }
      });

      const result = processor.processLine(line);

      expect(result).toBeDefined();
      expect(result?.content).toBe('你好！');
    });

    it('应该跳过空行', () => {
      const result = processor.processLine('');
      expect(result).toBeNull();
    });

    it('应该跳过只有空格的行', () => {
      const result = processor.processLine('   \n  ');
      expect(result).toBeNull();
    });

    it('应该处理无效的 JSON（返回 null 并记录警告）', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      const result = processor.processLine('not a json');

      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe('处理 assistant 消息', () => {
    it('应该提取文本内容', () => {
      const line = JSON.stringify({
        type: 'assistant',
        message: {
          id: 'msg_abc',
          content: [
            { type: 'text', text: '这是第一段' },
            { type: 'text', text: '这是第二段' }
          ]
        }
      });

      const result = processor.processLine(line);

      expect(result?.content).toBe('这是第一段\n\n这是第二段');
    });

    it('应该提取工具调用信息', () => {
      const line = JSON.stringify({
        type: 'assistant',
        message: {
          id: 'msg_def',
          content: [
            {
              type: 'tool_use',
              id: 'tool_001',
              name: 'mcp__playwright__browser_navigate',
              input: { url: 'https://www.google.com' }
            }
          ]
        }
      });

      const result = processor.processLine(line);

      expect(result?.toolCalls).toBeDefined();
      expect(result?.toolCalls?.length).toBe(1);
      expect(result?.toolCalls?.[0]).toMatchObject({
        id: 'tool_001',
        name: 'mcp__playwright__browser_navigate',
        input: { url: 'https://www.google.com' },
        status: 'running'
      });
    });

    it('应该同时提取文本和工具调用', () => {
      const line = JSON.stringify({
        type: 'assistant',
        message: {
          id: 'msg_mixed',
          content: [
            { type: 'text', text: '正在为您打开浏览器' },  // 修改为不触发思考关键词的文本
            {
              type: 'tool_use',
              id: 'tool_002',
              name: 'browser_navigate',
              input: { url: 'https://example.com' }
            }
          ]
        }
      });

      const result = processor.processLine(line);

      expect(result?.content).toContain('正在为您打开浏览器');
      expect(result?.toolCalls?.length).toBe(1);
      expect(result?.toolCalls?.[0].name).toBe('browser_navigate');
    });

    it('应该识别思考过程（基于关键词）', () => {
      const line = JSON.stringify({
        type: 'assistant',
        message: {
          id: 'msg_thinking',
          content: [
            { type: 'text', text: '让我思考一下如何解决这个问题' },
            { type: 'text', text: '这是正常的回复内容' }
          ]
        }
      });

      const result = processor.processLine(line);

      // 思考过程应该被提取到 thinking 字段
      expect(result?.thinking).toBeDefined();
      expect(result?.thinking).toContain('让我思考一下如何解决这个问题');
    });

    it('应该为没有 id 的工具调用生成默认 id', () => {
      const line = JSON.stringify({
        type: 'assistant',
        message: {
          id: 'msg_no_tool_id',
          content: [
            {
              type: 'tool_use',
              name: 'some_tool',
              input: {}
              // 没有 id 字段
            }
          ]
        }
      });

      const result = processor.processLine(line);

      expect(result?.toolCalls?.[0].id).toBeDefined();
      expect(result?.toolCalls?.[0].id).toMatch(/^tool_\d+$/);
    });
  });

  describe('处理 complete 事件', () => {
    it('应该将运行中的工具标记为完成', () => {
      // 先添加一个运行中的工具
      processor.processLine(JSON.stringify({
        type: 'assistant',
        message: {
          content: [
            {
              type: 'tool_use',
              id: 'tool_running',
              name: 'test_tool',
              input: {}
            }
          ]
        }
      }));

      // 发送 complete 事件
      const result = processor.processLine(JSON.stringify({
        type: 'complete'
      }));

      expect(result?.toolCalls).toBeDefined();
      expect(result?.toolCalls?.[0].status).toBe('completed');
    });
  });

  describe('处理 error 事件', () => {
    it('应该返回错误消息', () => {
      const line = JSON.stringify({
        type: 'error',
        message: 'Something went wrong'
      });

      const result = processor.processLine(line);

      expect(result?.content).toContain('错误');
      expect(result?.type).toBe('system');
    });
  });

  describe('多行流式处理', () => {
    it('应该累积多个工具调用', () => {
      // 第一个工具调用
      processor.processLine(JSON.stringify({
        type: 'assistant',
        message: {
          content: [
            { type: 'tool_use', id: 'tool_1', name: 'tool_one', input: {} }
          ]
        }
      }));

      // 第二个工具调用
      const result = processor.processLine(JSON.stringify({
        type: 'assistant',
        message: {
          content: [
            { type: 'tool_use', id: 'tool_2', name: 'tool_two', input: {} }
          ]
        }
      }));

      expect(result?.toolCalls?.length).toBe(2);
      expect(result?.toolCalls?.[0].id).toBe('tool_1');
      expect(result?.toolCalls?.[1].id).toBe('tool_2');
    });
  });

  describe('reset', () => {
    it('应该清空所有状态', () => {
      // 添加一些数据
      processor.processLine(JSON.stringify({
        type: 'assistant',
        message: {
          content: [
            { type: 'text', text: 'test' },
            { type: 'tool_use', id: 'tool_x', name: 'test_tool', input: {} }
          ]
        }
      }));

      // 重置
      processor.reset();

      // 获取工具调用应该为空
      expect(processor.getToolCalls()).toEqual([]);
    });
  });

  describe('getToolCalls', () => {
    it('应该返回当前的工具调用列表副本', () => {
      processor.processLine(JSON.stringify({
        type: 'assistant',
        message: {
          content: [
            { type: 'tool_use', id: 'tool_a', name: 'tool_a', input: {} }
          ]
        }
      }));

      const toolCalls1 = processor.getToolCalls();
      const toolCalls2 = processor.getToolCalls();

      // 应该是不同的数组实例（副本）
      expect(toolCalls1).not.toBe(toolCalls2);
      // 但内容相同
      expect(toolCalls1).toEqual(toolCalls2);
    });
  });
});

describe('parseClaudeCodeStreamLine', () => {
  it('应该创建新的处理器并解析单行', () => {
    const line = JSON.stringify({
      type: 'assistant',
      message: {
        content: [{ type: 'text', text: 'Hello' }]
      }
    });

    const result = parseClaudeCodeStreamLine(line);

    expect(result?.content).toBe('Hello');
  });

  it('应该支持传入已有的处理器', () => {
    const processor = new ClaudeCodeStreamProcessor();

    // 第一次调用
    parseClaudeCodeStreamLine(JSON.stringify({
      type: 'assistant',
      message: {
        content: [{ type: 'tool_use', id: 't1', name: 'tool1', input: {} }]
      }
    }), processor);

    // 第二次调用，使用同一个处理器
    const result = parseClaudeCodeStreamLine(JSON.stringify({
      type: 'assistant',
      message: {
        content: [{ type: 'tool_use', id: 't2', name: 'tool2', input: {} }]
      }
    }), processor);

    // 应该包含两个工具调用
    expect(result?.toolCalls?.length).toBe(2);
  });
});

describe('思考过程识别', () => {
  const thinkingKeywords = [
    '我可以帮您',
    '让我',
    '首先',
    '我将',
    '我会',
    '我需要'
  ];

  thinkingKeywords.forEach(keyword => {
    it(`应该识别以"${keyword}"开头的思考内容`, () => {
      const processor = new ClaudeCodeStreamProcessor();
      const line = JSON.stringify({
        type: 'assistant',
        message: {
          content: [
            { type: 'text', text: `${keyword}做一些事情` }
          ]
        }
      });

      const result = processor.processLine(line);

      expect(result?.thinking).toBeDefined();
      expect(result?.thinking).toContain(keyword);
    });
  });

  it('应该不将普通文本识别为思考过程', () => {
    const processor = new ClaudeCodeStreamProcessor();
    const line = JSON.stringify({
      type: 'assistant',
      message: {
        content: [
          { type: 'text', text: '这是一个普通的回复' }
        ]
      }
    });

    const result = processor.processLine(line);

    // thinking 应该是 undefined 或空字符串
    expect(result?.thinking).toBeFalsy();
  });
});
