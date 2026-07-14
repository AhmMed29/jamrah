const { contextBridge, ipcRenderer } = require('electron')

var electronAPI = {
  minimize: () => ipcRenderer.send('minimize'),
  maximize: () => ipcRenderer.send('maximize'),
  close: () => ipcRenderer.send('close'),
  navigate: (page) => ipcRenderer.send('navigate', page),
  zoomIn: () => ipcRenderer.invoke('zoom-in'),
  zoomOut: () => ipcRenderer.invoke('zoom-out'),
  zoomReset: () => ipcRenderer.invoke('zoom-reset'),
  setZoom: (z) => ipcRenderer.invoke('zoom-set', z),
  readFile: (fp) => ipcRenderer.invoke('read-file', fp),
  writeFile: (fp, data) => ipcRenderer.invoke('write-file', fp, data),
  selectFolder: () => ipcRenderer.invoke('select-folder'),
  getDefaultPath: () => ipcRenderer.invoke('get-default-path'),
  openUrl: (url) => ipcRenderer.invoke('open-url', url),
  onUpdateAvailable: (callback) => {
    ipcRenderer.on('update-available', (_, data) => callback(data))
  },
  onUpdateProgress: (callback) => {
    ipcRenderer.on('update-progress', (_, pct) => callback(pct))
  },
  onUpdateDownloaded: (callback) => {
    ipcRenderer.on('update-downloaded', () => callback())
  },
  startDownload: () => ipcRenderer.invoke('start-download'),
  quitAndInstall: () => ipcRenderer.invoke('quit-and-install'),
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  backupDo: (dir) => ipcRenderer.invoke('backup:do', dir),
  backupSelectFolder: () => ipcRenderer.invoke('backup:select-folder'),
  backupSelectFiles: () => ipcRenderer.invoke('backup:select-files'),
  backupRestore: (files) => ipcRenderer.invoke('backup:restore', files),
  backupGetInfo: () => ipcRenderer.invoke('backup:get-info'),
  backupGetDefaultPath: () => ipcRenderer.invoke('backup:get-default-path'),
  backupOpenFolder: (folderPath) => ipcRenderer.invoke('backup:open-folder', folderPath),
  closeApp: () => ipcRenderer.send('close-app'),
  onShortcut: (callback) => {
    ipcRenderer.on('shortcut', (_, action) => callback(action))
  }
}

contextBridge.exposeInMainWorld('electronAPI', electronAPI)

var db = {
  init: () => ipcRenderer.invoke('db:init'),
  getSetting: (key) => ipcRenderer.invoke('db:get-setting', key),
  setSetting: (key, value) => ipcRenderer.invoke('db:set-setting', key, value),
  getAllSettings: () => ipcRenderer.invoke('db:get-all-settings'),
  getTags: () => ipcRenderer.invoke('db:get-tags'),
  getTagsWithGoals: () => ipcRenderer.invoke('db:get-tags-with-goals'),
  saveTag: (tag) => ipcRenderer.invoke('db:save-tag', tag),
  deleteTag: (id) => ipcRenderer.invoke('db:delete-tag', id),
  getSessionsGrouped: () => ipcRenderer.invoke('db:get-sessions-grouped'),
  saveSession: (session) => ipcRenderer.invoke('db:save-session', session),
  updateSession: (id, taskName, tagId, note, goalId) => ipcRenderer.invoke('db:update-session', id, taskName, tagId, note, goalId),
  deleteSession: (id) => ipcRenderer.invoke('db:delete-session', id),
  getTodayStats: () => ipcRenderer.invoke('db:get-today-stats'),
  getTotalStats: () => ipcRenderer.invoke('db:get-total-stats'),
  getPath: () => ipcRenderer.invoke('db:get-path'),
  setPath: (newPath) => ipcRenderer.invoke('db:set-path', newPath),
  getGoals: () => ipcRenderer.invoke('db:get-goals'),
  createGoal: (goal) => ipcRenderer.invoke('db:create-goal', goal),
  updateGoal: (id, goal) => ipcRenderer.invoke('db:update-goal', id, goal),
  deleteGoal: (id) => ipcRenderer.invoke('db:delete-goal', id),
  getGoalProgress: (goalId) => ipcRenderer.invoke('db:get-goal-progress', goalId),
  getSessionsByTag: (tagId) => ipcRenderer.invoke('db:get-sessions-by-tag', tagId),
  getSessionsByGoal: (goalId) => ipcRenderer.invoke('db:get-sessions-by-goal', goalId),
  getTasks: (goalId) => ipcRenderer.invoke('db:get-tasks', goalId),
  createTask: (task) => ipcRenderer.invoke('db:create-task', task),
  toggleTask: (id) => ipcRenderer.invoke('db:toggle-task', id),
  updateTask: (id, data) => ipcRenderer.invoke('db:update-task', id, data),
  deleteTask: (id) => ipcRenderer.invoke('db:delete-task', id),
  getHabits: () => ipcRenderer.invoke('db:get-habits'),
  createHabit: (habit) => ipcRenderer.invoke('db:create-habit', habit),
  updateHabit: (id, data) => ipcRenderer.invoke('db:update-habit', id, data),
  deleteHabit: (id) => ipcRenderer.invoke('db:delete-habit', id),
  getHabitLogs: (habitId, startDate, endDate) => ipcRenderer.invoke('db:get-habit-logs', habitId, startDate, endDate),
  setHabitLog: (habitId, date, value) => ipcRenderer.invoke('db:set-habit-log', habitId, date, value)
}

contextBridge.exposeInMainWorld('db', db)

