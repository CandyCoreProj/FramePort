const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  platform: process.platform,
  status: () => ipcRenderer.invoke('status'),
  encoders: () => ipcRenderer.invoke('encoders'),
  installYtdlp: (language) => ipcRenderer.invoke('install-ytdlp', language),
  installFfmpeg: (language) => ipcRenderer.invoke('install-ffmpeg', language),
  updateYtdlp: (language) => ipcRenderer.invoke('update-ytdlp', language),
  youtubeSignIn: (language) => ipcRenderer.invoke('youtube-sign-in', language),
  youtubeSignOut: (language) => ipcRenderer.invoke('youtube-sign-out', language),
  pickFolder:() => ipcRenderer.invoke('pick-folder'),
  openFolder: (dir) => ipcRenderer.invoke('open-folder', dir),
  showFile: (file) => ipcRenderer.invoke('show-file', file),
  setTheme: (theme) => ipcRenderer.invoke('set-theme', theme),
  download: (opts) => ipcRenderer.invoke('download', opts),
  cancel: () => ipcRenderer.invoke('cancel'),
  onProgress: (cb) => ipcRenderer.on('progress', (_e, d) => cb(d)),
  onInstallProgress: (cb) => ipcRenderer.on('install-progress', (_e, d) => cb(d)),
  onLog: (cb) => ipcRenderer.on('log', (_e, d) => cb(d)),
  appUpdateState: () => ipcRenderer.invoke('app-update-state'),
  installAppUpdate: () => ipcRenderer.invoke('install-app-update'),
  onAppUpdate: (cb) => ipcRenderer.on('app-update', (_e, d) => cb(d)),
});
