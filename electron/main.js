const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');

const CONFIG_DIR = path.join(os.homedir(), '.nine_half_clock');
const CHAT_HISTORY_FILE = path.join(CONFIG_DIR, 'chat_history.json');
const USER_CONFIG_FILE = path.join(CONFIG_DIR, 'user_config.json');

function ensureConfigDir() {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }
}

function loadChatHistory() {
  ensureConfigDir();
  if (fs.existsSync(CHAT_HISTORY_FILE)) {
    try {
      const data = fs.readFileSync(CHAT_HISTORY_FILE, 'utf-8');
      return JSON.parse(data);
    } catch (err) {
      console.error('Error loading chat history:', err);
      return [];
    }
  }
  return [];
}

function saveChatHistory(history) {
  ensureConfigDir();
  try {
    fs.writeFileSync(CHAT_HISTORY_FILE, JSON.stringify(history, null, 2), 'utf-8');
    return { success: true };
  } catch (err) {
    console.error('Error saving chat history:', err);
    return { success: false, error: err.message };
  }
}

function loadUserConfig() {
  ensureConfigDir();
  if (fs.existsSync(USER_CONFIG_FILE)) {
    try {
      const data = fs.readFileSync(USER_CONFIG_FILE, 'utf-8');
      return JSON.parse(data);
    } catch (err) {
      console.error('Error loading user config:', err);
      return getDefaultConfig();
    }
  }
  return getDefaultConfig();
}

function getDefaultConfig() {
  return {
    llmModels: [],
    systemPrompt: 'You are a helpful assistant.',
    mcpServices: []
  };
}

function saveUserConfig(config) {
  ensureConfigDir();
  try {
    fs.writeFileSync(USER_CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8');
    return { success: true };
  } catch (err) {
    console.error('Error saving user config:', err);
    return { success: false, error: err.message };
  }
}

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    backgroundColor: '#1e1e1e',
    titleBarStyle: 'hiddenInset',
    frame: process.platform === 'darwin'
  });

  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

app.whenReady().then(() => {
  ipcMain.handle('load-chat-history', loadChatHistory);
  ipcMain.handle('save-chat-history', (event, history) => saveChatHistory(history));
  ipcMain.handle('load-user-config', loadUserConfig);
  ipcMain.handle('save-user-config', (event, config) => saveUserConfig(config));

  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});
