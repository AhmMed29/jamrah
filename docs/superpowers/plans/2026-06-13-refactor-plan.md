# Refactor Architecture & File-Based Persistence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split monolithic code into organized files, add file-based JSON persistence, add Home page, restructure sidebar navigation.

**Architecture:** Electron app with IPC bridge for local file I/O. 6 JS modules loaded in dependency order, each with one responsibility. localStorage data migrated to JSON files on first run. Pages loaded via `win.loadFile()` with sidebar navigation.

**Tech Stack:** Electron, vanilla JS, Tailwind CSS (CDN), local JSON file storage.

---

### Task 1: Create directory structure + update main.js (IPC handlers)

**Files:**
- Create: `src/`, `src/css/`, `src/js/`, `data/`
- Modify: `main.js`

- [ ] **Step 1: Create directories**

```bash
New-Item -ItemType Directory -Path "src\css", "src\js", "data" -Force
```

- [ ] **Step 2: Update main.js with IPC handlers**

Read `main.js` current content. Add `dialog` require and IPC handlers for file I/O + folder selection:

```js
const { app, BrowserWindow, ipcMain, dialog } = require('electron')
const path = require('path')
const fs = require('fs')

let win

function createWindow () {
  win = new BrowserWindow({
    width: 1200,
    height: 800,
    frame: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js')
    }
  })
  win.loadFile('src/home.html')
}

app.whenReady().then(createWindow)

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
    const dir = path.dirname(filePath)
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(filePath, data, 'utf-8')
    return true
  } catch { return false }
})

ipcMain.handle('select-folder', async () => {
  const result = await dialog.showOpenDialog(win, {
    properties: ['openDirectory']
  })
  return result.canceled ? null : result.filePaths[0]
})

ipcMain.handle('get-default-path', async () => {
  return path.join(app.getPath('userData'), 'data')
})
```

- [ ] **Step 3: Verify main.js syntax**

Run: `node -c main.js`
Expected: No errors (or `SyntaxError` if malformed)

---

### Task 2: Update preload.js with IPC APIs

**Files:**
- Modify: `preload.js`

- [ ] **Step 1: Write new preload.js content**

```js
const { contextBridge, ipcRenderer, webFrame } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  minimize: () => ipcRenderer.send('minimize'),
  maximize: () => ipcRenderer.send('maximize'),
  close: () => ipcRenderer.send('close'),
  navigate: (page) => ipcRenderer.send('navigate', page),
  zoomIn: () => { var z = Math.min((webFrame.getZoomFactor() || 1) + 0.1, 2); webFrame.setZoomFactor(z); return z },
  zoomOut: () => { var z = Math.max((webFrame.getZoomFactor() || 1) - 0.1, 0.5); webFrame.setZoomFactor(z); return z },
  zoomReset: () => { webFrame.setZoomFactor(1); return 1 },
  setZoom: (z) => webFrame.setZoomFactor(z),
  readFile: (fp) => ipcRenderer.invoke('read-file', fp),
  writeFile: (fp, data) => ipcRenderer.invoke('write-file', fp, data),
  selectFolder: () => ipcRenderer.invoke('select-folder'),
  getDefaultPath: () => ipcRenderer.invoke('get-default-path')
})
```

---

### Task 3: Extract styles + create storage.js (data layer)

**Files:**
- Create: `src/css/pomodoro.css`, `src/js/storage.js`

- [ ] **Step 1: Extract all inline `<style>` from index.html (lines 8-87) into `src/css/pomodoro.css`**

