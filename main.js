const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron')
const path = require('path')
const fs = require('fs')
const { spawn } = require('child_process')
const { autoUpdater } = require('electron-updater')

const API_BASE = 'http://localhost:5200/api'

let win
let storagePath = null
let backendProcess = null

// a second instance would spawn a second backend that collides on port 5200
// and opens the same SQLite file
const gotSingleInstanceLock = app.requestSingleInstanceLock()
if (!gotSingleInstanceLock) {
  app.quit()
} else {
  app.on('second-instance', function() {
    if (win) {
      if (win.isMinimized()) win.restore()
      win.focus()
    }
  })
}

function is(type, val) {
  if (type === 'string') return typeof val === 'string' && val.length > 0
  if (type === 'object') return val !== null && typeof val === 'object' && !Array.isArray(val)
  if (type === 'number') return typeof val === 'number' && isFinite(val)
  return typeof val === type
}

autoUpdater.autoDownload = false
autoUpdater.autoInstallOnAppQuit = false
// autoUpdater.forceDevUpdateConfig = true

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

async function startBackend() {
  var dbFullPath = path.join(storagePath, 'app.db')

  // SQLite cannot create missing parent directories; on a clean machine the
  // backend would die with SQLITE_CANTOPEN before serving a single request
  try { fs.mkdirSync(storagePath, { recursive: true }) } catch (e) { console.error('[.NET] mkdir failed:', e.message) }

  var env = {
    ...process.env,
    ASPNETCORE_URLS: 'http://localhost:5200',
    DATABASE_PATH: dbFullPath
  }

  if (app.isPackaged) {
    // self-contained publish output shipped via electron-builder extraResources;
    // installed machines have neither the .NET SDK nor the backend source
    var exe = path.join(process.resourcesPath, 'backend', 'Jamrah.Backend.exe')
    backendProcess = spawn(exe, [], { env: env, cwd: path.dirname(exe), stdio: ['ignore', 'pipe', 'pipe'] })
  } else {
    var backendDir = path.join(__dirname, 'backend')
    backendProcess = spawn('dotnet', ['run', '--project', backendDir], { env: env, stdio: ['ignore', 'pipe', 'pipe'] })
  }

  backendProcess.stdout.on('data', function(d) { var s = d.toString().trim(); if (s) console.log('[.NET] ' + s) })
  backendProcess.stderr.on('data', function(d) { var s = d.toString().trim(); if (s) console.error('[.NET] ' + s) })
  backendProcess.on('error', function(err) { console.error('[.NET] Failed:', err.message) })

  for (var i = 0; i < 30; i++) {
    try {
      var res = await fetch(API_BASE + '/settings')
      if (res.ok) { console.log('[.NET] Ready'); return true }
    } catch (e) {}
    await new Promise(function(r) { setTimeout(r, 500) })
  }
  console.warn('[.NET] Timed out waiting for backend')
  return false
}

function stopBackend() {
  if (backendProcess && !backendProcess.killed) {
    try {
      if (process.platform === 'win32') {
        // "dotnet run" hosts the real server as a child process; a plain
        // kill() orphans it, leaving port 5200 held and app.db locked
        require('child_process').spawnSync('taskkill', ['/pid', String(backendProcess.pid), '/T', '/F'], { stdio: 'ignore' })
      } else {
        backendProcess.kill()
      }
    } catch (e) {}
    backendProcess = null
  }
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
    autoUpdater.checkForUpdates()
  })
}

