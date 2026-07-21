
## Summary of What Will Be Fixed

| # | Area | Type |
|---|------|------|
| 1 | Session side box resizer — sluggish, double-resize | Bug |
| 2 | Session side box toggle pushes Pomodoro main area | Bug |
| 3 | .NET backend splash error dialog on startup | Bug |
| 4 | Habits table — checkboxes don't refresh daily | Bug |
| 5 | Edit habit — duration doesn't save; Arabic labels; total days wrong | Bug |
| 6 | Delete habit popup appears behind habit popup | Bug (z-index) |
| 7 | Goals — logic broken, heatmap needed, edit fields overflow, data doesn't save | Bug + Feature |
| 8 | Tasks — split-panel layout, notes as .md file, scheduling, reminder, delete without confirm | Bug + Feature |
| 9 | Sidebar — remove group labels, make resizable, icon+text larger, shrink main content | Bug + Feature |
| 10 | Stats — habits consistency broken, dot tooltips, time range arrows, goals progress redesign | Bug + Feature |
| 11 | Stats top cards — all-time focus, remove habits done, fix tasks completed, fix focus period label | Bug |
| 12 | Pomodoro main — popup on right, note section on right, quick presets 50/25/10/5, duration not saving, tags button, start only via "Start Session" | Bug + Feature |
| 13 | Pomo hover buttons — remove borders, make bigger, reset = restart with last settings, skip = save+next, End = no popup | Bug |
| 14 | Sessions side box — reverse order (newest first), delete without popup | Bug |
| 15 | Sessions bar sticks to sidebar right ledge regardless of sidebar state | Bug |
| 16 | Welcome popup — show only once, not every launch | Bug |

---

## Open Questions

> [!IMPORTANT]
> **Point 7 — Goals heatmap**: The heatmap you describe (GitHub-style, colored by subtask completion day) requires storing per-day task-completion data. The backend already has a `GoalProgress` table. Should the heatmap use that, or should it track from the existing task `completedAt` (not currently stored)? **I will add a `completedAt` field to tasks** and color heatmap cells based on the day a subtask under that goal was marked done.

> [!IMPORTANT]
> **Point 8 — Task notes as .md files**: The Electron `write-file` IPC handler already exists but restricts paths to inside `storagePath`. Notes will be saved as `<storagePath>/notes/<taskId>.md`. The Markdown toolbar will support Bold, Italic, Heading, Link, and Code — written as plain Markdown syntax (not a rich editor).

> [!IMPORTANT]
> **Point 8 — Task scheduling + 5-minute reminder**: The OS reminder will use Electron's `Notification` API and a background `setInterval` check every 30 seconds. It will appear as a native OS notification (not an in-app overlay) because Electron is sandboxed. The "override anything on screen" behavior is achieved via `win.setAlwaysOnTop(true)` momentarily.

> [!IMPORTANT]
> **Point 12 — Pomo popup on right**: Currently, clicking the timer circle shows a popup (`#pomoNamePopup`) centered on screen. The new behavior: clicking "Start Session" button (not the timer circle) opens the popup on the right side of the timer. This means the circle click no longer triggers anything except when idle (it now does nothing — only the dedicated play button/start button works).

---

## Proposed Changes

---

### 1 — Session Side Box Resizer (Sluggish / Double Resize)

**Root cause**: The resizer logic in `sessions.js` (lines 1076–1106) uses `e.clientX - 72` as an offset, but the `pomo-side-box` uses `resize: horizontal` CSS which conflicts, causing two simultaneous resize paths. The CSS `transition: all 0.3s` on `.pomo-side-box` also delays the drag.

#### [MODIFY] [side-box.css](file:///c:/Users/T.B/Desktop/My-Productivity-App/src/css/side-box.css)
- Remove `resize: horizontal` from `.pomo-side-box` (line 17).
- Remove the `transition: all 0.3s cubic-bezier(...)` from `.pomo-side-box` (line 14) — keep only opacity/transform transitions for the hidden-fade, not `width`.
- Change to `transition: opacity 0.3s, transform 0.3s` only.

#### [MODIFY] [sessions.js](file:///c:/Users/T.B/Desktop/My-Productivity-App/src/js/sessions.js)
- Rewrite the resizer block (lines 1076–1106): use `requestAnimationFrame` throttling on `mousemove`, compute width from `pomoSideBox.getBoundingClientRect().left` rather than a hardcoded `- 72` offset so it's accurate at any window size.
- `user-select: none` on `body` during drag to prevent text selection lag.

---

### 2 — Side Box Toggle Pushes Pomodoro Area

**Root cause**: `#page-pomodoro` is `display: flex`. The `#pomoSideBox` is a flex child with non-zero width. When toggled to `collapsed` (36px) or to `hidden-fade` (adds `margin-left: -320px`), the flex container redistributes space and pushes `<main>`. The resizer div also participates in flex flow.