Copy the content between `<style>` tags (excluding the `<style>` tag itself):
```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap');
body {
  font-family: 'Inter', sans-serif;
  background-color: #FAFAFA;
}
.text-purple-brand { color: #8A7CFB; }
.bg-purple-brand { background-color: #8A7CFB; }
.bg-purple-light { background-color: #EBE9FE; }

/* Scrollbar styling for the right sidebar */
.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background-color: #e5e7eb;
  border-radius: 10px;
}

/* Timer circle base (no border - now in SVG) */
.timer-circle {
  border-radius: 50%;
}
#progressRing {
  transition: stroke-dashoffset 1s linear;
}
#settingsPage {
  transition: opacity 0.25s ease;
}
#themeDropdown {
  transition: opacity 0.2s ease, transform 0.2s ease;
  transform-origin: top center;
}
#themeDropdown.hidden {
  opacity: 0;
  transform: translateY(-4px);
  pointer-events: none;
}
#themeDropdown:not(.hidden) {
  opacity: 1;
  transform: translateY(0);
}
.tag-bubble {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 500;
  white-space: nowrap;
}
#tagDropdown {
  transition: opacity 0.15s ease, transform 0.15s ease;
  transform-origin: top left;
}
#tagDropdown.hidden {
  opacity: 0;
  transform: translateY(-4px);
  pointer-events: none;
}
#tagDropdown:not(.hidden) {
  opacity: 1;
  transform: translateY(0);
}
.color-swatch {
  width: 24px;
  height: 24px;
  border-radius: 999px;
  cursor: pointer;
  border: 2px solid transparent;
  transition: border-color 0.15s;
}
.color-swatch:hover, .color-swatch.selected {
  border-color: #374151;
}
```

- [ ] **Step 2: Create storage.js**

```js
// storage.js — handles all data persistence
// First run: migrates from localStorage → JSON files
// After: reads/writes JSON files via IPC

var STORAGE = {
  path: null,
  ready: false,
  files: {
    'settings.json': {},
    'pomodoro-stats.json': {},
    'pomodoro-sessions.json': {},
    'pomodoro-tags.json': [],
    'habits.json': [],
    'themes.json': {}
  }
}

STORAGE.init = async function () {
  var defaultPath = await window.electronAPI.getDefaultPath()
  var settingsRaw = await window.electronAPI.readFile(defaultPath + '/settings.json')

  if (settingsRaw) {
    var settings = JSON.parse(settingsRaw)
    STORAGE.path = settings.dataPath || defaultPath
  } else {
    STORAGE.path = defaultPath
  }

  // Check if data dir exists — if not, do migration
  var statsFile = await STORAGE.readFileRaw('pomodoro-stats.json')
  if (statsFile === null) {
    await STORAGE.migrateFromLocalStorage()
  }

  STORAGE.ready = true
}

STORAGE.readFileRaw = async function (filename) {
  return await window.electronAPI.readFile(STORAGE.path + '/' + filename)
}

STORAGE.writeFileRaw = async function (filename, data) {
  return await window.electronAPI.writeFile(STORAGE.path + '/' + filename, data)
}

STORAGE.migrateFromLocalStorage = async function () {
  var keys = ['pomodoro_stats', 'pomodoro_sessions', 'pomodoro_tags', 'app_theme', 'last_pomodoro_minutes', 'zoom_factor']
  var data = {}
  for (var i = 0; i < keys.length; i++) {
    var val = localStorage.getItem(keys[i])
    if (val) data[keys[i]] = val
  }

  // Map localStorage keys to files
  var mapping = {
    'pomodoro_stats': 'pomodoro-stats.json',
    'pomodoro_sessions': 'pomodoro-sessions.json',
    'pomodoro_tags': 'pomodoro-tags.json'
  }

  for (var key in mapping) {
    if (data[key]) {
      await STORAGE.writeFileRaw(mapping[key], data[key])
    }
  }

  // Save settings
  var settings = {
    theme: data['app_theme'] || 'light',
    zoom: parseFloat(data['zoom_factor'] || '1'),
    timerMinutes: parseInt(data['last_pomodoro_minutes'] || '50'),
    dataPath: STORAGE.path
  }
  await STORAGE.writeFileRaw('settings.json', JSON.stringify(settings, null, 2))
}

STORAGE.get = async function (filename) {
  var raw = await STORAGE.readFileRaw(filename)
  if (!raw) return null
  try { return JSON.parse(raw) } catch { return null }
}

STORAGE.set = async function (filename, data) {
  return await STORAGE.writeFileRaw(filename, JSON.stringify(data, null, 2))
}

STORAGE.getPath = function () {
  return STORAGE.path
}

STORAGE.setPath = async function (newPath) {
  STORAGE.path = newPath
  var settings = await STORAGE.get('settings.json') || {}
  settings.dataPath = newPath
  await STORAGE.set('settings.json', settings)
}
```

