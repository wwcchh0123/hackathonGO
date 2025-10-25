import { JSONStreamParser } from '../../src/parser/json-stream-parser';
import { Readable, Writable } from 'stream';

describe('JSONStreamParser - 缓冲区处理', () => {
  let parser: JSONStreamParser;
  let events: any[];

  beforeEach(() => {
    parser = new JSONStreamParser();
    events = [];
  });

  it('should handle partial chunks', (done) => {
    parser.on('data', (event) => events.push(event));
    parser.on('end', () => {
      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('message_start');
      done();
    });

    // 模拟分块数据
    parser.write('{"type":"mess');
    expect(events).toHaveLength(0); // 还没有完整的行

    parser.write('age_start"}\n');
    parser.end();
  });

  it('should handle multiple events in one chunk', (done) => {
    parser.on('data', (event) => events.push(event));
    parser.on('end', () => {
      expect(events).toHaveLength(2);
      expect(events[0].type).toBe('event1');
      expect(events[1].type).toBe('event2');
      done();
    });

    parser.write('{"type":"event1"}\n{"type":"event2"}\n');
    parser.end();
  });

  it('should handle event split across multiple chunks', (done) => {
    parser.on('data', (event) => events.push(event));
    parser.on('end', () => {
      expect(events).toHaveLength(1);
      expect(events[0]).toEqual({
        type: 'content_block_delta',
        index: 0,
        delta: { type: 'text_delta', text: 'Hello World!' }
      });
      done();
    });

    // 将一个事件分成多个块
    const chunks = [
      '{"type":"content_',
      'block_delta","ind',
      'ex":0,"delta":{"ty',
      'pe":"text_delta","',
      'text":"Hello World',
      '!"}}\n'
    ];

    chunks.forEach(chunk => parser.write(chunk));
    parser.end();
  });

  it('should handle mixed complete and partial lines', (done) => {
    parser.on('data', (event) => events.push(event));
    parser.on('end', () => {
      expect(events).toHaveLength(3);
      expect(events[0].type).toBe('message_start');
      expect(events[1].type).toBe('content_block_start');
      expect(events[2].type).toBe('content_block_delta');
      done();
    });

    // 混合完整和部分行
    parser.write('{"type":"message_start"}\n{"type":"content_block_');
    parser.write('start"}\n{"type":"content_block_delta"}\n');
    parser.end();
  });

  it('should handle empty chunks', (done) => {
    parser.on('data', (event) => events.push(event));
    parser.on('end', () => {
      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('test');
      done();
    });

    parser.write('');
    parser.write('{"type":');
    parser.write('');
    parser.write('"test"}\n');
    parser.write('');
    parser.end();
  });

  it('should handle parse errors in stream', (done) => {
    parser.on('data', (event) => events.push(event));
    parser.on('end', () => {
      expect(events).toHaveLength(3);
      expect(events[0].type).toBe('valid1');
      expect(events[1].type).toBe('parse_error');
      expect(events[2].type).toBe('valid2');
      done();
    });

    parser.write('{"type":"valid1"}\n');
    parser.write('{invalid json}\n');
    parser.write('{"type":"valid2"}\n');
    parser.end();
  });

  it('should flush remaining buffer on end', (done) => {
    parser.on('data', (event) => events.push(event));
    parser.on('end', () => {
      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('final');
      done();
    });

    // 写入没有换行符的数据
    parser.write('{"type":"final"}');
    parser.end(); // 应该刷新缓冲区
  });

  it('should work with pipe', (done) => {
    const input = new Readable({
      read() {}
    });

    const output = new Writable({
      objectMode: true,
      write(chunk, encoding, callback) {
        events.push(chunk);
        callback();
      }
    });

    output.on('finish', () => {
      expect(events).toHaveLength(2);
      expect(events[0].type).toBe('message_start');
      expect(events[1].type).toBe('message_stop');
      done();
    });

    input.pipe(parser).pipe(output);

    // 模拟流式输入
    input.push('{"type":"message_');
    input.push('start"}\n');
    input.push('{"type":"message_stop"}\n');
    input.push(null); // 结束流
  });
});