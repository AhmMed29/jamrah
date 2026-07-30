# PHASE 8 — Polish, Performance & Production Readiness
**Status:** ⏳ Pending Execution (after Phase 7 approved)
**Agents:** Architect · Reviewer · UI Builder

---

## 🎯 Goal of Phase 8

By the end of this phase, the Jamrah Android app is:
- Completely polished — no rough edges visible to the user
- Production-ready — can be signed and released on Play Store or sideloaded reliably
- Performant — no jank, minimal memory usage
- Resilient — handles all known edge cases (offline, bad server URL, empty states)
- Accessible — screen reader friendly

---

# ╔══════════════════════════════════════════╗
# ║  TASK 1 — Splash Screen & App Icon      ║
# ╚══════════════════════════════════════════╝

## 1.1 — App Icon

Create a launcher icon that matches the Jamrah app aesthetic:
- Simple J letterform or the crescent/coffee icon used on PC
- Foreground layer: the icon artwork on transparent background
- Background layer: cream `#faf9f7` or dark `#2d2d2d`
- Sizes: use Android Studio's Image Asset Studio to generate all densities automatically

**Files to generate:**
```
android/app/src/main/res/mipmap-mdpi/ic_launcher.png
android/app/src/main/res/mipmap-hdpi/ic_launcher.png
android/app/src/main/res/mipmap-xhdpi/ic_launcher.png
android/app/src/main/res/mipmap-xxhdpi/ic_launcher.png
android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png
android/app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml  (adaptive icon)
android/app/src/main/res/drawable/ic_launcher_foreground.xml
android/app/src/main/res/drawable/ic_launcher_background.xml
```

**`ic_launcher_foreground.xml`** (Patrick Hand J in a circle):
```xml
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="108dp"
    android:height="108dp"
    android:viewportWidth="108"
    android:viewportHeight="108">
  <path
      android:fillColor="#2D2D2D"
      android:pathData="M54,30 Q62,30 66,38 L66,62 Q66,72 58,76 Q50,80 44,74"
      android:strokeWidth="5"
      android:strokeColor="#2D2D2D"
      android:fillAlpha="0"/>
</vector>
```

---

## 1.2 — Splash Screen (Android 12+ SplashScreen API)

**File:** `android/app/src/main/res/values/themes.xml` (add splash config):

```xml
<style name="Theme.JamrahApp" parent="Theme.SplashScreen">
    <item name="windowSplashScreenBackground">#FAF9F7</item>
    <item name="windowSplashScreenAnimatedIcon">@drawable/ic_launcher_foreground</item>
    <item name="windowSplashScreenAnimationDuration">300</item>
    <item name="postSplashScreenTheme">@style/Theme.JamrahApp.NoSplash</item>
</style>

<style name="Theme.JamrahApp.NoSplash" parent="Theme.Material3.Light.NoActionBar">
    <item name="android:statusBarColor">@android:color/transparent</item>
    <item name="android:navigationBarColor">@android:color/transparent</item>
    <item name="android:windowLightStatusBar">true</item>
</style>
```

**`MainActivity.kt` update** — install splash screen:
```kotlin
override fun onCreate(savedInstanceState: Bundle?) {
    val splashScreen = installSplashScreen()
    super.onCreate(savedInstanceState)
    // Keep splash visible while initial data loads (optional)
    splashScreen.setKeepOnScreenCondition {
        // false = dismiss splash immediately (can tie to ViewModel loading state)
        false
    }
    enableEdgeToEdge()
    setContent { JamrahTheme { JamrahApp() } }
}
```

Add to `libs.versions.toml`:
```toml
[versions]
splashscreen = "1.0.1"

[libraries]
androidx-core-splashscreen = { group = "androidx.core", name = "core-splashscreen", version.ref = "splashscreen" }
```

Add to `app/build.gradle.kts` dependencies:
```kotlin
implementation(libs.androidx.core.splashscreen)
```

---

# ╔══════════════════════════════════════════╗
# ║  TASK 2 — Empty States & Loading States ║
# ╚══════════════════════════════════════════╝

**File:** `android/app/src/main/java/com/jamrah/app/ui/components/EmptyState.kt`

