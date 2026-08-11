# Pomo Minimal Design Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replicate the visual design and behavior of `Pomo Minimal Design.html` exactly inside `PomodoroPage.razor`, so the app's pomodoro page looks pixel-identical to the design file.

**Architecture:** One Razor page (`PomodoroPage.razor`) renders the full design (RTL, Courier New, black/white minimal). It keeps in-memory state: a `PomodoroTimer` (existing service, gets a `SetDuration` method), a sessions list, and a tags list. Sessions are grouped chronologically (daily/weekly/monthly/yearly) and rendered as collapsible toggle groups via a small recursive component. No JavaScript anywhere — all design JS logic is ported to C# event handlers.

**Tech Stack:** .NET MAUI Blazor Hybrid (net9.0-windows10.0.19041.0), Razor components, C# only, in-memory state (no DB, no new packages).

---

## Scope Decisions (user-approved)

1. **Full replica** — all 3 parts of the design: (1) 60px sidebar with P/T buttons, (2) left timer panel, (3) right sessions panel.
2. **Live values** — "من الساعة" shows the actual session start time (`HH:mm:ss`), "نهائي" shows the active duration as `M:SS` (e.g. `25:00`). Prayer times stay static, exactly as in the file.
3. **Out of scope (do NOT touch):** calendar page, tasks page, the design's task-sidebar (`سجل المهام`), and the task modal (`taskBox`) — they belong to the tasks subsystem. The `T` sidebar button is rendered for visual fidelity but does nothing (app navigation stays in the XAML sidebar). No JS `alert()` on completion — the timer just stops at 00:00.
4. The design's hardcoded date `2026-8-10` for new sessions becomes today's date (live).
5. This plan only ever modifies files inside the worktree `C:\Users\T.B\Desktop\My-Productivity-App\.worktrees\pomo-minimal-design`. **Never run git or edit files in the main repo copy.**

## Prerequisites (already done — do not repeat)

- `.gitignore` created (ignores `bin/`, `obj/`, `.worktrees/`, `*.user`, etc.); `bin/`/`obj/` untracked; current state committed to `main` (`6e299d5`).
- Worktree created: branch `feature/pomo-minimal-design` at `C:\Users\T.B\Desktop\My-Productivity-App\.worktrees\pomo-minimal-design` (verified `git check-ignore .worktrees/pomo-minimal-design` → ignored, exit 0).
- Baseline verified: `dotnet build -f net9.0-windows10.0.19041.0` → Build succeeded, 0 errors (2 pre-existing CS1998 warnings in MainPage.xaml.cs — ignore).

## File Structure

