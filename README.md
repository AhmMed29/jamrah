# 🎉 My Productivity App

An all-in-one **Electron** desktop app: Pomodoro timer, habits tracker, goals & tasks manager — with SQLite persistence, animated shader backgrounds, and an auto-update system.

---

## ✨ Features

- **🍅 Pomodoro Timer** — Focus/break cycles with a live GLSL shader background (5 themes + custom colors), session timeline, and progress ring
- **📊 Habits Tracker** — Arabic/English daily habits table with completion %, streaks, and stats popup
- **🎯 Goals** — Create goals with sub-goals, track time-based progress, link pomodoros and tasks to each goal
- **✅ Tasks** — Simple todo list per goal; toggle, delete, and quick-add from the goals hierarchy tree
- **🏷️ Tags & Sessions** — Tag every session, filter timeline, edit past sessions
- **🎨 Shader Themes** — Dark, Ocean, Forest, Sunset, Lavender, or custom colors — all with dark backgrounds for vibrant visuals
- **🔄 Auto-Update** — Checks GitHub for new releases on launch; one-click download

---

## 🚀 Getting Started

```bash
git clone https://github.com/AhmMed29/My-Productivity-App.git
cd My-Productivity-App
npm install
npm start
```

Requires **Node.js 22+** and **npm**.

---

## 🧱 Project Structure

```
src/
├── index.html               # Main HTML (no inline scripts)
├── css/
│   ├── pomodoro.css          # Timer/settings styles
│   ├── home.css              # Home page styles
│   ├── habits.css            # Habits table styles
│   ├── ahmeds-styles.css     # Custom styles
│   └── main.css              # Extracted shared styles
├── js/
│   ├── app.js                # Page router, clock, shortcuts, updates
│   ├── storage.js            # DB path init
│   ├── stats.js              # Today/total stats helpers
│   ├── shader.js             # GLSL shader canvas init + themes
│   ├── timer.js              # Pomodoro timer logic + controls
│   ├── sessions.js           # Session CRUD, timeline, tags, popups
│   ├── theme.js              # Theme selection + sidebar
│   ├── utils/
│   │   └── helpers.js        # GOAL_COLORS, hexToRgb, esc
│   └── components/
│       ├── settings/         # Theme cards, color pickers
│       ├── goals/            # Goals CRUD, detail modal, hierarchy
│       ├── tasks/            # Tasks CRUD, goals-tree popup
│       └── habits/           # Habits table, stats modal, add modal
├── main.js                   # Electron main process + SQLite IPC
├── preload.js                # Context bridge (electronAPI + db)
├── database.js               # SQLite schema, migrations, queries
└── package.json
```

---

## 🗄️ Data

All data is stored locally via **SQLite** (better-sqlite3). Default location:

```
Windows: %APPDATA%/My-Productivity-App/data/
```

You can change the storage path in Settings → مكان الحفظ.

### Schema (v5)

| Table | Purpose |
|-------|---------|
| `settings` | Key-value pairs (theme, durations, paths) |
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

On launch, the app checks:
`https://raw.githubusercontent.com/AhmMed29/My-Productivity-App/main/update.json`

If a newer version is found, a popup shows release notes + download button.

---

## 📦 Tech Stack

- **Electron** 42 — desktop shell
- **better-sqlite3** — local database
- **Tailwind CSS** (CDN) — styling
- **GLSL** — animated shader backgrounds
- **Font Awesome** — icons
