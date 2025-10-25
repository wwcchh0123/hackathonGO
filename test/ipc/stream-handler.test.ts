import { StreamHandler } from '../../src/ipc/stream-handler';
import { ClaudeExecutor } from '../../src/cli/claude-executor';
import { EventEmitter } from 'events';

// Mock ClaudeExecutor
jest.mock('../../src/cli/claude-executor');

describe('StreamHandler', () => {
  let handler: StreamHandler;
  let mockExecutor: jest.Mocked<ClaudeExecutor>;
  let mockEvent: any;
  
  beforeEach(() => {
    // Create mock event (simulating Electron IPC event)
    mockEvent = {
      sender: {
        send: jest.fn()
      }
    };
    
    // Create mock executor
    const MockExecutor = ClaudeExecutor as jest.MockedClass<typeof ClaudeExecutor>;
    mockExecutor = new MockExecutor() as jest.Mocked<ClaudeExecutor>;
    
    // Setup default mock implementations
    mockExecutor.execute = jest.fn();
    mockExecutor.abort = jest.fn();
    mockExecutor.isRunning = jest.fn().mockReturnValue(false);
    mockExecutor.cleanup = jest.fn();
    
    // Make it an EventEmitter
    Object.setPrototypeOf(mockExecutor, EventEmitter.prototype);
    EventEmitter.call(mockExecutor);
    
    handler = new StreamHandler();
  });
  
  afterEach(() => {
    handler.cleanup();
  });
  
  describe('startStream', () => {
    beforeEach(() => {
      // Mock ClaudeExecutor constructor to return our mock
      (ClaudeExecutor as any).mockImplementation(() => {
        const executor = new EventEmitter() as any;
        executor.execute = jest.fn();
        executor.abort = jest.fn();
        executor.cleanup = jest.fn();
        executor.isRunning = jest.fn().mockReturnValue(false);
        return executor;
      });
    });
    
    it('should start stream and return stream ID', () => {
      const options = { message: 'Hello Claude' };
      const streamId = handler.startStream(mockEvent, options);
      
      expect(streamId).toBeDefined();
      expect(typeof streamId).toBe('string');
      expect(mockEvent.sender.send).toHaveBeenCalledWith(
        'stream-started',
        expect.objectContaining({
          streamId: streamId
        })
      );
    });
    
    it('should create executor with correct options', () => {
      const options = {
        message: 'Test message',
        model: 'claude-3-sonnet-20240229',
        temperature: 0.5
      };
      
      const streamId = handler.startStream(mockEvent, options);
      const executor = handler.getExecutor(streamId);
      
      expect(executor).toBeDefined();
      expect(executor?.execute).toHaveBeenCalledWith('Test message', {
        model: 'claude-3-sonnet-20240229',
        temperature: 0.5
      });
    });
    
    it('should forward data events to renderer', () => {
      const streamId = handler.startStream(mockEvent, { message: 'Hello' });
      const executor = handler.getExecutor(streamId);
      
      const testData = { type: 'test', data: 'hello' };
      executor?.emit('data', testData);
      
      expect(mockEvent.sender.send).toHaveBeenCalledWith(
        'stream-data',
        expect.objectContaining({
          streamId: streamId,
          chunk: testData
        })
      );
    });
    
    it('should forward error events to renderer', () => {
      const streamId = handler.startStream(mockEvent, { message: 'Hello' });
      const executor = handler.getExecutor(streamId);
      
      const testError = { type: 'error', message: 'Test error' };
      executor?.emit('error', testError);
      
      expect(mockEvent.sender.send).toHaveBeenCalledWith(
        'stream-error',
        expect.objectContaining({
          streamId: streamId,
          error: testError
        })
      );
    });
    
    it('should handle stream end', () => {
      const streamId = handler.startStream(mockEvent, { message: 'Hello' });
      const executor = handler.getExecutor(streamId);
      
      executor?.emit('end');
      
      expect(mockEvent.sender.send).toHaveBeenCalledWith(
        'stream-end',
        expect.objectContaining({ streamId })
      );
      
      // Should clean up the stream
      expect(handler.getExecutor(streamId)).toBeUndefined();
    });
    
    it('should handle multiple concurrent streams', () => {
      const streamId1 = handler.startStream(mockEvent, { message: 'Stream 1' });
      const streamId2 = handler.startStream(mockEvent, { message: 'Stream 2' });
      
      expect(streamId1).not.toBe(streamId2);
      expect(handler.getExecutor(streamId1)).toBeDefined();
      expect(handler.getExecutor(streamId2)).toBeDefined();
    });
  });
  
  describe('abortStream', () => {
    it('should abort existing stream', () => {
      const streamId = handler.startStream(mockEvent, { message: 'Hello' });
      const executor = handler.getExecutor(streamId);
      
      const result = handler.abortStream(streamId);
      
      expect(result).toBe(true);
      expect(executor?.abort).toHaveBeenCalled();
      expect(mockEvent.sender.send).toHaveBeenCalledWith(
        'stream-aborted',
        expect.objectContaining({ streamId })
      );
    });
    
    it('should return false for non-existent stream', () => {
      const result = handler.abortStream('non-existent-id');
      expect(result).toBe(false);
    });
    
    it('should clean up aborted stream', () => {
      const streamId = handler.startStream(mockEvent, { message: 'Hello' });
      
      handler.abortStream(streamId);
      
      expect(handler.getExecutor(streamId)).toBeUndefined();
    });
  });
  
  describe('pauseStream', () => {
    it('should pause stream', () => {
      const streamId = handler.startStream(mockEvent, { message: 'Hello' });
      
      handler.pauseStream(streamId);
      
      expect(handler.isStreamPaused(streamId)).toBe(true);
    });
    
    it('should buffer events while paused', () => {
      const streamId = handler.startStream(mockEvent, { message: 'Hello' });
      const executor = handler.getExecutor(streamId);
      
      handler.pauseStream(streamId);
      
      // Reset mock to clear previous calls
      mockEvent.sender.send.mockClear();
      
      // Emit events while paused
      executor?.emit('data', { type: 'test1' });
      executor?.emit('data', { type: 'test2' });
      
      // Should not send to renderer
      expect(mockEvent.sender.send).not.toHaveBeenCalled();
      
      // Resume and check buffered events are sent
      handler.resumeStream(streamId);
      
      expect(mockEvent.sender.send).toHaveBeenCalledTimes(2);
      expect(mockEvent.sender.send).toHaveBeenCalledWith(
        'stream-data',
        expect.objectContaining({
          chunk: { type: 'test1' }
        })
      );
      expect(mockEvent.sender.send).toHaveBeenCalledWith(
        'stream-data',
        expect.objectContaining({
          chunk: { type: 'test2' }
        })
      );
    });
  });
  
  describe('resumeStream', () => {
    it('should resume paused stream', () => {
      const streamId = handler.startStream(mockEvent, { message: 'Hello' });
      
      handler.pauseStream(streamId);
      expect(handler.isStreamPaused(streamId)).toBe(true);
      
      handler.resumeStream(streamId);
      expect(handler.isStreamPaused(streamId)).toBe(false);
    });
    
    it('should handle resume on non-paused stream', () => {
      const streamId = handler.startStream(mockEvent, { message: 'Hello' });
      
      expect(() => handler.resumeStream(streamId)).not.toThrow();
      expect(handler.isStreamPaused(streamId)).toBe(false);
    });
  });
  
  describe('getActiveStreams', () => {
    it('should return list of active stream IDs', () => {
      const streamId1 = handler.startStream(mockEvent, { message: 'Stream 1' });
      const streamId2 = handler.startStream(mockEvent, { message: 'Stream 2' });
      
      const activeStreams = handler.getActiveStreams();
      
      expect(activeStreams).toContain(streamId1);
      expect(activeStreams).toContain(streamId2);
      expect(activeStreams).toHaveLength(2);
    });
    
    it('should update after stream ends', () => {
      const streamId = handler.startStream(mockEvent, { message: 'Hello' });
      const executor = handler.getExecutor(streamId);
      
      expect(handler.getActiveStreams()).toContain(streamId);
      
      executor?.emit('end');
      
      expect(handler.getActiveStreams()).not.toContain(streamId);
    });
  });
  
  describe('cleanup', () => {
    it('should abort all active streams', () => {
      const streamId1 = handler.startStream(mockEvent, { message: 'Stream 1' });
      const streamId2 = handler.startStream(mockEvent, { message: 'Stream 2' });
      
      const executor1 = handler.getExecutor(streamId1);
      const executor2 = handler.getExecutor(streamId2);
      
      handler.cleanup();
      
      expect(executor1?.abort).toHaveBeenCalled();
      expect(executor2?.abort).toHaveBeenCalled();
      expect(handler.getActiveStreams()).toHaveLength(0);
    });
    
    it('should clear all event listeners', () => {
      const streamId = handler.startStream(mockEvent, { message: 'Hello' });
      const executor = handler.getExecutor(streamId);
      
      handler.cleanup();
      
      // Try to emit event after cleanup
      executor?.emit('data', { type: 'test' });
      
      // Should not receive any new events
      const callCount = mockEvent.sender.send.mock.calls.filter(
        call => call[0] === 'stream-data'
      ).length;
      expect(callCount).toBe(0);
    });
  });
});