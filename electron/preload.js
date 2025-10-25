const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('api', {
  // 现有API
  sendMessage: (options) => ipcRenderer.invoke('send-message', options),
  selectDir: () => ipcRenderer.invoke('select-dir'),
  
  // 会话持久化API（文件存储）
  sessions: {
    load: () => ipcRenderer.invoke('sessions-load'),
    save: (data) => ipcRenderer.invoke('sessions-save', data),
  },
  
  // 流式输出API
  onClaudeStream: (callback) => {
    ipcRenderer.on('claude-stream', callback)
    return () => ipcRenderer.removeListener('claude-stream', callback)
  },
  
  offClaudeStream: (callback) => {
    ipcRenderer.removeListener('claude-stream', callback)
  },
  
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
