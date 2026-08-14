# Plan: Pomo Improvements (details window, DB persistence, views fix, controls)

Branch: `feature/pomo-minimal-design` (worktree `.worktrees\pomo-minimal-design`)
Scope: ONLY `Components/Pomodoro/*` + new `Data/PomodoroRepository.cs`. Design CSS preserved verbatim. No other pages touched.

## Requirements (user-approved design)

1. **Details window**: click pomodoro while session active -> current-session details (name, note, elapsed/planned, tag) with ✏️ edit, 🗑 delete (also from DB+list, resets timer), 💾 save (freezes + saves actual elapsed, e.g. 10s -> 10s). Click a session in list: current -> same window; done -> details with edit (name/note/**duration**/tag) + delete.
2. **Swap modal boxes**: session box on the RIGHT, tags box on the LEFT (DOM: tags first, session second; `.tags-modal-box` keeps `border-right:none`).
3. **Date labels**: all day headers show `الثلاثاء 11/8/2026` (Arabic day names). Count stays in place.
4. **Monthly view**: current year only, months 1..current; each month -> every day (past months full, current month 1..today), zero-filled counters.
5. **Yearly view**: current year only -> months 1..current (zero-filled) -> days -> sessions. No past years.
6. **Controls**: play/pause button swaps SVG (running -> `||` pause, stopped -> `▶` play). New ✓ button next to it: finish immediately + save with actual elapsed + reset timer.
7. **Duration prompt**: pressing 5/10/25/50 while a session is active -> modal (same design) with two buttons: "الغاء الجلسة الحالية (سيتم حذفها)" and "حفظ الجلسة وبدأ جلسة جديدة مدتها: X دقيقة". Both start the new session immediately. X = close = no-op.
8. **DB**: new `jamrah_pomodoro.db3` via `PomodoroRepository` (sqlite-net-pcl, follows `TaskRepository` pattern). EVERY started session persists immediately (0 elapsed), updated on pause(10s ticks)/reset/save/✓/complete/delete. Tags persist; seed 3 defaults when empty.
9. **Remove T button** from right sidebar (keep P). Only that.
10. Final time row: end time = start + planned duration (live).

## Tasks

1. Write this plan, commit.
2. `PomodoroModels.cs`: SQLite attributes; `Session` -> settable props + `PlannedMinutes`, `ElapsedSeconds`, `Completed`, `TagId`/`TagName`/`TagColor`, `[Ignore] Tag`; `Tag` -> `[PrimaryKey, AutoIncrement]`.
3. New `Data/PomodoroRepository.cs`: InitAsync (jamrah_pomodoro.db3), GetSessionsAsync, SaveSessionAsync (InsertOrReplace), DeleteSessionAsync, GetTagsAsync, SaveTagAsync, DeleteTagAsync.
4. `PomodoroPage.razor` + `ToggleGroup.razor`: all behaviors above.
5. Build (0 errors), manual re-verify each requirement.
6. Commit; report; finishing-a-development-branch flow (PR).
