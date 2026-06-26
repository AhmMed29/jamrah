const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron')
const path = require('path')
const fs = require('fs')
const database = require('./database')
const { autoUpdater } = require('electron-updater')

let win
let storagePath = null

autoUpdater.autoDownload = false
autoUpdater.autoInstallOnAppQuit = false

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

function findOldDataPath() {
  var base = path.dirname(app.getPath('userData'))
  var candidates = [
    path.join(base, 'my-productivity-app', 'data'),
    path.join(base, 'Electron', 'data')
  ]
  for (var i = 0; i < candidates.length; i++) {
    var sessionsPath = path.join(candidates[i], 'pomodoro-sessions.json')
    if (fs.existsSync(sessionsPath)) {
      try {
        var data = JSON.parse(fs.readFileSync(sessionsPath, 'utf-8'))
        if (Object.keys(data).length > 0) return candidates[i]
      } catch (e) {}
    }
  }
  return null
}

function proceedWithStartup() {
  database.migrateFromJson(storagePath)
  autoUpdater.checkForUpdates()
}

function createWindow () {
  win = new BrowserWindow({
    width: 1200,
    height: 800,
    frame: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js')
    }
  })
  win.loadFile('src/index.html').then(function() {
    var oldPath = findOldDataPath()
    if (oldPath) {
      win.webContents.send('old-data-found', { path: oldPath })
    } else {
      proceedWithStartup()
    }
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

ipcMain.on('navigate', (e, page) => {
  win?.loadFile(path.join('src', page))
})

ipcMain.handle('read-file', async (e, filePath) => {
  try {
    if (!fs.existsSync(filePath)) return null
    return fs.readFileSync(filePath, 'utf-8')
  } catch { return null }
})

ipcMain.handle('write-file', async (e, filePath, data) => {
  try {
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

// ---- Data Restore IPC ----

ipcMain.handle('restore-old-data', async () => {
  database.migrateFromJson(storagePath)
  proceedWithStartup()
  return true
})

ipcMain.handle('skip-old-data', async () => {
  database.setSetting('_migrated', 'true')
  proceedWithStartup()
  return true
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

// ---- SQLite Database IPC ----

ipcMain.handle('db:init', async () => {
  return storagePath
})

ipcMain.on('db:get-setting', (e, key) => {
  e.returnValue = database.getSetting(key)
})

ipcMain.handle('db:set-setting', async (e, key, value) => {
  return database.setSetting(key, value)
})

ipcMain.on('db:get-all-settings', (e) => {
  e.returnValue = database.getAllSettings()
})

ipcMain.on('db:get-tags', (e) => {
  e.returnValue = database.getTags()
})

ipcMain.on('db:get-tags-with-goals', (e) => {
  e.returnValue = database.getTagsWithGoals()
})

ipcMain.handle('db:save-tag', async (e, tag) => {
  return database.saveTag(tag)
})

ipcMain.handle('db:delete-tag', async (e, id) => {
  return database.deleteTag(id)
})

ipcMain.on('db:get-sessions-grouped', (e) => {
  e.returnValue = database.getAllSessionsGrouped()
})

ipcMain.handle('db:save-session', async (e, session) => {
  return database.saveSession(session)
})

ipcMain.handle('db:update-session', async (e, id, taskName, tagId, note, goalId) => {
  return database.updateSession(id, taskName, tagId, note, goalId)
})

ipcMain.on('db:get-today-stats', (e) => {
  e.returnValue = database.getTodayStats()
})

ipcMain.on('db:get-total-stats', (e) => {
  e.returnValue = database.getTotalStats()
})

ipcMain.on('db:get-path', (e) => {
  e.returnValue = database.getPath()
})

ipcMain.handle('open-url', async (e, url) => {
  shell.openExternal(url)
})

ipcMain.handle('db:set-path', async (e, newPath) => {
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
  return database.updateGoal(id, goal);
});

ipcMain.handle('db:delete-goal', async (e, id) => {
  return database.deleteGoal(id);
});

ipcMain.handle('db:get-goal-progress', async (e, goalId) => {
  return database.getGoalProgress(goalId);
});

ipcMain.handle('db:get-sessions-by-tag', async (e, tagId) => {
  return database.getSessionsByTagId(tagId);
});

ipcMain.handle('db:get-sessions-by-goal', async (e, goalId) => {
  return database.getSessionsByGoal(goalId);
});

// ---- Tasks IPC ----
ipcMain.handle('db:get-tasks', async (e, goalId) => {
  return database.getTasks(goalId);
});

ipcMain.handle('db:create-task', async (e, task) => {
  return database.createTask(task);
});

ipcMain.handle('db:toggle-task', async (e, id) => {
  return database.toggleTask(id);
});

ipcMain.handle('db:delete-task', async (e, id) => {
  return database.deleteTask(id);
});

// ---- Habits IPC ----
ipcMain.on('db:get-habits', (e) => {
  e.returnValue = database.getHabits();
});

ipcMain.on('db:create-habit', (e, habit) => {
  e.returnValue = database.createHabit(habit);
});

ipcMain.on('db:update-habit', (e, id, data) => {
  e.returnValue = database.updateHabit(id, data);
});

ipcMain.on('db:delete-habit', (e, id) => {
  e.returnValue = database.deleteHabit(id);
});

ipcMain.on('db:get-habit-logs', (e, habitId, startDate, endDate) => {
  e.returnValue = database.getHabitLogs(habitId, startDate, endDate);
});

ipcMain.on('db:set-habit-log', (e, habitId, date, value) => {
  e.returnValue = database.setHabitLog(habitId, date, value);
});