app.whenReady().then(async () => {
  storagePath = determineStoragePath()
  var backendReady = await startBackend()
  if (!backendReady) {
    dialog.showErrorBox(
      'Jamrah — backend failed to start',
      'The database service did not start, so tasks, sessions, habits and settings cannot load.\n\n' +
      (app.isPackaged
        ? 'Try restarting the app. If the problem persists, reinstall Jamrah.'
        : 'Check that the .NET 9 SDK is installed and that port 5200 is free.')
    )
  }
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

app.on('will-quit', stopBackend)

// ---- Database IPC → HTTP to .NET Backend ----

function api(path) { return API_BASE + path }

ipcMain.handle('db:init', async () => {
  return storagePath
})

ipcMain.handle('db:get-setting', async (e, key) => {
  if (!is('string', key)) return null
  // json(), not text(): the backend returns a JSON string, so text() hands the
  // renderer a double-quoted value ("\"true\"") and missing keys as "null"
  try { var r = await fetch(api('/settings/' + encodeURIComponent(key))); return r.ok ? await r.json() : null }
  catch { return null }
})

ipcMain.handle('db:set-setting', async (e, key, value) => {
  if (!is('string', key)) return null
  try {
    // the backend binds [FromBody] string, so numbers (timer minutes) must be
    // sent as JSON strings or the request 400s and the setting never saves
    var r = await fetch(api('/settings/' + encodeURIComponent(key)), { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(String(value)) })
    return r.ok ? await r.json() : false
  } catch { return false }
})

ipcMain.handle('db:get-all-settings', async () => {
  try { var r = await fetch(api('/settings')); return r.ok ? await r.json() : {} }
  catch { return {} }
})

ipcMain.handle('db:get-tags', async () => {
  try { var r = await fetch(api('/tags')); return r.ok ? await r.json() : [] }
  catch { return [] }
})

ipcMain.handle('db:get-tags-with-goals', async () => {
  try { var r = await fetch(api('/tags/with-goals')); return r.ok ? await r.json() : { tags: [], goals: [] } }
  catch { return { tags: [], goals: [] } }
})

ipcMain.handle('db:save-tag', async (e, tag) => {
  if (!is('object', tag)) return null
  try {
    var r = await fetch(api('/tags'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(tag) })
    return r.ok ? await r.json() : false
  } catch { return false }
})

ipcMain.handle('db:delete-tag', async (e, id) => {
  if (!is('string', id)) return null
  try { var r = await fetch(api('/tags/' + encodeURIComponent(id)), { method: 'DELETE' }); return r.ok ? await r.json() : false }
  catch { return false }
})

ipcMain.handle('db:get-sessions-grouped', async () => {
  try { var r = await fetch(api('/sessions/grouped')); return r.ok ? await r.json() : {} }
  catch { return {} }
})

ipcMain.handle('db:save-session', async (e, session) => {
  if (!is('object', session)) return null
  try {
    var r = await fetch(api('/sessions'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(session) })
    return r.ok ? await r.json() : false
  } catch { return false }
})

ipcMain.handle('db:update-session', async (e, id, taskName, tagId, note, goalId) => {
  if (!is('string', id)) return null
  try {
    var r = await fetch(api('/sessions/' + encodeURIComponent(id)), { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ taskName: taskName || '', tagId: tagId || null, note: note || '', goalId: goalId || null }) })
    return r.ok ? await r.json() : false
  } catch { return false }
})

ipcMain.handle('db:get-today-stats', async () => {
  try { var r = await fetch(api('/sessions/stats/today')); return r.ok ? await r.json() : { todayPomos: 0, todayFocusMinutes: 0 } }
  catch { return { todayPomos: 0, todayFocusMinutes: 0 } }
})

ipcMain.handle('db:get-total-stats', async () => {
  try { var r = await fetch(api('/sessions/stats/total')); return r.ok ? await r.json() : { totalPomos: 0, totalFocusMinutes: 0 } }
  catch { return { totalPomos: 0, totalFocusMinutes: 0 } }
})

ipcMain.handle('db:get-path', async () => {
  return storagePath
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
  var fullPath = path.join(newPath, 'Jamrah', 'data')
  var oldDb = path.join(storagePath, 'app.db')
  var newDb = path.join(fullPath, 'app.db')
  try {
    var dir = path.dirname(newDb)
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    fs.copyFileSync(oldDb, newDb)
    stopBackend()
    storagePath = fullPath
    await startBackend()
    var defaultPath = path.join(app.getPath('userData'), 'data')
    if (!fs.existsSync(defaultPath)) fs.mkdirSync(defaultPath, { recursive: true })
    fs.writeFileSync(path.join(defaultPath, '.datadir'), storagePath, 'utf-8')
    return storagePath
  } catch { return null }
})

// ---- Goals IPC ----
ipcMain.handle('db:get-goals', async () => {
  try { var r = await fetch(api('/goals')); return r.ok ? await r.json() : [] }
  catch { return [] }
})

ipcMain.handle('db:create-goal', async (e, goal) => {
  if (!is('object', goal)) return null
  try {
    var r = await fetch(api('/goals'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(goal) })
    return r.ok ? await r.json() : false
  } catch { return false }
})

ipcMain.handle('db:update-goal', async (e, id, goal) => {
  if (!is('string', id) || !is('object', goal)) return null
  try {
    var r = await fetch(api('/goals/' + encodeURIComponent(id)), { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(goal) })
    return r.ok ? await r.json() : false
  } catch { return false }
})

