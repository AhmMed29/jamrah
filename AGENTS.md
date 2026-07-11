When executing tasks: do EXACTLY what the user asks, with NO additions, NO deletions, and NO modifications beyond what is explicitly requested. Never add features, change designs, refactor code, or improve things unless specifically told to. Follow every instruction to the letter.

## Session Summary (last updated 2026-07-10)

### Goal
- Fix all remaining button/delay bugs, redesign sidebar (one toggle button, no content push), redesign session tracker box, add day navigation, and integrate session name popup

### Done
- **TASK 1 (Stop button fix)**: `toggleTimer()` in timer.js made fully synchronous — removed `await setPhaseTime` call. Sessions.js override of `toggleTimer` also sync. Guard added for `remainingSeconds <= 0` to prevent restart on tick completion.
- **TASK 2 (Button delay fix)**: `openSettings()` calls `showPage('settings')` before any IPC calls (`theme.js:21`). `saveSettings()` no longer unconditionally navigates back (`settings.js:66`).
- **Sidebar redesign**: Removed separate open/close buttons, single `#sidebarToggleBtn` with hamburger/X swap. Content push removed — sidebar now overlays with `rgba(0,0,0,0.2)` backdrop.
- **Session side box**: 320px wide, inside `#page-pomodoro` as flex child left of `<main>`. Timeline dots with connecting lines. Day nav (back/fwd arrows), fwd hidden on today. Active session gets purple glow dot. Hidden when timer runs via `updateUI()`.
- **Session name popup (deferred start)**: When `taskPopup` enabled and user clicks play from idle, timer does NOT start immediately. `_pendingSessionStart = true`, popup appears near first dot. Input + check button. Click outside confirms. On confirm: timer starts via `_origToggleTimer()`, name saved to localStorage + `activeSession.taskName`, `lastResumeTime` reset for accurate timing.
- **`taskPopup` integration**: When disabled, session name defaults to `"none"`, name column in side box hides. Cached `_taskPopupEnabled` var updated on settings save. `onSessionComplete/Cancel` clear `_pendingSessionStart`.
- **`pomoNameBox` hidden**: Always `display: none` in `updateUI()` — replaced by inline popup.

### Current file state
- `src/index.html`: `#pomoNamePopup` added after preset buttons. `#pomoNameBox` kept (hidden via CSS/JS).
- `src/css/main.css`: `.sidebar-toggle-btn` (fixed, z-index 51), `.sidebar-backdrop` (z-index 41), `.sidebar` (overlay, z-index 42).
- `src/css/pomodoro.css`: `.pomo-side-box` + children (timeline, entries, dots, nav). `.pomo-name-popup` (fixed positioning, arrow, body, input, btn).
- `src/timer.js`: `toggleTimer()` sync. `pomoNameBox` always hidden in `updateUI()`.
- `src/js/sessions.js`: `toggleTimer` override sync. `onSessionStart/Pause/Resume/Complete/Cancel` all call `renderSessionSideBox()`. `showSessionNamePopup()` positioned near first dot. `confirmSessionName()` updates name. `updateTaskPopupCache()` reads from DB.
- `src/js/components/settings/settings.js`: `saveSettings()` calls `window.updateTaskPopupCache()`.
