# Refactor Architecture & File-Based Persistence Design

**Date:** 2026-06-13
**Project:** My Productivity App (Electron)

## Objectives

1. Split monolithic `index.html` (1120 lines, all HTML/CSS/JS inline) into separate organized files
2. Convert storage from `localStorage` to local JSON files on disk
3. Add Home page (clock + date + placeholder for prayer times)
4. Add Habits page as third navigation target
5. Add "Storage Path" setting to choose data folder
6. Keep all existing logic and design completely unchanged

## File Structure

```
my-productivity-app/
├── main.js                    // + IPC handlers: readFile, writeFile, selectFolder, getDefaultPath
├── preload.js                 // + expose readFile, writeFile, selectFolder to renderer
├── package.json
├── src/
│   ├── index.html             // HTML only, no inline <style> or <script>
│   ├── habits.html            // HTML only, no inline <style> or <script>
│   ├── home.html              // New Home page
│   ├── css/
│   │   ├── pomodoro.css       // All <style> from index.html
│   │   ├── habits.css         // All <style> from habits.html
│   │   └── home.css           // Home page styles
│   └── js/
│       ├── storage.js         // localStorage → file system abstraction
│       ├── timer.js           // Timer logic (start, pause, complete, ring, formatTime)
│       ├── stats.js           // Statistics (todayPomos, totalFocusMinutes, sidebar)
│       ├── sessions.js        // Sessions & Tags CRUD, timeline rendering
│       ├── theme.js           // Theme system (apply, select, save)
│       ├── settings.js        // Settings page (open, save, cancel, storage path)
│       └── habits.js          // Habits logic (new, to be built out)
└── data/                      // Default path: %APPDATA%/my-productivity-app
    ├── settings.json
    ├── pomodoro-stats.json
    ├── pomodoro-sessions.json
    ├── pomodoro-tags.json
    ├── habits.json
    └── themes.json
```

## Sidebar Navigation (left nav, new order)

| Icon | Page | Description |
|------|------|-------------|
| 🏠 Home | `home.html` | Clock, date (Gregorian+Hijri), prayer times placeholder |
| ⏱ Pomodoro | `index.html` | Existing Pomodoro timer |
| ✅ Habits | `habits.html` | Habit tracker |
| ⚙️ Settings | inline in pages | Opens settings overlay (existing system) |

Removed: Refresh, Notifications icons.

## JS Load Order (index.html)

```html
<script src="src/js/storage.js"></script>
<script src="src/js/stats.js"></script>
<script src="src/js/timer.js"></script>
<script src="src/js/sessions.js"></script>
<script src="src/js/theme.js"></script>
<script src="src/js/settings.js"></script>
```

(storage first — everything depends on it)

## IPC Bridge (preload.js)

Add to existing `electronAPI`:
- `readFile(filename)` → `ipcRenderer.invoke('read-file', filename)` → `main.js` reads JSON from data folder
- `writeFile(filename, data)` → `ipcRenderer.invoke('write-file', filename, data)` → `main.js` writes JSON
- `selectFolder()` → `ipcRenderer.invoke('select-folder')` → `dialog.showOpenDialog()`
- `getDefaultPath()` → `ipcRenderer.invoke('get-default-path')` → `app.getPath('userData')`

All local — no network involved.

## Data Persistence

**Format:** JSON files, one per entity.

**Default path:** `app.getPath('userData')` → `%APPDATA%/my-productivity-app`

**Migration (first run):**
1. On app start, `storage.js` checks if `pomodoro-stats.json` exists
2. If not, reads all data from `localStorage` keys and writes them to corresponding JSON files
3. After migration, all reads/writes go to files only

**Settings.json structure:**
```json
{
  "theme": "light",
  "zoom": 1,
  "dataPath": "C:/Users/.../AppData/Roaming/my-productivity-app",
  "timerMinutes": 50,
  "version": 1
}
```

**Settings UI addition:**
- Label: "مكان الحفظ"
- Current path (clickable)
- "تغيير" button → opens native Windows folder picker
- Changing path moves future data to new location

## SOLID Principles

- **S**: Each file has one responsibility (timer, stats, sessions, theme, settings, storage)
- **O**: New features added without modifying existing files (e.g., habits.js)
- **I**: Each module exposes minimal API surface
- **D**: All modules depend on `storage.js` abstraction, not on file system directly

## Home Page (new)

- First page shown on app launch
- Large analog/digital clock
- Gregorian date + Hijri date
- Prayer times section: placeholder box titled "أوقات الصلاة" — empty, ready for future implementation
- No network calls yet

## Constraints

- Do NOT modify any existing logic or visual design
- Do NOT add any new features beyond what's specified
- The code must work identically after refactoring
