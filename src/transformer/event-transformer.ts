import { randomUUID } from 'crypto';

export interface StreamMessage {
  id: string;
  timestamp: number;
  type: string;
  messageStart?: {
    messageId: string;
    model: string;
  };
  content?: {
    index: number;
    contentType?: string;
  };
  delta?: {
    text: string;
    index: number;
  };
  messageDelta?: {
    stopReason: string | null;
    outputTokens?: number;
  };
  error?: {
    type: string;
    message: string;
    recoverable: boolean;
  };
  complete?: {
    stopReason: string | null;
    usage?: {
      inputTokens?: number;
      outputTokens?: number;
    };
  };
  original?: any;
}

export interface ClaudeStreamEvent {
  type: string;
  message?: any;
  content_block?: any;
  delta?: any;
  index?: number;
  error?: {
    type: string;
    message: string;
  };
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
  };
}

export function transformClaudeEvent(event: ClaudeStreamEvent): StreamMessage {
  const base: StreamMessage = {
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
      
    case 'message_delta':
      return {
        ...base,
        type: 'message_delta',
        messageDelta: {
          stopReason: event.delta?.stop_reason || null,
          outputTokens: event.usage?.output_tokens
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
      
    case 'ping':
      return {
        ...base,
        type: 'ping'
      };
      
    default:
      return {
        ...base,
        type: 'unknown',
        original: event
      };
  }
}