#### [MODIFY] [side-box.css](file:///c:/Users/T.B/Desktop/My-Productivity-App/src/css/side-box.css)
- Change `.pomo-side-box` to `position: absolute; left: 0; top: 0; bottom: 0;` instead of being a flex child.
- Remove `margin-left: -320px` from `.pomo-side-box.hidden-fade` — use `transform: translateX(-100%)` only.
- Add `padding-left` to `<main id="mainArea">` equal to the current side box width (read via JS) so the main content is offset but doesn't move when box toggles.

#### [MODIFY] [sessions.js](file:///c:/Users/T.B/Desktop/My-Productivity-App/src/js/sessions.js)
- In `togglePomoSideBox()` (lines 1121–1134): after toggling, update `mainArea.style.paddingLeft` to match the side box width.
- In the resizer `mousemove`: also update `mainArea.style.paddingLeft` in sync.

#### [MODIFY] [index.html](file:///c:/Users/T.B/Desktop/My-Productivity-App/src/index.html)
- Remove `#pomoResizer` from the flex row between `#pomoSideBox` and `<main>`. Reposition resizer as `position: absolute` attached to the right edge of `#pomoSideBox` so it doesn't occupy flex space and never reaches into `<main>`.

---

### 3 — .NET Backend Splash Error Dialog

**Root cause**: In `main.js` (line 78), when the backend doesn't respond in 30 retries × 500ms = 15 seconds, `dialog.showErrorBox(...)` is called **before** the window is shown. This `dialog.showErrorBox` is a blocking native dialog that appears before the app renders.

Additionally, the backend `stderr` may be printing migration errors (caught by `try/catch` in `Program.cs`) but the Electron process logs them to `console.error` — these do not cause the window, but any unhandled exception in `Program.cs` would cause the process to crash and trigger the dialog.

#### [MODIFY] [main.js](file:///c:/Users/T.B/Desktop/My-Productivity-App/main.js)
- Replace `dialog.showErrorBox(...)` with a non-blocking approach: send an IPC message to the renderer after the window is shown, and show an in-app toast/banner instead.
- Add graceful error handling: if backend exits with a non-zero code, log it and show in-app warning.
- Add a `backendProcess.on('exit', ...)` handler to detect crashes and notify the renderer.

#### [MODIFY] [backend/Program.cs](file:///c:/Users/T.B/Desktop/My-Productivity-App/backend/Program.cs)
- Wrap `ctx.Database.Migrate()` in a broader try/catch that logs but never throws out of the startup block.
- Add explicit `try/catch` around each `legacyColumns` SQL that could fail due to type mismatch (not just `SqliteException`) to prevent unhandled errors.

#### [MODIFY] [src/js/app.js](file:///c:/Users/T.B/Desktop/My-Productivity-App/src/js/app.js)
- Add an IPC listener for `'backend-error'` event to show a non-blocking in-app notification.

#### [MODIFY] [preload.js](file:///c:/Users/T.B/Desktop/My-Productivity-App/preload.js)
- Expose the new `backend-error` IPC channel via `contextBridge`.

---

### 4 — Habits Table: Checkboxes Don't Reset Daily

**Root cause**: In `habits.js` (lines 1–17), `today`, `startDate`, and `DAY_COUNT` are computed **once** at script load time. If the user leaves the app open overnight, `today` becomes stale and the table never re-renders for the new day. The date column headers are also built once from the stale `dates` array.

#### [MODIFY] [src/js/components/habits/habits.js](file:///c:/Users/T.B/Desktop/My-Productivity-App/src/js/components/habits/habits.js)
- Move `today`, `startDate`, `DAY_COUNT`, and `dates` computation inside the `render()` function so they are **recalculated on every render call**.
- In `app.js`, schedule a `setInterval` check every 60 seconds: if the current date string differs from the last known date, call `window.renderHabits()` to force a refresh.
- Also call `renderHabits()` every time the habits page becomes visible (already done via `showPage`, but ensure `render()` is called fresh).

---

### 5 — Edit Habit: Duration Doesn't Save + Arabic Labels + Total Days Wrong

**Root causes**:
1. **Arabic labels in modal**: `openModal()` (lines 142–173) renders Arabic strings hardcoded: `'إجمالي الأيام'`, `'تم الإنجاز'`, `'أطول سلسلة'`, and the edit button says `'تعديل العادة'`.
2. **Total days is wrong**: The modal shows `DAY_COUNT` (days since Jan 1st of the year) as "Total Days", but it should show the habit's own duration (from `durationStart` to `durationEnd`).
3. **Duration doesn't save on edit**: In `showHabitForm()`, when saving, `computeEnd(dt)` is only called for non-custom types, but the `durationStart` is never set for non-custom types. The `onSave` callback passes `null` for `ds` (start date) for non-custom. The backend `updateHabit` does save whatever is passed, so the problem is `ds = null` always for non-custom — the frontend should compute and pass the correct start date.

