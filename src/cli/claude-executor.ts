import { ChildProcess, spawn } from 'child_process';
import { EventEmitter } from 'events';
import { JSONStreamParser } from '../parser/json-stream-parser';
import { transformClaudeEvent } from '../transformer/event-transformer';

export interface ClaudeExecutorOptions {
  model?: string;
  apiKey?: string;
  baseUrl?: string;
  maxTokens?: number;
  temperature?: number;
}

export class ClaudeExecutor extends EventEmitter {
  private process: ChildProcess | null = null;
  private parser: JSONStreamParser | null = null;
  
  constructor() {
    super();
  }
  
  execute(message: string, options: ClaudeExecutorOptions = {}) {
    try {
      // Build command arguments
      const args = this.buildArguments(message, options);
      
      // Set up environment
      const env = {
        ...process.env,
        ...(options.apiKey && { ANTHROPIC_API_KEY: options.apiKey })
      };
      
      // Spawn claude process
      this.process = spawn('claude', args, {
        env,
        stdio: ['pipe', 'pipe', 'pipe']
      });
      
      // Set up parser
      this.parser = new JSONStreamParser();
      
      // Handle parsed events
      this.parser.on('data', (event: any) => {
        // Transform Claude event to our format
        const transformed = transformClaudeEvent(event);
        this.emit('data', transformed);
      });
      
      // Pipe stdout through parser
      if (this.process.stdout) {
        this.process.stdout.pipe(this.parser);
      }
      
      // Handle stderr
      if (this.process.stderr) {
        this.process.stderr.on('data', (data: Buffer) => {
          this.emit('error', {
            type: 'cli_error',
            message: data.toString()
          });
        });
      }
      
      // Handle process events
      this.process.on('close', (code: number | null) => {
        this.process = null; // Mark process as ended before emitting events
        this.emit('close', code);
        this.emit('end');
        this.cleanup();
      });
      
      this.process.on('error', (error: Error) => {
        this.emit('error', {
          type: 'process_error',
          message: error.message
        });
      });
      
    } catch (error: any) {
      this.emit('error', {
        type: 'spawn_error',
        message: error.message
      });
    }
  }
  
  private buildArguments(message: string, options: ClaudeExecutorOptions): string[] {
    const args = [
      '--output-format', 'stream-json',
      '--model', options.model || 'claude-4.5-sonnet',
    ];
    
    if (options.baseUrl) {
      args.push('--base-url', options.baseUrl);
    }
    
    if (options.maxTokens) {
      args.push('--max-tokens', options.maxTokens.toString());
    }
    
    if (options.temperature !== undefined) {
      args.push('--temperature', options.temperature.toString());
    }
    
    // Message must be last
    args.push(message);
    
    return args;
  }
  
  abort() {
    if (this.process) {
      this.process.kill('SIGTERM');
      this.emit('abort');
      this.cleanup();
    }
  }
  
  isRunning(): boolean {
    return this.process !== null && !this.process.killed;
  }
  
  cleanup() {
    if (this.process && !this.process.killed) {
      this.process.kill('SIGTERM');
    }
    
    if (this.parser) {
      this.parser.removeAllListeners();
      this.parser.destroy();
      this.parser = null;
    }
    
    this.process = null;
    this.removeAllListeners();
  }
}