<p align="center">
  <img src="src/assets/Jamrah-Icon.svg" alt="Jamrah" width="128"/>
</p>

<h1 align="center">Jamrah جَــمْــرَه</h1>

<p align="center"><i>ember of productivity</i></p>

An all-in-one **Electron** desktop app: Pomodoro timer with live GLSL shader backgrounds (5 themes + custom + Minimal), habits tracker, goals & tasks manager — powered by SQLite with an auto-update system.
 
---

## Table of Contents
- [🧱 Project Structure](#-project-structure)
- [✨ Features](#-features)
  - [Simple Pomodoro 🍅](#simple-pomodoro-)
  - [Add Tasks ✔](#add-tasks-)
  - [Set a Goal 🎯](#set-a-goal-)
  - [🤸‍♀️ Habit Tracker](#️-habit-tracker)
  - [⚙ Customized Setting](#-customized-setting)
- [🚀 For Developers](#-for-developers)
  - [Getting Started](#getting-started)
- [🗄️ Data](#️-data)
- [🔧 Build for Windows](#-build-for-windows)
- [Linux & Mobile](#linux--mobile)
- [🔄 Sync](#-sync)
- [Updates](#updates)
- [⚖️ License](#️-license)

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

# ✨Features
## Simple Pomodoro 🍅

![Pomodoro Timer](src/assets/screenshots/Jamrah_AEBVDLM4uS.png)
## Add Tasks ✔

![Tasks](src/assets/screenshots/Pasted-image-20260629230335.png)
# Set a Goal 🎯
👉 Goals might be weekly, monthly or quartarly or yearly or customize it 🛠!

![Goals](src/assets/screenshots/Pasted-image-20260629230343.png)

### Alert ❕ 

The Goals Tab doesn't working well at all ! it needs alot of improvements ! so its prefered not to use it till it woek correctly ! 
⚔ The remaining Features :
- Customize Your Duration well ! not solid like (3-months or 3Weeks) ! set a goal in a specific deuration
- Complex Analytics ... when adding a task this may be linked to a specific Goal and this make it more productive and give a real analytics !
- SubGoals
- more by the time ....

![Goals Detail](src/assets/screenshots/Pasted-image-20260629230352.png)
## 🤸‍♀️ Habit Tracker 

Track Your habit as if it were in a paper ! 

༼ つ ◕_◕ ༽つ it has a clicked sounds to make it more attractive while done your habit !

⚔ the remaining part is also :
- the statistics of the habit during your week, month and the whole year !
- make the (everyday habit) add to tasks automaticaly and if the habit related to one by one day it will appear in this day automaticaly to make it more linkable !
- Support English 
![Habit Tracker](src/assets/screenshots/Pasted-image-20260629230358.png)
## ⚙ Customized Setting Based On Your Preferences 

⭐ The Main Idea of this app was to make the user choose his preferences in each component in the app ... hide or display any tab or any button or anything by your preferences ! 

👎 any other app make it solid and static . . they impose thier favourite buttons, colors and themes !

We Are Working on each button to make the user has full control on anything and everything !

![Settings](src/assets/screenshots/Pasted-image-20260629230407.png)

---

## 🚀 For Developers 

### Getting Started

```bash
git clone https://github.com/AhmMed29/jamrah.git
cd jamrah
npm install
npm start
```

Requires **Node.js 22+** and **npm**.
***
## 🗄️ Data

All data stored locally via **SQLite** (better-sqlite3). Default location:

```
Windows: %APPDATA%/Jamrah/data/
```

You can change the storage path in Settings → Storage tab (well be customized more and more soon .. need more improvements).
***
## 🔧 Build for Windows

🙆‍♂️ Unfortunately ! this app currently for windows else ! 

```bash
npm run dist
```

Output in `dist/` — NSIS installer.
## Linux & Mobile

👉 Im Calling all Devs To make this app working on linux and mobile ! 

## 🔄 Sync 

When The First Release For Mobile Work !
it must have a sync functionality ! to start use it with other platforms easily !
this may take many time to achieve unless any developer work on it !

---
## Updates

tell now the new updates reach to the end user successfuly ! with a full release notes for every new feature and updates !

---
## ⚖️ License

**PolyForm Noncommercial License 1.0.0**

This software is free for **personal, noncommercial use** only. You may use, modify, and share it for research, education, hobby projects, and other noncommercial purposes.

**Commercial use is not permitted** without explicit permission from the author.

See the [LICENSE](LICENSE) file for the full terms.

> Required Notice: Copyright AhmMed29 (https://github.com/AhmMed29)
