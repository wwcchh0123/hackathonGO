import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

let mainWindow;
const isDev = process.env.ELECTRON_DEV === 'true';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    title: 'Claude Code Desktop',
  });

  if (isDev) {
    const devUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173';
    mainWindow.loadURL(devUrl);
  } else {
    const indexPath = path.join(process.cwd(), 'dist', 'index.html');
    mainWindow.loadFile(indexPath);
  }
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

let currentProcess = null;

ipcMain.handle('run-cli', async (_event, options) => {
  const { command, args = [], cwd, env = {} } = options || {};
  if (!command) {
    mainWindow.webContents.send('cli-event', { type: 'error', data: 'No command provided' });
    return;
  }

  if (currentProcess) {
    mainWindow.webContents.send('cli-event', { type: 'info', data: 'A process is already running.' });
    return;
  }

  const mergedEnv = { ...process.env, ...env };
  currentProcess = spawn(command, args, { cwd: cwd || process.cwd(), env: mergedEnv, shell: true });

  mainWindow.webContents.send('cli-event', { type: 'start', data: `${command} ${args.join(' ')}` });

  currentProcess.stdout.on('data', (chunk) => {
    mainWindow.webContents.send('cli-event', { type: 'stdout', data: chunk.toString() });
  });
  currentProcess.stderr.on('data', (chunk) => {
    mainWindow.webContents.send('cli-event', { type: 'stderr', data: chunk.toString() });
  });
  currentProcess.on('close', (code) => {
    mainWindow.webContents.send('cli-event', { type: 'exit', data: `Exited with code ${code}` });
    currentProcess = null;
  });
  currentProcess.on('error', (err) => {
    mainWindow.webContents.send('cli-event', { type: 'error', data: String(err) });
  });
});

ipcMain.handle('stop-cli', async () => {
  if (currentProcess) {
    currentProcess.kill('SIGINT');
  }
});

ipcMain.handle('send-cli-input', async (_event, line) => {
  if (currentProcess && currentProcess.stdin && typeof line === 'string') {
    currentProcess.stdin.write(line + '\n');
  }
});

ipcMain.handle('select-dir', async () => {
  const res = await dialog.showOpenDialog({ properties: ['openDirectory'] });
  if (res.canceled || res.filePaths.length === 0) return null;
  return res.filePaths[0];
});