#### [MODIFY] [src/js/components/habits/habits.js](file:///c:/Users/T.B/Desktop/My-Productivity-App/src/js/components/habits/habits.js)
- In `openModal()`: replace all Arabic strings with English: `'Total Days'`, `'Done'`, `'Best Streak'`, `'Edit Habit'`, `'Delete'`.
- In `openModal()`: compute "Total Days" as the number of days between `habit.durationStart` and `habit.durationEnd` (or since `durationStart` if no end, fallback to `DAY_COUNT`).
- In `showHabitForm()` save handler: for non-custom types, compute and pass `ds = today.toISOString().split('T')[0]` as start date, and `de = computeEnd(dt)` as end date. For custom, use the inputs as before.
- Verify the `openEditModal()` correctly passes existing `habit.durationStart` / `habit.durationEnd` to `showHabitForm` — it does (lines 198–201), so the bug is only in the save path.

---

### 6 — Delete Habit Popup Appears Behind Habit Popup (Z-Index)

**Root cause**: The confirm popup (`#confirmPopup`) is rendered in the DOM with `z-index: 50` (line 256 of `index.html`). The habit modal (`#habit-modal`) has `z-index: 100` (main.css line 11). The confirm popup's z-index is lower.

#### [MODIFY] [src/index.html](file:///c:/Users/T.B/Desktop/My-Productivity-App/src/index.html)
- Change `z-index` of `#confirmPopup` from `z-50` (50) to a value above 100, e.g. `z-[150]` or inline `z-index:150`.

#### [MODIFY] [src/css/main.css](file:///c:/Users/T.B/Desktop/My-Productivity-App/src/css/main.css)
- Ensure `#delete-confirm-modal` (z-index 200) is also correct. It already is at 200 — this is fine.
- The issue is specifically the `#confirmPopup` used by habits. Fix its z-index to 150+.

---

### 7 — Goals Section: Logic, Heatmap, Daily Goals → Tasks, Edit Bugs

**Root causes**:
1. **Daily goals don't appear in Tasks**: No bridge exists between goals with `durationType=days/value=1` and the tasks page.
2. **Goal subtasks stored in localStorage** (not DB), so progress is not real.
3. **Edit form fields overflow** the card container (CSS issue in `goals.css`).
4. **Duration doesn't save on edit**: `saveEditGoal` sends `durationType` via localStorage only — the backend `updateGoal` doesn't receive or store `durationType` / `durationValue` (only `duration` in days). The `GoalsController.Update` does update `duration`, but `durationType` is never in the DTO.
5. **No heatmap**.
6. **Goal tasks need scheduling and checkbox**.

#### [MODIFY] [src/js/components/goals/goals.js](file:///c:/Users/T.B/Desktop/My-Productivity-App/src/js/components/goals/goals.js)
- **Daily goals → Tasks**: In `saveNewGoal()` and `saveEditGoal()`, if `durationType === 'days' && durationVal === 1`, call `window.db.createTask(...)` to create a matching task linked to this goal (`goalId`). This task will appear automatically in the Tasks TODO section.
- **Goal subtasks**: Move goal subtasks from localStorage to the real DB tasks table by creating them as tasks with `goalId` set and a `checkbox`-style completion. On save, call `createTask` with `parentTaskId = null, goalId = goal.id`.
- **Heatmap**: Add a `<div class="goal-heatmap">` to each goal card that reads from `rawData.tasks` (tasks belonging to this goal) filtered by `completedAt` date. Render a GitHub-style heatmap grid of the last 12 weeks. Color intensity = number of subtasks completed that day.
- **Edit form overflow**: In `createEditCard()`, wrap inputs in a constrained container. Specific inputs (date fields) that overflow: add `max-width: 100%; box-sizing: border-box` to `.goal-form-input`.
- **Duration save on edit**: Update `saveEditGoal()` to include `durationType` in the object sent to `db.updateGoal()`. Update the backend DTO and controller to accept and store `durationType` and `durationValue`.

#### [MODIFY] [src/css/goals.css](file:///c:/Users/T.B/Desktop/My-Productivity-App/src/css/goals.css)
- Add `.goal-form-input { max-width: 100%; box-sizing: border-box; }`.
- Add `.goal-heatmap` styles: small grid of colored squares.
- Add `.goal-heatmap-cell` styles for different intensity levels.

#### [MODIFY] [backend/Controllers/GoalsController.cs](file:///c:/Users/T.B/Desktop/My-Productivity-App/backend/Controllers/GoalsController.cs)
- Add `DurationType` and `DurationValue` fields to `UpdateGoalDto` and persist them in the `Update` endpoint.

#### [MODIFY] [backend/DTOs/UpdateGoalDto.cs] *(new field additions)*
- Add `string? DurationType` and `int? DurationValue` properties.

#### [MODIFY] [backend/Entities/Goal.cs] *(if DurationType not already there)*
- Add `DurationType` and `DurationValue` columns.

