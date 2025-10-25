import React from 'react';
import { renderHook, act } from '@testing-library/react-hooks';
import { useStream } from '../../src/hooks/use-stream';

// Mock window.api
const mockApi = {
  startStream: jest.fn(),
  onStreamData: jest.fn(),
  onStreamEnd: jest.fn(),
  onStreamError: jest.fn(),
  offStreamData: jest.fn(),
  offStreamEnd: jest.fn(),
  offStreamError: jest.fn(),
  abortStream: jest.fn(),
  pauseStream: jest.fn(),
  resumeStream: jest.fn()
};

describe('useStream', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Setup window.api mock for each test
    (global as any).window = { api: mockApi };
    // Mock startStream to return a stream ID
    mockApi.startStream.mockReturnValue('test-stream-id');
  });
  
  describe('initial state', () => {
    it('should initialize with empty state', () => {
      const { result } = renderHook(() => useStream());
      
      expect(result.current.messages).toEqual([]);
      expect(result.current.isStreaming).toBe(false);
      expect(result.current.currentStream).toBeNull();
      expect(result.current.error).toBeNull();
    });
  });
  
  describe('startStream', () => {
    it('should start stream with message', () => {
      const { result } = renderHook(() => useStream());
      
      act(() => {
        result.current.startStream('Hello Claude');
      });
      
      expect(mockApi.startStream).toHaveBeenCalledWith({
        message: 'Hello Claude'
      });
      expect(result.current.isStreaming).toBe(true);
      expect(result.current.currentStream).toBeDefined();
    });
    
    it('should start stream with options', () => {
      const { result } = renderHook(() => useStream());
      
      act(() => {
        result.current.startStream('Hello', {
          model: 'claude-3-sonnet-20240229',
          temperature: 0.7
        });
      });
      
      expect(mockApi.startStream).toHaveBeenCalledWith({
        message: 'Hello',
        model: 'claude-3-sonnet-20240229',
        temperature: 0.7
      });
    });
    
    it('should add user message to messages', () => {
      const { result } = renderHook(() => useStream());
      
      act(() => {
        result.current.startStream('User message');
      });
      
      expect(result.current.messages).toHaveLength(1);
      expect(result.current.messages[0]).toMatchObject({
        role: 'user',
        content: 'User message'
      });
    });
  });
  
  describe('stream events', () => {
    it('should handle stream data chunks', () => {
      const { result } = renderHook(() => useStream());
      
      // Start stream
      act(() => {
        result.current.startStream('Hello');
      });
      
      // Simulate receiving chunks
      const dataHandler = mockApi.onStreamData.mock.calls[0][0];
      
      act(() => {
        dataHandler(null, {
          streamId: 'test-stream',
          chunk: { type: 'delta', delta: { text: 'Hello' } }
        });
      });
      
      expect(result.current.currentStream?.chunks).toHaveLength(1);
      expect(result.current.getAccumulatedText()).toBe('Hello');
      
      act(() => {
        dataHandler(null, {
          streamId: 'test-stream',
          chunk: { type: 'delta', delta: { text: ' World' } }
        });
      });
      
      expect(result.current.currentStream?.chunks).toHaveLength(2);
      expect(result.current.getAccumulatedText()).toBe('Hello World');
    });
    
    it('should handle stream end', () => {
      const { result } = renderHook(() => useStream());
      
      // Start stream
      act(() => {
        result.current.startStream('Hello');
      });
      
      // Add some chunks
      const dataHandler = mockApi.onStreamData.mock.calls[0][0];
      act(() => {
        dataHandler(null, {
          streamId: 'test-stream',
          chunk: { type: 'delta', delta: { text: 'Response text' } }
        });
      });
      
      // End stream
      const endHandler = mockApi.onStreamEnd.mock.calls[0][0];
      act(() => {
        endHandler(null, { streamId: 'test-stream' });
      });
      
      expect(result.current.isStreaming).toBe(false);
      expect(result.current.currentStream).toBeNull();
      expect(result.current.messages).toHaveLength(2);
      expect(result.current.messages[1]).toMatchObject({
        role: 'assistant',
        content: 'Response text'
      });
    });
    
    it('should handle stream error', () => {
      const { result } = renderHook(() => useStream());
      
      // Start stream
      act(() => {
        result.current.startStream('Hello');
      });
      
      // Send error
      const errorHandler = mockApi.onStreamError.mock.calls[0][0];
      act(() => {
        errorHandler(null, {
          streamId: 'test-stream',
          error: { type: 'error', message: 'Something went wrong' }
        });
      });
      
      expect(result.current.error).toEqual({
        type: 'error',
        message: 'Something went wrong'
      });
      expect(result.current.isStreaming).toBe(false);
    });
  });
  
  describe('stream control', () => {
    it('should abort stream', () => {
      const { result } = renderHook(() => useStream());
      
      act(() => {
        result.current.startStream('Hello');
      });
      
      act(() => {
        result.current.abortStream();
      });
      
      expect(mockApi.abortStream).toHaveBeenCalled();
      expect(result.current.isStreaming).toBe(false);
      expect(result.current.currentStream).toBeNull();
    });
    
    it('should pause stream', () => {
      const { result } = renderHook(() => useStream());
      
      act(() => {
        result.current.startStream('Hello');
      });
      
      act(() => {
        result.current.pauseStream();
      });
      
      expect(mockApi.pauseStream).toHaveBeenCalled();
      expect(result.current.isPaused).toBe(true);
    });
    
    it('should resume stream', () => {
      const { result } = renderHook(() => useStream());
      
      act(() => {
        result.current.startStream('Hello');
        result.current.pauseStream();
      });
      
      act(() => {
        result.current.resumeStream();
      });
      
      expect(mockApi.resumeStream).toHaveBeenCalled();
      expect(result.current.isPaused).toBe(false);
    });
  });
  
  describe('message management', () => {
    it('should clear messages', () => {
      const { result } = renderHook(() => useStream());
      
      // Add some messages
      act(() => {
        result.current.startStream('Message 1');
      });
      
      const endHandler = mockApi.onStreamEnd.mock.calls[0][0];
      act(() => {
        endHandler(null, { streamId: 'test-stream' });
      });
      
      expect(result.current.messages.length).toBeGreaterThan(0);
      
      // Clear messages
      act(() => {
        result.current.clearMessages();
      });
      
      expect(result.current.messages).toEqual([]);
    });
    
    it('should delete specific message', () => {
      const { result } = renderHook(() => useStream());
      
      // Add messages
      act(() => {
        result.current.startStream('Message 1');
      });
      
      const endHandler = mockApi.onStreamEnd.mock.calls[0][0];
      act(() => {
        endHandler(null, { streamId: 'test-stream' });
      });
      
      act(() => {
        result.current.startStream('Message 2');
      });
      
      expect(result.current.messages).toHaveLength(3); // User 1, Assistant 1, User 2
      
      const messageId = result.current.messages[1].id;
      
      act(() => {
        result.current.deleteMessage(messageId);
      });
      
      expect(result.current.messages).toHaveLength(2);
      expect(result.current.messages.find(m => m.id === messageId)).toBeUndefined();
    });
  });
  
  describe('cleanup', () => {
    it('should cleanup listeners on unmount', () => {
      const { unmount } = renderHook(() => useStream());
      
      unmount();
      
      expect(mockApi.offStreamData).toHaveBeenCalled();
      expect(mockApi.offStreamEnd).toHaveBeenCalled();
      expect(mockApi.offStreamError).toHaveBeenCalled();
    });
    
    it('should abort active stream on unmount', () => {
      const { result, unmount } = renderHook(() => useStream());
      
      act(() => {
        result.current.startStream('Hello');
      });
      
      unmount();
      
      expect(mockApi.abortStream).toHaveBeenCalled();
    });
  });
  
  describe('getAccumulatedText', () => {
    it('should return empty string when no stream', () => {
      const { result } = renderHook(() => useStream());
      
      expect(result.current.getAccumulatedText()).toBe('');
    });
    
    it('should accumulate text from delta chunks', () => {
      const { result } = renderHook(() => useStream());
      
      act(() => {
        result.current.startStream('Hello');
      });
      
      const dataHandler = mockApi.onStreamData.mock.calls[0][0];
      
      act(() => {
        dataHandler(null, {
          streamId: 'test-stream',
          chunk: { type: 'message_start' }
        });
        dataHandler(null, {
          streamId: 'test-stream',
          chunk: { type: 'delta', delta: { text: 'A' } }
        });
        dataHandler(null, {
          streamId: 'test-stream',
          chunk: { type: 'delta', delta: { text: 'B' } }
        });
        dataHandler(null, {
          streamId: 'test-stream',
          chunk: { type: 'delta', delta: { text: 'C' } }
        });
      });
      
      expect(result.current.getAccumulatedText()).toBe('ABC');
    });
  });
});