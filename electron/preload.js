const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('api', {
  // 现有API
  sendMessage: (options) => ipcRenderer.invoke('send-message', options),
  selectDir: () => ipcRenderer.invoke('select-dir'),
  
  // 流式API
  startStream: (options) => {
    ipcRenderer.send('start-stream', options)
  },
  
  abortStream: (streamId) => {
    ipcRenderer.send('abort-stream', streamId)
  },
  
  pauseStream: (streamId) => {
    ipcRenderer.send('pause-stream', streamId)
  },
  
  resumeStream: (streamId) => {
    ipcRenderer.send('resume-stream', streamId)
  },
  
  // 流式事件监听器
  onStreamStarted: (callback) => {
    const handler = (event, data) => callback(event, data)
    ipcRenderer.on('stream-started', handler)
    return () => ipcRenderer.removeListener('stream-started', handler)
  },
  
  onStreamData: (callback) => {
    const handler = (event, data) => callback(event, data)
    ipcRenderer.on('stream-data', handler)
    return () => ipcRenderer.removeListener('stream-data', handler)
  },
  
  onStreamEnd: (callback) => {
    const handler = (event, data) => callback(event, data)
    ipcRenderer.on('stream-end', handler)
    return () => ipcRenderer.removeListener('stream-end', handler)
  },
  
  onStreamError: (callback) => {
    const handler = (event, data) => callback(event, data)
    ipcRenderer.on('stream-error', handler)
    return () => ipcRenderer.removeListener('stream-error', handler)
  },
  
  // 会话持久化API（文件存储）
  sessions: {
    load: () => ipcRenderer.invoke('sessions-load'),
    save: (data) => ipcRenderer.invoke('sessions-save', data),
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
