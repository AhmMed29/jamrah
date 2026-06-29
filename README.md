<p align="center">
  <img src="src/assets/Jamrah-Icon.svg" alt="Jamrah" width="128"/>
</p>

<h1 align="center">Jamrah جَــمْــرَه</h1>

<p align="center"><i>ember of productivity</i></p>

An all-in-one **Electron** desktop app: Pomodoro timer with live GLSL shader backgrounds (5 themes + custom + Minimal), habits tracker, goals & tasks manager — powered by SQLite with an auto-update system.

---

## ✨ Features

- **🍅 Pomodoro Timer** — Focus/break/long-break cycles with animated shader backgrounds (Ocean, Forest, Sunset, Lavender, Dark, Custom, or Minimal text-only mode), session timeline, sound cues
- **📊 Habits Tracker** — Daily habits table with completion %, streaks, and stats popup
- **🎯 Goals** — Create goals with sub-goals, link pomodoros and tasks, track time-based progress
- **✅ Tasks** — Todo list per goal; toggle, delete, quick-add from goals hierarchy
- **🏷️ Tags & Sessions** — Tag every session, filter timeline, edit past sessions
- **🎨 Shader Themes** — 5 animated GLSL themes + custom color pickers + new **Minimal** (text-only) mode
- **⚙️ Tabbed Settings** — General / Pomodoro / Storage with timer durations, sound toggle, theme grid, storage path
- **🔄 Auto-Update** — Checks GitHub Releases on launch; shows size, progress bar, and manual **Search for Updates** button in Settings
- **🗄️ SQLite Persistence** — All data stored locally with automatic JSON migration

---

## 🚀 Getting Started

```bash
git clone https://github.com/AhmMed29/jamrah.git
cd jamrah
npm install
npm start
```

Requires **Node.js 22+** and **npm**.

---

## 🧱 Project Structure

```
src/
├── index.html                 # Main HTML (settings modal, popups, dock)
├── css/
│   ├── pomodoro.css           # Timer, settings modal, minimal theme
│   ├── home.css               # Home page styles
│   ├── habits.css             # Habits table styles
│   ├── ahmeds-styles.css      # Custom toggle-switch, modal styles
│   └── main.css               # Dock, floating-menu, extracted shared styles
├── js/
│   ├── app.js                 # Page router, clock, updates, welcome popup
│   ├── storage.js             # DB path init
│   ├── stats.js               # Today/total stats helpers
│   ├── shader.js              # GLSL shader engine + 5 themes + hexToRgb
│   ├── timer.js               # Pomodoro logic, phases, presets, reset
│   ├── sessions.js            # Session CRUD, timeline, tags, popups
│   ├── theme.js               # openSettings, closeSettings, page navigation
│   ├── utils/
│   │   └── helpers.js         # GOAL_COLORS, hexToRgb, esc
│   └── components/
│       ├── settings/settings.js   # Tab switching, theme cards, custom colors, save/cancel
│       ├── goals/              # Goals CRUD, detail modal, hierarchy
│       ├── tasks/              # Tasks CRUD, goals-tree popup
│       └── habits/             # Habits table, stats modal, add modal
├── main.js                    # Electron main process + SQLite IPC + auto-updater
├── preload.js                 # Context bridge (electronAPI + db API)
├── database.js                # SQLite schema, migrations, queries
└── package.json
```

---

## 🗄️ Data

All data stored locally via **SQLite** (better-sqlite3). Default location:

```
Windows: %APPDATA%/Jamrah/data/
```

You can change the storage path in Settings → Storage tab.

### Schema (v5)

| Table | Purpose |
|-------|---------|
| `settings` | Key-value pairs (theme, durations, paths, welcomeShown) |
| `sessions` | Pomodoro sessions with tags, tasks, goals |
| `tags` | Colored labels for sessions |
| `goals` | Goals with dates, colors, parent-child hierarchy |
| `goal_progress` | Cached progress snapshots |
| `tasks` | Todo items linked to goals |

---

## 🔧 Build for Windows

```bash
npm run dist
```

Output in `dist/` — NSIS installer.

---

## 🔄 Update System

Uses **electron-updater** with GitHub Releases as the provider. Configuration:

```json
"publish": { "provider": "github", "owner": "AhmMed29", "repo": "jamrah" }
```

- On launch: `autoUpdater.checkForUpdates()` checks for new releases
- When available: modal shows version, size (KB/MB), release notes, download button
- Download progress: animated progress bar + percentage
- Manual check: **Search for Updates** button in Settings → General → Updates
- **Code signing recommended** to avoid Windows SmartScreen warnings

---

## 📦 Tech Stack

- **Electron** 42 — desktop shell
- **better-sqlite3** — local database
- **electron-updater** — auto-update via GitHub Releases
- **Tailwind CSS** (CDN) — utility-first styling
- **GLSL** — real-time WebGL shader backgrounds
- **Font Awesome** / **Material Symbols** — icons

---

## ⚖️ License

**PolyForm Noncommercial License 1.0.0**

This software is free for **personal, noncommercial use** only. You may use, modify, and share it for research, education, hobby projects, and other noncommercial purposes.

**Commercial use is not permitted** without explicit permission from the author.

See the [LICENSE](LICENSE) file for the full terms.

> Required Notice: Copyright AhmMed29 (https://github.com/AhmMed29)
