const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  sendMessage: (options) => ipcRenderer.invoke('send-message', options),
  selectDir: () => ipcRenderer.invoke('select-dir'),
});
