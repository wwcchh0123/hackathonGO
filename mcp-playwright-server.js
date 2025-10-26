#!/usr/bin/env node

/**
 * Playwright Browser MCP Server
 * 提供持久化浏览器上下文,支持保存登录状态
 */

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class PlaywrightMcpServer {
  constructor() {
    this.browserProcess = null;
    this.userDataDir = process.env.PLAYWRIGHT_USER_DATA_DIR || path.join(process.cwd(), '.playwright-user-data');
    this.headless = process.env.PLAYWRIGHT_HEADLESS !== 'false';
    
    this.logFile = path.join(process.cwd(), 'mcp-playwright-server.log');
    this.log('🚀 Playwright Browser MCP Server initializing');
    this.log(`📍 User Data Directory: ${this.userDataDir}`);
    this.log(`📍 Headless Mode: ${this.headless}`);
    
    this.ensureUserDataDir();
  }

  log(message) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}\n`;
    
    console.error(logMessage.trim());
    
    try {
      fs.appendFileSync(this.logFile, logMessage);
    } catch (error) {
      console.error('❌ Failed to write to log file:', error.message);
    }
  }

  ensureUserDataDir() {
    if (!fs.existsSync(this.userDataDir)) {
      fs.mkdirSync(this.userDataDir, { recursive: true });
      this.log(`📁 Created user data directory: ${this.userDataDir}`);
    }
  }

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

  async launchBrowser(url, options = {}) {
    this.log(`🌐 Launching browser with persistent context`);
    this.log(`🔗 URL: ${url || 'about:blank'}`);
    
    const browserType = options.browserType || 'chromium';
    const headless = options.headless !== undefined ? options.headless : this.headless;
    
    const scriptContent = `
import { ${browserType} } from 'playwright';

async function launch() {
  const context = await ${browserType}.launchPersistentContext('${this.userDataDir}', {
    headless: ${headless},
    viewport: { width: 1280, height: 720 },
    acceptDownloads: true,
    ${options.slowMo ? `slowMo: ${options.slowMo},` : ''}
  });
  
  const page = context.pages()[0] || await context.newPage();
  
  ${url ? `await page.goto('${url}');` : ''}
  
  console.log(JSON.stringify({
    success: true,
    url: page.url(),
    title: await page.title()
  }));
}

launch().catch(err => {
  console.error(JSON.stringify({
    success: false,
    error: err.message
  }));
  process.exit(1);
});
`;

    const scriptPath = path.join(this.userDataDir, 'launch-browser.mjs');
    fs.writeFileSync(scriptPath, scriptContent);
    
    const { stdout } = await this.execCommand(`node ${scriptPath}`);
    return JSON.parse(stdout.trim());
  }

  async navigateToUrl(url) {
    this.log(`🧭 Navigating to: ${url}`);
    
    const scriptContent = `
import { chromium } from 'playwright';

async function navigate() {
  const context = await chromium.launchPersistentContext('${this.userDataDir}', {
    headless: ${this.headless}
  });
  
  const page = context.pages()[0] || await context.newPage();
  await page.goto('${url}');
  
  console.log(JSON.stringify({
    success: true,
    url: page.url(),
    title: await page.title()
  }));
  
  await context.close();
}

navigate().catch(err => {
  console.error(JSON.stringify({
    success: false,
    error: err.message
  }));
  process.exit(1);
});
`;

    const scriptPath = path.join(this.userDataDir, 'navigate.mjs');
    fs.writeFileSync(scriptPath, scriptContent);
    
    const { stdout } = await this.execCommand(`node ${scriptPath}`);
    return JSON.parse(stdout.trim());
  }

  async executeScript(script) {
    this.log(`📜 Executing script in browser context`);
    
    const scriptContent = `
import { chromium } from 'playwright';

async function execute() {
  const context = await chromium.launchPersistentContext('${this.userDataDir}', {
    headless: ${this.headless}
  });
  
  const page = context.pages()[0] || await context.newPage();
  
  const result = await page.evaluate(() => {
    ${script}
  });
  
  console.log(JSON.stringify({
    success: true,
    result: result
  }));
  
  await context.close();
}

