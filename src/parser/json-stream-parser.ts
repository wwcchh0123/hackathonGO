import { Transform, TransformCallback } from 'stream';

export class JSONStreamParser extends Transform {
  private buffer: string = '';
  
  constructor() {
    super({ objectMode: true });
  }
  
  parseLine(line: string): any {
    if (!line.trim()) {
      return null;
    }
    
    try {
      return JSON.parse(line);
    } catch (error: any) {
      return {
        type: 'parse_error',
        error: error.message
      };
    }
  }
  
  _transform(chunk: Buffer | string, encoding: string, callback: TransformCallback): void {
    // 将 chunk 添加到缓冲区
    this.buffer += chunk.toString();
    
    // 按行分割
    const lines = this.buffer.split('\n');
    
    // 保留最后一个不完整的行在缓冲区
    this.buffer = lines.pop() || '';
    
    // 处理完整的行
    for (const line of lines) {
      const result = this.parseLine(line);
      if (result !== null) {
        this.push(result);
      }
    }
    
    callback();
  }
  
  _flush(callback: TransformCallback): void {
    // 处理缓冲区中剩余的数据
    if (this.buffer.trim()) {
      const result = this.parseLine(this.buffer);
      if (result !== null) {
        this.push(result);
      }
    }
    callback();
  }
  
  // 为了兼容直接调用
  write(chunk: any): boolean {
    return super.write(chunk);
  }
  
  end(chunk?: any): this {
    return super.end(chunk);
  }
}