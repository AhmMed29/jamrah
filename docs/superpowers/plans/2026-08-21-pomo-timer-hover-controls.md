# Pomo Timer Hover Controls & Session Row Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** إضافة 4 أزرار hover على timer-box (±5 كبير ±1 صغير) تعمل أثناء وجود جلسة مع مزامنة الوقت في كل مكان، وإعادة تصميم صف الجلسة ليعرض `MM:SS/MM:SS` والتاج في الوسط.

**Architecture:** تعديل وحيد في `PomodoroPage.razor` + `ToggleGroup.razor` + توسيع `Services/PomodoroTimer.cs` بـ `AdjustDuration()` لتجنب `Pause+SetDuration` الذي يصفّر elapsed. لا DB migration، لا ملفات جديدة.

**Tech Stack:** .NET 9 MAUI Blazor, Razor CSS inline, PomodoroTimer (System.Threading.Timer), PomodoroRepository (sqlite-net-pcl)

---

## File Structure

- **Modify:** `Services/PomodoroTimer.cs:44-49` — إضافة AdjustDuration
- **Modify:** `Components/Pomodoro/PomodoroPage.razor:7-11` — هيكل timer-box
- **Modify:** `Components/Pomodoro/PomodoroPage.razor:234-348` — CSS hover controls
- **Modify:** `Components/Pomodoro/PomodoroPage.razor:350-928` — منطق AdjustPlannedMinutes + GetSessionTimeLabel
- **Modify:** `Components/Pomodoro/ToggleGroup.razor:1-41` — إعادة تخطيط session-item

## Decisions

- 4 أزرار مؤكدة: `+5` كبير يمين، `-5` كبير شمال، `+1` صغير يمين، `-1` صغير شمال (user confirmed)
- الحد الأدنى: 1 دقيقة مطلقاً، ولا ينزل تحت `ceil(elapsed/60)` أثناء التشغيل
- السقف: 180 دقيقة
- inversion hover القديم: يُسأل المستخدم عند التنفيذ (مؤجل)

---

### Task 1: توسيع PomodoroTimer لدعم التعديل الحي

**Files:**
- Modify: `Services/PomodoroTimer.cs:44-49`

- [ ] **Step 1: إضافة AdjustDuration**

```csharp
public void AdjustDuration(TimeSpan delta)
{
    if (delta == TimeSpan.Zero) return;
    var newDuration = _duration + delta;
    if (newDuration < TimeSpan.FromMinutes(1)) return;
    var newRemaining = Remaining + delta;
    if (newRemaining < TimeSpan.Zero) newRemaining = TimeSpan.Zero;
    if (newRemaining > newDuration) newRemaining = newDuration;
    _duration = newDuration;
    Remaining = newRemaining;
}
```

- [ ] **Step 2: Build** `dotnet build` — 0 errors
- [ ] **Step 3: Commit** `feat(pomo): add PomodoroTimer.AdjustDuration for live +/-`

### Task 2: أزرار Hover على timer-box

**Files:**
- Modify: `Components/Pomodoro/PomodoroPage.razor:7-11`
- Modify: `Components/Pomodoro/PomodoroPage.razor:266-269`

- [ ] **Step 1: تعديل HTML ليشمل 4 أزرار مع has-session guard**

```razor
<div class="timer-box @( _currentSession != null ? "has-session" : "")" @onclick="OnTimerBoxClick">
    <div class="timer-adjust timer-adjust--left">
        <button class="adj-btn adj-btn--large" @onclick:stopPropagation="true" @onclick="() => AdjustPlannedMinutes(-5)" title="-5 دقائق">−5</button>
        <button class="adj-btn adj-btn--small" @onclick:stopPropagation="true" @onclick="() => AdjustPlannedMinutes(-1)" title="-1 دقيقة">−1</button>
    </div>
    <div class="timer-center">
        <div class="timer-value">@FormatTime(_timer.Remaining)</div>
        <div class="timer-label">Work</div>
    </div>
    <div class="timer-adjust timer-adjust--right">
        <button class="adj-btn adj-btn--large" @onclick:stopPropagation="true" @onclick="() => AdjustPlannedMinutes(+5)" title="+5 دقائق">+5</button>
        <button class="adj-btn adj-btn--small" @onclick:stopPropagation="true" @onclick="() => AdjustPlannedMinutes(+1)" title="+1 دقيقة">+1</button>
    </div>
</div>
```

- [ ] **Step 2: إضافة CSS**