```kotlin
package com.jamrah.app.ui.components

import androidx.compose.foundation.layout.*
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.jamrah.app.ui.theme.JamrahTextMuted

/**
 * Consistent empty state for all screens.
 * Shows icon + title + subtitle in centered column.
 */
@Composable
fun EmptyState(
    icon: String = "📋",
    title: String,
    subtitle: String = "",
    modifier: Modifier = Modifier
) {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement   = Arrangement.Center,
        modifier = modifier.fillMaxWidth().padding(48.dp)
    ) {
        Text(icon, style = MaterialTheme.typography.displaySmall)
        Spacer(Modifier.height(16.dp))
        Text(
            text = title,
            style = MaterialTheme.typography.bodyLarge,
            color = JamrahTextMuted,
            textAlign = TextAlign.Center
        )
        if (subtitle.isNotEmpty()) {
            Spacer(Modifier.height(8.dp))
            Text(
                text = subtitle,
                style = MaterialTheme.typography.bodyMedium,
                color = JamrahTextMuted,
                textAlign = TextAlign.Center
            )
        }
    }
}
```

**Empty state messages per screen:**
- Tasks: icon="📋", title="No tasks for this day", subtitle="Tap + to add a task"
- Goals: icon="🎯", title="No goals yet", subtitle="Tap + to create your first goal"
- Habits: icon="🔁", title="No habits yet", subtitle="Tap + to start tracking a habit"
- Sessions: icon="⏱", title="No sessions yet", subtitle="Complete a Pomodoro to see history here"
- Stats: icon="📊", title="No data yet", subtitle="Complete tasks and Pomodoros to see stats"

**File:** `android/app/src/main/java/com/jamrah/app/ui/components/LoadingSpinner.kt`

```kotlin
package com.jamrah.app.ui.components

import androidx.compose.foundation.layout.*
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.jamrah.app.ui.theme.JamrahBorderStrong

@Composable
fun LoadingSpinner(modifier: Modifier = Modifier) {
    Box(modifier = modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        CircularProgressIndicator(color = JamrahBorderStrong, strokeWidth = 3.dp)
    }
}
```

---

# ╔══════════════════════════════════════════╗
# ║  TASK 3 — Error Handling & Snackbars   ║
# ╚══════════════════════════════════════════╝

**File:** `android/app/src/main/java/com/jamrah/app/ui/components/ErrorSnackbar.kt`

```kotlin
package com.jamrah.app.ui.components

import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

/**
 * Consistent error display.
 * Usage: ErrorSnackbar(snackbarHostState) in Scaffold's snackbarHost parameter.
 */
@Composable
fun ErrorSnackbar(hostState: SnackbarHostState) {
    SnackbarHost(hostState) { data ->
        Snackbar(
            snackbarData = data,
            containerColor = Color(0xFF2D2D2D),
            contentColor = Color.White,
            actionColor = Color(0xFF10B981)
        )
    }
}
```

Update each ViewModel to use a `snackbarMessage: String?` field in UiState.
Update each Screen's Scaffold to include `snackbarHost = { ErrorSnackbar(snackbarHostState) }`.

---

# ╔══════════════════════════════════════════════╗
# ║  TASK 4 — Pull-to-Refresh (Sync Trigger)   ║
# ╚══════════════════════════════════════════════╝

Add pull-to-refresh to Tasks, Goals, Habits, and Sessions screens.

Add to `libs.versions.toml`:
```toml
material3-pullrefresh = "1.3.0"
```

Actually use the built-in `PullToRefreshBox` from material3 (available in compose-material3 1.3+).

**Pattern for TasksScreen.kt update:**
```kotlin
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TasksScreen(viewModel: TasksViewModel = hiltViewModel()) {
    val state by viewModel.state.collectAsState()

    PullToRefreshBox(
        isRefreshing = state.isSyncing,
        onRefresh = { viewModel.onEvent(TasksEvent.Sync) }
    ) {
        // existing Column content
    }
}
```

Apply the same pattern to GoalsScreen, HabitsScreen, SessionsScreen.

---

# ╔══════════════════════════════════════════╗
# ║  TASK 5 — Performance Optimizations    ║
# ╚══════════════════════════════════════════╝

## 5.1 — Stable keys in LazyColumn

Ensure all `LazyColumn` / `LazyVerticalGrid` `items()` calls use `key = { ... }` with unique, stable values:
```kotlin
items(tasks, key = { "${it.id}_${it.instanceDate ?: ""}" }) { task -> ... }
items(goals, key = { it.id }) { goal -> ... }
items(habits, key = { it.id }) { habit -> ... }
```

## 5.2 — derivedStateOf for filtered lists

