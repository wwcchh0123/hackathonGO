#!/usr/bin/env node

/**
 * VNC Desktop MCP Server
 * 为Claude Code提供VNC桌面控制工具
 */

import { spawn } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';

const execAsync = promisify(spawn);

// MCP协议消息处理
class VncMcpServer {
  constructor() {
    this.vncContainerId = null;
    this.requestId = 0;
    
    // 设置日志文件
    this.logFile = path.join(process.cwd(), 'mcp-vnc-server.log');
    this.log('🚀 VNC Desktop MCP Server initializing');
    this.log(`📍 Log file: ${this.logFile}`);
  }

  // 日志记录函数
  log(message) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}\n`;
    
    // 同时输出到stderr和文件
    console.error(logMessage.trim());
    
    try {
      fs.appendFileSync(this.logFile, logMessage);
    } catch (error) {
      console.error('❌ Failed to write to log file:', error.message);
    }
  }

  // 查找VNC容器
  async findVncContainer() {
    this.log('🔍 Searching for VNC container...');
    try {
      const { stdout } = await this.execCommand('docker ps --format "{{.ID}}\t{{.Image}}\t{{.Names}}" | grep computer-use-demo');
      this.log('📋 Docker ps output: ' + stdout);
      if (stdout.trim()) {
        const lines = stdout.trim().split('\n');
        const containerInfo = lines[0].split('\t');
        this.vncContainerId = containerInfo[0];
        this.log(`✅ Found VNC container: ${this.vncContainerId}`);
        return this.vncContainerId;
      }
      this.log('❌ No VNC container found in docker ps output');
    } catch (error) {
      this.log('❌ Error searching for VNC container: ' + error.message);
    }
    return null;
  }

  // 执行系统命令
  async execCommand(command) {
    return new Promise((resolve, reject) => {
      const child = spawn('sh', ['-c', command], { stdio: ['pipe', 'pipe', 'pipe'] });
      
      let stdout = '';
      let stderr = '';
      
      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      child.on('close', (code) => {
        if (code === 0) {
          resolve({ stdout, stderr });
        } else {
          reject(new Error(`Command failed with code ${code}: ${stderr}`));
        }
      });
    });
  }

  // 在VNC容器内执行截图
  async takeScreenshot() {
    this.log('📸 Starting screenshot capture');
    
    if (!this.vncContainerId) {
      this.log('🔍 No container ID, searching for VNC container...');
      await this.findVncContainer();
      if (!this.vncContainerId) {
        this.log('❌ No VNC container found');
        throw new Error('VNC容器未运行，请先启动VNC桌面环境');
      }
    }
    
    this.log(`📦 Using VNC container: ${this.vncContainerId}`);

    // 创建Python脚本
    const scriptContent = `import asyncio
import sys
import json
sys.path.append('/home/computeruse/computer_use_demo')
from tools.computer import ComputerTool20241022

async def screenshot():
    tool = ComputerTool20241022()
    result = await tool(action='screenshot')
    return {
        'success': True,
        'base64_image': result.base64_image,
        'width': getattr(result, 'width', None),
        'height': getattr(result, 'height', None)
    }

