const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron')
const path = require('path')
const fs = require('fs')
const database = require('./database')
const { autoUpdater } = require('electron-updater')

let win
let storagePath = null

function is(type, val) {
  if (type === 'string') return typeof val === 'string' && val.length > 0
  if (type === 'object') return val !== null && typeof val === 'object' && !Array.isArray(val)
  if (type === 'number') return typeof val === 'number' && isFinite(val)
  return typeof val === type
}

autoUpdater.autoDownload = false
autoUpdater.autoInstallOnAppQuit = false
autoUpdater.forceDevUpdateConfig = true

autoUpdater.on('update-available', function(info) {
  if (win) win.webContents.send('update-available', info)
})

autoUpdater.on('download-progress', function(progress) {
  if (win) win.webContents.send('update-progress', Math.round(progress.percent))
})

autoUpdater.on('update-downloaded', function() {
  if (win) win.webContents.send('update-downloaded')
})

autoUpdater.on('error', function(err) {
  console.error('[AutoUpdater] error:', err.message)
})

function determineStoragePath() {
  var defaultPath = path.join(app.getPath('userData'), 'data')
  var datadirPath = path.join(defaultPath, '.datadir')
  if (fs.existsSync(datadirPath)) {
    return fs.readFileSync(datadirPath, 'utf-8').trim()
  }
  var settingsPath = path.join(defaultPath, 'settings.json')
  if (fs.existsSync(settingsPath)) {
    try {
      var settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'))
      if (settings.dataPath) return settings.dataPath
    } catch (e) {}
  }
  return defaultPath
}

function createWindow () {
  win = new BrowserWindow({
    width: 1200,
    height: 800,
    frame: false,
    show: false,
    backgroundColor: '#fff',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false
    }
  })
  win.maximize()
  win.once('ready-to-show', () => win.show())
  win.loadFile('src/index.html').then(function() {
    database.migrateFromJson(storagePath)
    autoUpdater.checkForUpdates()
  })
}

app.whenReady().then(() => {
  storagePath = determineStoragePath()
  var defaultPath = path.join(app.getPath('userData'), 'data')
  database.init(storagePath, defaultPath)
  createWindow()
})

ipcMain.on('minimize', () => win?.minimize())
ipcMain.on('maximize', () => {
  win?.isMaximized() ? win.unmaximize() : win?.maximize()
})
ipcMain.on('close', () => win?.close())

ipcMain.handle('zoom-in', (e) => {
  var wc = e.sender
  var z = Math.min((wc.getZoomFactor() || 1) + 0.1, 1.3)
  wc.setZoomFactor(z)
  return z
})

ipcMain.handle('zoom-out', (e) => {
  var wc = e.sender
  var z = Math.max((wc.getZoomFactor() || 1) - 0.1, 0.8)
  wc.setZoomFactor(z)
  return z
})

ipcMain.handle('zoom-reset', (e) => {
  e.sender.setZoomFactor(1)
  return 1
})

ipcMain.handle('zoom-set', (e, z) => {
  e.sender.setZoomFactor(z)
  return z
})

ipcMain.on('navigate', (e, page) => {
  if (!is('string', page)) return
  if (page.includes('..') || page.includes('\\')) return
  win?.loadFile(path.join('src', page))
})

ipcMain.handle('read-file', async (e, filePath) => {
  try {
    if (!filePath || typeof filePath !== 'string') return null
    if (!filePath.startsWith(storagePath)) return null
    if (!fs.existsSync(filePath)) return null
    return fs.readFileSync(filePath, 'utf-8')
  } catch { return null }
})

ipcMain.handle('write-file', async (e, filePath, data) => {
  try {
    if (!filePath || typeof filePath !== 'string') return false
    if (!filePath.startsWith(storagePath)) return false
    var dir = path.dirname(filePath)
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(filePath, data, 'utf-8')
    return true
  } catch { return false }
})

ipcMain.handle('select-folder', async () => {
  var result = await dialog.showOpenDialog(win, {
    properties: ['openDirectory']
  })
  return result.canceled ? null : result.filePaths[0]
})

ipcMain.handle('get-default-path', async () => {
  return path.join(app.getPath('userData'), 'data')
})

// ---- AutoUpdater IPC ----

ipcMain.handle('start-download', async () => {
  try {
    await autoUpdater.downloadUpdate()
    return true
  } catch (e) {
    console.error('[Download] error:', e.message)
    return false
  }
})

ipcMain.handle('quit-and-install', () => {
  autoUpdater.quitAndInstall()
})

ipcMain.handle('check-for-updates', async () => {
  try {
    var result = await autoUpdater.checkForUpdates()
    return result != null
  } catch (e) {
    console.error('[CheckUpdate]', e.message)
    return false
  }
})

// ---- SQLite Database IPC ----

ipcMain.handle('db:init', async () => {
  return storagePath
})

ipcMain.handle('db:get-setting', async (e, key) => {
  if (!is('string', key)) return null
  return database.getSetting(key)
})

ipcMain.handle('db:set-setting', async (e, key, value) => {
  if (!is('string', key)) return null
  return database.setSetting(key, value)
})

ipcMain.handle('db:get-all-settings', async () => {
  return database.getAllSettings()
})