---

### Task 4: Extract timer.js

**Files:**
- Create: `src/js/timer.js`
- Modify: `index.html` (remove first script block lines 337-1052)

- [ ] **Step 1: Extract timer-related code into `src/js/timer.js`**

Extract from lines 337-1052 of index.html:
- `DASHARRAY`, `STATS_KEY`, `DURATION_KEY`, `totalSeconds`, `remainingSeconds`, `isRunning`, `timerId`, `expectedNext`
- DOM references (`timerText`, `progressRing`, `startBtn`, `endBtn`)
- `initStats()`, `getStats()`, `updateSidebar()`, `formatTime()`, `updateRing()`
- `stopTimer()`, `tick()`
- `openTimePopup()`, `closeTimePopup()`, `setTimer()`
- `toggleTimer()`, `startTimer()`
- `saveFocusMinutes()`, `completeTimer()`
- `openEndPopup()`, `closeEndPopup()`, `confirmEnd()`, `cancelEnd()`
- Keyboard zoom listeners
- Session hooks: `onSessionStart()`, `onSessionPause()`, `onSessionResume()`, `onSessionComplete()`, `onSessionCancel()`
- Timeline delegation and patched functions

Put all of it in timer.js wrapped in an IIFE matching the original structure. The code will be exactly the same but use `STORAGE` instead of `localStorage` directly.

Key changes in the extracted code:
- `initStats()` → uses `STORAGE.get('pomodoro-stats.json')` and `STORAGE.set('pomodoro-stats.json', stats)` instead of localStorage
- `saveFocusMinutes()` → same
- `completeTimer()` → same
- `getSessions()` → `STORAGE.get('pomodoro-sessions.json')`
- `saveSessions()` → `STORAGE.set('pomodoro-sessions.json', sessions)`
- `getTags()` → `STORAGE.get('pomodoro-tags.json')`
- `saveTags()` → `STORAGE.set('pomodoro-tags.json', tags)`

- [ ] **Step 2: Verify the file was created**

Run: `Get-ChildItem src/js/timer.js`
Expected: file exists

---

### Task 5: Extract stats.js, sessions.js, theme.js, settings.js

**Files:**
- Create: `src/js/stats.js`, `src/js/sessions.js`, `src/js/theme.js`, `src/js/settings.js`

- [ ] **Step 1: Create stats.js**

Contains all stats-related functions from timer.js:
```js
// stats.js — pomodoro statistics

var STATS_KEY = 'pomodoro_stats';

window.initStats = async function () {
  var stats = await STORAGE.get('pomodoro-stats.json');
  var today = new Date().toISOString().split('T')[0];
  if (!stats) {
    stats = { todayPomos: 0, todayFocusMinutes: 0, totalPomos: 0, totalFocusMinutes: 0, lastDate: today };
    await STORAGE.set('pomodoro-stats.json', stats);
  } else if (stats.lastDate !== today) {
    stats.todayPomos = 0;
    stats.todayFocusMinutes = 0;
    stats.lastDate = today;
    await STORAGE.set('pomodoro-stats.json', stats);
  }
};

window.getStats = async function () {
  var s = await STORAGE.get('pomodoro-stats.json');
  return s || { todayPomos: 0, todayFocusMinutes: 0, totalPomos: 0, totalFocusMinutes: 0, lastDate: new Date().toISOString().split('T')[0] };
};

window.updateSidebar = async function () {
  var stats = await window.getStats();
  document.getElementById('todayPomosValue').textContent = stats.todayPomos;
  document.getElementById('todayDurationValue').textContent = stats.todayFocusMinutes.toFixed(1);
  document.getElementById('totalPomosValue').textContent = stats.totalPomos;
  var totalM = stats.totalFocusMinutes;
  document.getElementById('totalDurationHours').textContent = Math.floor(totalM / 60);
  document.getElementById('totalDurationMins').textContent = Math.floor(totalM % 60);
};

window.saveFocusMinutes = async function (mins) {
  if (mins < 0.01) return;
  var stats = await window.getStats();
  stats.todayFocusMinutes += mins;
  stats.totalFocusMinutes += mins;
  await STORAGE.set('pomodoro-stats.json', stats);
  await window.updateSidebar();
};
```