- Modify: `Services/PomodoroTimer.cs` — add `SetDuration(TimeSpan)` so the duration can be switched between 25/50/5/10 without recreating the timer.
- Replace: `Components/Pomodoro/PomodoroPage.razor` — the whole design (markup + CSS + logic), built up over Tasks 2-4.
- Create: `Components/Pomodoro/PomodoroModels.cs` — public models `Session`, `Tag`, `ToggleGroup` (shared by page + recursive component).
- Create: `Components/Pomodoro/ToggleGroup.razor` — recursive collapsible group (the design's `buildToggle`/`toggleContent`).

Design → implementation mapping:

| Design file | Implementation |
|---|---|
| `:root` vars `--black/--white/--gray` | Same vars in the page's `<style>` |
| `*` reset + Courier New + `body` rules | Same rules in the page's `<style>` (component style runs in the webview document, later than tui-calendar.css → wins) |
| `.app-container`, `dir="rtl"` | Root `<div class="app-container" dir="rtl">` |
| `.sidebar` + P/T buttons | `<div class="sidebar">` with two `<button class="sidebar-btn">`; P has `active` |
| `.left-panel` / `.timer-box` / `.timer-value` / `.timer-label` | Timer panel; value bound to `FormatTime(_timer.Remaining)`; label static `Work`; timer-box click opens the session modal |
| `.durations` + 4 `.dur-btn` | `@foreach` over `Durations = {25, 50, 5, 10}`, click → `DirectStart(m)` (design `directStart`) |
| `.actions` + 2 SVG buttons | Reset (design `resetTimer`) and Start/Pause (design `toggleTimer`); same inline SVGs |
| `.timer-info` + 2 `.info-row` | Live: `StartTimeText` (session start) + `FinalTimeText` (active duration) |
| `.prayer-section` + table | Static, exact rows from the file |
| `.right-panel` / `.view-modes` / 4 `.view-btn` | يومي/اسبوعي/شهري/سنوي switch `_viewMode` |
| `buildToggle` / `toggleContent` / `renderChronological` | `ToggleGroup.razor` recursive component + `RebuildToggles()` (daily/weekly/monthly/yearly grouping) |
| `session-item` / `tag-badge` / `time-stamp` | Rendered inside `ToggleGroup.razor` leaf groups |
| `.modal-overlay` / `.modal-group` / `.modal-box` | Session modal (pomoBox) + tags modal, shown via `display: flex/none` |
| `openPomoModals` / `startSessionFromModal` | `OpenModal()` / `StartSessionFromModal()` |
| Tags logic (`renderTagsInModal`, `addTag`, `deleteTag`, `selectTag`) | `FilteredTags`, `AddTag()`, `DeleteTag()`, `SelectTag()`, `TagTextColor()` |
| `directStart` session creation, `sessions.unshift` | `_sessions.Insert(0, NewSession(...))` with today's date |
| `groupBy/groupByMonth/groupByYear/groupByWeek` + `getWeekNumber` | LINQ `GroupBy` + `WeekNumber()` (identical ISO-ish algorithm) |

**Excluded CSS rules (elements not rendered, visual result identical):** `.task-sidebar*`, `.ts-*`, `.toggle-content`, `.task-item*`, `.task-check`, `.task-sidebar-toggle`, `.toggle-header:hover` is kept. Everything else from the design's `<style>` is copied verbatim.

---

### Task 1: Allow switching timer duration

**Files:**
- Modify: `Services/PomodoroTimer.cs`

- [ ] **Step 1: Add `SetDuration`**

Open `Services/PomodoroTimer.cs`. Change the field declaration (remove `readonly`):

```csharp
        private TimeSpan _duration;
```

Add this method after `Reset()`:

```csharp
        public void SetDuration(TimeSpan duration)
        {
            Pause();
            _duration = duration;
            Remaining = duration;
        }
```

- [ ] **Step 2: Build and commit**

Run (working directory MUST be the worktree):
`dotnet build -f net9.0-windows10.0.19041.0`
Expected: Build succeeded, 0 errors.

```bash
git add Services/PomodoroTimer.cs
git commit -m "feat: allow switching pomodoro duration"
```

---

### Task 2: Page skeleton — full markup + CSS + timer basics

**Files:**
- Replace: `Components/Pomodoro/PomodoroPage.razor`

- [ ] **Step 1: Replace the whole file with v1**

Delete the current content of `Components/Pomodoro/PomodoroPage.razor` and write this exact content (this is v1 — sessions list and modal come in Tasks 3-4):

```razor
@namespace Jamrah.Components.Pomodoro
@implements IDisposable

<div class="app-container" dir="rtl">

    <div class="sidebar">
        <button class="sidebar-btn active">P</button>
        <button class="sidebar-btn">T</button>
    </div>

    <div class="left-panel">
        <div class="timer-box" @onclick="OpenModal">
            <div class="timer-value">@FormatTime(_timer.Remaining)</div>
            <div class="timer-label">Work</div>
        </div>

        <div class="durations">
            @foreach (var m in Durations)
            {
                <button class="dur-btn @(_activeMinutes == m ? "active" : null)" @onclick="() => DirectStart(m)">@m</button>
            }
        </div>

        <div class="actions">
            <button class="action-btn" title="Reset" @onclick="Reset">
                <svg width="16" height="16" viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><path d="M3 3v5h5"></path></svg>
            </button>
            <button class="action-btn" title="Start" @onclick="Toggle">
                <svg width="16" height="16" viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
            </button>
        </div>

        <div class="timer-info">
            <div class="info-row"><span>من الساعة</span><span>@StartTimeText</span></div>
            <div class="info-row"><span>نهائي</span><span>@FinalTimeText</span></div>
        </div>

        <div class="prayer-section">
            <div class="prayer-title">مواقيت الصلاة</div>
            <table class="prayer-table">
                <thead>
                    <tr><th>الصلاة</th><th>الأذان</th><th>الإقامة</th></tr>
                </thead>
                <tbody>
                    <tr><td>الفجر</td><td>04:15</td><td>04:25</td></tr>
                    <tr><td>الظهر</td><td>12:05</td><td>12:15</td></tr>
                    <tr><td>العصر</td><td>03:35</td><td>03:45</td></tr>
                    <tr><td>المغرب</td><td>06:45</td><td>06:55</td></tr>
                    <tr><td>العشاء</td><td>08:15</td><td>08:25</td></tr>
                </tbody>
            </table>
        </div>
    </div>

    <div class="right-panel">
        <div class="view-modes">
            @foreach (var v in ViewModes)
            {
                <button class="view-btn @(_viewMode == v.Value ? "active" : null)" @onclick="() => SetView(v.Value)">@v.Label</button>
            }
        </div>
    </div>

</div>

<style>
    :root { --black: #000000; --white: #FFFFFF; --gray: #EEEEEE; }
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Courier New', Courier, monospace; }
    body { background-color: var(--white); color: var(--black); height: 100vh; overflow: hidden; font-size: 14px; }

    .app-container { display: flex; height: 100vh; }

    .sidebar { width: 60px; border-left: 1px solid var(--black); background: var(--white); display: flex; flex-direction: column; align-items: center; padding-top: 20px; gap: 20px; z-index: 10; }
    .sidebar-btn { width: 40px; height: 40px; border: 1px solid var(--black); background: none; cursor: pointer; font-weight: bold; font-size: 16px; font-family: inherit; display: flex; align-items: center; justify-content: center; }
    .sidebar-btn:hover { background: var(--black); color: var(--white); }
    .sidebar-btn.active { background: var(--black); color: var(--white); }

    .left-panel { flex: 1.5; border-left: 1px solid var(--black); display: flex; flex-direction: column; padding: 40px; gap: 24px; overflow-y: auto; }

    .timer-box { border: 1px solid var(--black); padding: 20px 40px; text-align: center; cursor: pointer; }
    .timer-box:hover { background: var(--black); color: var(--white); }
    .timer-value { font-size: 64px; font-weight: normal; letter-spacing: -2px; line-height: 1; }
    .timer-label { font-size: 12px; margin-top: 8px; text-transform: uppercase; }

    .durations { display: flex; gap: 8px; justify-content: center; }
    .dur-btn { border: 1px solid var(--black); padding: 4px 12px; cursor: pointer; background: none; font-family: inherit; font-size: 14px; }
    .dur-btn:hover { background: var(--black); color: var(--white); }
    .dur-btn.active { background: var(--black); color: var(--white); }

    .actions { display: flex; gap: 16px; justify-content: center; }
    .action-btn { background: none; border: 1px solid var(--black); width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; cursor: pointer; padding: 8px; }
    .action-btn:hover { background: var(--black); }
    .action-btn svg { stroke: var(--black); fill: none; }
    .action-btn:hover svg { stroke: var(--white); }

    .timer-info { width: 100%; display: flex; flex-direction: column; gap: 8px; font-size: 12px; border-top: 1px solid var(--black); padding-top: 16px; }
    .info-row { display: flex; justify-content: space-between; padding: 4px 0; cursor: pointer; }
    .info-row:hover { background: var(--gray); }

    .prayer-section { border-top: 1px solid var(--black); padding-top: 24px; margin-top: 24px; }
    .prayer-title { font-size: 14px; font-weight: bold; margin-bottom: 12px; cursor: pointer; }
    .prayer-table { width: 100%; border-collapse: collapse; text-align: right; }
    .prayer-table th, .prayer-table td { padding: 8px 12px; border: 1px solid var(--black); cursor: pointer; }
    .prayer-table th { font-weight: normal; background: var(--white); text-transform: uppercase; font-size: 12px; }
    .prayer-table tr:hover td { background: var(--black); color: var(--white); }

    .right-panel { flex: 2; overflow-y: auto; display: flex; flex-direction: column; }
    .right-panel::-webkit-scrollbar { width: 4px; }
    .right-panel::-webkit-scrollbar-thumb { background: var(--black); }

    .view-modes { display: flex; border-bottom: 1px solid var(--black); position: relative; }
    .view-btn { flex: 1; text-align: center; padding: 12px; cursor: pointer; border-left: 1px solid var(--black); background: none; font-family: inherit; }
    .view-btn:last-child { border-left: none; }
    .view-btn:hover { background: var(--black); color: var(--white); }
    .view-btn.active { background: var(--black); color: var(--white); }
</style>

@code {
    private readonly PomodoroTimer _timer = new(TimeSpan.FromMinutes(25));
    private int _activeMinutes = 25;
    private DateTime? _startedAt;
    private string _viewMode = "daily";

    private static readonly int[] Durations = { 25, 50, 5, 10 };
    private static readonly (string Label, string Value)[] ViewModes =
    {
        ("يومي", "daily"), ("اسبوعي", "weekly"), ("شهري", "monthly"), ("سنوي", "yearly"),
    };

    private string StartTimeText => _startedAt?.ToString("HH:mm:ss") ?? "00:00:00";
    private string FinalTimeText => $"{_activeMinutes}:00";

    protected override void OnInitialized()
    {
        _timer.Tick += OnTimerEvent;
        _timer.Completed += OnTimerEvent;
    }

    private void OnTimerEvent() => InvokeAsync(StateHasChanged);

    private static string FormatTime(TimeSpan t) => $"{(int)t.TotalMinutes:D2}:{t.Seconds:D2}";

    private void Toggle()
    {
        if (_timer.IsRunning) _timer.Pause();
        else _timer.Start();
    }

    private void Reset()
    {
        _timer.Reset();
        _startedAt = null;
    }

    private void DirectStart(int minutes)
    {
        _activeMinutes = minutes;
        _timer.SetDuration(TimeSpan.FromMinutes(minutes));
        if (!_timer.IsRunning) _timer.Start();
        _startedAt = DateTime.Now;
    }

    private void OpenModal() { }

    private void SetView(string mode) => _viewMode = mode;

    public void Dispose()
    {
        _timer.Tick -= OnTimerEvent;
        _timer.Completed -= OnTimerEvent;
        _timer.Dispose();
    }
}
```

- [ ] **Step 2: Build**

Run (worktree): `dotnet build -f net9.0-windows10.0.19041.0`
Expected: Build succeeded, 0 errors. (RZ9980 would mean unbalanced tags — compare against the code above.)

- [ ] **Step 3: Visual check + commit**

Run the app from Rider (in the worktree) → open Pomodoro from the sidebar. Expect: white screen, RTL, black 1px borders, Courier New everywhere, timer `25:00` in a bordered box with `WORK` under it, duration buttons `25 50 5 10` with `25` inverted, two square SVG buttons, prayer table with 5 rows, view buttons `يومي اسبوعي شهري سنوي` with `يومي` inverted, empty right panel below them. Compare side-by-side with `Pomo Minimal Design.html` opened in a browser (only the sessions list below view-modes is missing at this stage).

```bash
git add Components/Pomodoro/PomodoroPage.razor
git commit -m "feat: pomo minimal design skeleton with live timer"
```

---

### Task 3: Sessions — models, recursive toggle groups, chronological engine

**Files:**
- Create: `Components/Pomodoro/PomodoroModels.cs`
- Create: `Components/Pomodoro/ToggleGroup.razor`
- Replace: `Components/Pomodoro/PomodoroPage.razor` (v2)

- [ ] **Step 1: Create `Components/Pomodoro/PomodoroModels.cs`**

```csharp
namespace Jamrah.Components.Pomodoro;

public sealed class Session
{
    public string Id { get; init; } = "";
    public string Date { get; init; } = "";
    public string Title { get; init; } = "";
    public string Time { get; init; } = "";
    public int Duration { get; init; }
    public string Note { get; init; } = "";
    public Tag? Tag { get; init; }
}

public sealed class Tag
{
    public int Id { get; init; }
    public string Name { get; init; } = "";
    public string Color { get; init; } = "#000000";
}

public sealed class ToggleGroup
{
    public string Id { get; init; } = "";
    public string Label { get; init; } = "";
    public int Count { get; init; }
    public List<ToggleGroup>? Children { get; init; }
    public List<Session>? Sessions { get; init; }
    public bool Open { get; set; }
}
```

- [ ] **Step 2: Create `Components/Pomodoro/ToggleGroup.razor`**

```razor
@namespace Jamrah.Components.Pomodoro

<div class="toggle-group">
    <div class="toggle-header" @onclick="() => Group.Open = !Group.Open;">
        <div><span class="toggle-icon">@(Group.Open ? "-" : "+")</span><span>@Group.Label</span></div>
        <span>@Group.Count جلسة</span>
    </div>
    @if (Group.Open)
    {
        if (Group.Children != null)
        {
            @foreach (var child in Group.Children)
            {
                <ToggleGroup @key="child.Id" Group="child" />
            }
        }
        else if (Group.Sessions != null)
        {
            @foreach (var s in Group.Sessions)
            {
                <div class="session-item">
                    <span>
                        @s.Title
                        @if (s.Tag != null)
                        {
                            <span class="tag-badge" style="background:@s.Tag.Color; color:@TagTextColor(s.Tag);">@s.Tag.Name</span>
                        }
                    </span>
                    <span class="time-stamp">@s.Time</span>
                </div>
            }
        }
    }
</div>

@code {
    [Parameter] public ToggleGroup Group { get; set; } = null!;

    private static string TagTextColor(Tag t) => t.Color == "#000000" ? "white" : "black";
}
```

- [ ] **Step 3: Replace `Components/Pomodoro/PomodoroPage.razor` with v2**

Same as v1 from Task 2 with these changes ONLY:

1. In the `<div class="right-panel">`, after the `view-modes` div, add:

```razor
        @foreach (var g in _toggles)
        {
            <ToggleGroup @key="g.Id" Group="g" />
        }
```

2. In the `<style>` block, after the `.view-btn.active` rule, add:

```css
    .toggle-group { border-bottom: 1px solid var(--black); }
    .toggle-header { padding: 12px 16px; border-bottom: 1px solid var(--black); cursor: pointer; font-weight: bold; display: flex; justify-content: space-between; align-items: center; background: var(--white); user-select: none; }
    .toggle-header:hover { background: var(--black); color: var(--white); }
    .toggle-icon { font-size: 16px; line-height: 1; margin-right: 8px; }

    .session-item { padding: 10px 16px; border-bottom: 1px solid var(--gray); display: flex; justify-content: space-between; align-items: center; cursor: pointer; }
    .session-item:hover { background: var(--black); color: var(--white); }

    .time-stamp { color: #555; font-size: 12px; }
    .session-item:hover .time-stamp { color: var(--white); }

    .tag-badge { border: 1px solid var(--black); padding: 2px 6px; font-size: 10px; display: inline-flex; align-items: center; margin-left: 5px; }
```

3. Replace the entire `@code { ... }` block with:

```razor
@code {
    private readonly PomodoroTimer _timer = new(TimeSpan.FromMinutes(25));
    private int _activeMinutes = 25;
    private DateTime? _startedAt;
    private string _viewMode = "daily";
    private List<ToggleGroup> _toggles = new();
    private readonly List<Session> _sessions = new();

    private static readonly int[] Durations = { 25, 50, 5, 10 };
    private static readonly (string Label, string Value)[] ViewModes =
    {
        ("يومي", "daily"), ("اسبوعي", "weekly"), ("شهري", "monthly"), ("سنوي", "yearly"),
    };

    private string StartTimeText => _startedAt?.ToString("HH:mm:ss") ?? "00:00:00";
    private string FinalTimeText => $"{_activeMinutes}:00";

    protected override void OnInitialized()
    {
        _timer.Tick += OnTimerEvent;
        _timer.Completed += OnTimerEvent;
        RebuildToggles();
    }

    private void OnTimerEvent() => InvokeAsync(StateHasChanged);

    private static string FormatTime(TimeSpan t) => $"{(int)t.TotalMinutes:D2}:{t.Seconds:D2}";

    private void Toggle()
    {
        if (_timer.IsRunning) _timer.Pause();
        else _timer.Start();
    }

    private void Reset()
    {
        _timer.Reset();
        _startedAt = null;
    }

    private void DirectStart(int minutes)
    {
        _activeMinutes = minutes;
        _timer.SetDuration(TimeSpan.FromMinutes(minutes));
        if (!_timer.IsRunning) _timer.Start();
        _startedAt = DateTime.Now;
        _sessions.Insert(0, NewSession("untitled", "", minutes));
        RebuildToggles();
    }

    private Session NewSession(string title, string note, int minutes)
    {
        var now = DateTime.Now;
        return new Session
        {
            Id = $"s-{now.Ticks}",
            Date = $"{now.Year}-{now.Month}-{now.Day}",
            Title = title,
            Time = now.ToString("HH:mm"),
            Duration = minutes,
            Note = note,
            Tag = null,
        };
    }

    private void OpenModal() { }

    private void SetView(string mode)
    {
        _viewMode = mode;
        RebuildToggles();
    }

    private void RebuildToggles()
    {
        var ordered = _sessions
            .OrderByDescending(s => s.Date)
            .ThenByDescending(s => s.Time)
            .ToList();

        switch (_viewMode)
        {
            case "weekly":
                _toggles = ordered.GroupBy(s => WeekNumber(ParseDate(s.Date)))
                    .OrderByDescending(g => g.Key)
                    .Select(g => GroupWithChildren($"W{g.Key}", $"الأسبوع {g.Key}", g.Count(),
                        g.GroupBy(s => s.Date).Select(d => Group($"{g.Key}-{d.Key}", DateLabel(d.Key), d.ToList())).ToList()))
                    .ToList();
                break;
            case "monthly":
                _toggles = ordered.GroupBy(s => s.Date[..7])
                    .OrderByDescending(g => g.Key)
                    .Select(g => GroupWithChildren(g.Key, MonthLabel(g.Key), g.Count(),
                        g.GroupBy(s => s.Date).Select(d => Group($"{g.Key}-{d.Key}", DateLabel(d.Key), d.ToList())).ToList()))
                    .ToList();
                break;
            case "yearly":
                _toggles = ordered.GroupBy(s => s.Date[..4])
                    .OrderByDescending(g => g.Key)
                    .Select(g => GroupWithChildren(g.Key, g.Key, g.Count(),
                        g.GroupBy(s => s.Date[..7]).Select(m => GroupWithChildren($"{g.Key}-{m.Key}", MonthLabel(m.Key), m.Count(),
                            m.GroupBy(s => s.Date).Select(d => Group($"{g.Key}-{d.Key}", DateLabel(d.Key), d.ToList())).ToList())).ToList()))
                    .ToList();
                break;
            default:
                _toggles = ordered.GroupBy(s => s.Date)
                    .Select(g => Group($"tg-{g.Key}", DateLabel(g.Key), g.ToList()))
                    .ToList();
                break;
        }
    }

    private static ToggleGroup Group(string id, string label, List<Session> sessions) =>
        new() { Id = id, Label = label, Count = sessions.Count, Sessions = sessions };

    private static ToggleGroup GroupWithChildren(string id, string label, int count, List<ToggleGroup> children) =>
        new() { Id = id, Label = label, Count = count, Children = children };

    private static string DateLabel(string d)
    {
        var p = d.Split('-');
        return $"{p[2]}/{p[1]}";
    }

    private static string MonthLabel(string m)
    {
        var p = m.Split('-');
        return $"شهر {p[1]}";
    }

    private static DateTime ParseDate(string d) =>
        DateTime.ParseExact(d, "yyyy-M-d", System.Globalization.CultureInfo.InvariantCulture);

    private static int WeekNumber(DateTime d)
    {
        var day = (int)d.DayOfWeek == 0 ? 7 : (int)d.DayOfWeek;
        var shifted = d.Date.AddDays(4 - day);
        var yearStart = new DateTime(shifted.Year, 1, 1);
        return (int)Math.Ceiling(((shifted - yearStart).TotalDays + 1) / 7);
    }

    public void Dispose()
    {
        _timer.Tick -= OnTimerEvent;
        _timer.Completed -= OnTimerEvent;
        _timer.Dispose();
    }
}
```

- [ ] **Step 4: Build and commit**

Run (worktree): `dotnet build -f net9.0-windows10.0.19041.0`
Expected: Build succeeded, 0 errors.

Run the app: click `50` (auto-starts a 50-min session and adds it to the list), `5`, `10` — each click adds a session `untitled` under a toggle labeled `dd/mm` with count. Click the toggle header to expand/collapse (`+`/`-` icon). Switch `اسبوعي/شهري/سنوي` — grouping changes (weekly = `الأسبوع N` → days; monthly = `شهر M` → days; yearly = year → months → days). `من الساعة` shows the last start time, `نهائي` shows the active duration.

```bash
git add Components/Pomodoro/PomodoroModels.cs Components/Pomodoro/ToggleGroup.razor Components/Pomodoro/PomodoroPage.razor
git commit -m "feat: live sessions list with chronological grouping"
```

---

### Task 4: Session modal + tags

**Files:**
- Replace: `Components/Pomodoro/PomodoroPage.razor` (v3, final)

- [ ] **Step 1: Replace `Components/Pomodoro/PomodoroPage.razor` with v3 (final)**

Same as v2 from Task 3 with these changes ONLY:

1. Add this markup right after the closing `</div>` of `app-container` (before the `<style>`):

```razor
<div class="modal-overlay" style="display: @(_modalOpen ? "flex" : "none");">
    <div class="modal-group">
        <div class="modal-box">
            <div class="modal-header">
                <span class="modal-title">جلسة جديدة @if (_selectedTag != null) { <span class="tag-badge" style="background:@_selectedTag.Color; color:@TagTextColor(_selectedTag);">@_selectedTag.Name</span> }</span>
                <button class="close-btn" @onclick="CloseModal">X</button>
            </div>
            <div class="input-group"><label class="input-label">اسم الجلسة</label><input type="text" class="minimal-input" @bind="_sessionName" placeholder="untitled" /></div>
            <div class="input-group"><label class="input-label">ملاحظات</label><textarea class="minimal-textarea" @bind="_sessionNote" placeholder="اكتب ملاحظاتك هنا..."></textarea></div>
            <div class="input-group"><label class="input-label">المدة</label><input type="number" class="minimal-input" @bind="_sessionDuration" /></div>
            <div class="modal-actions"><button class="modal-btn" @onclick="CloseModal">إلغاء</button><button class="modal-btn primary" @onclick="StartSessionFromModal">بدء</button></div>
        </div>
        <div class="modal-box tags-modal-box">
            <div class="modal-header"><span class="modal-title">التاجات</span></div>
            <div class="input-group"><input type="text" class="minimal-input" @bind="_tagSearch" placeholder="بحث..." /></div>
            <div class="input-group">
                <div style="display:flex; gap:8px; align-items:center;">
                    <input type="text" class="minimal-input" @bind="_newTagName" placeholder="إضافة تاج" style="flex:1;" />
                    <input type="color" class="color-input" @bind="_newTagColor" />
                    <button class="modal-btn primary" @onclick="AddTag" style="padding:8px;">+</button>
                </div>
            </div>
            <div class="tags-list">
                @foreach (var t in FilteredTags)
                {
                    <div class="tag-item" style="background:@t.Color; color:@TagTextColor(t);" @onclick="() => SelectTag(t)">
                        @t.Name
                        <span class="tag-delete" @onclick="() => DeleteTag(t)">X</span>
                    </div>
                }
            </div>
        </div>
    </div>
</div>
```

2. In the `<style>` block, after the `.tag-badge` rule, add:

```css
    .modal-overlay { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: transparent; z-index: 100; display: none; justify-content: center; align-items: center; pointer-events: none; }
    .modal-group { pointer-events: auto; display: flex; gap: 0; box-shadow: 10px 10px 0px rgba(0,0,0,0.1); }
    .modal-box { border: 2px solid var(--black); background: var(--white); color: var(--black); padding: 32px; width: 350px; display: flex; flex-direction: column; gap: 20px; position: relative; }
    .tags-modal-box { width: 250px; border-right: none; }

    .modal-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--black); padding-bottom: 12px; }
    .modal-title { font-weight: bold; text-transform: uppercase; display: flex; align-items: center; gap: 8px; font-size: 14px; }
    .close-btn { background: none; border: 1px solid var(--black); color: var(--black); width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; cursor: pointer; font-family: inherit; font-size: 12px; }
    .close-btn:hover { background: var(--black); color: var(--white); }

    .input-group { display: flex; flex-direction: column; gap: 6px; }
    .input-label { font-size: 12px; text-transform: uppercase; }
    .minimal-input, .minimal-textarea { border: 1px solid var(--black); padding: 8px; font-family: inherit; background: none; color: var(--black); outline: none; font-size: 14px; width: 100%; }
    .minimal-textarea { resize: vertical; min-height: 100px; }
    .minimal-input:focus, .minimal-textarea:focus { border-color: var(--gray); background: var(--gray); }
    .minimal-input::placeholder, .minimal-textarea::placeholder { color: #999; }

    .modal-actions { display: flex; justify-content: space-between; margin-top: 12px; }
    .modal-btn { border: 1px solid var(--black); padding: 8px 16px; cursor: pointer; background: none; color: var(--black); font-family: inherit; text-transform: uppercase; font-size: 12px; }
    .modal-btn:hover { background: var(--black); color: var(--white); }
    .modal-btn.primary { background: var(--black); color: var(--white); }
    .modal-btn.primary:hover { background: var(--white); color: var(--black); }

    .tags-list { display: flex; flex-wrap: wrap; gap: 6px; max-height: 200px; overflow-y: auto; border: 1px solid var(--gray); padding: 8px; }
    .tag-item { border: 1px solid var(--black); padding: 4px 8px; cursor: pointer; display: flex; align-items: center; gap: 4px; font-size: 12px; }
    .tag-item:hover { opacity: 0.7; }
    .tag-delete { cursor: pointer; border-left: 1px solid var(--black); padding-left: 4px; margin-left: 4px; }
    .tag-delete:hover { color: red; }
    .color-input { width: 30px; height: 30px; border: 1px solid var(--black); cursor: pointer; padding: 0; background: none; }
```

3. Replace the `@code { ... }` block with:

```razor
@code {
    private readonly PomodoroTimer _timer = new(TimeSpan.FromMinutes(25));
    private int _activeMinutes = 25;
    private DateTime? _startedAt;
    private string _viewMode = "daily";
    private List<ToggleGroup> _toggles = new();
    private readonly List<Session> _sessions = new();
    private readonly List<Tag> _tags = new()
    {
        new() { Id = 1, Name = "برمجة", Color = "#000000" },
        new() { Id = 2, Name = "تصميم", Color = "#3B82F6" },
        new() { Id = 3, Name = "كتابة", Color = "#EF4444" },
    };
    private int _nextTagId = 4;
    private Tag? _selectedTag;
    private bool _modalOpen;
    private string _sessionName = "";
    private string _sessionNote = "";
    private int _sessionDuration = 25;
    private string _tagSearch = "";
    private string _newTagName = "";
    private string _newTagColor = "#000000";

    private static readonly int[] Durations = { 25, 50, 5, 10 };
    private static readonly (string Label, string Value)[] ViewModes =
    {
        ("يومي", "daily"), ("اسبوعي", "weekly"), ("شهري", "monthly"), ("سنوي", "yearly"),
    };

    private string StartTimeText => _startedAt?.ToString("HH:mm:ss") ?? "00:00:00";
    private string FinalTimeText => $"{_activeMinutes}:00";
    private IEnumerable<Tag> FilteredTags => _tags.Where(t => t.Name.Contains(_tagSearch, StringComparison.OrdinalIgnoreCase));

    protected override void OnInitialized()
    {
        _timer.Tick += OnTimerEvent;
        _timer.Completed += OnTimerEvent;
        RebuildToggles();
    }

    private void OnTimerEvent() => InvokeAsync(StateHasChanged);

    private static string FormatTime(TimeSpan t) => $"{(int)t.TotalMinutes:D2}:{t.Seconds:D2}";

    private void Toggle()
    {
        if (_timer.IsRunning) _timer.Pause();
        else _timer.Start();
    }

    private void Reset()
    {
        _timer.Reset();
        _startedAt = null;
    }

    private void DirectStart(int minutes)
    {
        _activeMinutes = minutes;
        _timer.SetDuration(TimeSpan.FromMinutes(minutes));
        if (!_timer.IsRunning) _timer.Start();
        _startedAt = DateTime.Now;
        _sessions.Insert(0, NewSession("untitled", "", minutes));
        RebuildToggles();
    }

    private void OpenModal()
    {
        _sessionName = "";
        _sessionNote = "";
        _sessionDuration = 25;
        _modalOpen = true;
    }

    private void CloseModal()
    {
        _modalOpen = false;
        _selectedTag = null;
    }

    private void StartSessionFromModal()
    {
        var dur = _sessionDuration > 0 ? _sessionDuration : 25;
        _activeMinutes = dur;
        _timer.SetDuration(TimeSpan.FromMinutes(dur));
        if (!_timer.IsRunning) _timer.Start();
        _startedAt = DateTime.Now;
        _sessions.Insert(0, NewSession(string.IsNullOrWhiteSpace(_sessionName) ? "untitled" : _sessionName, _sessionNote, dur));
        _selectedTag = null;
        _modalOpen = false;
        RebuildToggles();
    }

    private Session NewSession(string title, string note, int minutes)
    {
        var now = DateTime.Now;
        return new Session
        {
            Id = $"s-{now.Ticks}",
            Date = $"{now.Year}-{now.Month}-{now.Day}",
            Title = title,
            Time = now.ToString("HH:mm"),
            Duration = minutes,
            Note = note,
            Tag = _selectedTag,
        };
    }

    private void SelectTag(Tag t) => _selectedTag = t;

    private void DeleteTag(Tag t)
    {
        _tags.Remove(t);
        if (_selectedTag == t) _selectedTag = null;
    }

    private void AddTag()
    {
        if (string.IsNullOrWhiteSpace(_newTagName)) return;
        _tags.Add(new Tag { Id = _nextTagId++, Name = _newTagName.Trim(), Color = _newTagColor });
        _newTagName = "";
    }

    private static string TagTextColor(Tag t) => t.Color == "#000000" ? "white" : "black";

    private void SetView(string mode)
    {
        _viewMode = mode;
        RebuildToggles();
    }

    private void RebuildToggles()
    {
        var ordered = _sessions
            .OrderByDescending(s => s.Date)
            .ThenByDescending(s => s.Time)
            .ToList();

        switch (_viewMode)
        {
            case "weekly":
                _toggles = ordered.GroupBy(s => WeekNumber(ParseDate(s.Date)))
                    .OrderByDescending(g => g.Key)
                    .Select(g => GroupWithChildren($"W{g.Key}", $"الأسبوع {g.Key}", g.Count(),
                        g.GroupBy(s => s.Date).Select(d => Group($"{g.Key}-{d.Key}", DateLabel(d.Key), d.ToList())).ToList()))
                    .ToList();
                break;
            case "monthly":
                _toggles = ordered.GroupBy(s => s.Date[..7])
                    .OrderByDescending(g => g.Key)
                    .Select(g => GroupWithChildren(g.Key, MonthLabel(g.Key), g.Count(),
                        g.GroupBy(s => s.Date).Select(d => Group($"{g.Key}-{d.Key}", DateLabel(d.Key), d.ToList())).ToList()))
                    .ToList();
                break;
            case "yearly":
                _toggles = ordered.GroupBy(s => s.Date[..4])
                    .OrderByDescending(g => g.Key)
                    .Select(g => GroupWithChildren(g.Key, g.Key, g.Count(),
                        g.GroupBy(s => s.Date[..7]).Select(m => GroupWithChildren($"{g.Key}-{m.Key}", MonthLabel(m.Key), m.Count(),
                            m.GroupBy(s => s.Date).Select(d => Group($"{g.Key}-{d.Key}", DateLabel(d.Key), d.ToList())).ToList())).ToList()))
                    .ToList();
                break;
            default:
                _toggles = ordered.GroupBy(s => s.Date)
                    .Select(g => Group($"tg-{g.Key}", DateLabel(g.Key), g.ToList()))
                    .ToList();
                break;
        }
    }

    private static ToggleGroup Group(string id, string label, List<Session> sessions) =>
        new() { Id = id, Label = label, Count = sessions.Count, Sessions = sessions };

    private static ToggleGroup GroupWithChildren(string id, string label, int count, List<ToggleGroup> children) =>
        new() { Id = id, Label = label, Count = count, Children = children };

    private static string DateLabel(string d)
    {
        var p = d.Split('-');
        return $"{p[2]}/{p[1]}";
    }

    private static string MonthLabel(string m)
    {
        var p = m.Split('-');
        return $"شهر {p[1]}";
    }

    private static DateTime ParseDate(string d) =>
        DateTime.ParseExact(d, "yyyy-M-d", System.Globalization.CultureInfo.InvariantCulture);

    private static int WeekNumber(DateTime d)
    {
        var day = (int)d.DayOfWeek == 0 ? 7 : (int)d.DayOfWeek;
        var shifted = d.Date.AddDays(4 - day);
        var yearStart = new DateTime(shifted.Year, 1, 1);
        return (int)Math.Ceiling(((shifted - yearStart).TotalDays + 1) / 7);
    }

    public void Dispose()
    {
        _timer.Tick -= OnTimerEvent;
        _timer.Completed -= OnTimerEvent;
        _timer.Dispose();
    }
}
```

- [ ] **Step 2: Build and commit**

Run (worktree): `dotnet build -f net9.0-windows10.0.19041.0`
Expected: Build succeeded, 0 errors.

Run the app: click the timer box → modal opens centered with box-shadow offset, session fields, tags box with 3 default tags. Type a name, select a tag, click بدء → session appears in the list with its tag badge, timer runs with chosen duration. `+` adds a tag, `X` on a tag deletes it, search filters. إلغاء/X closes the modal.

```bash
git add Components/Pomodoro/PomodoroPage.razor
git commit -m "feat: session modal and tags"
```

---

### Task 5: Final verification against the design

**Files:** none (verification only)

- [ ] **Step 1: Full build check**

Run (worktree): `dotnet build -f net9.0-windows10.0.19041.0`
Expected: Build succeeded, 0 errors.

- [ ] **Step 2: Visual diff checklist**

Open `Pomo Minimal Design.html` in a browser and the app's pomodoro page side by side. Verify EVERY row:

1. Font is Courier New everywhere; base size 14px; pure black/white/#EEEEEE.
2. RTL layout: sidebar on the right edge of the content area, 60px wide, `P` (inverted = active) above `T`.
3. Timer box: 1px black border, `25:00` at 64px, letter-spacing -2px, `WORK` label 12px uppercase below; hover inverts.
4. Duration row: `25 50 5 10`; active one inverted; hover inverts.
5. Two 40px square action buttons with the exact SVG paths from the file (reset + play); hover fills black.
6. Timer info: two rows `من الساعة` / `نهائي` with live values; row hover → gray background.
7. Prayer table: header الصلاة/الأذان/الإقامة, 5 rows with the file's exact times; row hover inverts.
8. View modes: يومي/اسبوعي/شهري/سنوي with يومي inverted; switching re-groups sessions.
9. Toggle groups with `+`/`-` icons, `X جلسة` counts, hover inverts; session rows show title + tag badge + time-stamp; nested groups in weekly/monthly/yearly.
10. Modal: click timer box → two boxes side by side (session + tags), 2px black border, 10px offset shadow, uppercase labels, focus inverts input background; `بدء` starts timer and adds the session.

- [ ] **Step 3: Commit any visual fixes found**

If any step above fails, fix the code, rebuild, re-verify, then:

```bash
git add -A
git commit -m "fix: align pomo page with minimal design"
```

---

## Self-Review Notes

- **Spec coverage:** every design element in the file is mapped (see mapping table); excluded items are documented (task-sidebar, task modal, JS alert, T-button navigation) and are tasks/calendar territory per user instructions.
- **Type consistency:** `Session`, `Tag`, `ToggleGroup` defined once in `PomodoroModels.cs`, used by both the page and `ToggleGroup.razor`. `SetDuration` used in `DirectStart` and `StartSessionFromModal`. `TagTextColor` defined once in the page (used by page markup) and duplicated in `ToggleGroup.razor` (leaf component, cannot see page privates) — identical bodies.
- **Live-value decisions:** `StartTimeText` = session start `HH:mm:ss` (00:00:00 before first start); `FinalTimeText` = `{_activeMinutes}:00`; new session date = today (design hardcoded `2026-8-10`).