result = asyncio.run(screenshot())
print(json.dumps(result))`;

    // 将脚本写入容器，使用base64编码避免引号问题
    const scriptBase64 = Buffer.from(scriptContent).toString('base64');
    const writeCommand = `docker exec ${this.vncContainerId} sh -c 'echo "${scriptBase64}" | base64 -d > /tmp/screenshot.py'`;
    
    this.log('📝 Writing screenshot script to container...');
    await this.execCommand(writeCommand);
    
    // 执行脚本
    this.log('🚀 Executing screenshot script...');
    const execCommand = `docker exec ${this.vncContainerId} python3 /tmp/screenshot.py`;
    const { stdout, stderr } = await this.execCommand(execCommand);

    this.log('📄 Script stdout length: ' + (stdout?.length || 0));
    this.log('📄 Script stderr: ' + (stderr || 'none'));

    if (stderr && stderr.includes('Error')) {
      this.log('❌ Screenshot execution failed: ' + stderr);
      throw new Error(`截图执行失败: ${stderr}`);
    }

    const result = JSON.parse(stdout.trim());
    this.log('✅ Screenshot captured successfully, image size: ' + (result?.base64_image?.length || 0));
    return result;
  }

  // 在VNC容器内执行点击
  async clickAt(x, y) {
    if (!this.vncContainerId) {
      await this.findVncContainer();
      if (!this.vncContainerId) {
        throw new Error('VNC容器未运行');
      }
    }

    const pythonScript = `import asyncio; import sys; sys.path.append('/home/computeruse/computer_use_demo'); from tools.computer import ComputerTool20241022; import json; async def click(): tool = ComputerTool20241022(); result = await tool(action='click', coordinate=[${x}, ${y}]); return {'success': True, 'result': str(result)}; result = asyncio.run(click()); print(json.dumps(result))`;

    const command = `docker exec ${this.vncContainerId} python3 -c "${pythonScript}"`;
    const { stdout } = await this.execCommand(command);
    return JSON.parse(stdout.trim());
  }

  // 处理MCP请求
  async handleRequest(request) {
    this.log(`🔧 Handling request: ${request.method}`);
    try {
      switch (request.method) {
        case 'initialize':
          this.log('🔄 Initializing MCP server');
          return this.handleInitialize(request);
        
        case 'tools/list':
          this.log('📋 Listing available tools');
          return this.handleToolsList(request);
        
        case 'tools/call':
          this.log(`🛠️ Calling tool: ${request.params?.name}`);
          return this.handleToolCall(request);
        
        default:
          this.log(`❓ Unknown method: ${request.method}`);
          throw new Error(`Unknown method: ${request.method}`);
      }
    } catch (error) {
      this.log(`❌ Error in handleRequest: ${error.message}`);
      this.log(`❌ Error stack: ${error.stack}`);
      return {
        jsonrpc: '2.0',
        id: request.id,
        error: {
          code: -32603,
          message: error.message
        }
      };
    }
  }

  handleInitialize(request) {
    return {
      jsonrpc: '2.0',
      id: request.id,
      result: {
        protocolVersion: '2024-11-05',
        capabilities: {
          tools: {}
        },
        serverInfo: {
          name: 'vnc-desktop-mcp',
          version: '1.0.0'
        }
      }
    };
  }

  handleToolsList(request) {
    return {
      jsonrpc: '2.0',
      id: request.id,
      result: {
        tools: [
          {
            name: 'vnc_screenshot',
            description: '获取VNC桌面环境的截图',
            inputSchema: {
              type: 'object',
              properties: {},
              required: []
            }
          },
          {
            name: 'vnc_click',
            description: '在VNC桌面环境指定坐标点击',
            inputSchema: {
              type: 'object',
              properties: {
                x: { type: 'number', description: 'X坐标' },
                y: { type: 'number', description: 'Y坐标' }
              },
              required: ['x', 'y']
            }
          }
        ]
      }
    };
  }

  async handleToolCall(request) {
    const { name, arguments: args } = request.params;
    this.log(`🛠️ Tool call details: ${JSON.stringify({ name, args }, null, 2)}`);

    switch (name) {
      case 'vnc_screenshot':
        this.log('📸 Executing vnc_screenshot...');
        const screenshotResult = await this.takeScreenshot();
        const response = {
          jsonrpc: '2.0',
          id: request.id,
          result: {
            content: [
              {
                type: 'image',
                data: screenshotResult.base64_image,
                mimeType: 'image/png'
              },
              {
                type: 'text',
                text: `桌面截图完成 (${screenshotResult.width}x${screenshotResult.height})`
              }
            ]
          }
        };
        this.log('✅ vnc_screenshot completed successfully');
        return response;

      case 'vnc_click':
        this.log(`🖱️ Executing vnc_click at (${args.x}, ${args.y})...`);
        const { x, y } = args;
        const clickResult = await this.clickAt(x, y);
        const clickResponse = {
          jsonrpc: '2.0',
          id: request.id,
          result: {
            content: [
              {
                type: 'text',
                text: `在坐标 (${x}, ${y}) 点击完成`
              }
            ]
          }
        };
        this.log('✅ vnc_click completed successfully');
        return clickResponse;

      default:
        this.log(`❓ Unknown tool requested: ${name}`);
        throw new Error(`Unknown tool: ${name}`);
    }
  }

  // 启动MCP服务器
  start() {
    this.log('🚀 VNC Desktop MCP Server started');
    this.log('📍 Server PID: ' + process.pid);
    this.log('📍 Working directory: ' + process.cwd());

    process.stdin.on('data', async (data) => {
      const input = data.toString().trim();
      this.log('📥 Received input: ' + input);
      
      const lines = input.split('\n');
      
      for (const line of lines) {
        if (!line.trim()) continue;
        
        try {
          this.log('🔍 Processing line: ' + line);
          const request = JSON.parse(line);
          this.log('📋 Parsed request: ' + JSON.stringify(request, null, 2));
          
          const response = await this.handleRequest(request);
          this.log('📤 Sending response: ' + JSON.stringify(response, null, 2));
          console.log(JSON.stringify(response));
        } catch (error) {
          this.log('❌ Error processing request: ' + error);
          this.log('❌ Error stack: ' + error.stack);
          console.log(JSON.stringify({
            jsonrpc: '2.0',
            id: null,
            error: {
              code: -32700,
              message: 'Parse error: ' + error.message
            }
          }));
        }
      }
    });

    process.stdin.on('end', () => {
      this.log('📡 stdin ended');
    });

    process.stdin.on('error', (error) => {
      this.log('❌ stdin error: ' + error);
    });

    process.stdin.resume();
  }
}

// 启动服务器
const server = new VncMcpServer();
server.start();