- [ ] **Step 2: Create sessions.js**

Contains all sessions & tags code from lines 537-1051 (everything after "Sessions & Tags System" comment):
```js
// sessions.js — sessions and tags CRUD + timeline rendering

var SESSIONS_KEY = 'pomodoro-sessions.json';
var TAGS_KEY = 'pomodoro-tags.json';
window.activeSession = null;
window.editingSessionId = null;
window.editingTagForSession = null;
window.addSessionTagId = null;
window.selectedTagColor = '#3B82F6';
var PALETTE = ['#3B82F6','#8A7CFB','#EC4899','#EF4444','#F59E0B','#10B981','#14B8A6','#6366F1','#84CC16','#06B4D0'];

window.getTags = async function () {
  var s = await STORAGE.get(TAGS_KEY);
  return s || [];
};

window.saveTags = async function (tags) {
  await STORAGE.set(TAGS_KEY, tags);
};

window.getSessions = async function () {
  var s = await STORAGE.get(SESSIONS_KEY);
  return s || {};
};

window.saveSessions = async function (sessions) {
  await STORAGE.set(SESSIONS_KEY, sessions);
};
// ... rest of sessions.js contains all functions from the original sessions section:
// todayKey, formatTimeHM, hexToRgb, renderTimeline, formatDateLabel
// onSessionStart, onSessionPause, onSessionResume, onSessionComplete, onSessionCancel
// selectSessionTag, selectAddSessionTag, renderTagList
// toggleTagDropdown, toggleAddTagDropdown, openSessionPopup, closeSessionPopup
// saveSessionEdit, renderSessionTagDisplay, clearSessionTag
// openNewTagPopup, closeNewTagPopup, renderColorPalette, selectTagColor, saveNewTag
// openAddSessionPopup, closeAddSessionPopup, saveAddSession, renderAddSessionTagDisplay, clearAddSessionTag
// All these are exactly copied from the original code but with STORAGE instead of localStorage
```

- [ ] **Step 3: Create theme.js**

All theme code from lines 1056-1118:
```js
// theme.js — theme system

window.currentTheme = localStorage.getItem('app_theme') || 'light';
window.previewTheme = window.currentTheme;

window.themeColors = {
  light: { body: '#FAFAFA', sidebar: '#D4CDFB', main: '#FFFFFF', aside: '#FFFFFF', card: '#F5F6F8', titlebar: '#FFFFFF', ring: '#3B82F6', bgRing: '#F3F4F6' },
  night: { body: '#FFF5D6', sidebar: '#A898E0', main: '#FFF8E0', aside: '#FFF8E0', card: '#FFF0C0', titlebar: '#FFF8E0', ring: '#8A7CFB', bgRing: '#E8E0C8' },
  offwhite: { body: '#F0F0F0', sidebar: '#D1D1D1', main: '#F5F5F5', aside: '#F5F5F5', card: '#E8E8E8', titlebar: '#F5F5F5', ring: '#3B82F6', bgRing: '#E0E0E0' },
  classic: { body: '#FFFFFF', sidebar: '#1A1A1A', main: '#FFFFFF', aside: '#FFFFFF', card: '#F5F5F5', titlebar: '#FFFFFF', ring: '#000000', bgRing: '#E5E5E5' }
};
window.themeNames = { light: 'Light', night: 'Night', offwhite: 'OffWhite', classic: 'Classic' };

window.applyTheme = function (name) {
  var c = window.themeColors[name];
  document.body.style.backgroundColor = c.body;
  var nav = document.getElementById('navSidebar');
  if (nav) nav.style.backgroundColor = c.sidebar;
  var main = document.getElementById('mainArea');
  if (main) main.style.backgroundColor = c.main;
  var aside = document.getElementById('asideArea');
  if (aside) aside.style.backgroundColor = c.aside;
  var tb = document.getElementById('titlebar');
  if (tb) tb.style.backgroundColor = c.titlebar;
  document.querySelectorAll('#asideArea .grid > div').forEach(function(el) { el.style.backgroundColor = c.card; });
  var ring = document.getElementById('progressRing');
  if (ring) ring.style.stroke = c.ring;
  var bg = document.getElementById('progressBg');
  if (bg) bg.style.stroke = c.bgRing || '#F3F4F6';
};

window.applyTheme(window.currentTheme);
```

