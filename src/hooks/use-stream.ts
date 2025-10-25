import { useState, useCallback, useEffect, useRef } from 'react';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface StreamChunk {
  type: string;
  delta?: {
    text: string;
  };
  [key: string]: any;
}

export interface CurrentStream {
  id: string;
  chunks: StreamChunk[];
  startTime: number;
}

export interface StreamError {
  type: string;
  message: string;
}

export interface StreamOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  command?: string;
  baseArgs?: string[];
  cwd?: string;
  env?: Record<string, string>;
}

export function useStream() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentStream, setCurrentStream] = useState<CurrentStream | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [error, setError] = useState<StreamError | null>(null);
  
  const streamIdRef = useRef<string | null>(null);
  
  const startStream = useCallback((message: string, options?: StreamOptions) => {
    // Clear error
    setError(null);
    
    // Add user message
    const userMessage: Message = {
      id: Date.now().toString() + '-user',
      role: 'user',
      content: message,
      timestamp: Date.now()
    };
    
    setMessages(prev => [...prev, userMessage]);
    
    // Start streaming
    setIsStreaming(true);
    setCurrentStream({
      id: Date.now().toString(),
      chunks: [],
      startTime: Date.now()
    });
    
    // Call IPC to start stream
    if (window.api?.startStream) {
      const streamOptions = {
        message,
        ...options
      };
      
      // startStream will trigger stream-started event with actual streamId
      window.api.startStream(streamOptions);
    }
  }, []);
  
  const handleChunk = useCallback((chunk: StreamChunk) => {
    setCurrentStream(prev => {
      if (!prev) return null;
      return {
        ...prev,
        chunks: [...prev.chunks, chunk]
      };
    });
  }, []);
  
  const handleStreamEnd = useCallback(() => {
    if (currentStream) {
      // Compile stream into message
      const content = getAccumulatedTextFromChunks(currentStream.chunks);
      
      if (content) {
        const assistantMessage: Message = {
          id: currentStream.id + '-assistant',
          role: 'assistant',
          content,
          timestamp: currentStream.startTime
        };
        
        setMessages(prev => [...prev, assistantMessage]);
      }
    }
    
    // Reset streaming state
    setCurrentStream(null);
    setIsStreaming(false);
    setIsPaused(false);
    streamIdRef.current = null;
  }, [currentStream]);
  
  const handleStreamError = useCallback((error: StreamError) => {
    setError(error);
    setIsStreaming(false);
    setCurrentStream(null);
    setIsPaused(false);
    streamIdRef.current = null;
  }, []);
  
  const abortStream = useCallback(() => {
    if (streamIdRef.current && window.api?.abortStream) {
      window.api.abortStream(streamIdRef.current);
    }
    setIsStreaming(false);
    setCurrentStream(null);
    setIsPaused(false);
    streamIdRef.current = null;
  }, []);
  
  const pauseStream = useCallback(() => {
    if (streamIdRef.current && window.api?.pauseStream) {
      window.api.pauseStream(streamIdRef.current);
      setIsPaused(true);
    }
  }, []);
  
  const resumeStream = useCallback(() => {
    if (streamIdRef.current && window.api?.resumeStream) {
      window.api.resumeStream(streamIdRef.current);
      setIsPaused(false);
    }
  }, []);
  
  const clearMessages = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);
  
  const deleteMessage = useCallback((messageId: string) => {
    setMessages(prev => prev.filter(m => m.id !== messageId));
  }, []);
  
  const getAccumulatedText = useCallback(() => {
    if (!currentStream) return '';
    return getAccumulatedTextFromChunks(currentStream.chunks);
  }, [currentStream]);
  
  // Set up IPC listeners
  useEffect(() => {
    const handleStarted = (event: any, data: any) => {
      console.log('Stream started with ID:', data.streamId);
      streamIdRef.current = data.streamId;
    };
    
    const handleData = (event: any, data: any) => {
      console.log('Stream data received:', data);
      if (!streamIdRef.current || data.streamId === streamIdRef.current) {
        handleChunk(data.chunk);
      }
    };
    
    const handleEnd = (event: any, data: any) => {
      console.log('Stream ended:', data);
      if (!streamIdRef.current || data.streamId === streamIdRef.current) {
        handleStreamEnd();
      }
    };
    
    const handleError = (event: any, data: any) => {
      console.log('Stream error:', data);
      if (!streamIdRef.current || data.streamId === streamIdRef.current || !data.streamId) {
        handleStreamError(data.error || { type: 'unknown', message: 'Unknown error' });
      }
    };
    
    // Add listeners
    if (window.api) {
      window.api.onStreamStarted?.(handleStarted);
      window.api.onStreamData?.(handleData);
      window.api.onStreamEnd?.(handleEnd);
      window.api.onStreamError?.(handleError);
    }
    
    // Cleanup
    return () => {
      if (window.api) {
        window.api.offStreamStarted?.(handleStarted);
        window.api.offStreamData?.(handleData);
        window.api.offStreamEnd?.(handleEnd);
        window.api.offStreamError?.(handleError);
      }
      
      // Abort any active stream
      if (streamIdRef.current && window.api?.abortStream) {
        window.api.abortStream(streamIdRef.current);
      }
    };
  }, [handleChunk, handleStreamEnd, handleStreamError]);
  
  return {
    messages,
    currentStream,
    isStreaming,
    isPaused,
    error,
    startStream,
    abortStream,
    pauseStream,
    resumeStream,
    clearMessages,
    deleteMessage,
    getAccumulatedText
  };
}

// Helper function to extract text from chunks
function getAccumulatedTextFromChunks(chunks: StreamChunk[]): string {
  return chunks
    .filter(chunk => chunk.type === 'delta' && chunk.delta?.text)
    .map(chunk => chunk.delta!.text)
    .join('');
}

// Type declaration for window.api
declare global {
  interface Window {
    api?: {
      startStream: (options: any) => void;
      abortStream: (streamId: string) => void;
      pauseStream: (streamId: string) => void;
      resumeStream: (streamId: string) => void;
      onStreamStarted: (callback: (event: any, data: any) => void) => void;
      onStreamData: (callback: (event: any, data: any) => void) => void;
      onStreamEnd: (callback: (event: any, data: any) => void) => void;
      onStreamError: (callback: (event: any, data: any) => void) => void;
      offStreamStarted: (callback: (event: any, data: any) => void) => void;
      offStreamData: (callback: (event: any, data: any) => void) => void;
      offStreamEnd: (callback: (event: any, data: any) => void) => void;
      offStreamError: (callback: (event: any, data: any) => void) => void;
    };
  }
}