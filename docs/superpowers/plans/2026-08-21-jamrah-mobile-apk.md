# Jamrah نسخة الموبايل APK — خطة التنفيذ الشاملة (منفذة في worktree)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** انتاج نسخة موبايل Android كاملة من Jamrah (Pomodoro + Tasks + Calendar + Prayer) تعمل كـ APK قابل للتثبيت والرفع على GitHub Releases بدون لمس كود الديسكتوب الأصلي إلا في سطر واحد (`Jamrah.csproj:4` TargetFrameworks) — كل شغل الموبايل معزول في Worktree `feat/mobile` في `C:\Users\T.B\Desktop\Jamrah-Mobile`.

**Architecture:** عزل كامل عبر `git worktree` على branch `feat/mobile`. كل منطق البيانات (`Data/`, `Models/`, `Services/`) يُعاد استخدامه كما هو (SQLite + `FileSystem.AppDataDirectory`). Shell الموبايل يستبدل `MainPage.xaml:7 Grid *,64` + السايدبار اليمين بـ `Bottom TabBar` مع SafeArea. البناء عبر `dotnet publish -f net9.0-android`. كل الـ UI مضاف كـ CSS overrides (`mobile*.css`) + تعديلات XAML/Razor معزولة في worktree فقط.

**Tech Stack:** .NET 9 MAUI Blazor Hybrid, BlazorWebView, Razor, XAML, SQLite-net-pcl, GitHub Actions (ubuntu-latest + Java 21 + .NET 9), Android SDK 34, Tajawal.

---

## File Structure (المنفذ فعليا)

**الوحيد المسموح لمسه في main (بعد المراجعة):**
- `Jamrah.csproj:4` → `<TargetFrameworks>net9.0-android;net9.0-windows10.0.19041.0</TargetFrameworks>` (من `net9.0-windows10.0.19041.0`)

**داخل Worktree `feat/mobile` (C:\Users\T.B\Desktop\Jamrah-Mobile):**
```
Modified:
- Jamrah.csproj:4,30-31 (TFM + version 4.3.0-mobile/5)
- MainPage.xaml:1-180 (DesktopLayout + MobileLayout adaptive)
- MainPage.xaml.cs:1-240 (ApplyIdiomLayout + dual WebViews + Android/iOS Zoom)
- Components/Tasks/TaskPage.razor:6,19-26,215-220,430,690-750 (mobile drawer + touch)
- Components/Calendar/CalendarPage.razor:39-42 (FAB)
- Platforms/Android/MainActivity.cs:7 (WindowSoftInputMode AdjustResize)
- wwwroot/index.html:11-14 (links to mobile*.css)
- .github/workflows/build-android.yml (MAUI publish)
Deleted:
- .github/workflows/build-apk.yml (Capacitor obsolete)

Created:
- wwwroot/css/mobile.css (global + bottom-sheet + safe-area)
- wwwroot/css/mobile-pomodoro.css (stacked layout + always visible adjust)
- wwwroot/css/mobile-tasks.css (drawer + snap kanban + single-col eisenhower)
- wwwroot/css/mobile-calendar.css (stacked toolbar + FAB)
- docs/sync-strategy.md
```

---

### Task 0: العزل — Worktree

- [x] stash redesign → worktree `feat/mobile` في `C:\Users\T.B\Desktop\Jamrah-Mobile` → merge redesign → clean main يبقى `3f67fc4`
```
git stash push -m "temp"
git worktree add "C:\Users\T.B\Desktop\Jamrah-Mobile" -b feat/mobile
# apply patch via git checkout 2894292 -- . + d6b1c80 -- src/...
git merge temp-mobile-apply --no-ff
```

### Task 1: تفعيل TFM

- [x] `Jamrah.csproj:4` → `net9.0-android;net9.0-windows10.0.19041.0`
- [x] `ApplicationDisplayVersion 4.3.0-mobile / ApplicationVersion 5`

### Task 2: Mobile Shell — Bottom TabBar

- [x] `MainPage.xaml` — `RootGrid` يحتوي `DesktopLayout` (ColumnDefinitions *,64) و `MobileLayout` (RowDefinitions *,72) مع `IsVisible` يتبدل في `MainPage.xaml.cs:29 ApplyIdiomLayout()` حسب `DeviceInfo.Current.Idiom == Phone`.
- [x] `MainPage.xaml.cs` — فصل WebViews: `_calendarWebViewMobile` etc. و `Show*Page()` تختار المحتوى حسب `_isMobile`. `DisableZoom()` يدعم `#if WINDOWS / ANDROID / IOS` (Android WebView `SetSupportZoom(false)`).

