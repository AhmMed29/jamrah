# Jamrah Unified Light Tajawal Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** تحويل كامل البرنامج من الثيم الحالي (أسود/أبيض حاد #000/#FFF/#EEE) إلى الثيم الموحد Light Tajawal من التصميم المرجعي (--bg:#FAFAF9 --card:#FFF --border:#E7E5E4 --text:#1C1917 --muted:#78716C ... + كل العناصر border-radius:12-16px + أزرار دائرية) بدون إضافة/حذف أي وظيفة — فقط ألوان وعناصر.

**Architecture:** ثيم مركزي واحد wwwroot/css/jamrah-theme.css يحمل :root الجديد ويُستورد في wwwroot/index.html قبل tui-calendar.css/tasks.css. كل صفحة (MainPage.xaml, PomodoroPage.razor, TaskPage.razor, CalendarPage.razor + tui-calendar.css) تستبدل var(--black)→var(--text) وهكذا سطر بسطر، مع الحفاظ على كل Id/Parameter/Service كما هو. لا تغيير في Models/Data/Services.

**Tech Stack:** .NET 9 MAUI Blazor Hybrid, Razor <style> inline, wwwroot/css, XAML, Google Fonts Tajawal

---

## File Structure

- Create: wwwroot/css/jamrah-theme.css
- Modify: wwwroot/index.html:7
- Modify: wwwroot/css/tui-calendar.css:10-22
- Modify: wwwroot/css/tasks.css:1
- Modify: MainPage.xaml:7-104
- Modify: MainPage.xaml.cs:132-173
- Modify: Components/Pomodoro/PomodoroPage.razor:244-350
- Modify: Components/Pomodoro/ToggleGroup.razor:21
- Modify: Components/Tasks/TaskPage.razor:326-380
- Modify: Components/Calendar/CalendarPage.razor:5-20
- Modify: wwwroot/css/tui-calendar.css:700-920 (cal-*)

### Task 1: Global Theme

**Files:**
- Create: wwwroot/css/jamrah-theme.css
- Modify: wwwroot/index.html:7

- [ ] Create jamrah-theme.css with :root variables
- [ ] Add link in index.html before tui-calendar.css

### Task 2: Shell — MainPage.xaml + .cs

**Files:**
- Modify: MainPage.xaml
- Modify: MainPage.xaml.cs:132-173

- [ ] Update Grid/BoxView/Border colors and radius
- [ ] Update SetActivePage/Hover colors to #1C1917 etc.

### Task 3: Pomodoro — PomodoroPage.razor

**Files:**
- Modify: Components/Pomodoro/PomodoroPage.razor:244-350

- [ ] Replace left-panel, timer-box, durs, act, info, prayer-box, view-tabs, group, sess, overlay, modal styles

### Task 4: Tasks — TaskPage.razor

**Files:**
- Modify: Components/Tasks/TaskPage.razor:326-380

- [ ] Update board-header→kanban-toolbar etc.

### Task 5: Calendar — CalendarPage + tui-calendar.css

**Files:**
- Modify: Components/Calendar/CalendarPage.razor + tui-calendar.css

- [ ] Update cal card, cal-toolbar, view-switch, cal-grid etc.

### Task 6: Build & Verify

- [ ] dotnet build 0 errors
