const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  loadChatHistory: () => ipcRenderer.invoke('load-chat-history'),
  saveChatHistory: (history) => ipcRenderer.invoke('save-chat-history', history),
  loadUserConfig: () => ipcRenderer.invoke('load-user-config'),
  saveUserConfig: (config) => ipcRenderer.invoke('save-user-config', config)
});
