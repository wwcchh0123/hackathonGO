import { ClaudeExecutor } from '../../src/cli/claude-executor';
import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';
import { Readable, PassThrough } from 'stream';

// Mock child_process
jest.mock('child_process');

describe('ClaudeExecutor', () => {
  let executor: ClaudeExecutor;
  let mockProcess: any;
  let mockSpawn: jest.MockedFunction<typeof spawn>;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Create mock process
    mockProcess = {
      stdout: new PassThrough(),
      stderr: new PassThrough(),
      stdin: new PassThrough(),
      on: jest.fn(),
      kill: jest.fn(),
      pid: 12345
    };
    
    // Setup spawn mock
    mockSpawn = spawn as jest.MockedFunction<typeof spawn>;
    mockSpawn.mockReturnValue(mockProcess as any);
    
    executor = new ClaudeExecutor();
  });

  afterEach(() => {
    executor.cleanup();
  });

  describe('execute', () => {
    it('should spawn claude with correct default arguments', () => {
      executor.execute('Hello Claude');
      
      expect(mockSpawn).toHaveBeenCalledWith('claude', [
        '--format', 'json-stream',
        '--model', 'claude-3-opus-20240229',
        '--no-color',
        '--quiet',
        'Hello Claude'
      ], expect.any(Object));
    });

    it('should allow custom model', () => {
      executor.execute('Hello', { model: 'claude-3-sonnet-20240229' });
      
      expect(mockSpawn).toHaveBeenCalledWith('claude', 
        expect.arrayContaining(['--model', 'claude-3-sonnet-20240229']),
        expect.any(Object)
      );
    });

    it('should pass environment variables', () => {
      process.env.ANTHROPIC_API_KEY = 'test-key';
      executor.execute('Hello');
      
      expect(mockSpawn).toHaveBeenCalledWith('claude', 
        expect.any(Array),
        expect.objectContaining({
          env: expect.objectContaining({
            ANTHROPIC_API_KEY: 'test-key'
          })
        })
      );
    });

    it('should emit parsed events from stdout', (done) => {
      const events: any[] = [];
      
      executor.on('data', (event) => {
        events.push(event);
      });
      
      executor.on('end', () => {
        expect(events).toHaveLength(2);
        expect(events[0].type).toBe('message_start');
        expect(events[1].type).toBe('delta');
        expect(events[1].delta.text).toBe('Hello');
        done();
      });
      
      executor.execute('test');
      
      // Simulate Claude output
      mockProcess.stdout.write('{"type":"message_start","message":{"id":"123"}}\n');
      mockProcess.stdout.write('{"type":"content_block_delta","index":0,"delta":{"text":"Hello"}}\n');
      mockProcess.stdout.end();
      
      // Simulate process close
      mockProcess.on.mock.calls
        .find(call => call[0] === 'close')?.[1](0);
    });

    it('should handle partial JSON chunks', (done) => {
      const events: any[] = [];
      
      executor.on('data', (event) => {
        events.push(event);
      });
      
      executor.on('end', () => {
        expect(events).toHaveLength(1);
        expect(events[0].type).toBe('message_start');
        done();
      });
      
      executor.execute('test');
      
      // Send partial chunks
      mockProcess.stdout.write('{"type":"mess');
      mockProcess.stdout.write('age_start","');
      mockProcess.stdout.write('message":{"id"');
      mockProcess.stdout.write(':"123"}}\n');
      mockProcess.stdout.end();
      
      mockProcess.on.mock.calls
        .find(call => call[0] === 'close')?.[1](0);
    });

    it('should emit stderr as errors', (done) => {
      const errors: any[] = [];
      
      executor.on('error', (error) => {
        errors.push(error);
      });
      
      executor.on('end', () => {
        expect(errors).toHaveLength(1);
        expect(errors[0].type).toBe('cli_error');
        expect(errors[0].message).toContain('Something went wrong');
        done();
      });
      
      executor.execute('test');
      
      mockProcess.stderr.write('Something went wrong\n');
      mockProcess.stderr.end();
      
      mockProcess.on.mock.calls
        .find(call => call[0] === 'close')?.[1](1);
    });

    it('should handle process exit codes', (done) => {
      executor.on('close', (code) => {
        expect(code).toBe(1);
        done();
      });
      
      executor.execute('test');
      
      mockProcess.on.mock.calls
        .find(call => call[0] === 'close')?.[1](1);
    });
  });

  describe('abort', () => {
    it('should kill the process', () => {
      executor.execute('test');
      executor.abort();
      
      expect(mockProcess.kill).toHaveBeenCalledWith('SIGTERM');
    });

    it('should emit abort event', (done) => {
      executor.on('abort', () => {
        done();
      });
      
      executor.execute('test');
      executor.abort();
    });

    it('should handle abort when no process is running', () => {
      expect(() => executor.abort()).not.toThrow();
    });
  });

  describe('isRunning', () => {
    it('should return true when process is running', () => {
      executor.execute('test');
      expect(executor.isRunning()).toBe(true);
    });

    it('should return false when process is not running', () => {
      expect(executor.isRunning()).toBe(false);
    });

    it('should return false after process ends', (done) => {
      executor.execute('test');
      expect(executor.isRunning()).toBe(true);
      
      executor.on('close', () => {
        expect(executor.isRunning()).toBe(false);
        done();
      });
      
      mockProcess.on.mock.calls
        .find(call => call[0] === 'close')?.[1](0);
    });
  });

  describe('cleanup', () => {
    it('should abort running process', () => {
      executor.execute('test');
      executor.cleanup();
      
      expect(mockProcess.kill).toHaveBeenCalled();
    });

    it('should remove all listeners', () => {
      const listener = jest.fn();
      executor.on('data', listener);
      
      executor.cleanup();
      executor.emit('data', {});
      
      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should handle spawn errors', (done) => {
      const spawnError = new Error('Command not found');
      mockSpawn.mockImplementation(() => {
        throw spawnError;
      });
      
      executor.on('error', (error) => {
        expect(error.type).toBe('spawn_error');
        expect(error.message).toContain('Command not found');
        done();
      });
      
      executor.execute('test');
    });

    it('should handle invalid JSON from Claude', (done) => {
      const events: any[] = [];
      const errors: any[] = [];
      
      executor.on('data', (event) => events.push(event));
      executor.on('error', (error) => errors.push(error));
      
      executor.on('end', () => {
        expect(events).toHaveLength(2); // message_start + parse_error as unknown
        expect(events[0].type).toBe('message_start');
        expect(events[1].type).toBe('unknown'); // parse_error is transformed to unknown
        expect(errors).toHaveLength(0); // Parse errors are transformed to events
        done();
      });
      
      executor.execute('test');
      
      mockProcess.stdout.write('{"type":"message_start","message":{"id":"123"}}\n');
      mockProcess.stdout.write('not valid json\n');
      mockProcess.stdout.end();
      
      mockProcess.on.mock.calls
        .find(call => call[0] === 'close')?.[1](0);
    });
  });
});