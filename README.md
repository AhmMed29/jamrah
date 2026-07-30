<p align="center">
  <img src="src/assets/Jamrah-Icon.svg" alt="Jamrah" width="128"/>
</p>

<h1 align="center">Jamrah جَــمْــرَه</h1>

<p align="center"><i>ember of productivity</i></p>

An all-in-one **Electron** desktop app: Pomodoro timer with live GLSL shader backgrounds (5 themes + custom + Minimal), habits tracker, goals & tasks manager, session timeline with daily history — powered by **.NET 9 + EF Core SQLite** backend with an auto-update system.

---

## Table of Contents
- [✨ Features](#-features)
  - [Pomodoro Focus Timer 🍅](#pomodoro-focus-timer-)
  - [Session Timeline & History 📜](#session-timeline--history-)
  - [Tasks ✔](#tasks-)
  - [Goals 🎯](#goals-)
  - [Habit Tracker 🤸‍♀️](#habit-tracker-)
  - [Calendar & Stats 📊](#calendar--stats-)
  - [Customizable Preferences ⚙](#customizable-preferences-)
- [🚀 For Developers](#-for-developers)
  - [Getting Started](#getting-started)
  - [Project Structure](#project-structure)
- [🗄️ Data](#️-data)
- [🔧 Build for Windows](#-build-for-windows)
- [Linux & Mobile](#linux--mobile)
- [🔄 Sync](#-sync)
- [📦 Updates](#-updates)
- [⚖️ License](#️-license)

---

# ✨ Features

## Pomodoro Focus Timer 🍅

Full-featured Pomodoro timer with configurable Focus / Short Break / Long Break durations. Includes live GLSL shader backgrounds with 5 themes plus custom color picker and minimal mode.

- Phase word selector (Focus / Short Break / Long Break)
- Auto-start breaks and focus sessions
- Session count display
- Desktop notifications
- Task name popup on start (optional)
- Hover controls: skip, reset, end session

![Simple Pomodoro](src/assets/screenshots/Simple%20Pomodoro.png)

## Session Timeline & History 📜

Every focus session is tracked and displayed in an interactive timeline sidebar:

- Hour-by-hour timeline with sessions grouped by time
- Color-coded dots for tags and goals
- Inline session name editing
- Day navigation (back / forward arrows, forward hidden on today)
- Active session highlighted with purple glow
- Session notes panel
- Session popup for editing name, tag, goal, and notes

## Tasks ✔

Full task management with rich features:

- Create, edit, delete, and reorder tasks
- Priority levels (High / Medium / Low / None)
- Subtasks with expand/collapse
- Goals integration (assign tasks to goals)
- Custom days and recurring tasks
- Detail panel with notes
- Filter and sort controls

![Add Tasks](src/assets/screenshots/Add%20Tasks.png)

## Goals 🎯

Set goals with custom durations (weekly, monthly, quarterly, yearly, or custom). Track progress as you complete linked tasks.

- Goal hierarchy with sub-goals
- Progress bar and status badges
- Goal analytics

![Set a Goal](src/assets/screenshots/Set%20a%20Goal.png)

## Habit Tracker 🤸‍♀️

Track your habits with a clean paper-like grid interface. Click sound feedback when marking habits.

- Daily habit logging
- Year view with color density
- Monthly statistics

![Habit Tracker](src/assets/screenshots/Habit%20Tracker.png)

## Calendar & Stats 📊

- **Calendar View**: Year, month, and week track views with session heatmap
- **Timeline View**: Day and week timeline with session details
- **Stats Page**: Focus time analytics, session counts, trends

## Customizable Preferences ⚙

Every component can be shown or hidden in the sidebar and dock — you control what you see.

- Toggle pages in sidebar and/or dock
- Show task popup on timer start
- Configurable timer durations
- Auto-start toggles
- Sound on/off
- Shader theme selector with custom colors
- Minimal mode (no shader, just the timer text)

---

# 🚀 For Developers

## Getting Started

```bash
git clone https://github.com/AhmMed29/jamrah.git
cd jamrah
npm install
npm start
```

Requires **Node.js 22+**, **npm**, and **[.NET 9 SDK](https://dotnet.microsoft.com/en-us/download/dotnet/9.0)**.

---

## 🗄️ Data

All data stored locally via **SQLite** with **Entity Framework Core** (.NET 9 backend). Default location:

```
Windows: %APPDATA%/MyProductivityApp/data/app.db
```

The Electron main process spawns the .NET backend as a child process, and the renderer communicates via IPC → HTTP (localhost:5200). You can change the storage path in Settings → Storage tab.

---

## 🔧 Build for Windows

Currently Windows-only.

```bash
npm run dist
```

Output in `dist/` — NSIS installer.

## 📱 Mobile App & 🔄 Sync

The official **Android App** is now available! 
You can sync your tasks, goals, habits, and sessions between your PC and Android phone locally over Wi-Fi.
The PC app acts as a local server, and the Android app connects to it to keep your data in sync instantly.

Linux support is a community-driven contribution. PRs welcome!

---

## 📦 Updates

Jamrah includes a built-in frontend auto-update system (lightweight ZIP-based updates for HTML/JS/CSS, no full EXE download). Check for updates in Settings → General.

---

## 🧱 Project Structure

```
├── src/
│   ├── index.html                  # Main application HTML
│   ├── css/
│   │   ├── main.css                # Core styles, sidebar, dock, goals table
│   │   ├── pomodoro.css            # Timer, phase words, session popup, timeline grid
│   │   ├── side-box.css            # Session timeline panel (side box)
│   │   ├── sidebar-new.css         # App sidebar specific styles
│   │   ├── dock.css                # Floating dock styles
│   │   ├── timer.css               # Timer face and controls
│   │   ├── base.css                # Font imports, CSS variables, utility styles
│   │   ├── settings.css            # Settings modal styles
│   │   ├── modals.css              # Shared modal styles
│   │   ├── goals.css               # Goals page styles
│   │   ├── tasks.css               # Tasks page styles
│   │   ├── habits.css              # Habits table styles
│   │   ├── home.css                # Home page styles
│   │   ├── stats.css               # Stats page styles
│   │   └── calender.css            # Calendar page styles
│   ├── js/
│   │   ├── app.js                  # Page router, clock, splash screen, keyboard shortcuts
│   │   ├── storage.js              # DB path initialization
│   │   ├── stats.js                # Today/total stats helpers
│   │   ├── shader.js               # GLSL shader engine + 5 themes + minimal mode
│   │   ├── timer.js                # Pomodoro logic, phases, presets, timer controls
│   │   ├── sessions.js             # Session CRUD, timeline render, tags, goals, popups
│   │   ├── theme.js                # Theme settings, shader color management
│   │   ├── calender.js             # Calendar year/month/week views
│   │   ├── utils/
│   │   │   ├── audio.js            # AudioManager — sound effects
│   │   │   └── helpers.js          # GOAL_COLORS, hexToRgb, escape helpers
│   │   └── components/
│   │       ├── settings/settings.js    # Tab switching, theme cards, custom colors, save/cancel
│   │       ├── sidebar/sidebar.js      # Sidebar toggle, page placements, navigation
│   │       ├── goals/                  # Goals CRUD, detail modal, hierarchy tree
│   │       ├── tasks/                  # Tasks CRUD, goals-tree popup, filters
│   │       ├── stats/                  # Stats charts, focus analytics
│   │       └── habits/                 # Habits table, stats modal, add modal
│   ├── main.js                     # Electron main — spawns .NET backend, IPC → HTTP bridge
│   └── preload.js                  # Context bridge (electronAPI + db API)
├── backend/
│   ├── Program.cs                  # .NET 9 startup, EF Core + legacy DB migration
│   ├── Data/
│   │   └── AppDbContext.cs         # EF Core DbContext (8 entities)
│   ├── Entities/                   # Goal, GoalProgress, Habit, HabitLog,
│   │                              # Session, Setting, Tag, TaskItem
│   ├── DTOs/                       # Request/response DTOs per entity
│   ├── Controllers/                # REST API: Goals, Habits, Sessions,
│   │                              # Settings, Tags, Tasks
│   ├── Migrations/                 # EF Core migrations
│   ├── Properties/
│   │   └── launchSettings.json     # Dev server config (port 5200)
│   ├── appsettings.json            # Logging, connection strings
│   └── Jamrah.Backend.csproj       # .NET 9 project file
├── package.json                    # Electron + build config
├── .gitignore
└── README.md
```

**Architecture Flow:**

```
Renderer (HTML/JS)  →  IPC (preload.js)  →  Main Process (main.js)  →  HTTP  →  .NET Backend (localhost:5200)  →  SQLite
```

---

## ⚖️ License

**PolyForm Noncommercial License 1.0.0**

This software is free for **personal, noncommercial use** only. You may use, modify, and share it for research, education, hobby projects, and other noncommercial purposes.

**Commercial use is not permitted** without explicit permission from the author.

See the [LICENSE](LICENSE) file for the full terms.

> Required Notice: Copyright AhmMed29 (https://github.com/AhmMed29)
