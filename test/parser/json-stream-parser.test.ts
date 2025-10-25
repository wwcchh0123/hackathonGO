import { JSONStreamParser } from '../../src/parser/json-stream-parser';

describe('JSONStreamParser - 单行解析', () => {
  let parser: JSONStreamParser;

  beforeEach(() => {
    parser = new JSONStreamParser();
  });

  it('should parse a complete JSON line', () => {
    const result = parser.parseLine('{"type":"message_start","message":{"id":"123"}}');
    expect(result).toEqual({
      type: 'message_start',
      message: { id: '123' }
    });
  });

  it('should handle empty lines', () => {
    const result = parser.parseLine('');
    expect(result).toBeNull();
  });

  it('should handle whitespace-only lines', () => {
    const result = parser.parseLine('   \t\n  ');
    expect(result).toBeNull();
  });

  it('should handle invalid JSON', () => {
    const result = parser.parseLine('{invalid json}');
    expect(result).toEqual({
      type: 'parse_error',
      error: expect.any(String)
    });
  });

  it('should handle malformed JSON with detailed error', () => {
    const result = parser.parseLine('{"type": "test", missing_quote: value}');
    expect(result).toHaveProperty('type', 'parse_error');
    expect(result).toHaveProperty('error');
    expect(result.error).toMatch(/Expected|Unexpected/);
  });

  it('should parse different Claude event types', () => {
    const testCases = [
      {
        input: '{"type":"message_start","message":{"id":"msg_123","model":"claude-3"}}',
        expected: {
          type: 'message_start',
          message: { id: 'msg_123', model: 'claude-3' }
        }
      },
      {
        input: '{"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"Hello"}}',
        expected: {
          type: 'content_block_delta',
          index: 0,
          delta: { type: 'text_delta', text: 'Hello' }
        }
      },
      {
        input: '{"type":"error","error":{"type":"rate_limit","message":"Too many requests"}}',
        expected: {
          type: 'error',
          error: { type: 'rate_limit', message: 'Too many requests' }
        }
      }
    ];

    testCases.forEach(({ input, expected }) => {
      const result = parser.parseLine(input);
      expect(result).toEqual(expected);
    });
  });
});