#### [MODIFY] [backend/Program.cs](file:///c:/Users/T.B/Desktop/My-Productivity-App/backend/Program.cs)
- Add migration SQL: `ALTER TABLE goals ADD COLUMN durationType TEXT` and `ALTER TABLE goals ADD COLUMN durationValue INTEGER`.

#### [MODIFY] [backend/Controllers/TasksController.cs](file:///c:/Users/T.B/Desktop/My-Productivity-App/backend/Controllers/TasksController.cs)
- Add `completedAt` field support: when a task is marked complete, store the current timestamp.

#### [MODIFY] [backend/Entities/Task.cs] *(add completedAt field)*
- Add `CompletedAt` (nullable datetime string).

---

### 8 — Tasks: Split-Panel Layout, Notes, Scheduling, Subtask Redesign, Hover Delete

**Root causes**:
1. Task details open as a full overlay popup — should be a right panel.
2. No task notes feature.
3. No scheduling/reminder.
4. Subtask display is inside the popup (same overlay), not a clean left-side item.
5. Delete requires confirmation even for simple tasks.
6. Colored dot instead of colored left ledge.

#### [MODIFY] [src/index.html](file:///c:/Users/T.B/Desktop/My-Productivity-App/src/index.html)
- Restructure `#page-tasks`: from a single-column list to a two-column flex layout:
  - Left column (`#tasks-list-panel`): task list, sort controls, add button.
  - Right column (`#task-detail-panel`): task detail view (initially empty/placeholder).
- Add `#task-detail-panel` with sections: editable name, date + schedule button, priority selector, subtasks toggle, note editor (`<textarea>` with toolbar).
- Add a small scheduling popover (`#task-schedule-popover`) that appears near the schedule button.

#### [MODIFY] [src/js/components/tasks/tasks.js](file:///c:/Users/T.B/Desktop/My-Productivity-App/src/js/components/tasks/tasks.js)
- **Colored left ledge**: Replace `.task-priority-dot` (a circle) with a `4px wide` left border on `.task-item` colored by priority.
- **`showTaskDetails(id)`**: Instead of creating an overlay, populate `#task-detail-panel` with the task data. Keep a `_selectedTaskId` variable.
- **Editable task name**: Make `#task-detail-name` a `contenteditable` div or input that saves on blur via `db.updateTask()`.
- **Date + Schedule**: Show the task's `createdAt` date. Add a "Schedule" button that opens `#task-schedule-popover` — a small floating dropdown with a time input. Store the scheduled time in localStorage as `scheduledTime_<taskId>`.
- **Priority selector**: Render 3 colored dot buttons in the detail panel that update task priority on click via `db.updateTask()`.
- **Task notes**: On clicking the note `<textarea>`, call `electronAPI.writeFile(storagePath + '/notes/' + taskId + '.md', content)`. Auto-save on `input` event with 500ms debounce. On load, call `electronAPI.readFile(...)` to restore note content.
- **Markdown toolbar**: Add a small bar above the note textarea with buttons: **B**, *I*, `H`, `Link`, `` ` `` — each inserts the markdown syntax around selected text.
- **Subtasks redesign**: In the left panel, render subtasks as indented items below their parent (already done). Remove the complex popup. Add a `+` icon button next to date/priority in the detail panel to add subtasks inline.
- **Subtasks in detail panel**: A collapsible `<details>` section above the note, listing subtasks with checkboxes. Each subtask has a hover-reveal delete `×` button (no confirmation).
- **Hover delete on task list**: On `.task-item:hover`, show a delete icon on the right edge. If task has no subtasks and no note: delete directly without confirmation. If it has subtasks or a note: show a brief warning text (e.g., "Has subtasks/note — click again to delete") requiring a second click.
- **Reminder**: In `app.js`, add a `setInterval` every 30 seconds that checks localStorage for any `scheduledTime_<taskId>`. If the scheduled time is within 5 minutes and not yet notified, call `Notification` API and temporarily `win.setAlwaysOnTop(true)`.

#### [MODIFY] [src/css/tasks.css](file:///c:/Users/T.B/Desktop/My-Productivity-App/src/css/tasks.css)
- Add `.tasks-split-layout`, `.tasks-list-panel`, `.task-detail-panel` layout styles.
- Change `.task-item` from a full-width card to a left-border style: `border-left: 4px solid <priority-color>; border-radius: 0 8px 8px 0;`.
- Add `.task-note-toolbar` styles.
- Add `.task-subtask-row` redesigned styles.

#### [MODIFY] [main.js](file:///c:/Users/T.B/Desktop/My-Productivity-App/main.js)
- Add IPC handler for reminder: a `set-task-reminder` handler that the renderer calls with `{ taskId, scheduledTime }`, and triggers a `Notification` + momentary `win.setAlwaysOnTop(true)` at the right time.

#### [MODIFY] [backend/Controllers/TasksController.cs](file:///c:/Users/T.B/Desktop/My-Productivity-App/backend/Controllers/TasksController.cs)
- Ensure `updateTask` endpoint accepts and persists `priority`, `name`, `scheduledTime`, `completedAt`.

---

### 9 — Sidebar: Remove Group Labels, Resizable, Bigger Icons+Text, Shrink Main

#### [MODIFY] [src/index.html](file:///c:/Users/T.B/Desktop/My-Productivity-App/src/index.html)
- Remove the three `<div class="app-sidebar-group-label">` elements: "Navigation", "Insights", "System" (lines 116, 137, 146).
- Remove the wrapping `<div class="app-sidebar-group">` divs, keeping only the `<div class="app-sidebar-menu">` and `<button>` items directly.
- Add a `<div id="appSidebarResizer">` on the right edge of `#appSidebar` for drag-to-resize.