ipcMain.handle('db:delete-goal', async (e, id) => {
  if (!is('string', id)) return null
  try { var r = await fetch(api('/goals/' + encodeURIComponent(id)), { method: 'DELETE' }); return r.ok ? await r.json() : false }
  catch { return false }
})

ipcMain.handle('db:get-goal-progress', async (e, goalId) => {
  if (!is('string', goalId)) return null
  try { var r = await fetch(api('/goals/' + encodeURIComponent(goalId) + '/progress')); return r.ok ? await r.json() : [] }
  catch { return [] }
})

ipcMain.handle('db:get-sessions-by-tag', async (e, tagId) => {
  if (!is('string', tagId)) return null
  try { var r = await fetch(api('/sessions/by-tag/' + encodeURIComponent(tagId))); return r.ok ? await r.json() : [] }
  catch { return [] }
})

ipcMain.handle('db:get-sessions-by-goal', async (e, goalId) => {
  if (!is('string', goalId)) return null
  try { var r = await fetch(api('/sessions/by-goal/' + encodeURIComponent(goalId))); return r.ok ? await r.json() : [] }
  catch { return [] }
})

// ---- Tasks IPC ----
ipcMain.handle('db:get-tasks', async (e, goalId) => {
  if (goalId != null && !is('string', goalId)) return null
  try { var r = await fetch(api('/tasks' + (goalId ? '?goalId=' + encodeURIComponent(goalId) : ''))); return r.ok ? await r.json() : [] }
  catch { return [] }
})

ipcMain.handle('db:create-task', async (e, task) => {
  if (!is('object', task)) return null
  try {
    var r = await fetch(api('/tasks'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(task) })
    if (!r.ok) { var body = await r.text(); return { error: true, status: r.status, body: body } }
    return await r.json()
  } catch (err) { return { error: true, message: err.message } }
})

ipcMain.handle('db:toggle-task', async (e, id) => {
  if (!is('string', id)) return null
  try { var r = await fetch(api('/tasks/' + encodeURIComponent(id) + '/toggle'), { method: 'PUT' }); return r.ok ? await r.json() : false }
  catch { return false }
})

ipcMain.handle('db:delete-task', async (e, id) => {
  if (!is('string', id)) return null
  try { var r = await fetch(api('/tasks/' + encodeURIComponent(id)), { method: 'DELETE' }); return r.ok ? await r.json() : false }
  catch { return false }
})

ipcMain.handle('db:update-task', async (e, id, name) => {
  if (!is('string', id) || !is('string', name)) return null
  try {
    var r = await fetch(api('/tasks/' + encodeURIComponent(id)), { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: name }) })
    return r.ok ? await r.json() : false
  } catch { return false }
})

// ---- Habits IPC ----
ipcMain.handle('db:get-habits', async () => {
  try { var r = await fetch(api('/habits')); return r.ok ? await r.json() : [] }
  catch { return [] }
})

ipcMain.handle('db:create-habit', async (e, habit) => {
  if (!is('object', habit)) return null
  try {
    var r = await fetch(api('/habits'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(habit) })
    return r.ok ? await r.json() : false
  } catch { return false }
})

ipcMain.handle('db:update-habit', async (e, id, data) => {
  if (!is('string', id) || !is('object', data)) return null
  try {
    var r = await fetch(api('/habits/' + encodeURIComponent(id)), { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
    return r.ok ? await r.json() : false
  } catch { return false }
})

ipcMain.handle('db:delete-habit', async (e, id) => {
  if (!is('string', id)) return null
  try { var r = await fetch(api('/habits/' + encodeURIComponent(id)), { method: 'DELETE' }); return r.ok ? await r.json() : false }
  catch { return false }
})

ipcMain.handle('db:get-habit-logs', async (e, habitId, startDate, endDate) => {
  if (!is('string', habitId)) return null
  try {
    var url = api('/habits/' + encodeURIComponent(habitId) + '/logs')
    if (startDate) url += '?startDate=' + encodeURIComponent(startDate)
    if (endDate) url += (startDate ? '&' : '?') + 'endDate=' + encodeURIComponent(endDate)
    var r = await fetch(url); return r.ok ? await r.json() : []
  } catch { return [] }
})

ipcMain.handle('db:set-habit-log', async (e, habitId, date, value) => {
  if (!is('string', habitId) || !is('string', date)) return null
  try {
    var r = await fetch(api('/habits/' + encodeURIComponent(habitId) + '/logs'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ habitId: habitId, date: date, value: typeof value === 'number' ? value : 1 }) })
    return r.ok ? await r.json() : false
  } catch { return false }
})
