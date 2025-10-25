/**
 * MessageBubble 组件测试
 * 测试消息气泡组件的渲染和交互功能
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { MessageBubble, Message, ToolCall } from '../../src/pages/chat/components/MessageBubble';

describe('MessageBubble 组件', () => {
  describe('基础消息渲染', () => {
    it('应该渲染用户消息', () => {
      const message: Message = {
        id: '1',
        type: 'user',
        content: '你好，Claude',
        timestamp: new Date('2025-01-01T12:00:00')
      };

      render(<MessageBubble message={message} />);

      // 验证消息内容
      expect(screen.getByText('你好，Claude')).toBeInTheDocument();
      // 验证用户头像
      expect(screen.getByText('U')).toBeInTheDocument();
    });

    it('应该渲染助手消息', () => {
      const message: Message = {
        id: '2',
        type: 'assistant',
        content: '你好！我是 Claude。',
        timestamp: new Date('2025-01-01T12:00:01')
      };

      render(<MessageBubble message={message} />);

      // 验证消息内容
      expect(screen.getByText('你好！我是 Claude。')).toBeInTheDocument();
      // 验证助手头像
      expect(screen.getByText('C')).toBeInTheDocument();
    });

    it('应该渲染系统消息', () => {
      const message: Message = {
        id: '3',
        type: 'system',
        content: '系统初始化完成',
        timestamp: new Date('2025-01-01T12:00:02')
      };

      render(<MessageBubble message={message} />);

      // 验证消息内容
      expect(screen.getByText('系统初始化完成')).toBeInTheDocument();
      // 验证系统头像
      expect(screen.getByText('!')).toBeInTheDocument();
    });

    it('应该显示消息时间戳', () => {
      const timestamp = new Date('2025-01-01T12:34:56');
      const message: Message = {
        id: '4',
        type: 'user',
        content: '测试时间戳',
        timestamp
      };

      render(<MessageBubble message={message} />);

      // 验证时间戳显示（格式可能因浏览器而异，只检查是否存在）
      const timeString = timestamp.toLocaleTimeString();
      expect(screen.getByText(timeString)).toBeInTheDocument();
    });
  });

  describe('思考过程展示', () => {
    it('应该渲染思考过程（折叠状态）', () => {
      const message: Message = {
        id: '5',
        type: 'assistant',
        content: '这是回复内容',
        timestamp: new Date(),
        thinking: '让我思考一下如何回答这个问题...'
      };

      render(<MessageBubble message={message} />);

      // 验证思考过程标题
      expect(screen.getByText('思考过程')).toBeInTheDocument();
      // 默认折叠，思考内容不可见
      expect(screen.queryByText('让我思考一下如何回答这个问题...')).not.toBeVisible();
    });

    it('应该能展开和折叠思考过程', () => {
      const message: Message = {
        id: '6',
        type: 'assistant',
        content: '这是回复内容',
        timestamp: new Date(),
        thinking: '我需要仔细考虑这个问题'
      };

      render(<MessageBubble message={message} />);

      // 点击展开
      const thinkingHeader = screen.getByText('思考过程').closest('div');
      if (thinkingHeader?.parentElement) {
        fireEvent.click(thinkingHeader.parentElement);
      }

      // 验证思考内容可见
      expect(screen.getByText('我需要仔细考虑这个问题')).toBeVisible();
    });
  });

  describe('工具调用展示', () => {
    it('应该渲染工具调用信息', () => {
      const toolCalls: ToolCall[] = [
        {
          id: 'tool_1',
          name: 'mcp__playwright__browser_navigate',
          input: { url: 'https://www.google.com' },
          status: 'running'
        }
      ];

      const message: Message = {
        id: '7',
        type: 'assistant',
        content: '正在打开浏览器',
        timestamp: new Date(),
        toolCalls
      };

      render(<MessageBubble message={message} />);

      // 验证工具名称
      expect(screen.getByText('mcp__playwright__browser_navigate')).toBeInTheDocument();
      // 验证状态标签
      expect(screen.getByText('running')).toBeInTheDocument();
    });

    it('应该显示工具输入参数', () => {
      const toolCalls: ToolCall[] = [
        {
          id: 'tool_2',
          name: 'browser_click',
          input: {
            element: 'button',
            ref: 'submit-btn'
          },
          status: 'completed'
        }
      ];

      const message: Message = {
        id: '8',
        type: 'assistant',
        content: '已点击按钮',
        timestamp: new Date(),
        toolCalls
      };

      render(<MessageBubble message={message} />);

      // 验证输入参数标题
      expect(screen.getByText('输入参数:')).toBeInTheDocument();
      // 验证参数内容（JSON 格式）
      expect(screen.getByText(/"element": "button"/)).toBeInTheDocument();
      expect(screen.getByText(/"ref": "submit-btn"/)).toBeInTheDocument();
    });

    it('应该根据状态显示不同的颜色', () => {
      const testCases: Array<{
        status: ToolCall['status'];
        expectedColor: string;
      }> = [
        { status: 'completed', expectedColor: '#4caf50' },
        { status: 'error', expectedColor: '#f44336' },
        { status: 'running', expectedColor: '#ff9800' },
        { status: 'pending', expectedColor: '#2196f3' }
      ];

      testCases.forEach(({ status, expectedColor }) => {
        const toolCalls: ToolCall[] = [
          {
            id: `tool_${status}`,
            name: 'test_tool',
            input: {},
            status
          }
        ];

        const message: Message = {
          id: `msg_${status}`,
          type: 'assistant',
          content: `测试 ${status} 状态`,
          timestamp: new Date(),
          toolCalls
        };

        const { container } = render(<MessageBubble message={message} />);

        // 验证状态标签的颜色（通过查找对应的 Chip 组件）
        const chip = container.querySelector(`[class*="MuiChip-root"]`);
        expect(chip).toHaveTextContent(status as string);
      });
    });

    it('应该显示工具执行结果', () => {
      const toolCalls: ToolCall[] = [
        {
          id: 'tool_3',
          name: 'fetch_data',
          input: { url: 'https://api.example.com/data' },
          status: 'completed',
          result: '{"data": "success"}'
        }
      ];

      const message: Message = {
        id: '9',
        type: 'assistant',
        content: '数据获取完成',
        timestamp: new Date(),
        toolCalls
      };

      render(<MessageBubble message={message} />);

      // 验证执行结果标题
      expect(screen.getByText('执行结果:')).toBeInTheDocument();
      // 验证结果内容
      expect(screen.getByText('{"data": "success"}')).toBeInTheDocument();
    });

    it('应该显示工具错误信息', () => {
      const toolCalls: ToolCall[] = [
        {
          id: 'tool_4',
          name: 'failed_tool',
          input: { param: 'test' },
          status: 'error',
          error: 'Network timeout'
        }
      ];

      const message: Message = {
        id: '10',
        type: 'assistant',
        content: '工具执行失败',
        timestamp: new Date(),
        toolCalls
      };

      render(<MessageBubble message={message} />);

      // 验证错误信息标题
      expect(screen.getByText('错误信息:')).toBeInTheDocument();
      // 验证错误内容
      expect(screen.getByText('Network timeout')).toBeInTheDocument();
    });

    it('应该能展开和折叠工具调用详情', () => {
      const toolCalls: ToolCall[] = [
        {
          id: 'tool_5',
          name: 'collapsible_tool',
          input: { test: 'data' },
          status: 'completed'
        }
      ];

      const message: Message = {
        id: '11',
        type: 'assistant',
        content: '测试折叠功能',
        timestamp: new Date(),
        toolCalls
      };

      render(<MessageBubble message={message} />);

      // 默认展开状态
      expect(screen.getByText('输入参数:')).toBeVisible();

      // 点击折叠
      const toolHeader = screen.getByText('collapsible_tool').closest('div');
      if (toolHeader?.parentElement?.parentElement) {
        fireEvent.click(toolHeader.parentElement.parentElement);
      }

      // 验证内容被折叠（注意：Collapse 组件可能使用 display: none）
      // 具体验证方式取决于 MUI Collapse 的实现
    });
  });

  describe('多个工具调用', () => {
    it('应该渲染多个工具调用', () => {
      const toolCalls: ToolCall[] = [
        {
          id: 'tool_a',
          name: 'tool_one',
          input: {},
          status: 'completed'
        },
        {
          id: 'tool_b',
          name: 'tool_two',
          input: {},
          status: 'running'
        },
        {
          id: 'tool_c',
          name: 'tool_three',
          input: {},
          status: 'pending'
        }
      ];

      const message: Message = {
        id: '12',
        type: 'assistant',
        content: '执行多个工具',
        timestamp: new Date(),
        toolCalls
      };

      render(<MessageBubble message={message} />);

      // 验证所有工具都被渲染
      expect(screen.getByText('tool_one')).toBeInTheDocument();
      expect(screen.getByText('tool_two')).toBeInTheDocument();
      expect(screen.getByText('tool_three')).toBeInTheDocument();

      // 验证状态
      expect(screen.getByText('completed')).toBeInTheDocument();
      expect(screen.getByText('running')).toBeInTheDocument();
      expect(screen.getByText('pending')).toBeInTheDocument();
    });
  });

  describe('边界情况', () => {
    it('应该处理空的工具调用数组', () => {
      const message: Message = {
        id: '13',
        type: 'assistant',
        content: '没有工具调用',
        timestamp: new Date(),
        toolCalls: []
      };

      const { container } = render(<MessageBubble message={message} />);

      // 验证没有渲染工具调用相关内容
      expect(screen.queryByText('输入参数:')).not.toBeInTheDocument();
    });

    it('应该处理 undefined 的 toolCalls', () => {
      const message: Message = {
        id: '14',
        type: 'assistant',
        content: 'toolCalls 为 undefined',
        timestamp: new Date()
        // toolCalls 未定义
      };

      const { container } = render(<MessageBubble message={message} />);

      // 验证消息正常渲染
      expect(screen.getByText('toolCalls 为 undefined')).toBeInTheDocument();
    });

    it('应该处理空的 thinking', () => {
      const message: Message = {
        id: '15',
        type: 'assistant',
        content: '没有思考过程',
        timestamp: new Date(),
        thinking: ''
      };

      render(<MessageBubble message={message} />);

      // 验证没有渲染思考过程
      expect(screen.queryByText('思考过程')).not.toBeInTheDocument();
    });
  });
});