ipcMain.handle('db:get-tags', async () => {
  return database.getTags()
})

ipcMain.handle('db:get-tags-with-goals', async () => {
  return database.getTagsWithGoals()
})

ipcMain.handle('db:save-tag', async (e, tag) => {
  if (!is('object', tag) || !is('string', tag.id) || !is('string', tag.name)) return null
  return database.saveTag(tag)
})

ipcMain.handle('db:delete-tag', async (e, id) => {
  if (!is('string', id)) return null
  return database.deleteTag(id)
})

ipcMain.handle('db:get-sessions-grouped', async () => {
  return database.getAllSessionsGrouped()
})

ipcMain.handle('db:save-session', async (e, session) => {
  if (!is('object', session)) return null
  return database.saveSession(session)
})

ipcMain.handle('db:update-session', async (e, id, taskName, tagId, note, goalId) => {
  if (!is('string', id)) return null
  return database.updateSession(id, taskName, tagId, note, goalId)
})

ipcMain.handle('db:get-today-stats', async () => {
  return database.getTodayStats()
})

ipcMain.handle('db:get-total-stats', async () => {
  return database.getTotalStats()
})

ipcMain.handle('db:get-path', async () => {
  return database.getPath()
})

ipcMain.handle('open-url', async (e, url) => {
  if (!is('string', url)) return
  try {
    var parsed = new URL(url)
    if (parsed.protocol !== 'https:') return
    shell.openExternal(url)
  } catch { return }
})

ipcMain.handle('db:set-path', async (e, newPath) => {
  if (!is('string', newPath)) return null
  var fullPath = newPath + '/MyProductivityApp/data'
  var result = database.setPath(fullPath)
  if (result) {
    storagePath = result
    var defaultPath = path.join(app.getPath('userData'), 'data')
    try {
      fs.writeFileSync(path.join(defaultPath, '.datadir'), storagePath, 'utf-8')
    } catch (e) {}
  }
  return result
})

// ---- Goals IPC ----
ipcMain.handle('db:get-goals', async () => {
  return database.getGoals();
});

ipcMain.handle('db:create-goal', async (e, goal) => {
  if (!is('object', goal) || !is('string', goal.name)) return null
  var tags = database.getTags();
  var existingTag = null;
  for (var i = 0; i < tags.length; i++) {
    if (tags[i].name === goal.name) { existingTag = tags[i]; break; }
  }
  if (!existingTag) {
    var tagId = 'tag_' + Date.now();
    database.saveTag({ id: tagId, name: goal.name, color: goal.color, createdAt: Date.now() });
    goal.tagId = tagId;
  } else {
    goal.tagId = existingTag.id;
  }
  return database.createGoal(goal);
});

ipcMain.handle('db:update-goal', async (e, id, goal) => {
  if (!is('string', id) || !is('object', goal)) return null
  return database.updateGoal(id, goal);
});

ipcMain.handle('db:delete-goal', async (e, id) => {
  if (!is('string', id)) return null
  return database.deleteGoal(id);
});

ipcMain.handle('db:get-goal-progress', async (e, goalId) => {
  if (!is('string', goalId)) return null
  return database.getGoalProgress(goalId);
});

ipcMain.handle('db:get-sessions-by-tag', async (e, tagId) => {
  if (!is('string', tagId)) return null
  return database.getSessionsByTagId(tagId);
});

ipcMain.handle('db:get-sessions-by-goal', async (e, goalId) => {
  if (!is('string', goalId)) return null
  return database.getSessionsByGoal(goalId);
});

// ---- Tasks IPC ----
ipcMain.handle('db:get-tasks', async (e, goalId) => {
  if (goalId != null && !is('string', goalId)) return null
  return database.getTasks(goalId || undefined);
});

ipcMain.handle('db:create-task', async (e, task) => {
  if (!is('object', task)) return null
  return database.createTask(task);
});

ipcMain.handle('db:toggle-task', async (e, id) => {
  if (!is('string', id)) return null
  return database.toggleTask(id);
});

ipcMain.handle('db:delete-task', async (e, id) => {
  if (!is('string', id)) return null
  return database.deleteTask(id);
});

ipcMain.handle('db:update-task', async (e, id, name) => {
  if (!is('string', id) || !is('string', name)) return null
  return database.updateTask(id, name);
});

// ---- Habits IPC ----
ipcMain.handle('db:get-habits', async () => {
  return database.getHabits();
});

ipcMain.handle('db:create-habit', async (e, habit) => {
  if (!is('object', habit)) return null
  return database.createHabit(habit);
});

ipcMain.handle('db:update-habit', async (e, id, data) => {
  if (!is('string', id) || !is('object', data)) return null
  return database.updateHabit(id, data);
});

ipcMain.handle('db:delete-habit', async (e, id) => {
  if (!is('string', id)) return null
  return database.deleteHabit(id);
});

ipcMain.handle('db:get-habit-logs', async (e, habitId, startDate, endDate) => {
  if (!is('string', habitId)) return null
  return database.getHabitLogs(habitId, startDate, endDate);
});

ipcMain.handle('db:set-habit-log', async (e, habitId, date, value) => {
  if (!is('string', habitId) || !is('string', date)) return null
  return database.setHabitLog(habitId, date, value);
});
