const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('api', {
  // 现有API
  sendMessage: (options) => ipcRenderer.invoke('send-message', options),
  selectDir: () => ipcRenderer.invoke('select-dir'),
  
  // VNC管理API
  vnc: {
    start: () => ipcRenderer.invoke('start-vnc'),
    stop: () => ipcRenderer.invoke('stop-vnc'),
    status: () => ipcRenderer.invoke('vnc-status'),
    
    // 监听容器状态变化
    onContainerStopped: (callback) => {
      ipcRenderer.on('vnc-container-stopped', callback)
      return () => ipcRenderer.removeListener('vnc-container-stopped', callback)
    }
  }
})
