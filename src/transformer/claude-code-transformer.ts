/**
 * Claude Code CLI 流式输出转换器
 * 解析 Claude Code 的 --output-format stream-json 格式输出
 */

import { Message, ToolCall } from '../pages/chat/components/MessageBubble';

/**
 * Claude Code 流式事件原始格式
 */
export interface ClaudeCodeStreamEvent {
  type: 'assistant' | 'tool_result' | 'error' | 'complete' | string;
  message?: {
    id: string;
    type: string;
    role: string;
    model: string;
    content: Array<{
      type: 'text' | 'tool_use';
      text?: string;
      id?: string;
      name?: string;
      input?: Record<string, any>;
    }>;
    stop_reason: string | null;
    usage?: {
      input_tokens: number;
      output_tokens: number;
      cache_creation_input_tokens?: number;
      cache_read_input_tokens?: number;
    };
  };
  parent_tool_use_id?: string | null;
  session_id?: string;
  uuid?: string;
}

/**
 * 内部状态管理
 */
export class ClaudeCodeStreamProcessor {
  private currentMessage: Partial<Message> | null = null;
  private messageBuffer: string = '';
  private toolCalls: ToolCall[] = [];

  /**
   * 处理单行流式输出
   */
  processLine(line: string): Partial<Message> | null {
    try {
      // 跳过空行
      if (!line.trim()) {
        return null;
      }

      const event: ClaudeCodeStreamEvent = JSON.parse(line);
      return this.processEvent(event);
    } catch (error) {
      console.warn('⚠️ 解析流式输出失败:', error, line);
      return null;
    }
  }

  /**
   * 处理流式事件
   */
  private processEvent(event: ClaudeCodeStreamEvent): Partial<Message> | null {
    console.log('📥 处理事件:', event.type, event);

    switch (event.type) {
      case 'assistant':
        return this.handleAssistantMessage(event);

      case 'tool_result':
        // 工具结果事件（暂时不处理，可以后续扩展）
        return null;

      case 'error':
        return this.handleError(event);

      case 'complete':
        return this.handleComplete(event);

      default:
        console.log('🔍 未知事件类型:', event.type);
        return null;
    }
  }

  /**
   * 处理 Assistant 消息事件
   */
  private handleAssistantMessage(event: ClaudeCodeStreamEvent): Partial<Message> {
    if (!event.message) {
      return {};
    }

    const { content } = event.message;
    const textContent: string[] = [];
    const toolCallsInEvent: ToolCall[] = [];
    let thinking = '';

    // 解析消息内容
    content.forEach((block) => {
      if (block.type === 'text' && block.text) {
        // 检测是否是思考过程（通常以特定标记开头）
        if (this.isThinkingContent(block.text)) {
          thinking += block.text + '\n';
        } else {
          textContent.push(block.text);
        }
      } else if (block.type === 'tool_use' && block.name && block.input) {
        // 工具调用
        toolCallsInEvent.push({
          id: block.id || `tool_${Date.now()}`,
          name: block.name,
          input: block.input,
          status: 'running'  // 默认状态为运行中
        });
      }
    });

    // 合并工具调用
    if (toolCallsInEvent.length > 0) {
      this.toolCalls = [...this.toolCalls, ...toolCallsInEvent];
    }

    // 构建消息更新
    const messageUpdate: Partial<Message> = {
      content: textContent.join('\n\n'),
      thinking: thinking || undefined,
      toolCalls: this.toolCalls.length > 0 ? [...this.toolCalls] : undefined
    };

    return messageUpdate;
  }

  /**
   * 处理错误事件
   */
  private handleError(event: ClaudeCodeStreamEvent): Partial<Message> {
    return {
      content: `❌ 错误: ${JSON.stringify(event)}`,
      type: 'system'
    };
  }

  /**
   * 处理完成事件
   */
  private handleComplete(event: ClaudeCodeStreamEvent): Partial<Message> {
    // 将所有运行中的工具标记为完成
    if (this.toolCalls.length > 0) {
      this.toolCalls = this.toolCalls.map(tool => ({
        ...tool,
        status: tool.status === 'running' ? 'completed' : tool.status
      }));
    }

    return {
      toolCalls: this.toolCalls.length > 0 ? [...this.toolCalls] : undefined
    };
  }

  /**
   * 判断是否为思考内容
   * 可以根据实际输出格式调整判断逻辑
   */
  private isThinkingContent(text: string): boolean {
    // 简单判断：如果文本以某些关键词开头，认为是思考过程
    const thinkingKeywords = [
      '我可以帮您',
      '让我',
      '首先',
      '我将',
      '我会',
      '我需要'
    ];

    return thinkingKeywords.some(keyword => text.trim().startsWith(keyword));
  }

  /**
   * 重置处理器状态
   */
  reset() {
    this.currentMessage = null;
    this.messageBuffer = '';
    this.toolCalls = [];
  }

  /**
   * 获取当前工具调用列表
   */
  getToolCalls(): ToolCall[] {
    return [...this.toolCalls];
  }
}

/**
 * 快捷函数：处理单行流式输出
 */
export function parseClaudeCodeStreamLine(
  line: string,
  processor: ClaudeCodeStreamProcessor = new ClaudeCodeStreamProcessor()
): Partial<Message> | null {
  return processor.processLine(line);
}