- [ ] **Step 4: Create settings.js**

Settings page functions:
```js
// settings.js — settings page + storage path selector

window.openSettings = function () {
  window.previewTheme = window.currentTheme;
  document.getElementById('pomodoroContent').classList.add('hidden');
  document.getElementById('settingsContent').classList.remove('hidden');
  window.applyTheme(window.previewTheme);
  document.getElementById('selectedThemeName').textContent = window.themeNames[window.previewTheme];
  // Show storage path
  var pathDisplay = document.getElementById('storagePathDisplay');
  if (pathDisplay) pathDisplay.textContent = STORAGE.getPath();
};

window.closeSettings = function () {
  document.getElementById('settingsContent').classList.add('hidden');
  document.getElementById('pomodoroContent').classList.remove('hidden');
  window.applyTheme(window.currentTheme);
};

window.toggleThemeDropdown = function () {
  document.getElementById('themeDropdown').classList.toggle('hidden');
};

window.selectTheme = function (name) {
  window.previewTheme = name;
  document.getElementById('selectedThemeName').textContent = window.themeNames[name];
  document.getElementById('themeDropdown').classList.add('hidden');
  window.applyTheme(name);
};

window.saveSettings = function () {
  window.currentTheme = window.previewTheme;
  localStorage.setItem('app_theme', window.currentTheme);
  window.closeSettings();
};

window.cancelSettings = function () {
  window.closeSettings();
};

window.selectStoragePath = async function () {
  var newPath = await window.electronAPI.selectFolder();
  if (newPath) {
    await STORAGE.setPath(newPath);
    document.getElementById('storagePathDisplay').textContent = newPath;
  }
};
```

---

### Task 6: Clean up index.html

**Files:**
- Modify: `src/index.html` (move from root)

- [ ] **Step 1: Move index.html to src/index.html**

Copy entire content of `index.html`.

- [ ] **Step 2: Replace inline `<style>` with `<link>`**

Remove lines 8-87 (the entire `<style>` block) and replace with:
```html
<link rel="stylesheet" href="css/pomodoro.css">
```

- [ ] **Step 3: Replace inline `<script>` with external scripts**

Remove the first `<script>` block (lines 336-1053) and the second `<script>` block (lines 1056-1118).

After the HTML body, add:
```html
<script src="js/storage.js"></script>
<script src="js/stats.js"></script>
<script src="js/timer.js"></script>
<script src="js/sessions.js"></script>
<script src="js/theme.js"></script>
<script src="js/settings.js"></script>
```

- [ ] **Step 4: Update main.js to load src/index.html**

Already done in Task 1 (changed to `win.loadFile('src/home.html')`). For pomodoro page, navigation will use `window.electronAPI.navigate('index.html')`.

---

### Task 7: Create Home page

**Files:**
- Create: `src/home.html`, `src/css/home.css`

- [ ] **Step 1: Create home.css**

```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600&display=swap');
body {
  font-family: 'Inter', sans-serif;
  background-color: #FAFAFA;
}
.home-clock {
  font-size: 5rem;
  font-weight: 300;
  letter-spacing: -0.02em;
  line-height: 1;
}
.home-date {
  font-size: 1.25rem;
  color: #6B7280;
}
.prayer-box {
  border-radius: 16px;
  background: #FFFFFF;
  border: 1px solid #E5E7EB;
  padding: 1.5rem;
  box-shadow: 0 1px 3px rgba(0,0,0,0.04);
}
```

