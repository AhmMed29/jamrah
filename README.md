<p align="center">
  <img src="assets/Jamrah-Icon.svg" alt="Jamrah" width="128"/>
</p>

<h1 align="center">Jamrah جَــمْــرَه</h1>

<p align="center"><i>ember of productivity</i></p>

> please note that the stack is completely changed to maui blazor hybrid instead of electron,
> this will lead to a major updates and more and more features because my stack is .Net so i could write C# well !
> the old stable version was 'VIBE CODED' I HATE IT. for each component i was asking ai what to do and spend hours solving its probelms either in UI or Logic !
> the new versions now is very simple and i can handle everything and I OWN THE CODE NOT AI.
> Thank You, hope my app helps you, your CONTRIBUTIONS appreciated

---

Jamrah is a local-first productivity app built with .NET 9 + MAUI (Blazor Hybrid).
everything is stored locally on your machine using SQLite -- no accounts, no cloud, no tracking.
the whole UI is RTL Arabic-first with a minimal warm stone design.

## Table of Contents
- [Tech Stack](#tech-stack)
- [App Shell & Navigation](#app-shell--navigation)
- [Tasks](#tasks)
- [Pomodoro](#pomodoro)
    - [Prayer Times](#prayer-times)
- [Calendar](#calendar)
- [Architecture](#architecture)
- [Data Layer](#data-layer)
- [What's Next](#whats-next)

## Tech Stack

- .NET 9 + MAUI Blazor Hybrid : native shell for the frame + Razor components rendered inside WebViews.
- C# everywhere -- no JavaScript framework, no npm, no node_modules.
- sqlite-net-pcl as the ORM, three separate local databases.
- one external API only : aladhan.com for prayer times (cached offline in SQLite).
- targets Windows first (net9.0-windows10.0.19041.0), platform folders ready for future targets.

## App Shell & Navigation

- fixed slim sidebar (64px) on the left, built with pure native MAUI (not html).
- three buttons : Tasks / Pomodoro / Calendar.
- active button gets a dark highlight, hover effect on the rest.
- each page lives inside its own lazy-created BlazorWebView -- switching is instant because the webviews stay alive, we just toggle visibility.
- zoom is disabled inside the webviews so the ui stays pixel perfect.

## Tasks

Very Very Simple Task Management System ! (that grew up)

five view modes, you cycle between them with one button :

1. **Kanban Board**
    - add / rename / delete columns (rename is inline edit : Enter saves, Esc cancels).
    - custom mouse drag & drop : a ghost card follows your cursor while dragging, drop on any column to move the task.
2. **Eisenhower Matrix** مصفوفة أيزنهاور
    - four quadrants : ضروري ومهم / مهم وغير ضروري / ضروري وغير مهم / غير ضروري وغير مهم.
    - drag any task between quadrants, the quadrant number is saved on drop.
3. **All** الكل
    - split view : normal TO-DO list on one side, scheduled & recurring tasks on the other side.
    - recurring/scheduled tasks show badges (متكررة / date / time).
4. **Done** المكتملة -- completed tasks only.
5. **Pending** قيد التنفيذ -- not completed only.

sorting modes (one button cycles): newest first / oldest first / by scheduled date / by priority.

new task modal :
- Task Title
- Priority : high / medium / low
- Eisenhower Quadrant
- Recurring mode ? pick weekdays (ح ن ث ر خ ج س) as repeat days.
- OR one-time mode : optional date + optional time.

every action persists to SQLite instantly through the state service.

## Pomodoro

Very Very Simple Sessions Tracking System !
You Can now Track Your Sessions Per Day/Weeks/Months/Years ! --> this will be used later to export a status report for your activity per week/month/year.

##### Pomodoro Side (Left Side)

- start now buttons : 5 10 25 50
    - if a session is already running, a prompt asks you : cancel the current session (deleted) OR save it and start the new one immediately.
- clickable timer : click the timer box to open the create-session modal !
    - Session Name
    - Session Note
    - Session Duration
    - Session Tag
        - Full Tag Management (add - delete - color picker - live search)
    - Session Sound (see sounds below)
- live duration adjust during a running session : +/-1 and +/-5 minutes buttons around the timer (min 1, max 180, never below already-elapsed time). every change is saved to the DB on the fly.
- controls : play/pause (icon swaps), reset, and a check button to finish now + save actual elapsed time.
- live info rows : وقت البداية / وقت النهاية / المدة (end time = start + planned duration, updates live).

##### Sessions Details (Right Side)

- view modes : يومي / اسبوعي / شهري / سنوي
- daily : sessions grouped by day with full arabic labels (الاثنين 17/8/2026).
- weekly : week -> day -> sessions.
- monthly : current year only, months 1..now, every single day listed even with zero count.
- yearly : year -> months -> days -> sessions.
- counters on every group level, and groups remember their open/closed state across refreshes.
- clickable Session Box :
    - running session -> details window with live elapsed time.
    - finished session -> details with edit (name/note/duration/tag) and delete.

##### Sounds

- global sound mode (one sound for all sessions) OR per-session sound mode.
- library : end tone / start tone / default / confirm / swipe / none.
- your choice is saved in Preferences, survives restarts.

##### Prayer Times

Under the pomo box to create sessions based on the next Salah !

- countdown to the next prayer, live every second.
- today table : الفجر / الشروق / الظهر / العصر / المغرب / العشاء in 12h format, next prayer row highlighted.
- data fetched from aladhan.com API one full month at a time, cached locally per day-key + coordinates.
- change location modal : latitude / longitude / calculation method. changing location invalidates the cache and refetches.

## Calendar

Full calendar engine written from scratch in pure C# -- zero external calendar libraries.

four views :

- **Month** : real event-span bars that stretch across multiple days (multi-day events render as continuous bars with exceed-left/right indicators), overflow counter (+N more) opens a see-more popup listing that day's events.
- **Week** : time grid with 30-minute slots.
- **Day** : same time grid for a single day.
- **Agenda** : upcoming events grouped by arabic-formatted date headers with counts.

time grid details :
- click any empty slot -> create event prefilled with that exact time.
- click any event -> detail popup (edit/delete).
- overlapping events are resolved by a collision matrix algorithm -- columns are computed automatically so events sit side by side, never stacked.
- events crossing midnight get cropped at view boundaries (CroppedStart/CroppedEnd flags).
- travel time support : GoingDuration/ComingDuration rendered as separate segments of the event block.

sidebar :
- mini month calendar with today/selected markers, navigable independently.
- calendar categories with color dots + checkboxes filter events instantly.
- upcoming events list (next 4).
- week start day setting : السبت / الأحد / الإثنين.

event form popup : title / all-day toggle / start & end pickers (date vs datetime-local depending on all-day) / location / category select.

edit/display mode toggle in the header.

event model is fully compatible with tui.calendar EventObject schema (Category: time/allday/milestone/task, RRULE recurrence string, Busy/Free state, custom colors/styles as JSON) -- designed so sync/export can plug in later.

## Architecture

simple and boring on purpose -- everything is C# services you can read in one sitting :

- **State Services** (`CalendarStateService`, `TaskStateService`) : pure C# classes holding all page state, expose an `OnStateChanged` event that razor pages subscribe to. no state containers, no redux-like magic.
- **Repositories** (`PomodoroRepository`, `TaskRepository`, `CalendarRepository`, `PrayerTimesService`) : thin wrappers over SQLiteAsyncConnection, thread-safe init via SemaphoreSlim, InsertOrReplace-based upserts.
- **Layout Engine** (`CalendarLayoutEngine`) : converts event lists into percentage-positioned UI models (TopPercent/HeightPercent/LeftPercent/WidthPercent + collision metadata) so views stay dumb templates.
- **Timer** (`PomodoroTimer`) : sealed class with Tick/Completed events, supports live duration adjustment, fully testable without UI.
- DI registered as singletons in MauiProgram.cs, interfaces everywhere (ITaskRepository, ICalendarStateService...) so swapping implementations is trivial.

## Data Layer

three local SQLite databases inside FileSystem.AppDataDirectory :

| Database | Tables | Content |
|---|---|---|
| jamrah_pomodoro.db3 | PomodoroSession, PomodoroTag | sessions (planned/elapsed/completed/tag/sound) + tags |
| tasks + calendar db | TaskItems, TaskFolders, KanbanColumns, CalendarEvents, CalendarInfos | tasks with recurrence/eisenhower/columns + full event entities |
| prayer_times.db3 | PrayerTimes | one row per day-key, invalidated when location changes |

every write hits the disk immediately -- close the app mid-session and nothing is lost.

## What's Next

next (إن شاء الله) is : reports export for pomodoro activity, task folders UI revival, and event recurrence execution (RRULE expansion).

---

MIT License