Replace `remember(state.tasks, state.currentDate, ...)` with `derivedStateOf`:
```kotlin
val filteredTasks by remember {
    derivedStateOf { viewModel.getFilteredTasks() }
}
```

## 5.3 — Room index for frequent queries

Add indices to TaskEntity:
```kotlin
@Entity(
    tableName = "tasks",
    indices = [
        Index(value = ["parentTaskId"]),
        Index(value = ["scheduledTime"]),
        Index(value = ["completed"]),
        Index(value = ["syncStatus"])
    ]
)
```

Add the indices via a Room migration (MIGRATION_4_5):
```kotlin
val MIGRATION_4_5 = object : Migration(4, 5) {
    override fun migrate(db: SupportSQLiteDatabase) {
        db.execSQL("CREATE INDEX IF NOT EXISTS index_tasks_parentTaskId ON tasks(parentTaskId)")
        db.execSQL("CREATE INDEX IF NOT EXISTS index_tasks_syncStatus ON tasks(syncStatus)")
        db.execSQL("CREATE INDEX IF NOT EXISTS index_tasks_scheduledTime ON tasks(scheduledTime)")
    }
}
```

## 5.4 — Coroutine scope for ViewModels

Ensure all ViewModel coroutines use `viewModelScope` and never `GlobalScope`.
Ensure all Repository operations use `Dispatchers.IO` via `withContext(Dispatchers.IO)`.

## 5.5 — Image/Font caching

Patrick Hand is loaded from a resource file (not network) — no caching needed.
No Coil usage needed (no images in the app currently).

---

# ╔══════════════════════════════════════════════╗
# ║  TASK 6 — Accessibility (a11y)             ║
# ╚══════════════════════════════════════════════╝

## 6.1 — Content Descriptions

Add `contentDescription` to every interactive element that has only an icon:
```kotlin
Icon(
    imageVector = Icons.Default.Check,
    contentDescription = "Mark task as complete",
    ...
)
```

Key elements to cover:
- Task checkbox: "Mark '${task.name}' as complete" (or "Mark as incomplete")
- Priority dot: "Priority: ${task.priority}"
- Delete button: "Delete task '${task.name}'"
- Day navigation arrows: "Previous day" / "Next day"
- Habit day cell: "Toggle ${habit.name} for ${dateStr}"
- Timer play/pause: "Start timer" / "Pause timer"
- Timer skip: "Skip to next phase"

## 6.2 — Semantic merging

Use `Modifier.semantics(mergeDescendants = true)` on composite elements:
```kotlin
Row(
    modifier = Modifier.semantics(mergeDescendants = true) {}
) {
    // checkbox + text — reads as one unit
}
```

## 6.3 — Minimum touch target

Ensure all clickable elements are at least 48x48dp:
```kotlin
Modifier.size(48.dp).clickable { ... }
// or use IconButton which is already 48x48dp
```

---

# ╔══════════════════════════════════════════╗
# ║  TASK 7 — ProGuard & Build Config      ║
# ╚══════════════════════════════════════════╝

**File:** `android/app/proguard-rules.pro`

```proguard
# Keep Retrofit DTOs (Gson uses reflection)
-keepclassmembers class com.jamrah.app.data.remote.dto.** {
    <fields>;
}
-keep class com.jamrah.app.data.remote.dto.** { *; }

# Keep Room entities
-keep class com.jamrah.app.data.local.entity.** { *; }

# Keep Hilt
-keep class dagger.hilt.** { *; }
-keep class * extends dagger.hilt.android.internal.managers.ViewComponentManager { *; }

# Keep Gson
-keepattributes Signature
-keepattributes *Annotation*
-keep class com.google.gson.** { *; }

# Keep OkHttp
-dontwarn okhttp3.**
-dontwarn okio.**

# Keep Coroutines
-keepclassmembernames class kotlinx.** {
    volatile <fields>;
}

# Keep WorkManager
-keep class * extends androidx.work.Worker { *; }
-keep class * extends androidx.work.CoroutineWorker { *; }
```

**Enable ProGuard for release build in `app/build.gradle.kts`:**
```kotlin
release {
    isMinifyEnabled = true
    isShrinkResources = true
    proguardFiles(
        getDefaultProguardFile("proguard-android-optimize.txt"),
        "proguard-rules.pro"
    )
}
```

---

# ╔══════════════════════════════════════════╗
# ║  TASK 8 — Signing Configuration        ║
# ╚══════════════════════════════════════════╝