- [ ] **Step 2: Create home.html**

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta content="width=device-width, initial-scale=1.0" name="viewport"/>
<title>My Productivity App</title>
<script src="https://cdn.tailwindcss.com?plugins=forms,container-queries"></script>
<link rel="stylesheet" href="css/home.css">
<link rel="stylesheet" href="css/pomodoro.css">
<style>
  body { font-family: 'Inter', sans-serif; background-color: #FAFAFA; }
</style>
</head>
<body class="h-screen w-screen overflow-hidden flex flex-col text-gray-800">
<!-- Title Bar -->
<div class="flex-shrink-0 h-[32px] bg-white border-b border-gray-100 flex items-center justify-between select-none" id="titlebar">
<div class="flex-1 h-full" id="drag-region" style="-webkit-app-region: drag"></div>
<div class="flex h-full">
<button onclick="window.electronAPI.minimize()" class="w-[46px] h-full flex items-center justify-center text-gray-500 hover:bg-[rgba(0,0,0,0.05)] transition-colors">
<svg class="w-[10px] h-[1px]" viewBox="0 0 10 1"><rect width="10" height="1" fill="currentColor"></rect></svg>
</button>
<button onclick="window.electronAPI.maximize()" class="w-[46px] h-full flex items-center justify-center text-gray-500 hover:bg-[rgba(0,0,0,0.05)] transition-colors">
<svg class="w-[10px] h-[10px]" viewBox="0 0 10 10"><rect fill="none" height="10" stroke="currentColor" stroke-width="1.2" width="10"></rect></svg>
</button>
<button onclick="window.electronAPI.close()" class="w-[46px] h-full flex items-center justify-center text-gray-500 hover:bg-[#e81123] hover:text-white transition-colors">
<svg class="w-[10px] h-[10px]" viewBox="0 0 10 10"><path d="M1 1l8 8M9 1l-8 8" fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.5"></path></svg>
</button>
</div>
</div>
<div class="flex flex-1 overflow-hidden">
<!-- Left Sidebar Navigation -->
<nav aria-label="Main Navigation" class="w-[56px] bg-[#D4CDFB] h-full flex flex-col items-center py-4 justify-between" id="navSidebar">
<div class="flex flex-col items-center gap-6 w-full">
<button aria-label="Home" class="text-white relative" onclick="window.electronAPI.navigate('home.html')">
<div class="absolute -left-3 top-1/2 -translate-y-1/2 w-1 h-5 bg-white rounded-r"></div>
<svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>
</button>
<button aria-label="Pomodoro" class="text-white/70 hover:text-white transition-colors" onclick="window.electronAPI.navigate('index.html')">
<svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" fill="none" r="10" stroke="currentColor" stroke-width="2"></circle><circle cx="12" cy="12" r="4"></circle></svg>
</button>
<button aria-label="Habits" class="text-white/70 hover:text-white transition-colors" onclick="window.electronAPI.navigate('habits.html')">
<svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
</button>
</div>
<div class="flex flex-col items-center gap-6 w-full mb-4">
<button aria-label="Settings" class="text-white/70 hover:text-white transition-colors" onclick="window.openSettings()">
<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/></svg>
</button>
</div>
</nav>
<!-- Main Home Content -->
<main class="flex-1 flex flex-col items-center justify-center bg-white">
  <div class="text-center">
    <!-- Clock -->
    <div class="home-clock text-gray-800 mb-2" id="clockDisplay">00:00</div>
    <!-- Date -->
    <div class="home-date mb-10" id="dateDisplay">...</div>
    <!-- Prayer Times Box -->
    <div class="prayer-box w-[400px] mx-auto">
      <h2 class="text-lg font-semibold text-gray-800 mb-2">🕌 أوقات الصلاة</h2>
      <p class="text-sm text-gray-400">سيتم إضافة مواقيت الصلاة قريباً</p>
    </div>
  </div>
</main>
</div>

<script>
// Clock update
function updateClock() {
  var now = new Date();
  var h = now.getHours().toString().padStart(2, '0');
  var m = now.getMinutes().toString().padStart(2, '0');
  document.getElementById('clockDisplay').textContent = h + ':' + m;

  var days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  var months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  var dayName = days[now.getDay()];
  var monthName = months[now.getMonth()];
  var date = now.getDate();
  var year = now.getFullYear();
  document.getElementById('dateDisplay').textContent = dayName + ', ' + monthName + ' ' + date + ', ' + year;
}
updateClock();
setInterval(updateClock, 1000);

// Keyboard zoom
document.addEventListener('keydown', function(e) {
  if (e.ctrlKey && (e.key === '=' || e.key === '+')) { e.preventDefault(); window.electronAPI.zoomIn(); }
  if (e.ctrlKey && e.key === '-') { e.preventDefault(); window.electronAPI.zoomOut(); }
  if (e.ctrlKey && e.key === '0') { e.preventDefault(); window.electronAPI.zoomReset(); }
});
</script>
</body>
</html>
```

---

### Task 8: Create Habits page structure

**Files:**
- Create: `src/css/habits.css`, `src/js/habits.js`
- Modify: Move `habits.html` to `src/habits.html`, extract styles

- [ ] **Step 1: Extract habits.css**

From habits.html lines 35-67:
```css
.overflow-x-auto::-webkit-scrollbar {
  height: 8px;
}
.overflow-x-auto::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 4px;
}
.overflow-x-auto::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 4px;
}
.overflow-x-auto::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}
.circular-progress {
  position: relative;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: conic-gradient(#3b82f6 var(--progress), #e5e7eb 0deg);
}
.circular-progress::before {
  content: "";
  position: absolute;
  inset: 3px;
  border-radius: 50%;
  background-color: white;
}
```

- [ ] **Step 2: Move habits.html to src/habits.html**

Copy file, update to include sidebar navigation matching the new layout (Home / Pomodoro / Habits / Settings), and replace inline style/css with links.

- [ ] **Step 3: Create habits.js placeholder**

```js
// habits.js — habits logic (to be built out)
```

---

### Task 9: Update settings page to show storage path

**Files:**
- Modify: `src/index.html` (add storage path UI to settings section)

- [ ] **Step 1: Add storage path UI in settings**

Find the settings HTML in index.html (lines 199-224). After the theme section, add:

```html
<div class="bg-gray-50 rounded-2xl p-8 mt-6">
  <h2 class="text-lg font-medium text-gray-800 mb-6">مكان الحفظ</h2>
  <div class="flex items-center justify-between">
    <span class="text-gray-700 font-medium text-base">المسار الحالي</span>
    <div class="flex items-center gap-3">
      <span class="text-sm text-gray-500 bg-white px-4 py-2 rounded-lg border border-gray-200 max-w-[300px] truncate" id="storagePathDisplay">...</span>
      <button onclick="window.selectStoragePath()" class="px-4 py-2 bg-purple-brand text-white rounded-lg text-sm font-medium hover:bg-opacity-90 transition-colors">تغيير</button>
    </div>
  </div>
</div>
```

---

### Task 10: Update sidebar in index.html to new navigation

**Files:**
- Modify: `src/index.html`

- [ ] **Step 1: Replace sidebar buttons (lines 107-126)**

Change the left sidebar to:
```
Home (navigate to home.html)  ← active only when on pomodoro
Pomodoro (current page)
Habits (navigate to habits.html)
--- separator ---
Settings (openSettings)
```
Remove Refresh and Notifications buttons.

---

### Task 11: Test the application

- [ ] **Step 1: Run the app**

```bash
npm start
```

Expected: App opens to Home page. All navigation works. Timer works. Sessions save. Settings save.

- [ ] **Step 2: Verify data files created**

Check `%APPDATA%/my-productivity-app/data/` for JSON files.
Expected: settings.json, pomodoro-stats.json, pomodoro-sessions.json, pomodoro-tags.json exist.

- [ ] **Step 3: Test storage path change**

Go to Settings, click "تغيير", select a folder, verify path updates.

- [ ] **Step 4: Verify no design/logic changes**

Compare timer behavior, theme switching, session editing, tag management — all identical to before.
