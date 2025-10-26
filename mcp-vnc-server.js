#!/usr/bin/env node

/**
 * VNC Desktop MCP Server
 * 为Claude Code提供VNC桌面控制工具
 */

import { spawn } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';

// VNC Docker 镜像配置 - 从环境变量读取
const VNC_DOCKER_IMAGE = process.env.VNC_DOCKER_IMAGE || 'aslan-spock-register.qiniu.io/devops/anthropic-quickstarts:computer-use-demo-latest';


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
      // 使用镜像名称的最后一部分进行匹配，兼容不同的镜像仓库前缀
      const imageName = VNC_DOCKER_IMAGE.split('/').pop() || 'computer-use-demo-latest';
      const { stdout } = await this.execCommand(`docker ps --format "{{.ID}}\t{{.Image}}\t{{.Names}}" | grep ${imageName}`);
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

  // 在VNC容器内执行点击（两步操作：移动鼠标 + 点击）
  async clickAt(x, y) {
    this.log(`🖱️ Executing click at (${x}, ${y}) - two-step operation`);
    
    if (!this.vncContainerId) {
      await this.findVncContainer();
      if (!this.vncContainerId) {
        throw new Error('VNC容器未运行');
      }
    }

    const pythonScript = `import asyncio
import sys
import json
sys.path.append('/home/computeruse/computer_use_demo')
from tools.computer import ComputerTool20241022

async def click():
    tool = ComputerTool20241022()
    # 步骤1: 移动鼠标到目标位置
    move_result = await tool(action='mouse_move', coordinate=[${x}, ${y}])
    # 步骤2: 执行点击
    click_result = await tool(action='left_click')
    return {'success': True, 'move_result': str(move_result), 'click_result': str(click_result)}

result = asyncio.run(click())
print(json.dumps(result))`;

    const scriptBase64 = Buffer.from(pythonScript).toString('base64');
    const writeCommand = `docker exec ${this.vncContainerId} sh -c 'echo "${scriptBase64}" | base64 -d > /tmp/click.py'`;
    await this.execCommand(writeCommand);
    
    const execCommand = `docker exec ${this.vncContainerId} python3 /tmp/click.py`;
    const { stdout } = await this.execCommand(execCommand);
    return JSON.parse(stdout.trim());
  }

  // 移动鼠标到指定坐标
  async mouseMove(x, y) {
    this.log(`🖱️ Moving mouse to (${x}, ${y})`);
    
    if (!this.vncContainerId) {
      await this.findVncContainer();
      if (!this.vncContainerId) {
        throw new Error('VNC容器未运行');
      }
    }

    const pythonScript = `import asyncio
import sys
import json
sys.path.append('/home/computeruse/computer_use_demo')
from tools.computer import ComputerTool20241022

async def mouse_move():
    tool = ComputerTool20241022()
    result = await tool(action='mouse_move', coordinate=[${x}, ${y}])
    return {'success': True, 'result': str(result)}

result = asyncio.run(mouse_move())
print(json.dumps(result))`;

    const scriptBase64 = Buffer.from(pythonScript).toString('base64');
    const writeCommand = `docker exec ${this.vncContainerId} sh -c 'echo "${scriptBase64}" | base64 -d > /tmp/mouse_move.py'`;
    await this.execCommand(writeCommand);
    
    const execCommand = `docker exec ${this.vncContainerId} python3 /tmp/mouse_move.py`;
    const { stdout } = await this.execCommand(execCommand);
    return JSON.parse(stdout.trim());
  }

  // 执行左键点击（在当前位置）
  async leftClick() {
    this.log('🖱️ Executing left click');
    
    if (!this.vncContainerId) {
      await this.findVncContainer();
      if (!this.vncContainerId) {
        throw new Error('VNC容器未运行');
      }
    }

    const pythonScript = `import asyncio
import sys
import json
sys.path.append('/home/computeruse/computer_use_demo')
from tools.computer import ComputerTool20241022

async def left_click():
    tool = ComputerTool20241022()
    result = await tool(action='left_click')
    return {'success': True, 'result': str(result)}

result = asyncio.run(left_click())
print(json.dumps(result))`;

    const scriptBase64 = Buffer.from(pythonScript).toString('base64');
    const writeCommand = `docker exec ${this.vncContainerId} sh -c 'echo "${scriptBase64}" | base64 -d > /tmp/left_click.py'`;
    await this.execCommand(writeCommand);
    
    const execCommand = `docker exec ${this.vncContainerId} python3 /tmp/left_click.py`;
    const { stdout } = await this.execCommand(execCommand);
    return JSON.parse(stdout.trim());
  }

  // 执行右键点击（在当前位置）
  async rightClick() {
    this.log('🖱️ Executing right click');
    
    if (!this.vncContainerId) {
      await this.findVncContainer();
      if (!this.vncContainerId) {
        throw new Error('VNC容器未运行');
      }
    }

    const pythonScript = `import asyncio
import sys
import json
sys.path.append('/home/computeruse/computer_use_demo')
from tools.computer import ComputerTool20241022

async def right_click():
    tool = ComputerTool20241022()
    result = await tool(action='right_click')
    return {'success': True, 'result': str(result)}

result = asyncio.run(right_click())
print(json.dumps(result))`;

    const scriptBase64 = Buffer.from(pythonScript).toString('base64');
    const writeCommand = `docker exec ${this.vncContainerId} sh -c 'echo "${scriptBase64}" | base64 -d > /tmp/right_click.py'`;
    await this.execCommand(writeCommand);
    
    const execCommand = `docker exec ${this.vncContainerId} python3 /tmp/right_click.py`;
    const { stdout } = await this.execCommand(execCommand);
    return JSON.parse(stdout.trim());
  }

  // 执行双击（在当前位置）
  async doubleClick() {
    this.log('🖱️ Executing double click');
    
    if (!this.vncContainerId) {
      await this.findVncContainer();
      if (!this.vncContainerId) {
        throw new Error('VNC容器未运行');
      }
    }

    const pythonScript = `import asyncio
import sys
import json
sys.path.append('/home/computeruse/computer_use_demo')
from tools.computer import ComputerTool20241022

async def double_click():
    tool = ComputerTool20241022()
    result = await tool(action='double_click')
    return {'success': True, 'result': str(result)}

result = asyncio.run(double_click())
print(json.dumps(result))`;

    const scriptBase64 = Buffer.from(pythonScript).toString('base64');
    const writeCommand = `docker exec ${this.vncContainerId} sh -c 'echo "${scriptBase64}" | base64 -d > /tmp/double_click.py'`;
    await this.execCommand(writeCommand);
    
    const execCommand = `docker exec ${this.vncContainerId} python3 /tmp/double_click.py`;
    const { stdout } = await this.execCommand(execCommand);
    return JSON.parse(stdout.trim());
  }

  // 执行拖拽操作
  async leftClickDrag(x, y) {
    this.log(`🖱️ Executing drag to (${x}, ${y})`);
    
    if (!this.vncContainerId) {
      await this.findVncContainer();
      if (!this.vncContainerId) {
        throw new Error('VNC容器未运行');
      }
    }

    const pythonScript = `import asyncio
import sys
import json
sys.path.append('/home/computeruse/computer_use_demo')
from tools.computer import ComputerTool20241022

async def drag():
    tool = ComputerTool20241022()
    result = await tool(action='left_click_drag', coordinate=[${x}, ${y}])
    return {'success': True, 'result': str(result)}

result = asyncio.run(drag())
print(json.dumps(result))`;

    const scriptBase64 = Buffer.from(pythonScript).toString('base64');
    const writeCommand = `docker exec ${this.vncContainerId} sh -c 'echo "${scriptBase64}" | base64 -d > /tmp/drag.py'`;
    await this.execCommand(writeCommand);
    
    const execCommand = `docker exec ${this.vncContainerId} python3 /tmp/drag.py`;
    const { stdout } = await this.execCommand(execCommand);
    return JSON.parse(stdout.trim());
  }

  // 获取当前鼠标位置
  async getCursorPosition() {
    this.log('🖱️ Getting cursor position');
    
    if (!this.vncContainerId) {
      await this.findVncContainer();
      if (!this.vncContainerId) {
        throw new Error('VNC容器未运行');
      }
    }

    const pythonScript = `import asyncio
import sys
import json
sys.path.append('/home/computeruse/computer_use_demo')
from tools.computer import ComputerTool20241022

async def get_cursor():
    tool = ComputerTool20241022()
    result = await tool(action='screenshot')
    # 注意：computer.py 可能没有直接的cursor action，需要通过其他方式获取
    return {'success': True, 'note': 'cursor position not directly available'}

result = asyncio.run(get_cursor())
print(json.dumps(result))`;

    const scriptBase64 = Buffer.from(pythonScript).toString('base64');
    const writeCommand = `docker exec ${this.vncContainerId} sh -c 'echo "${scriptBase64}" | base64 -d > /tmp/cursor_pos.py'`;
    await this.execCommand(writeCommand);
    
    const execCommand = `docker exec ${this.vncContainerId} python3 /tmp/cursor_pos.py`;
    const { stdout } = await this.execCommand(execCommand);
    return JSON.parse(stdout.trim());
  }

  // 键盘按键操作
  async pressKey(text) {
    this.log(`⌨️ Pressing key: ${text}`);
    
    if (!this.vncContainerId) {
      await this.findVncContainer();
      if (!this.vncContainerId) {
        throw new Error('VNC容器未运行');
      }
    }

    const pythonScript = `import asyncio
import sys
import json
sys.path.append('/home/computeruse/computer_use_demo')
from tools.computer import ComputerTool20241022

async def press_key():
    tool = ComputerTool20241022()
    result = await tool(action='key', text='${text}')
    return {'success': True, 'result': str(result)}

result = asyncio.run(press_key())
print(json.dumps(result))`;

    const scriptBase64 = Buffer.from(pythonScript).toString('base64');
    const writeCommand = `docker exec ${this.vncContainerId} sh -c 'echo "${scriptBase64}" | base64 -d > /tmp/press_key.py'`;
    await this.execCommand(writeCommand);
    
    const execCommand = `docker exec ${this.vncContainerId} python3 /tmp/press_key.py`;
    const { stdout } = await this.execCommand(execCommand);
    return JSON.parse(stdout.trim());
  }

  // 文本输入操作
  async typeText(text) {
    this.log(`⌨️ Typing text: ${text}`);
    
    if (!this.vncContainerId) {
      await this.findVncContainer();
      if (!this.vncContainerId) {
        throw new Error('VNC容器未运行');
      }
    }

    // 转义特殊字符，避免在Python字符串中出现问题
    const escapedText = text.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n').replace(/\r/g, '\\r');

    const pythonScript = `import asyncio
import sys
import json
sys.path.append('/home/computeruse/computer_use_demo')
from tools.computer import ComputerTool20241022

async def type_text():
    tool = ComputerTool20241022()
    result = await tool(action='type', text='${escapedText}')
    return {'success': True, 'result': str(result)}

result = asyncio.run(type_text())
print(json.dumps(result))`;

    const scriptBase64 = Buffer.from(pythonScript).toString('base64');
    const writeCommand = `docker exec ${this.vncContainerId} sh -c 'echo "${scriptBase64}" | base64 -d > /tmp/type_text.py'`;
    await this.execCommand(writeCommand);
    
    const execCommand = `docker exec ${this.vncContainerId} python3 /tmp/type_text.py`;
    const { stdout } = await this.execCommand(execCommand);
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
        
        case 'notifications/initialized':
          this.log('📢 Handling initialized notification');
          return this.handleInitializedNotification(request);
        
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
        protocolVersion: '2025-06-18',
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

  handleInitializedNotification(request) {
    // 这是一个通知，不需要返回响应
    this.log('✅ Client initialized notification received');
    return null;
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
          },
          {
            name: 'vnc_mouse_move',
            description: '移动鼠标到指定坐标',
            inputSchema: {
              type: 'object',
              properties: {
                x: { type: 'number', description: 'X坐标' },
                y: { type: 'number', description: 'Y坐标' }
              },
              required: ['x', 'y']
            }
          },
          {
            name: 'vnc_left_click',
            description: '执行鼠标左键点击（在当前位置）',
            inputSchema: {
              type: 'object',
              properties: {},
              required: []
            }
          },
          {
            name: 'vnc_right_click',
            description: '执行鼠标右键点击（在当前位置）',
            inputSchema: {
              type: 'object',
              properties: {},
              required: []
            }
          },
          {
            name: 'vnc_double_click',
            description: '执行鼠标双击（在当前位置）',
            inputSchema: {
              type: 'object',
              properties: {},
              required: []
            }
          },
          {
            name: 'vnc_drag',
            description: '拖拽操作，从当前位置拖拽到目标位置',
            inputSchema: {
              type: 'object',
              properties: {
                x: { type: 'number', description: '目标X坐标' },
                y: { type: 'number', description: '目标Y坐标' }
              },
              required: ['x', 'y']
            }
          },
          {
            name: 'vnc_cursor_position',
            description: '获取当前鼠标位置',
            inputSchema: {
              type: 'object',
              properties: {},
              required: []
            }
          },
          {
            name: 'vnc_key',
            description: '按下特定按键（如Enter、Tab、Ctrl+C等）',
            inputSchema: {
              type: 'object',
              properties: {
                text: { type: 'string', description: '按键名称（如 "Return", "Tab", "ctrl+c"）' }
              },
              required: ['text']
            }
          },
          {
            name: 'vnc_type',
            description: '输入文本内容',
            inputSchema: {
              type: 'object',
              properties: {
                text: { type: 'string', description: '要输入的文本' }
              },
              required: ['text']
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
        await this.clickAt(x, y);
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

      case 'vnc_mouse_move':
        this.log(`🖱️ Executing vnc_mouse_move to (${args.x}, ${args.y})...`);
        await this.mouseMove(args.x, args.y);
        return {
          jsonrpc: '2.0',
          id: request.id,
          result: {
            content: [
              {
                type: 'text',
                text: `鼠标移动到坐标 (${args.x}, ${args.y}) 完成`
              }
            ]
          }
        };

      case 'vnc_left_click':
        this.log('🖱️ Executing vnc_left_click...');
        await this.leftClick();
        return {
          jsonrpc: '2.0',
          id: request.id,
          result: {
            content: [
              {
                type: 'text',
                text: '鼠标左键点击完成'
              }
            ]
          }
        };

      case 'vnc_right_click':
        this.log('🖱️ Executing vnc_right_click...');
        await this.rightClick();
        return {
          jsonrpc: '2.0',
          id: request.id,
          result: {
            content: [
              {
                type: 'text',
                text: '鼠标右键点击完成'
              }
            ]
          }
        };

      case 'vnc_double_click':
        this.log('🖱️ Executing vnc_double_click...');
        await this.doubleClick();
        return {
          jsonrpc: '2.0',
          id: request.id,
          result: {
            content: [
              {
                type: 'text',
                text: '鼠标双击完成'
              }
            ]
          }
        };

      case 'vnc_drag':
        this.log(`🖱️ Executing vnc_drag to (${args.x}, ${args.y})...`);
        await this.leftClickDrag(args.x, args.y);
        return {
          jsonrpc: '2.0',
          id: request.id,
          result: {
            content: [
              {
                type: 'text',
                text: `拖拽到坐标 (${args.x}, ${args.y}) 完成`
              }
            ]
          }
        };

      case 'vnc_cursor_position':
        this.log('🖱️ Executing vnc_cursor_position...');
        const posResult = await this.getCursorPosition();
        return {
          jsonrpc: '2.0',
          id: request.id,
          result: {
            content: [
              {
                type: 'text',
                text: `当前鼠标位置: ${JSON.stringify(posResult.position)}`
              }
            ]
          }
        };

      case 'vnc_key':
        this.log(`⌨️ Executing vnc_key with text: ${args.text}`);
        await this.pressKey(args.text);
        return {
          jsonrpc: '2.0',
          id: request.id,
          result: {
            content: [
              {
                type: 'text',
                text: `按键 "${args.text}" 执行完成`
              }
            ]
          }
        };

      case 'vnc_type':
        this.log(`⌨️ Executing vnc_type with text: ${args.text}`);
        await this.typeText(args.text);
        return {
          jsonrpc: '2.0',
          id: request.id,
          result: {
            content: [
              {
                type: 'text',
                text: `文本输入完成: "${args.text}"`
              }
            ]
          }
        };

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
          if (response !== null) {
            this.log('📤 Sending response: ' + JSON.stringify(response, null, 2));
            console.log(JSON.stringify(response));
          } else {
            this.log('📤 No response needed (notification)');
          }
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