**For release APK/AAB signing:**

1. Generate a keystore:
```bash
keytool -genkey -v -keystore android/jamrah-release.jks \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -alias jamrah -storepass YOUR_PASSWORD -keypass YOUR_PASSWORD
```

2. Add to `app/build.gradle.kts`:
```kotlin
signingConfigs {
    create("release") {
        storeFile = file("../jamrah-release.jks")
        storePassword = System.getenv("KEYSTORE_PASSWORD") ?: ""
        keyAlias = "jamrah"
        keyPassword = System.getenv("KEY_PASSWORD") ?: ""
    }
}
buildTypes {
    release {
        signingConfig = signingConfigs.getByName("release")
        isMinifyEnabled = true
        isShrinkResources = true
        proguardFiles(
            getDefaultProguardFile("proguard-android-optimize.txt"),
            "proguard-rules.pro"
        )
    }
}
```

3. Add `android/jamrah-release.jks` to `.gitignore`

4. Build release APK:
```bash
cd android
./gradlew assembleRelease
# Output: app/build/outputs/apk/release/app-release.apk
```

---

# ╔══════════════════════════════════════════╗
# ║  TASK 9 — Final Integration Tests      ║
# ╚══════════════════════════════════════════╝

**File:** `android/app/src/test/java/com/jamrah/app/domain/TaskUtilsTest.kt`
```kotlin
class TaskUtilsTest {
    @Test fun newTaskId_startsWithTask()   = assert(newTaskId().startsWith("task_"))
    @Test fun priorityValue_high_is3()    = assertEquals(3, priorityValue("High"))
    @Test fun priorityValue_medium_is2()  = assertEquals(2, priorityValue("Medium"))
    @Test fun priorityValue_low_is1()     = assertEquals(1, priorityValue("Low"))
    @Test fun priorityValue_none_is0()    = assertEquals(0, priorityValue("none"))
    @Test fun recLabel_daily()            = assertEquals("Daily", recLabel("daily", null))
    @Test fun recLabel_weekly()           = assertEquals("Weekly", recLabel("weekly", null))
    @Test fun recLabel_none_empty()       = assertEquals("", recLabel("none", null))
    @Test fun todayKey_format()           = assertTrue(todayKey().matches(Regex("\\d{4}-\\d{2}-\\d{2}")))
}
```

**File:** `android/app/src/test/java/com/jamrah/app/domain/HabitUtilsTest.kt`
```kotlin
class HabitUtilsTest {
    @Test fun calcStreak_noLogs_returns0() {
        val streak = calcStreak(emptyMap(), todayKey())
        assertEquals(0, streak)
    }
    @Test fun calcStreak_todayChecked_returns1() {
        val today = todayKey()
        val streak = calcStreak(mapOf(today to 1), today)
        assertEquals(1, streak)
    }
}
```

**Run all unit tests:**
```bash
cd android
./gradlew test
```

---

# ╔══════════════════════════════════════════╗
# ║  TASK 10 — Final Build Verification    ║
# ╚══════════════════════════════════════════╝

```bash
# 1. Clean and build debug
cd android
./gradlew clean assembleDebug

# 2. Build release (with signing configured)
./gradlew assembleRelease

# 3. Run unit tests
./gradlew test

# 4. Install on device
adb install app/build/outputs/apk/debug/app-debug.apk

# 5. Check APK size (should be < 15MB for debug)
ls -lh app/build/outputs/apk/debug/app-debug.apk
```

---

# ╔══════════════════════════════════════════════════╗
# ║  TASK 11 — Master Checklist (Full App)         ║
# ╚══════════════════════════════════════════════════╝

### Tasks Page
- [ ] App launches, splash screen shows, Tasks page appears
- [ ] Header: "Tasks" + today date + filter + sort
- [ ] Day navigation works (prev/next/today)
- [ ] Add task form expands with + button
- [ ] Task added with Enter or Add button
- [ ] Task persists after app kill/restart
- [ ] Task checkbox toggle works with animation
- [ ] Completed task: line-through + 50% opacity
- [ ] Task detail bottom sheet opens on tap
- [ ] Edit mode: all fields editable and saveable
- [ ] Delete task from list (long press) and from detail sheet
- [ ] Subtasks visible in detail sheet, toggle/delete works
- [ ] Priority dot colors correct (High=red, Medium=green, None=gray)
- [ ] Recurring tasks appear on correct days
- [ ] Custom-day task: only shows on selected weekdays
- [ ] Filter (All/Active/Completed) works
- [ ] Sort by Priority and Date works
- [ ] Pull-to-refresh triggers sync

