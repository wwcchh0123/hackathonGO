import { randomUUID } from 'crypto';
import { ClaudeExecutor, ClaudeExecutorOptions } from '../cli/claude-executor';

interface Stream {
  id: string;
  executor: ClaudeExecutor;
  event: any; // Electron IPC event
  isPaused: boolean;
  buffer: any[];
}

export interface StreamOptions extends ClaudeExecutorOptions {
  message: string;
}

export class StreamHandler {
  private streams: Map<string, Stream> = new Map();
  
  constructor() {}
  
  startStream(event: any, options: StreamOptions): string {
    const streamId = randomUUID();
    const executor = new ClaudeExecutor();
    
    // Store stream info
    const stream: Stream = {
      id: streamId,
      executor,
      event,
      isPaused: false,
      buffer: []
    };
    
    this.streams.set(streamId, stream);
    
    // Set up event handlers
    executor.on('data', (chunk) => {
      this.handleData(streamId, chunk);
    });
    
    executor.on('error', (error) => {
      this.handleError(streamId, error);
    });
    
    executor.on('end', () => {
      this.handleEnd(streamId);
    });
    
    executor.on('close', (code) => {
      this.handleClose(streamId, code);
    });
    
    // Execute the command
    const { message, ...executorOptions } = options;
    executor.execute(message, executorOptions);
    
    // Notify renderer that stream has started
    event.sender.send('stream-started', { streamId });
    
    return streamId;
  }
  
  private handleData(streamId: string, chunk: any) {
    const stream = this.streams.get(streamId);
    if (!stream) return;
    
    if (stream.isPaused) {
      // Buffer the data while paused
      stream.buffer.push(chunk);
    } else {
      // Send data to renderer
      stream.event.sender.send('stream-data', { streamId, chunk });
    }
  }
  
  private handleError(streamId: string, error: any) {
    const stream = this.streams.get(streamId);
    if (!stream) return;
    
    stream.event.sender.send('stream-error', { streamId, error });
  }
  
  private handleEnd(streamId: string) {
    const stream = this.streams.get(streamId);
    if (!stream) return;
    
    stream.event.sender.send('stream-end', { streamId });
    
    // Clean up the stream
    this.streams.delete(streamId);
  }
  
  private handleClose(streamId: string, code: number | null) {
    const stream = this.streams.get(streamId);
    if (!stream) return;
    
    stream.event.sender.send('stream-close', { streamId, code });
  }
  
  abortStream(streamId: string): boolean {
    const stream = this.streams.get(streamId);
    if (!stream) return false;
    
    stream.executor.abort();
    stream.event.sender.send('stream-aborted', { streamId });
    
    // Clean up
    this.streams.delete(streamId);
    
    return true;
  }
  
  pauseStream(streamId: string): boolean {
    const stream = this.streams.get(streamId);
    if (!stream) return false;
    
    stream.isPaused = true;
    return true;
  }
  
  resumeStream(streamId: string): boolean {
    const stream = this.streams.get(streamId);
    if (!stream) return false;
    
    stream.isPaused = false;
    
    // Flush buffered data
    while (stream.buffer.length > 0 && !stream.isPaused) {
      const chunk = stream.buffer.shift();
      stream.event.sender.send('stream-data', { streamId, chunk });
    }
    
    return true;
  }
  
  isStreamPaused(streamId: string): boolean {
    const stream = this.streams.get(streamId);
    return stream?.isPaused ?? false;
  }
  
  getExecutor(streamId: string): ClaudeExecutor | undefined {
    return this.streams.get(streamId)?.executor;
  }
  
  getActiveStreams(): string[] {
    return Array.from(this.streams.keys());
  }
  
  cleanup() {
    // Abort all active streams
    for (const [streamId, stream] of this.streams) {
      stream.executor.abort();
      stream.executor.cleanup();
    }
    
    // Clear the map
    this.streams.clear();
  }
}