#### [MODIFY] [src/css/sidebar-new.css](file:///c:/Users/T.B/Desktop/My-Productivity-App/src/css/sidebar-new.css)
- Increase `.app-sidebar-menu-item` icon size: `material-symbols-outlined` font-size from current to `22px`.
- Increase `.app-sidebar-menu-item` text font-size from current to `14px`.
- Add `#appSidebarResizer` styles: `width: 5px; cursor: col-resize; position: absolute; right: 0; top: 0; bottom: 0;`.

#### [MODIFY] [src/js/components/sidebar/sidebar.js](file:///c:/Users/T.B/Desktop/My-Productivity-App/src/js/components/sidebar/sidebar.js)
- Add sidebar resize logic: `mousedown` on `#appSidebarResizer` → `mousemove` → update `sidebar.style.width`. Save width to `localStorage('sidebarWidth')`. Restore on load.
- In `toggleAppSidebar()`: when opening, apply `appContent.style.paddingLeft = sidebarWidth + 'px'` to shrink the main content area. When closing, set `paddingLeft = 0`. This is purely a layout shift, not a design change.

> [!NOTE]
> The sidebar currently overlays (position: fixed, z-index 42) so it doesn't push content. Point 9 asks that the main window becomes "smaller" when sidebar is open — this requires changing the sidebar from overlay to a push model for this specific case, OR applying a CSS transform/margin to `#appContent`. The approach here uses `marginLeft` on `#appContent` to avoid redesigning the overlay.

---

### 10 — Stats: Habits Consistency Bug, Dot Tooltips, Time Range Arrows, Goals Redesign

**Root cause for habits consistency**: In `stats.js` (lines 196–214), habits data uses `h.logs` which stores log objects with a `date` string like `"2026-07-18"`. The `new Date(l.date)` conversion without a time component treats dates as UTC midnight, so date comparison with local `startDate` (which is in local time) can be off by one day.

#### [MODIFY] [src/js/components/stats/stats.js](file:///c:/Users/T.B/Desktop/My-Productivity-App/src/js/components/stats/stats.js)
- **Fix date comparison**: For habit logs, parse `l.date` as `new Date(l.date + 'T00:00:00')` (local time) instead of `new Date(l.date)` (UTC).
- **Dot tooltips**: In Chart.js config for all three charts, add `plugins.tooltip` with `mode: 'index'` and a custom `callbacks.label` that shows: for habits chart — `"X habits done on this day"`, for tasks — `"X tasks completed"`, for focus — `"Xh Ym focused"`.
- **For habits chart specifically**: Change to show per-day ratio: `(number of habits done that day) / (total number of habits)` as a percentage line. Tooltip shows `"3/5 habits done"`.
- **Time range arrows**: Add `<button id="statsRangePrev">◀</button>` and `<button id="statsRangeNext">▶</button>` next to the `#statsTimeToggle` bar. Clicking arrows shifts `startDate` by ±1 week/month/year based on current `currentTimeRange`. Add a `currentRangeOffset` variable (default 0 = now) that shifts the window.
- **Goals progress redesign**: Replace the simple bar-per-goal with a table: goal name | start date | end date | progress bar | percentage | status badge. Add color coding by status.

#### [MODIFY] [src/css/stats.css](file:///c:/Users/T.B/Desktop/My-Productivity-App/src/css/stats.css)
- Add `.stats-goals-table` styles.
- Add `.stats-range-arrows` styles.

#### [MODIFY] [src/index.html](file:///c:/Users/T.B/Desktop/My-Productivity-App/src/index.html)
- In the stats section of the page, add `<div id="statsRangeControls">` with prev/next arrow buttons and the time toggle.

---

### 11 — Stats Top 4 Cards: Fix Values and Labels