execute().catch(err => {
  console.error(JSON.stringify({
    success: false,
    error: err.message
  }));
  process.exit(1);
});
`;

    const scriptPath = path.join(this.userDataDir, 'execute-script.mjs');
    fs.writeFileSync(scriptPath, scriptContent);
    
    const { stdout } = await this.execCommand(`node ${scriptPath}`);
    return JSON.parse(stdout.trim());
  }

  async clearUserData() {
    this.log('🗑️  Clearing user data directory');
    
    try {
      if (fs.existsSync(this.userDataDir)) {
        fs.rmSync(this.userDataDir, { recursive: true, force: true });
        this.ensureUserDataDir();
        return { success: true, message: 'User data cleared' };
      }
      return { success: true, message: 'No user data to clear' };
    } catch (error) {
      this.log(`❌ Error clearing user data: ${error.message}`);
      throw error;
    }
  }

  async handleRequest(request) {
    this.log(`🔧 Handling request: ${request.method}`);
    try {
      switch (request.method) {
        case 'initialize':
          return this.handleInitialize(request);
        
        case 'notifications/initialized':
          return this.handleInitializedNotification(request);
        
        case 'tools/list':
          return this.handleToolsList(request);
        
        case 'tools/call':
          return this.handleToolCall(request);
        
        default:
          throw new Error(`Unknown method: ${request.method}`);
      }
    } catch (error) {
      this.log(`❌ Error in handleRequest: ${error.message}`);
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
          name: 'playwright-browser-mcp',
          version: '1.0.0'
        }
      }
    };
  }

  handleInitializedNotification(request) {
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
            name: 'playwright_launch_browser',
            description: '启动持久化浏览器(支持保存登录状态)',
            inputSchema: {
              type: 'object',
              properties: {
                url: { type: 'string', description: '要打开的URL(可选)' },
                browserType: { type: 'string', enum: ['chromium', 'firefox', 'webkit'], description: '浏览器类型' },
                headless: { type: 'boolean', description: '是否无头模式' },
                slowMo: { type: 'number', description: '慢速模式延迟(毫秒)' }
              },
              required: []
            }
          },
          {
            name: 'playwright_navigate',
            description: '在持久化浏览器中导航到指定URL',
            inputSchema: {
              type: 'object',
              properties: {
                url: { type: 'string', description: '目标URL' }
              },
              required: ['url']
            }
          },
          {
            name: 'playwright_execute_script',
            description: '在浏览器中执行JavaScript脚本',
            inputSchema: {
              type: 'object',
              properties: {
                script: { type: 'string', description: 'JavaScript代码' }
              },
              required: ['script']
            }
          },
          {
            name: 'playwright_clear_data',
            description: '清除浏览器用户数据(cookies、localStorage等)',
            inputSchema: {
              type: 'object',
              properties: {},
              required: []
            }
          }
        ]
      }
    };
  }

  async handleToolCall(request) {
    const { name, arguments: args } = request.params;
    this.log(`🛠️  Tool call: ${name}`);

    switch (name) {
      case 'playwright_launch_browser':
        const launchResult = await this.launchBrowser(args.url, args);
        return {
          jsonrpc: '2.0',
          id: request.id,
          result: {
            content: [
              {
                type: 'text',
                text: `浏览器启动成功\n标题: ${launchResult.title}\nURL: ${launchResult.url}\n用户数据目录: ${this.userDataDir}`
              }
            ]
          }
        };

      case 'playwright_navigate':
        const navResult = await this.navigateToUrl(args.url);
        return {
          jsonrpc: '2.0',
          id: request.id,
          result: {
            content: [
              {
                type: 'text',
                text: `导航成功\n标题: ${navResult.title}\nURL: ${navResult.url}`
              }
            ]
          }
        };

      case 'playwright_execute_script':
        const execResult = await this.executeScript(args.script);
        return {
          jsonrpc: '2.0',
          id: request.id,
          result: {
            content: [
              {
                type: 'text',
                text: `脚本执行成功\n结果: ${JSON.stringify(execResult.result, null, 2)}`
              }
            ]
          }
        };

      case 'playwright_clear_data':
        const clearResult = await this.clearUserData();
        return {
          jsonrpc: '2.0',
          id: request.id,
          result: {
            content: [
              {
                type: 'text',
                text: clearResult.message
              }
            ]
          }
        };

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  }

  start() {
    this.log('🚀 Playwright Browser MCP Server started');
    this.log('📍 Server PID: ' + process.pid);

    process.stdin.on('data', async (data) => {
      const input = data.toString().trim();
      this.log('📥 Received input: ' + input);
      
      const lines = input.split('\n');
      
      for (const line of lines) {
        if (!line.trim()) continue;
        
        try {
          const request = JSON.parse(line);
          this.log('📋 Parsed request: ' + JSON.stringify(request, null, 2));
          
          const response = await this.handleRequest(request);
          if (response !== null) {
            this.log('📤 Sending response');
            console.log(JSON.stringify(response));
          }
        } catch (error) {
          this.log('❌ Error processing request: ' + error);
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

    process.stdin.resume();
  }
}

const server = new PlaywrightMcpServer();
server.start();