### Task 3: Global mobile.css

- [x] `wwwroot/css/mobile.css` — `@media (max-width:768px)` يشمل `modal-overlay` كـ BottomSheet (`align-items:flex-end`, `max-height:88dvh`) و `safe-area-inset-bottom` و `min-height:44px` للـ tap targets.
- [x] `wwwroot/index.html` — ربط `mobile.css + mobile-pomodoro.css + mobile-tasks.css + mobile-calendar.css`.

### Task 4: Pomodoro Mobile

- [x] `mobile-pomodoro.css` — `app-container:flex-direction:column`, `left-panel:100%`, `timer-value:36px`, `timer-adjust:opacity:1 + position:static` (always visible), `adj-btn:44px`, `durations:flex-wrap`.

### Task 5: Tasks Mobile

- [x] `mobile-tasks.css` — `folders-sidebar:fixed + translateX(-100%)` drawer مع `folders-overlay`, `board-container:scroll-snap-type:x mandatory`, `kanban-column:85vw`, `eisenhower:1fr`, `split-view:1fr`.
- [x] `TaskPage.razor` — زر `☰ mobile-drawer-toggle`, `_mobileDrawerOpen` + `ToggleMobileDrawer()`, `folders-overlay`, `@ontouchstart/move/end` + `HandleTouchStart/Move/Up`، `@onmousedown` + `@ontouchstart` على كل `kanban-task`.

### Task 6: Calendar Mobile

- [x] `mobile-calendar.css` — `calendar-toolbar:flex-direction:column`, `view-switcher:flex:1`, `fab-new-event:fixed bottom 88px left 16px 56px circle`.
- [x] `CalendarPage.razor` — زر `fab-new-event` يظهر فقط على mobile (CSS يخفيه >769px).

### Task 7: Android Polish

- [x] `MainActivity.cs:7` — `WindowSoftInputMode = AdjustResize` لكي الكيبورد لا يغطي الـ WebView.
- [x] `AndroidManifest.xml` — permissions `INTERNET + ACCESS_NETWORK_STATE` موجودة, `supportsRtl true`.

### Task 8: بناء APK

- [x] `dotnet workload install maui` مطلوب على Runner وعلى المطور المحلي (غير مثبت محليا — تم التحقق عبر CI).
- [x] Local check (بدون SDK): `Select-String` تحقق TFM + CSS + XAML.
- [ ] Full CI build: `dotnet publish -f net9.0-android -c Release -p:AndroidPackageFormat=apk -o publish` → artifact `publish/*.apk` (يتم على push لـ `feat/mobile`).

### Task 9: GitHub Workflows

- [x] `build-android.yml` جديد: `on push branches [main, feat/mobile] + tags v*`, steps: `checkout → setup-java 21 → setup-dotnet 9 → workload maui → restore → publish → upload-artifact → gh-release`.
- [x] حذف `build-apk.yml` (Capacitor `mobile/` غير موجود).

### Task 10: Sync Strategy

- [x] `docs/sync-strategy.md` — خطة المزامنة بعد اكتمال الموبايل.

---

## Verification Checklist

- [x] `Jamrah.csproj` TFM يتضمن `net9.0-android`
- [x] `MainPage.xaml` يحوي `MobileLayout` و `DesktopLayout`
- [x] `MainPage.xaml.cs` يدعم `_isMobile` و dual WebViews
- [x] `mobile*.css` مربوطة في `index.html`
- [x] `TaskPage.razor` drawer + touch
- [x] `CalendarPage.razor` FAB
- [x] `MainActivity` AdjustResize
- [x] `build-android.yml` MAUI publish
- [ ] CI build ينجح على `feat/mobile` (يتطلب push)
- [ ] APK يثبت `adb install -r` ويعمل offline (SQLite persistence)

---

## التالي (بعد مراجعتك)

1. مراجعة الـ worktree بصريا (Emulator أو Browser @media)
2. `git push origin feat/mobile` → تحقق CI يبني APK
3. `git tag v4.3.0-mobile-beta && git push origin v4.3.0-mobile-beta` → Release تلقائي مع APK
4. بعد الموافقة: `git checkout main && git merge feat/mobile --no-ff` (سيجلب فقط سطر TFM + mobile CSS + Shell — الديسكتوب لن يتأثر لأنه يستخدم `DesktopLayout` عند `Idiom != Phone`)