### Goals Page
- [ ] Goals page shows via bottom nav
- [ ] Add goal form (bottom sheet) opens, all fields work
- [ ] New goal appears as a card
- [ ] Progress bar correct (based on linked tasks)
- [ ] Heatmap renders 28 dots
- [ ] Status badge (Active/Done/Cancelled)
- [ ] Edit goal updates correctly
- [ ] Delete goal (with confirmation)
- [ ] Task linked to goal shows in goal card
- [ ] Toggle task completion from goal card

### Pomodoro Page
- [ ] Timer page shows via bottom nav
- [ ] Timer circle draws correctly with color
- [ ] Play starts 25:00 countdown
- [ ] Pause/Resume works
- [ ] Skip to break works
- [ ] Timer continues when app is backgrounded
- [ ] Notification shows with pause/skip buttons
- [ ] Session saved to DB after work session completes
- [ ] Session count dots update
- [ ] Long break after 4 sessions (configurable in settings)

### Sessions Page
- [ ] Sessions tab shows history grouped by date
- [ ] Stats row: today pomos, today focus, total pomos, total focus
- [ ] Tap session row -> edit sheet opens
- [ ] Edit task name + note + save works

### Habits Page
- [ ] Habits page shows via bottom nav
- [ ] Month header with prev/next navigation
- [ ] All days of month shown as columns
- [ ] Habit cells toggle (tap to check/uncheck)
- [ ] Future cells not tappable
- [ ] Today's column highlighted
- [ ] Percentage and streak correct
- [ ] Add habit: name + color + duration type works
- [ ] Edit habit (long press)
- [ ] Delete habit (from edit sheet)
- [ ] Completed habits move to bottom section

### Stats Page
- [ ] Stats page shows via bottom nav
- [ ] Focus time bar chart renders
- [ ] Tasks completed chart renders
- [ ] Time range selector (7D/4W/12M/All) works
- [ ] Habit completion rates list correct
- [ ] Goals progress list correct

### Settings Page
- [ ] Settings reachable from gear icon
- [ ] Backend URL field editable and saves
- [ ] Sync Now button triggers sync
- [ ] Pomodoro settings (work/break minutes) update and affect timer
- [ ] Theme: Light/System/Dark switch works
- [ ] Notification permissions shown correctly

### Notifications
- [ ] Task with scheduled time triggers reminder notification
- [ ] Notification has task name + Mark Done action
- [ ] Tapping notification opens app to Tasks screen
- [ ] Pomodoro completion notification shows
- [ ] Break-over notification shows

### Sync
- [ ] Tasks created on Android appear in PC app
- [ ] Tasks created on PC appear on Android after sync
- [ ] Same for Goals, Habits
- [ ] Offline: create task, go online -> auto-syncs
- [ ] Sync error shows as snackbar

---

# ╔══════════════════════════════════════════════════╗
# ║  📣 REVIEW CALL — END OF PHASE 8 (FINAL)       ║
# ╚══════════════════════════════════════════════════╝

> **CONGRATULATIONS. All 8 phases are complete.**

The Reviewer Agent must:

1. Run `./gradlew assembleRelease` (ensure ProGuard and signing work)
2. Run `./gradlew test` (all unit tests pass)
3. Install release APK on a physical device
4. Go through the master checklist above (50+ items)
5. Report any regressions introduced in Phase 8 polish work
6. Confirm the app is ready for distribution

**Distribution options:**
- **Sideload**: `adb install app-release.apk` or share the APK file
- **Internal Testing**: Upload to Play Console as internal test track
- **Firebase App Distribution**: Upload APK for testers to install via the Firebase App Distribution app

---

## 📝 Post-Launch Roadmap (Phase 9+)

After the app is live and stable:

- **Phase 9:** Real-time sync via WebSocket (requires backend upgrade)
- **Phase 10:** Widget support (Tasks today widget on home screen)
- **Phase 11:** Wear OS companion app (quick task toggle from watch)
- **Phase 12:** Backup & Restore (export/import local DB as JSON)
- **Phase 13:** Multiple backends / accounts support
- **Phase 14:** iPad/tablet optimized layout (two-pane, same as PC)

---

*End of PHASE_8.md — Master Phase (Polish & Production)*
