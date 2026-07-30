# Phase 5 — Bottom Navigation Bar
## Jamrah Android App

---

## Overview

All screens (Tasks, Goals, Pomodoro, Sessions, Habits, Stats) were built in Phases 0–4 and are currently wired together via a temporary `TabRow` at the top of `JamrahApp.kt`. Phase 5 replaces that temporary navigation with a production-ready bottom navigation bar using Jetpack Compose Navigation.

---

## PC App Navigation Reference

The PC version uses a left sidebar with icon-only buttons for each section:

| # | Section   | Icon         | Notes                                      |
|---|-----------|-------------|---------------------------------------------|
| 1 | Tasks     | Clipboard    | Primary landing screen                     |
| 2 | Pomodoro  | Timer        | Sub-tabs: Timer \| Sessions (History)      |
| 3 | Goals     | Flag/Target  |                                            |
| 4 | Habits    | Repeat/Cal   |                                            |
| 5 | Stats     | Bar Chart    |                                            |
| 6 | Settings  | Gear         | Accessible via header or top app bar icon  |

The mobile implementation mirrors this structure as a bottom navigation bar with 5 primary tabs. Settings is accessed via a gear icon in the top app bar of the Tasks screen (or any screen's top bar).

---

## Navigation Architecture

### Route Map

```
tasks                    ← TasksScreen
pomodoro_nav/            ← nested graph (route = "pomodoro_nav")
  timer                  ← PomodoroScreen
  sessions               ← SessionsScreen
goals                    ← GoalsScreen
habits                   ← HabitsScreen
stats                    ← StatsScreen
```

### Bottom Nav Tabs (5 items)

| Tab | Label    | Outlined Icon                    | Filled Icon                   | Route           |
|-----|----------|----------------------------------|-------------------------------|-----------------|
| 1   | Tasks    | `Icons.Outlined.CheckBox`        | `Icons.Filled.CheckBox`       | `tasks`         |
| 2   | Pomodoro | `Icons.Outlined.Timer`           | `Icons.Filled.Timer`          | `pomodoro_nav`  |
| 3   | Goals    | `Icons.Outlined.Flag`            | `Icons.Filled.Flag`           | `goals`         |
| 4   | Habits   | `Icons.Outlined.Repeat`          | `Icons.Filled.Repeat`         | `habits`        |
| 5   | Stats    | `Icons.Outlined.BarChart`        | `Icons.Filled.BarChart`       | `stats`         |

- **Active tab**: filled icon + primary color (`#3b82f6` / `MaterialTheme.colorScheme.primary`)
- **Inactive tab**: outlined icon + muted gray (`Color(0xFF9CA3AF)`)
- **Background**: white/cream (`Color(0xFFFAF9F7)`) with a top border (`Color(0xFFE5E7EB)`, 1.dp)
- **Label font**: Patrick Hand
- **Label size**: 10.sp
- **Icon size**: 24.dp
- **Bar height**: 64.dp (plus system nav inset)

### Back-Stack Policy

- Each tab uses `popUpTo(startDestination) { saveState = true }` + `launchSingleTop = true` + `restoreState = true`
- This prevents duplicate destinations and preserves per-tab scroll/state across tab switches
- Pomodoro nested graph: back press from `sessions` returns to `timer`; back press from `timer` (start of graph) exits the nested graph back to the bottom-nav level

---

## Scaffold Structure

```kotlin
Scaffold(
    bottomBar = {
        JamrahBottomNav(
            navController = navController,
            currentRoute = currentRoute
        )
    }
) { paddingValues ->
    NavHost(
        navController = navController,
        startDestination = Screen.Tasks.route,
        modifier = Modifier.padding(paddingValues)
    ) {
        composable(Screen.Tasks.route) { TasksScreen() }
        composable(Screen.Goals.route) { GoalsScreen() }
        navigation(
            startDestination = "timer",
            route = Screen.Pomodoro.route
        ) {
            composable("timer") { PomodoroScreen() }
            composable("sessions") { SessionsScreen() }
        }
        composable(Screen.Habits.route) { HabitsScreen() }
        composable(Screen.Stats.route) { StatsScreen() }
    }
}
```

---

## FAB Behavior Per Screen

| Screen   | FAB                      | Notes                                    |
|----------|--------------------------|------------------------------------------|
| Tasks    | Existing `+` card / FAB  | Keep existing add-task UI untouched      |
| Goals    | FAB (`+`)                | Opens add-goal dialog/sheet              |
| Habits   | FAB (`+`)                | Opens add-habit dialog/sheet             |
| Pomodoro | None                     | —                                        |
| Stats    | None                     | —                                        |

FABs are declared inside their respective screen composables (not in the Scaffold at `JamrahApp` level), so each screen owns its own FAB.

---

## Slide Transition Animation

Tabs animate with a horizontal slide based on the direction of travel (left tab → right tab = slide left; right tab → left tab = slide right).

- `enterTransition`: `slideIntoContainer(AnimatedContentTransitionScope.SlideDirection.Start, tween(220))`
- `exitTransition`: `slideOutOfContainer(AnimatedContentTransitionScope.SlideDirection.Start, tween(220))`
- Mirror for reverse direction
- Nested Pomodoro sub-screens use the same slide animation

---

## Files to Create / Modify

| # | Action | File |
|---|--------|------|
| 1 | **Create** | `android/app/src/main/java/com/jamrah/app/ui/navigation/Screen.kt` |
| 2 | **Create** | `android/app/src/main/java/com/jamrah/app/ui/navigation/JamrahBottomNav.kt` |
| 3 | **Create** | `android/app/src/main/java/com/jamrah/app/ui/navigation/PomodoroNavHost.kt` |
| 4 | **Update** | `android/app/src/main/java/com/jamrah/app/ui/JamrahApp.kt` |
| 5 | **Verify** | `android/app/build.gradle.kts` — confirm `navigation-compose` dependency |
| 6 | **Update** | `android/app/src/main/java/com/jamrah/app/MainActivity.kt` — edge-to-edge insets |

---

## File 1 — `Screen.kt`

**Full path**: `android/app/src/main/java/com/jamrah/app/ui/navigation/Screen.kt`

```kotlin
package com.jamrah.app.ui.navigation

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.BarChart
import androidx.compose.material.icons.filled.CheckBox
import androidx.compose.material.icons.filled.Flag
import androidx.compose.material.icons.filled.Repeat
import androidx.compose.material.icons.filled.Timer
import androidx.compose.material.icons.outlined.BarChart
import androidx.compose.material.icons.outlined.CheckBox
import androidx.compose.material.icons.outlined.Flag
import androidx.compose.material.icons.outlined.Repeat
import androidx.compose.material.icons.outlined.Timer
import androidx.compose.ui.graphics.vector.ImageVector

/**
 * Sealed class representing every top-level destination in the bottom navigation bar,
 * plus the nested Pomodoro sub-graph.
 *
 * @property route         NavHost route string for this destination.
 * @property label         Short display label shown beneath the nav icon.
 * @property outlinedIcon  Icon displayed when the tab is NOT selected.
 * @property filledIcon    Icon displayed when the tab IS selected.
 */
sealed class Screen(
    val route: String,
    val label: String,
    val outlinedIcon: ImageVector,
    val filledIcon: ImageVector,
) {
    /** Tasks tab — primary landing screen. */
    object Tasks : Screen(
        route = "tasks",
        label = "Tasks",
        outlinedIcon = Icons.Outlined.CheckBox,
        filledIcon = Icons.Filled.CheckBox,
    )

    /**
     * Pomodoro tab — acts as the root route of the nested Pomodoro/Sessions
     * navigation graph. The nested graph's own route is "pomodoro_nav"; this
     * object's [route] matches the graph route so the bottom nav highlights
     * correctly for both sub-screens.
     */
    object Pomodoro : Screen(
        route = "pomodoro_nav",
        label = "Pomodoro",
        outlinedIcon = Icons.Outlined.Timer,
        filledIcon = Icons.Filled.Timer,
    )

    /** Goals tab. */
    object Goals : Screen(
        route = "goals",
        label = "Goals",
        outlinedIcon = Icons.Outlined.Flag,
        filledIcon = Icons.Filled.Flag,
    )

    /** Habits tab. */
    object Habits : Screen(
        route = "habits",
        label = "Habits",
        outlinedIcon = Icons.Outlined.Repeat,
        filledIcon = Icons.Filled.Repeat,
    )

    /** Stats tab. */
    object Stats : Screen(
        route = "stats",
        label = "Stats",
        outlinedIcon = Icons.Outlined.BarChart,
        filledIcon = Icons.Filled.BarChart,
    )

    companion object {
        /** Ordered list of all bottom-nav destinations. */
        val bottomNavItems: List<Screen> = listOf(
            Tasks,
            Pomodoro,
            Goals,
            Habits,
            Stats,
        )

        /**
         * Returns the [Screen] whose [route] matches [route], or null if none
         * matches. Used to determine the active bottom-nav item from the current
         * back-stack entry's route.
         */
        fun fromRoute(route: String?): Screen? =
            bottomNavItems.firstOrNull { screen ->
                route == screen.route ||
                // Highlight Pomodoro tab for both nested sub-screens
                (screen is Pomodoro && route != null &&
                    (route == "timer" || route == "sessions" || route.startsWith("pomodoro_nav")))
            }
    }
}
```

---

## File 2 — `JamrahBottomNav.kt`

**Full path**: `android/app/src/main/java/com/jamrah/app/ui/navigation/JamrahBottomNav.kt`

```kotlin
package com.jamrah.app.ui.navigation

import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.material3.Icon
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationBarItemDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.navigation.NavController
import com.jamrah.app.ui.theme.PatrickHand   // your FontFamily declaration

/**
 * Bottom navigation bar composable. Rendered inside the Scaffold's [bottomBar]
 * slot in [JamrahApp].
 *
 * @param navController  The root [NavController] shared across all screens.
 * @param currentRoute   The route of the currently visible back-stack entry,
 *                       used to determine which tab is highlighted.
 */
@Composable
fun JamrahBottomNav(
    navController: NavController,
    currentRoute: String?,
) {
    val activeScreen = Screen.fromRoute(currentRoute)

    NavigationBar(
        modifier = Modifier
            .height(64.dp)
            .navigationBarsPadding(),   // respects system nav bar inset
        containerColor = Color(0xFFFAF9F7),
        tonalElevation = 0.dp,          // no tonal elevation shadow; top border used instead
    ) {
        Screen.bottomNavItems.forEach { screen ->
            val isSelected = screen == activeScreen

            NavigationBarItem(
                selected = isSelected,
                onClick = {
                    navController.navigate(screen.route) {
                        // Pop back to the start destination of the graph so that
                        // pressing Back from any tab returns to Tasks, not a deep
                        // back-stack of tab-switching history.
                        popUpTo(navController.graph.startDestinationId) {
                            saveState = true
                        }
                        // Avoid creating multiple copies of the same destination
                        launchSingleTop = true
                        // Restore state when reselecting a previously visited tab
                        restoreState = true
                    }
                },
                icon = {
                    Icon(
                        imageVector = if (isSelected) screen.filledIcon else screen.outlinedIcon,
                        contentDescription = if (isSelected)
                            "${screen.label}, selected"
                        else
                            screen.label,
                        tint = if (isSelected)
                            Color(0xFF3B82F6)       // primary blue
                        else
                            Color(0xFF9CA3AF),      // muted gray
                    )
                },
                label = {
                    Text(
                        text = screen.label,
                        fontFamily = PatrickHand,
                        fontSize = 10.sp,
                        color = if (isSelected) Color(0xFF3B82F6) else Color(0xFF9CA3AF),
                    )
                },
                colors = NavigationBarItemDefaults.colors(
                    // Disable the default indicator ripple background behind the icon
                    indicatorColor = Color.Transparent,
                    selectedIconColor = Color(0xFF3B82F6),
                    unselectedIconColor = Color(0xFF9CA3AF),
                    selectedTextColor = Color(0xFF3B82F6),
                    unselectedTextColor = Color(0xFF9CA3AF),
                ),
                alwaysShowLabel = true,
            )
        }
    }
}
```

> **Note on `PatrickHand`**: ensure a `val PatrickHand = FontFamily(Font(R.font.patrick_hand))` (or equivalent) exists in your theme package (`com.jamrah.app.ui.theme`). If the font was already registered in earlier phases, just import it here.

---

## File 3 — `PomodoroNavHost.kt`

**Full path**: `android/app/src/main/java/com/jamrah/app/ui/navigation/PomodoroNavHost.kt`

```kotlin
package com.jamrah.app.ui.navigation

import androidx.compose.animation.AnimatedContentTransitionScope
import androidx.compose.animation.core.tween
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.Tab
import androidx.compose.material3.TabRow
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.unit.sp
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import com.jamrah.app.ui.screens.PomodoroScreen
import com.jamrah.app.ui.screens.SessionsScreen
import com.jamrah.app.ui.theme.PatrickHand

/** Sub-routes within the Pomodoro nested graph. */
private const val ROUTE_TIMER    = "timer"
private const val ROUTE_SESSIONS = "sessions"

/**
 * Self-contained composable that hosts the two Pomodoro sub-screens
 * (Timer and Sessions/History) with its own inner [NavHostController].
 *
 * The outer [NavHost] in [JamrahApp] navigates to the graph route
 * "pomodoro_nav"; this composable is the entry point of that graph.
 *
 * A two-tab [TabRow] at the top of this composable mirrors the PC app's
 * sub-tab behaviour. The selected tab drives the inner NavController.
 */
@Composable
fun PomodoroNavHost(
    modifier: Modifier = Modifier,
) {
    val innerNavController = rememberNavController()
    val navBackStackEntry by innerNavController.currentBackStackEntryAsState()
    val currentInnerRoute = navBackStackEntry?.destination?.route ?: ROUTE_TIMER

    val tabs = listOf("Timer" to ROUTE_TIMER, "History" to ROUTE_SESSIONS)
    val selectedTabIndex = tabs.indexOfFirst { it.second == currentInnerRoute }.coerceAtLeast(0)

    Column(modifier = modifier.fillMaxSize()) {

        // ── Sub-tab row (Timer | History) ──────────────────────────────────
        TabRow(
            selectedTabIndex = selectedTabIndex,
            containerColor = Color(0xFFFAF9F7),
            contentColor = Color(0xFF3B82F6),
        ) {
            tabs.forEachIndexed { index, (title, route) ->
                Tab(
                    selected = selectedTabIndex == index,
                    onClick = {
                        if (currentInnerRoute != route) {
                            innerNavController.navigate(route) {
                                popUpTo(ROUTE_TIMER) { saveState = true }
                                launchSingleTop = true
                                restoreState = true
                            }
                        }
                    },
                    text = {
                        Text(
                            text = title,
                            fontFamily = PatrickHand,
                            fontSize = 14.sp,
                        )
                    },
                )
            }
        }

        // ── Inner NavHost ──────────────────────────────────────────────────
        NavHost(
            navController = innerNavController,
            startDestination = ROUTE_TIMER,
            modifier = Modifier.fillMaxSize(),
            enterTransition = {
                slideIntoContainer(
                    towards = AnimatedContentTransitionScope.SlideDirection.Start,
                    animationSpec = tween(220),
                )
            },
            exitTransition = {
                slideOutOfContainer(
                    towards = AnimatedContentTransitionScope.SlideDirection.Start,
                    animationSpec = tween(220),
                )
            },
            popEnterTransition = {
                slideIntoContainer(
                    towards = AnimatedContentTransitionScope.SlideDirection.End,
                    animationSpec = tween(220),
                )
            },
            popExitTransition = {
                slideOutOfContainer(
                    towards = AnimatedContentTransitionScope.SlideDirection.End,
                    animationSpec = tween(220),
                )
            },
        ) {
            composable(ROUTE_TIMER)    { PomodoroScreen() }
            composable(ROUTE_SESSIONS) { SessionsScreen() }
        }
    }
}
```

---

## File 4 — `JamrahApp.kt` (Updated)

**Full path**: `android/app/src/main/java/com/jamrah/app/ui/JamrahApp.kt`

Replace the existing file content entirely with the following:

```kotlin
package com.jamrah.app.ui

import androidx.compose.animation.AnimatedContentTransitionScope
import androidx.compose.animation.core.tween
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.Scaffold
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.navigation
import androidx.navigation.compose.rememberNavController
import com.jamrah.app.ui.navigation.JamrahBottomNav
import com.jamrah.app.ui.navigation.PomodoroNavHost
import com.jamrah.app.ui.navigation.Screen
import com.jamrah.app.ui.screens.GoalsScreen
import com.jamrah.app.ui.screens.HabitsScreen
import com.jamrah.app.ui.screens.StatsScreen
import com.jamrah.app.ui.screens.TasksScreen

/**
 * Root composable of the Jamrah app.
 *
 * Sets up the outer [Scaffold] with [JamrahBottomNav] and the primary
 * [NavHost] that drives top-level screen navigation.
 *
 * The temporary [TabRow] from Phase 0–4 has been removed. Pomodoro and
 * Sessions are now hosted inside a nested navigation graph rendered by
 * [PomodoroNavHost].
 */
@Composable
fun JamrahApp() {
    val navController = rememberNavController()
    val navBackStackEntry by navController.currentBackStackEntryAsState()
    val currentRoute = navBackStackEntry?.destination?.route

    Scaffold(
        modifier = Modifier.fillMaxSize(),
        bottomBar = {
            JamrahBottomNav(
                navController = navController,
                currentRoute = currentRoute,
            )
        },
    ) { paddingValues ->

        NavHost(
            navController = navController,
            startDestination = Screen.Tasks.route,
            modifier = Modifier
                .fillMaxSize(),
            // ── Top-level slide transitions ────────────────────────────────
            enterTransition = {
                slideIntoContainer(
                    towards = AnimatedContentTransitionScope.SlideDirection.Start,
                    animationSpec = tween(220),
                )
            },
            exitTransition = {
                slideOutOfContainer(
                    towards = AnimatedContentTransitionScope.SlideDirection.Start,
                    animationSpec = tween(220),
                )
            },
            popEnterTransition = {
                slideIntoContainer(
                    towards = AnimatedContentTransitionScope.SlideDirection.End,
                    animationSpec = tween(220),
                )
            },
            popExitTransition = {
                slideOutOfContainer(
                    towards = AnimatedContentTransitionScope.SlideDirection.End,
                    animationSpec = tween(220),
                )
            },
        ) {

            // ── Tasks ──────────────────────────────────────────────────────
            composable(Screen.Tasks.route) {
                TasksScreen(contentPadding = paddingValues)
            }

            // ── Pomodoro nested graph ──────────────────────────────────────
            // The graph route "pomodoro_nav" is the same as Screen.Pomodoro.route.
            // PomodoroNavHost manages its own inner NavController for Timer/Sessions.
            navigation(
                startDestination = "timer",
                route = Screen.Pomodoro.route,
            ) {
                composable("timer") {
                    // PomodoroNavHost starts on the timer sub-screen
                    PomodoroNavHost(contentPadding = paddingValues)
                }
            }

            // ── Goals ──────────────────────────────────────────────────────
            composable(Screen.Goals.route) {
                GoalsScreen(contentPadding = paddingValues)
            }

            // ── Habits ────────────────────────────────────────────────────
            composable(Screen.Habits.route) {
                HabitsScreen(contentPadding = paddingValues)
            }

            // ── Stats ─────────────────────────────────────────────────────
            composable(Screen.Stats.route) {
                StatsScreen(contentPadding = paddingValues)
            }
        }
    }
}
```

> **Signature note**: Each screen composable is passed `contentPadding: PaddingValues` so they can apply `Modifier.padding(contentPadding)` to their own root layout, correctly offsetting content below the bottom nav bar. Update each screen composable's signature to accept this parameter (or use `paddingValues` via a `CompositionLocal` if you prefer a shared approach).

---

## File 5 — `build.gradle.kts` Verification

**Full path**: `android/app/build.gradle.kts`

Confirm the following dependency is present in the `dependencies { }` block. It was introduced in Phase 0; no change is required if it already exists.

```kotlin
dependencies {
    // ... existing dependencies ...

    // Jetpack Compose Navigation — required for NavHost, NavController, composable()
    implementation("androidx.navigation:navigation-compose:2.7.7")

    // Material Icons Extended — required for Outlined + Filled variants used in Screen.kt
    implementation("androidx.compose.material:material-icons-extended")

    // ... rest of dependencies ...
}
```

If either line is missing, add it. No other changes to this file are needed for Phase 5.

---

## File 6 — `MainActivity.kt` (Edge-to-Edge Update)

**Full path**: `android/app/src/main/java/com/jamrah/app/MainActivity.kt`

Ensure `enableEdgeToEdge()` is called **before** `setContent`, and that the window does **not** consume insets for the bottom nav area (Compose handles this via `navigationBarsPadding()` in `JamrahBottomNav`).

```kotlin
package com.jamrah.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.ui.Modifier
import com.jamrah.app.ui.JamrahApp
import com.jamrah.app.ui.theme.JamrahTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Enable edge-to-edge so our bottom nav bar extends behind the system
        // navigation bar. JamrahBottomNav applies navigationBarsPadding() internally.
        enableEdgeToEdge()

        setContent {
            JamrahTheme {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.background,
                ) {
                    JamrahApp()
                }
            }
        }
    }
}
```

> **`AndroidManifest.xml` note**: confirm `android:windowSoftInputMode="adjustResize"` is set on `<activity>`. This ensures the bottom nav bar hides correctly when the soft keyboard is open (added in Phase 0). No change needed if already present.

---

## Scroll-to-Top on Same-Tab Tap

Each screen's ViewModel should expose a `SharedFlow<Unit>` named `scrollToTopEvent`. The screen observes this flow and calls `lazyListState.animateScrollToItem(0)` when it emits.

### Pattern (repeat for each ViewModel)

```kotlin
// In ViewModel
private val _scrollToTop = MutableSharedFlow<Unit>(extraBufferCapacity = 1)
val scrollToTopEvent: SharedFlow<Unit> = _scrollToTop.asSharedFlow()

fun onTabReselected() {
    _scrollToTop.tryEmit(Unit)
}
```

```kotlin
// In Screen composable
val lazyListState = rememberLazyListState()
val coroutineScope = rememberCoroutineScope()

LaunchedEffect(Unit) {
    viewModel.scrollToTopEvent.collect {
        coroutineScope.launch {
            lazyListState.animateScrollToItem(0)
        }
    }
}
```

### Triggering from JamrahBottomNav

In `JamrahBottomNav`, when `onClick` fires and the tapped tab is **already** the active one:

```kotlin
onClick = {
    if (isSelected) {
        // Signal the current screen's ViewModel to scroll to top
        // Implemented via a shared NavController argument or a global
        // ScrollToTopEventBus (singleton SharedFlow) observed by each screen.
        ScrollToTopEventBus.emit(screen.route)
    } else {
        navController.navigate(screen.route) { /* ... */ }
    }
}
```

Create `ScrollToTopEventBus.kt` as a singleton object:

```kotlin
package com.jamrah.app.ui.navigation

import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.asSharedFlow

object ScrollToTopEventBus {
    private val _events = MutableSharedFlow<String>(extraBufferCapacity = 1)
    val events: SharedFlow<String> = _events.asSharedFlow()

    fun emit(route: String) {
        _events.tryEmit(route)
    }
}
```

Each screen composable subscribes to `ScrollToTopEventBus.events`, filters for its own route, and scrolls to top.

---

## Accessibility Checklist

- [ ] Every `Icon` in `JamrahBottomNav` has a `contentDescription` that includes the tab name and whether it is selected (e.g., `"Tasks, selected"` / `"Tasks"`)
- [ ] `NavigationBarItem` exposes `selected` semantics automatically via Material3 — no extra `Modifier.semantics` needed for basic support
- [ ] Pomodoro sub-tab `Tab` composables include descriptive text labels, which serve as accessibility labels by default
- [ ] Test with TalkBack enabled on a physical device or emulator

---

## Transitions Summary

| Scope | Enter | Exit |
|-------|-------|------|
| Root NavHost (tab switch) | `slideIntoContainer(Start, 220ms)` | `slideOutOfContainer(Start, 220ms)` |
| Root NavHost (back) | `slideIntoContainer(End, 220ms)` | `slideOutOfContainer(End, 220ms)` |
| Pomodoro inner NavHost | same as above | same as above |

All durations are 220ms with the default `tween` easing. Adjust to taste.

---

## Edge Cases Handled

| Edge Case | Handling |
|-----------|----------|
| Tapping the active tab again | Emits `ScrollToTopEventBus` event; screen scrolls to top |
| Keyboard open | `windowSoftInputMode=adjustResize` hides bottom nav automatically |
| Back press from root tab | `popUpTo` prevents exit; stays on Tasks (start destination) |
| Back press inside Pomodoro nested graph (sessions → timer) | Inner NavController handles; pressing back again collapses to Tasks |
| Tab state preservation across switches | `saveState = true` + `restoreState = true` in `navigate` options |
| Deep link | Not in scope for Phase 5 |

---

## Dependencies Added / Verified

```
androidx.navigation:navigation-compose:2.7.7
androidx.compose.material:material-icons-extended
```

Both were added in Phase 0. Phase 5 adds no new Gradle dependencies.

---

## REVIEW CALL

Before marking Phase 5 complete, run through this **15-item test checklist**:

---

### ✅ Phase 5 — Test Checklist

| # | Test | Expected Result |
|---|------|-----------------|
| 1 | **App launches** | App opens on Tasks screen; bottom nav visible with 5 tabs |
| 2 | **Active tab highlight** | Tasks tab shows filled icon + blue color on launch |
| 3 | **Tap each tab** | Navigating to Goals, Habits, Stats, Pomodoro each updates the highlighted tab correctly |
| 4 | **Inactive tab style** | All non-active tabs show outlined icon + gray color |
| 5 | **Pomodoro sub-tabs** | Tapping Pomodoro tab shows Timer screen with a "Timer \| History" sub-tab row at top |
| 6 | **Pomodoro → History** | Tapping History sub-tab slides to SessionsScreen; sub-tab indicator moves |
| 7 | **Back press from History** | System back returns to Timer sub-screen (not to previous top-level tab) |
| 8 | **Back press from root tab** | Pressing back on Tasks (start destination) does not exit the app or navigate backwards |
| 9 | **Tab state preserved** | Scroll position on Tasks is restored when switching away and back |
| 10 | **Same-tab tap** | Tapping the already-active tab scrolls the screen's list back to the top |
| 11 | **Slide transition** | Switching tabs produces a smooth 220ms horizontal slide animation |
| 12 | **Bottom nav insets** | Nav bar content is not obscured by the system navigation bar (edge-to-edge correct) |
| 13 | **Keyboard hides nav** | Opening keyboard (e.g., task title field) causes bottom nav to hide; closing keyboard restores it |
| 14 | **TalkBack accessibility** | Each nav item announces its label and selected/unselected state when focused |
| 15 | **Patrick Hand font** | Tab labels render in Patrick Hand, not the default system font |

---

*End of Phase 5 — Bottom Navigation Bar Implementation Plan*
