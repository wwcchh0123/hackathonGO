import { transformClaudeEvent, StreamMessage } from '../../src/transformer/event-transformer';

describe('EventTransformer', () => {
  describe('transformClaudeEvent', () => {
    it('should transform message_start event', () => {
      const event = {
        type: 'message_start',
        message: { 
          id: 'msg_123', 
          type: 'message',
          role: 'assistant',
          model: 'claude-3-opus-20240229',
          content: [],
          stop_reason: null,
          stop_sequence: null,
          usage: { input_tokens: 10, output_tokens: 0 }
        }
      };
      
      const transformed = transformClaudeEvent(event);
      
      expect(transformed).toMatchObject({
        type: 'message_start',
        messageStart: {
          messageId: 'msg_123',
          model: 'claude-3-opus-20240229'
        }
      });
      expect(transformed.id).toBeDefined();
      expect(transformed.timestamp).toBeDefined();
      expect(typeof transformed.id).toBe('string');
      expect(typeof transformed.timestamp).toBe('number');
    });

    it('should transform content_block_start event', () => {
      const event = {
        type: 'content_block_start',
        index: 0,
        content_block: {
          type: 'text',
          text: ''
        }
      };
      
      const transformed = transformClaudeEvent(event);
      
      expect(transformed).toMatchObject({
        type: 'content_start',
        content: {
          index: 0,
          contentType: 'text'
        }
      });
    });

    it('should transform content_block_delta event', () => {
      const event = {
        type: 'content_block_delta',
        index: 0,
        delta: { 
          type: 'text_delta', 
          text: 'Hello World' 
        }
      };
      
      const transformed = transformClaudeEvent(event);
      
      expect(transformed).toMatchObject({
        type: 'delta',
        delta: {
          text: 'Hello World',
          index: 0
        }
      });
    });

    it('should transform content_block_stop event', () => {
      const event = {
        type: 'content_block_stop',
        index: 0
      };
      
      const transformed = transformClaudeEvent(event);
      
      expect(transformed).toMatchObject({
        type: 'content_stop',
        content: {
          index: 0
        }
      });
    });

    it('should transform message_delta event', () => {
      const event = {
        type: 'message_delta',
        delta: {
          stop_reason: 'end_turn',
          stop_sequence: null
        },
        usage: { output_tokens: 123 }
      };
      
      const transformed = transformClaudeEvent(event);
      
      expect(transformed).toMatchObject({
        type: 'message_delta',
        messageDelta: {
          stopReason: 'end_turn',
          outputTokens: 123
        }
      });
    });

    it('should transform message_stop event', () => {
      const event = {
        type: 'message_stop'
      };
      
      const transformed = transformClaudeEvent(event);
      
      expect(transformed).toMatchObject({
        type: 'complete',
        complete: {
          stopReason: 'end_turn'
        }
      });
    });

    it('should transform error event with rate limit', () => {
      const event = {
        type: 'error',
        error: { 
          type: 'rate_limit_error', 
          message: 'Rate limit exceeded. Please try again later.' 
        }
      };
      
      const transformed = transformClaudeEvent(event);
      
      expect(transformed).toMatchObject({
        type: 'error',
        error: {
          type: 'rate_limit_error',
          message: 'Rate limit exceeded. Please try again later.',
          recoverable: true
        }
      });
    });

    it('should transform error event with authentication error', () => {
      const event = {
        type: 'error',
        error: { 
          type: 'authentication_error', 
          message: 'Invalid API key' 
        }
      };
      
      const transformed = transformClaudeEvent(event);
      
      expect(transformed).toMatchObject({
        type: 'error',
        error: {
          type: 'authentication_error',
          message: 'Invalid API key',
          recoverable: false
        }
      });
    });

    it('should handle unknown event types', () => {
      const event = {
        type: 'unknown_event_type',
        data: { foo: 'bar' }
      };
      
      const transformed = transformClaudeEvent(event);
      
      expect(transformed).toMatchObject({
        type: 'unknown',
        original: event
      });
      expect(transformed.id).toBeDefined();
      expect(transformed.timestamp).toBeDefined();
    });

    it('should handle ping event', () => {
      const event = {
        type: 'ping'
      };
      
      const transformed = transformClaudeEvent(event);
      
      expect(transformed).toMatchObject({
        type: 'ping'
      });
    });
  });

  describe('StreamMessage type validation', () => {
    it('should have required fields', () => {
      const message: StreamMessage = {
        id: '123',
        timestamp: Date.now(),
        type: 'test'
      };
      
      expect(message.id).toBeDefined();
      expect(message.timestamp).toBeDefined();
      expect(message.type).toBeDefined();
    });
    
    it('should allow optional fields based on type', () => {
      const messageStart: StreamMessage = {
        id: '123',
        timestamp: Date.now(),
        type: 'message_start',
        messageStart: {
          messageId: 'msg_123',
          model: 'claude-3'
        }
      };
      
      expect(messageStart.messageStart).toBeDefined();
      
      const delta: StreamMessage = {
        id: '456',
        timestamp: Date.now(),
        type: 'delta',
        delta: {
          text: 'Hello',
          index: 0
        }
      };
      
      expect(delta.delta).toBeDefined();
    });
  });
});