**Root causes**:
- "Focus Time (Period)" → should be "Today's Focus" showing only today's sessions.
- "Habits Done" → remove this card entirely (doesn't make sense as a single number).
- "Tasks Completed" → should count all time (from first launch to today), not period.
- "All-Time Focus" → already correct conceptually but needs to be always recalculated from all sessions, not range.

#### [MODIFY] [src/js/components/stats/stats.js](file:///c:/Users/T.B/Desktop/My-Productivity-App/src/js/components/stats/stats.js)
- In `drawStats()`, replace the 4-card section (lines 227–244) with:
  1. **"All-Time Focus"** — sum `focusMinutes` for ALL sessions (already computed as `tFocusStr`). ✓ Keep.
  2. **"Tasks Completed"** — count of ALL completed tasks (not filtered by range). Add a `totalTasksDone` variable.
  3. **"Today's Focus"** — sum `focusMinutes` for sessions where `startTime` date = today ISO. New variable `todayFocus`.
  4. **Remove "Habits Done"** — drop this card entirely.
- Update card titles: remove "Period" word from any label.

---

### 12 — Pomodoro: Popup on Right, Note Section on Right, Quick Presets, Duration Not Saving, Tags, Start Only Via Button

**Root causes**:
1. The popup (`#pomoNamePopup`) is centered and shown on timer circle click — should be on the right.
2. The note section is inside the popup — move it to be a persistent right panel.
3. Quick presets (50/25/10/5 min) are not present.
4. Duration input in popup (`#pomoPopupDuration`) updates `window.totalSeconds` but doesn't call `db.setSetting('workMinutes', ...)` so it's not persisted.
5. Tags button missing in note/right panel area.
6. Clicking outside the popup calls `confirmSessionName()` which starts the timer — should NOT start on outside click.

#### [MODIFY] [src/index.html](file:///c:/Users/T.B/Desktop/My-Productivity-App/src/index.html)
- **Popup reposition**: Remove `#pomoNamePopup` from its current centered position (inside the flex column). Move it to be a floating panel attached to the right of `#timerCircle` — use `position: absolute; left: calc(100% + 20px); top: 50%; transform: translateY(-50%);` relative to a positioned parent.
- **Remove Goal field from popup**: Remove the `#pomoPopupGoal` field from `#pomoNamePopup`.
- **Right note panel**: Add `#pomoNotePanel` as a sibling of `<main>` in `#page-pomodoro` flex row — mirrors how `#pomoSideBox` is on the left. Contains: tags button at top, note textarea, and hides when timer is running.
- **Quick presets**: Below the duration input in `#pomoNamePopup`, add `<div id="pomoPresets">` with 4 buttons: `50`, `25`, `10`, `5`.
- **Remove backdrop click = start**: Remove `onclick="window.confirmSessionName()"` from `#pomoNamePopupBackdrop`. Clicking outside should only dismiss if user presses Start Session button.

#### [MODIFY] [src/js/sessions.js](file:///c:/Users/T.B/Desktop/My-Productivity-App/src/js/sessions.js)
- **Preset buttons logic**: Add `window.selectPomoPreset(minutes)` that sets `#pomoPopupDuration` value and calls `db.setSetting('workMinutes', minutes)`.
- **Duration save fix**: In `confirmSessionName()` (line 1028–1034), also call `window.db.setSetting('workMinutes', customDuration)` when a custom duration is set.
- **Remove outside-click start**: Remove or modify the `document.addEventListener('click', ...)` block (lines 1061–1068) that calls `confirmSessionName()` on outside click. Change it to only call `hideSessionNamePopup()` (close without starting).
- **Tags in note panel**: Add `window.openPomoNoteTagDropdown()` function that shows existing tags in a small dropdown near the note panel. On selection, store `activeSession.tagId` if session is active, or set a `_pendingTagId` for the next session.
- **Note panel hide on run**: In `updateUI()` in `timer.js`, add: if `isRunning`, hide `#pomoNotePanel`; else show it.

#### [MODIFY] [src/js/timer.js](file:///c:/Users/T.B/Desktop/My-Productivity-App/src/js/timer.js)
- In `updateUI()` (line 163), add logic to show/hide `#pomoNotePanel`.
- In `window.timerCircle.addEventListener('click', ...)` (line 333): Remove the `toggleTimer()` call from the circle click handler — the circle click should do nothing except when the play button inside it is clicked. Or: keep circle click only for the play button (`#playBtn`), not the whole circle.

#### [MODIFY] [src/css/pomodoro.css](file:///c:/Users/T.B/Desktop/My-Productivity-App/src/css/pomodoro.css)
- Add `.pomo-note-panel` styles mirroring `.pomo-side-box` but on the right side.
- Add `.pomo-presets` button row styles.
- Reposition `.pomo-name-popup` to be `position: absolute` relative to a new wrapper.

---

### 13 — Pomo Hover Buttons: Remove Borders, Larger, Reset = Last Settings, Skip = Save+Next, End = No Popup

**Root causes**:
1. Hover buttons (`pomo-hover-btn`) have borders in CSS.
2. Clicking "End" shows `#endPopup` — should directly end without popup.
3. Reset should replay last session config (name, tag, duration).
4. Skip saves session then moves to next phase (partially done in sessions.js but incomplete).

#### [MODIFY] [src/css/timer.css](file:///c:/Users/T.B/Desktop/My-Productivity-App/src/css/timer.css)
- For `.pomo-hover-btn`: remove `border` (set to `border: none`), increase icon size (`font-size: 28px`), increase button `width`/`height`, increase distance from timer center.

#### [MODIFY] [src/js/timer.js](file:///c:/Users/T.B/Desktop/My-Productivity-App/src/js/timer.js)
- **End button** (`.pomo-btn-end`): Change its `onclick` from `window.openEndPopup()` to directly call `window.cancelSessionNow()` (already exists in sessions.js, saves the session and advances phase). Remove the popup call entirely.
- **Reset button**: Store last session config (name, tag, duration) in `window._lastPomoConfig = { name, tagId, duration }` at session start. On reset, restore these values to `activeSession` and the popup inputs.

#### [MODIFY] [src/index.html](file:///c:/Users/T.B/Desktop/My-Productivity-App/src/index.html)
- Change the End button's onclick from `window.openEndPopup()` to `window.cancelSessionNow()`.

#### [MODIFY] [src/js/sessions.js](file:///c:/Users/T.B/Desktop/My-Productivity-App/src/js/sessions.js)
- In `onSessionStart()`, save config to `window._lastPomoConfig`.
- In `window.resetTimer` override: restore `_lastPomoConfig` to the next session's pending state.

---

### 14 — Sessions Side Box: Newest First, Delete Without Popup

**Root cause**: `renderSessionSideBox()` renders sessions in start-time ascending order (line 777: `sort(a, b => a.startTime - b.startTime)`). Delete calls `showConfirmModal` (line 936–950).

#### [MODIFY] [src/js/sessions.js](file:///c:/Users/T.B/Desktop/My-Productivity-App/src/js/sessions.js)
- In `getSessionsForDate()` (line 773): reverse the sort — change to `b.startTime - a.startTime` so newest sessions appear first.
- In `window.deleteSession()` (lines 935–951): remove the `showConfirmModal` call entirely. Directly call `window.db.deleteSession(id)` then re-render. No confirmation needed.

---

### 15 — Sessions Bar Sticks to Sidebar Right Edge

**Root cause**: `#pomoSideBox` is currently positioned in the flex row of `#page-pomodoro`. It only appears on the pomodoro page. The sidebar is `position: fixed`. There's no mechanical connection between the two.

What you want: the sessions box always visible, glued to the right edge of the sidebar (whether sidebar is open or closed). When sidebar is closed, the sessions box is at `left: 0` (sidebar is off-screen). When open, it's at `left: 240px` (sidebar width).

#### [MODIFY] [src/css/side-box.css](file:///c:/Users/T.B/Desktop/My-Productivity-App/src/css/side-box.css)
- Change `#pomoSideBox` from being a flex-child of `#page-pomodoro` to `position: fixed; left: 0; top: 32px; bottom: 0;` (32px = titlebar height).
- Add `transition: left 0.3s cubic-bezier(0.4, 0, 0.2, 1)` to match sidebar animation.

#### [MODIFY] [src/js/components/sidebar/sidebar.js](file:///c:/Users/T.B/Desktop/My-Productivity-App/src/js/components/sidebar/sidebar.js)
- In `toggleAppSidebar()`: also update `pomoSideBox.style.left = _sidebarOpen ? '240px' : '0px'` (or whatever the sidebar width is).

#### [MODIFY] [src/index.html](file:///c:/Users/T.B/Desktop/My-Productivity-App/src/index.html)
- Move `#pomoSideBox` and `#pomoResizer` out of `#page-pomodoro` into the root `#appContent` div so it persists across page navigation.
- Adjust `<main id="mainArea">` in `#page-pomodoro` to have `margin-left` equal to the side box width so it doesn't overlap.

---

### 16 — Welcome Popup Shows Every Launch

**Root cause**: The `checkWelcome()` IIFE in `app.js` (lines 167–194) reads `await window.db.getSetting('welcomeShown')`. If the DB is not initialized yet when this runs, the `getSetting` may return `null` or throw, resulting in `shown !== 'true'` being true and the modal showing again.

**Confirmation**: `window.closeWelcomeModal()` (lines 196–199) calls `await window.db.setSetting('welcomeShown', 'true')` — this is correct. The bug is a timing issue: the DB init (`window._dbInitPromise`) is not awaited before reading the setting.

#### [MODIFY] [src/js/app.js](file:///c:/Users/T.B/Desktop/My-Productivity-App/src/js/app.js)
- In `checkWelcome()`: add `if (window._dbInitPromise) await window._dbInitPromise;` before reading the setting (same pattern used in `sessions.js` and `timer.js`).
- Add error handling: if `getSetting` throws, default to NOT showing the modal (fail safe).

---

## Files Affected (Complete List)

### Frontend

| File | Changes |
|------|---------|
| [src/index.html](file:///c:/Users/T.B/Desktop/My-Productivity-App/src/index.html) | Issues: 2, 6, 9, 10, 12, 13, 15 |
| [src/js/app.js](file:///c:/Users/T.B/Desktop/My-Productivity-App/src/js/app.js) | Issues: 3, 4, 8, 11, 16 |
| [src/js/timer.js](file:///c:/Users/T.B/Desktop/My-Productivity-App/src/js/timer.js) | Issues: 12, 13 |
| [src/js/sessions.js](file:///c:/Users/T.B/Desktop/My-Productivity-App/src/js/sessions.js) | Issues: 1, 2, 12, 13, 14, 15 |
| [src/js/components/habits/habits.js](file:///c:/Users/T.B/Desktop/My-Productivity-App/src/js/components/habits/habits.js) | Issues: 4, 5, 6 |
| [src/js/components/goals/goals.js](file:///c:/Users/T.B/Desktop/My-Productivity-App/src/js/components/goals/goals.js) | Issue: 7 |
| [src/js/components/tasks/tasks.js](file:///c:/Users/T.B/Desktop/My-Productivity-App/src/js/components/tasks/tasks.js) | Issue: 8 |
| [src/js/components/stats/stats.js](file:///c:/Users/T.B/Desktop/My-Productivity-App/src/js/components/stats/stats.js) | Issues: 10, 11 |
| [src/js/components/sidebar/sidebar.js](file:///c:/Users/T.B/Desktop/My-Productivity-App/src/js/components/sidebar/sidebar.js) | Issues: 9, 15 |
| [src/css/side-box.css](file:///c:/Users/T.B/Desktop/My-Productivity-App/src/css/side-box.css) | Issues: 1, 2, 15 |
| [src/css/main.css](file:///c:/Users/T.B/Desktop/My-Productivity-App/src/css/main.css) | Issue: 6 |
| [src/css/timer.css](file:///c:/Users/T.B/Desktop/My-Productivity-App/src/css/timer.css) | Issue: 13 |
| [src/css/pomodoro.css](file:///c:/Users/T.B/Desktop/My-Productivity-App/src/css/pomodoro.css) | Issue: 12 |
| [src/css/tasks.css](file:///c:/Users/T.B/Desktop/My-Productivity-App/src/css/tasks.css) | Issue: 8 |
| [src/css/goals.css](file:///c:/Users/T.B/Desktop/My-Productivity-App/src/css/goals.css) | Issue: 7 |
| [src/css/stats.css](file:///c:/Users/T.B/Desktop/My-Productivity-App/src/css/stats.css) | Issues: 10, 11 |
| [src/css/sidebar-new.css](file:///c:/Users/T.B/Desktop/My-Productivity-App/src/css/sidebar-new.css) | Issue: 9 |

### Backend (.NET)

| File | Changes |
|------|---------|
| [main.js](file:///c:/Users/T.B/Desktop/My-Productivity-App/main.js) | Issues: 3, 8 |
| [preload.js](file:///c:/Users/T.B/Desktop/My-Productivity-App/preload.js) | Issue: 3 |
| [backend/Program.cs](file:///c:/Users/T.B/Desktop/My-Productivity-App/backend/Program.cs) | Issues: 3, 7 |
| [backend/Controllers/GoalsController.cs](file:///c:/Users/T.B/Desktop/My-Productivity-App/backend/Controllers/GoalsController.cs) | Issue: 7 |
| [backend/Controllers/TasksController.cs](file:///c:/Users/T.B/Desktop/My-Productivity-App/backend/Controllers/TasksController.cs) | Issues: 7, 8 |
| [backend/Controllers/HabitsController.cs](file:///c:/Users/T.B/Desktop/My-Productivity-App/backend/Controllers/HabitsController.cs) | Issue: 5 (verify only — controller is correct) |
| backend/DTOs/UpdateGoalDto.cs | Issue: 7 |
| backend/Entities/Goal.cs | Issue: 7 |
| backend/Entities/Task.cs | Issue: 7, 8 |

---

## Verification Plan

### Logic Bugs (verify by running the app)
- Habits: Open app next day → new date columns appear and checkboxes are fresh ✓
- Welcome modal: Close it once → reopen app → does not appear again ✓
- Delete habit: popup appears on top of habit modal ✓
- Edit habit: duration saves correctly, English labels shown ✓
- Sessions side box: dragging resizer is smooth, Pomodoro doesn't shift ✓

### Feature Verification
- Tasks: Left panel shows tasks, clicking one shows detail on right ✓
- Goals: Edit saves duration to DB, heatmap renders ✓
- Stats: Habits chart shows correct day-by-day data with tooltips ✓
- Pomo: Clicking "Start Session" button starts timer, outer click does NOT ✓
- Sessions bar: visible on all pages, glued to sidebar right edge ✓

### Manual Verification
- Run `npm run dev` and test each of the 16 points manually in sequence.
- Check browser DevTools console for any JS errors after each fix.
