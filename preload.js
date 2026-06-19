const { contextBridge, ipcRenderer, webFrame } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  minimize: () => ipcRenderer.send('minimize'),
  maximize: () => ipcRenderer.send('maximize'),
  close: () => ipcRenderer.send('close'),
  navigate: (page) => ipcRenderer.send('navigate', page),
  zoomIn: () => { var z = Math.min((webFrame.getZoomFactor() || 1) + 0.1, 1.3); webFrame.setZoomFactor(z); return z },
  zoomOut: () => { var z = Math.max((webFrame.getZoomFactor() || 1) - 0.1, 0.8); webFrame.setZoomFactor(z); return z },
  zoomReset: () => { webFrame.setZoomFactor(1); return 1 },
  setZoom: (z) => webFrame.setZoomFactor(z),
  readFile: (fp) => ipcRenderer.invoke('read-file', fp),
  writeFile: (fp, data) => ipcRenderer.invoke('write-file', fp, data),
  selectFolder: () => ipcRenderer.invoke('select-folder'),
  getDefaultPath: () => ipcRenderer.invoke('get-default-path'),
  openUrl: (url) => ipcRenderer.invoke('open-url', url),
  onUpdateAvailable: (callback) => {
    ipcRenderer.on('update-available', (_, data) => callback(data))
  }
})

contextBridge.exposeInMainWorld('db', {
  init: () => ipcRenderer.invoke('db:init'),
  getSetting: (key) => ipcRenderer.sendSync('db:get-setting', key),
  setSetting: (key, value) => ipcRenderer.invoke('db:set-setting', key, value),
  getAllSettings: () => ipcRenderer.sendSync('db:get-all-settings'),
  getTags: () => ipcRenderer.sendSync('db:get-tags'),
  saveTag: (tag) => ipcRenderer.invoke('db:save-tag', tag),
  deleteTag: (id) => ipcRenderer.invoke('db:delete-tag', id),
  getSessionsGrouped: () => ipcRenderer.sendSync('db:get-sessions-grouped'),
  saveSession: (session) => ipcRenderer.invoke('db:save-session', session),
  updateSession: (id, taskName, tagId, note) => ipcRenderer.invoke('db:update-session', id, taskName, tagId, note),
  getTodayStats: () => ipcRenderer.sendSync('db:get-today-stats'),
  getTotalStats: () => ipcRenderer.sendSync('db:get-total-stats'),
  getPath: () => ipcRenderer.sendSync('db:get-path'),
  setPath: (newPath) => ipcRenderer.invoke('db:set-path', newPath)
})
