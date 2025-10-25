import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('api', {
  runCli: (options) => ipcRenderer.invoke('run-cli', options),
  stopCli: () => ipcRenderer.invoke('stop-cli'),
  sendCliInput: (line) => ipcRenderer.invoke('send-cli-input', line),
  onCliEvent: (cb) => {
    const listener = (_event, payload) => cb(payload);
    ipcRenderer.on('cli-event', listener);
    return () => ipcRenderer.removeListener('cli-event', listener);
  },
  selectDir: () => ipcRenderer.invoke('select-dir'),
});
