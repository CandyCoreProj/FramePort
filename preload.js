const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  status: () => ipcRenderer.invoke('status'),
  installYtdlp: (language) => ipcRenderer.invoke('install-ytdlp', language),
  installFfmpeg: (language) => ipcRenderer.invoke('install-ffmpeg', language),
  updateYtdlp: () => ipcRenderer.invoke('update-ytdlp'),
  pickFolder: () => ipcRenderer.invoke('pick-folder'),
  openFolder: (dir) => ipcRenderer.invoke('open-folder', dir),
  download: (opts) => ipcRenderer.invoke('download', opts),
  cancel: () => ipcRenderer.invoke('cancel'),
  onProgress: (cb) => ipcRenderer.on('progress', (_e, d) => cb(d)),
  onInstallProgress: (cb) => ipcRenderer.on('install-progress', (_e, d) => cb(d)),
  onLog: (cb) => ipcRenderer.on('log', (_e, d) => cb(d)),
});