```css
.timer-box { position: relative; border: 1px solid var(--black); padding: 20px 40px; text-align: center; cursor: pointer; display:flex; align-items:center; justify-content:center; gap:12px; }
.timer-center { flex:1; }
.timer-adjust { display:flex; flex-direction:column; gap:6px; opacity:0; pointer-events:none; transition: opacity 0.15s ease; }
.timer-box.has-session:hover .timer-adjust { opacity:1; pointer-events:auto; }
.timer-box:not(.has-session) .timer-adjust { display:none; }
.adj-btn { border:1px solid var(--black); background: var(--white); color:var(--black); cursor:pointer; font-family:inherit; line-height:1; display:flex; align-items:center; justify-content:center; }
.adj-btn--large { width:44px; height:44px; font-size:18px; font-weight:bold; }
.adj-btn--small { width:32px; height:32px; font-size:12px; }
.adj-btn:hover { background: var(--black); color: var(--white); }
.adj-btn:active { transform: scale(0.95); }
```

### Task 3: لوجيك AdjustPlannedMinutes

**Files:**
- Modify: `Components/Pomodoro/PomodoroPage.razor:400-413`

- [ ] **Step 1: إضافة Method**

```csharp
private async Task AdjustPlannedMinutes(int deltaMinutes)
{
    if (_currentSession == null) return;
    var elapsedSec = CurrentElapsedSeconds();
    var elapsedMinCeil = (int)Math.Ceiling(elapsedSec / 60.0);
    var proposed = _activeMinutes + deltaMinutes;
    if (proposed < 1) return;
    if (proposed < elapsedMinCeil) return;
    if (proposed > 180) return;
    var delta = TimeSpan.FromMinutes(deltaMinutes);
    _activeMinutes = proposed;
    _currentSession.PlannedMinutes = proposed;
    _timer.AdjustDuration(delta);
    await _repo.SaveSessionAsync(_currentSession);
    RebuildToggles();
    StateHasChanged();
}
```

### Task 4: إعادة تصميم صف الجلسة

**Files:**
- Modify: `Components/Pomodoro/ToggleGroup.razor:19-31`
- Modify: `Components/Pomodoro/PomodoroPage.razor:88-91,304-312`

- [ ] **Step 1: ToggleGroup.razor — grid 3 أعمدة + TimeLabelProvider**

```razor
@foreach (var s in Group.Sessions)
{
    <div class="session-item session-item--new" @onclick="() => OnSessionClick.InvokeAsync(s)">
        <span class="session-time">@(TimeLabelProvider?.Invoke(s) ?? $"{TimeSpan.FromSeconds(s.ElapsedSeconds):mm\\:ss}/{TimeSpan.FromMinutes(s.PlannedMinutes):mm\\:ss}")</span>
        @if (s.Tag != null)
        { <span class="tag-badge" style="background:@s.Tag.Color; color:@TagTextColor(s.Tag);">@s.Tag.Name</span> }
        else { <span class="tag-placeholder"></span> }
        <span class="session-title">@s.Title</span>
    </div>
}
@code {
    [Parameter] public Func<Session, string>? TimeLabelProvider { get; set; }
}
```

```css
.session-item--new { display: grid; grid-template-columns: 110px 1fr 1fr; gap:8px; align-items:center; }
.session-time { font-size:12px; color:#555; font-variant-numeric: tabular-nums; text-align:left; direction:ltr; }
.session-title { text-align:right; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.tag-placeholder { justify-self:center; width:1px; }
```

- [ ] **Step 2: PomodoroPage.razor — تمرير Provider**

```csharp
<ToggleGroup @key="g.Id" Group="g" OnSessionClick="OpenSessionDetails" TimeLabelProvider="GetSessionTimeLabel" />
private string GetSessionTimeLabel(Session s)
{
    if (s == _currentSession)
    {
        var elapsed = TimeSpan.FromSeconds(CurrentElapsedSeconds());
        var planned = TimeSpan.FromMinutes(_activeMinutes);
        return $"{elapsed:mm\\:ss}/{planned:mm\\:ss}";
    }
    else
    {
        var elapsed = TimeSpan.FromSeconds(s.ElapsedSeconds);
        var planned = TimeSpan.FromMinutes(s.PlannedMinutes);
        return $"{elapsed:mm\\:ss}/{planned:mm\\:ss}";
    }
}
```

### Task 5: التحقق النهائي

- [ ] `dotnet build` 0 errors
- [ ] hover يظهر 4 أزرار فقط عند وجود جلسة
- [ ] +5 يزيد 30:00 ويحفظ DB
- [ ] -5 لا ينزل تحت elapsed
- [ ] صف الجلسة MM:SS/MM:SS والتاج وسط ويتحدث live
