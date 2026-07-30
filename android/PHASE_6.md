# PHASE 6 — Settings Page
**Status:** ⏳ Pending Execution (after Phase 5 approved)

---

## 🎯 Goal of Phase 6

By the end of this phase:
- A **Settings screen** is reachable from the bottom nav (or gear icon in any screen's top bar)
- Users can change the **backend sync URL** and trigger a manual sync
- **Pomodoro timer durations** are configurable and take effect immediately
- **Theme** switching (Light / System / Dark) works across the whole app
- All settings are persisted to **DataStore** (survives app restarts)

---

# ╔══════════════════════════════════════════════╗
# ║  TASK 1 — Extend AppPreferences            ║
# ╚══════════════════════════════════════════════╝

**Exact file path:** `android/app/src/main/java/com/jamrah/app/data/local/AppPreferences.kt` (REPLACE)

```kotlin
package com.jamrah.app.data.local

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.*
import androidx.datastore.preferences.preferencesDataStore
import com.jamrah.app.domain.model.AppTheme
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import javax.inject.Inject
import javax.inject.Singleton

private val Context.dataStore: DataStore<Preferences> by preferencesDataStore(name = "jamrah_prefs")

@Singleton
class AppPreferences @Inject constructor(
    @ApplicationContext private val context: Context
) {
    companion object {
        val BACKEND_URL          = stringPreferencesKey("backend_url")
        val WORK_MINUTES         = intPreferencesKey("work_minutes")
        val SHORT_BREAK_MINUTES  = intPreferencesKey("short_break_minutes")
        val LONG_BREAK_MINUTES   = intPreferencesKey("long_break_minutes")
        val LONG_BREAK_INTERVAL  = intPreferencesKey("long_break_interval")
        val AUTO_START_BREAKS    = booleanPreferencesKey("auto_start_breaks")
        val AUTO_START_FOCUS     = booleanPreferencesKey("auto_start_focus")
        val SOUNDS               = booleanPreferencesKey("sounds")
        val THEME                = stringPreferencesKey("theme")            // "light"|"dark"|"system"
        val TASK_REMINDERS       = booleanPreferencesKey("task_reminders")
        val POMO_ALERTS          = booleanPreferencesKey("pomo_alerts")
        val LAST_SYNC_TIME       = longPreferencesKey("last_sync_time")

        const val DEFAULT_URL    = "http://10.0.2.2:5000/"
    }

    val backendUrl: Flow<String> = context.dataStore.data.map { p ->
        p[BACKEND_URL] ?: DEFAULT_URL
    }

    val pomodoroSettings: Flow<PomodoroSettings> = context.dataStore.data.map { p ->
        PomodoroSettings(
            workMinutes        = p[WORK_MINUTES]        ?: 25,
            shortBreakMinutes  = p[SHORT_BREAK_MINUTES] ?: 5,
            longBreakMinutes   = p[LONG_BREAK_MINUTES]  ?: 15,
            longBreakInterval  = p[LONG_BREAK_INTERVAL] ?: 4,
            autoStartBreaks    = p[AUTO_START_BREAKS]   ?: false,
            autoStartFocus     = p[AUTO_START_FOCUS]    ?: false,
            sounds             = p[SOUNDS]              ?: true
        )
    }

    val theme: Flow<AppTheme> = context.dataStore.data.map { p ->
        when (p[THEME]) {
            "dark"   -> AppTheme.DARK
            "light"  -> AppTheme.LIGHT
            else     -> AppTheme.SYSTEM
        }
    }

    val taskReminders: Flow<Boolean> = context.dataStore.data.map { p -> p[TASK_REMINDERS] ?: true }
    val pomoAlerts: Flow<Boolean>    = context.dataStore.data.map { p -> p[POMO_ALERTS]    ?: true }
    val lastSyncTime: Flow<Long>     = context.dataStore.data.map { p -> p[LAST_SYNC_TIME] ?: 0L }

    suspend fun setBackendUrl(url: String) {
        context.dataStore.edit { it[BACKEND_URL] = url }
    }

    suspend fun savePomodoroSettings(settings: PomodoroSettings) {
        context.dataStore.edit { p ->
            p[WORK_MINUTES]       = settings.workMinutes
            p[SHORT_BREAK_MINUTES]= settings.shortBreakMinutes
            p[LONG_BREAK_MINUTES] = settings.longBreakMinutes
            p[LONG_BREAK_INTERVAL]= settings.longBreakInterval
            p[AUTO_START_BREAKS]  = settings.autoStartBreaks
            p[AUTO_START_FOCUS]   = settings.autoStartFocus
            p[SOUNDS]             = settings.sounds
        }
    }

    suspend fun setTheme(theme: AppTheme) {
        context.dataStore.edit { p ->
            p[THEME] = when (theme) {
                AppTheme.DARK   -> "dark"
                AppTheme.LIGHT  -> "light"
                AppTheme.SYSTEM -> "system"
            }
        }
    }

    suspend fun setTaskReminders(enabled: Boolean) { context.dataStore.edit { it[TASK_REMINDERS] = enabled } }
    suspend fun setPomoAlerts(enabled: Boolean)    { context.dataStore.edit { it[POMO_ALERTS]    = enabled } }
    suspend fun setLastSyncTime(ts: Long)          { context.dataStore.edit { it[LAST_SYNC_TIME]  = ts }     }
}
```

---

# ╔══════════════════════════════════════════════╗
# ║  TASK 2 — AppTheme Enum                    ║
# ╚══════════════════════════════════════════════╝

**Exact file path:** `android/app/src/main/java/com/jamrah/app/domain/model/AppTheme.kt`

```kotlin
package com.jamrah.app.domain.model

enum class AppTheme {
    LIGHT, DARK, SYSTEM;

    fun label(): String = when (this) {
        LIGHT  -> "Light"
        DARK   -> "Dark"
        SYSTEM -> "System"
    }
}
```

---

# ╔══════════════════════════════════════════════╗
# ║  TASK 3 — SettingsViewModel                ║
# ╚══════════════════════════════════════════════╝

**Exact file path:** `android/app/src/main/java/com/jamrah/app/ui/settings/SettingsViewModel.kt`

```kotlin
package com.jamrah.app.ui.settings

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import androidx.work.*
import com.jamrah.app.data.local.AppPreferences
import com.jamrah.app.data.local.PomodoroSettings
import com.jamrah.app.domain.model.AppTheme
import com.jamrah.app.sync.SyncWorker
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.*
import javax.inject.Inject

data class SettingsUiState(
    val backendUrl: String      = "http://10.0.2.2:5000/",
    val pomodoro: PomodoroSettings = PomodoroSettings(),
    val theme: AppTheme         = AppTheme.SYSTEM,
    val taskReminders: Boolean  = true,
    val pomoAlerts: Boolean     = true,
    val lastSyncTime: Long      = 0L,
    val isSyncing: Boolean      = false,
    val syncError: String?      = null
)

@HiltViewModel
class SettingsViewModel @Inject constructor(
    private val prefs: AppPreferences,
    private val workManager: WorkManager
) : ViewModel() {

    private val _state = MutableStateFlow(SettingsUiState())
    val state: StateFlow<SettingsUiState> = _state.asStateFlow()

    init {
        viewModelScope.launch {
            combine(
                prefs.backendUrl,
                prefs.pomodoroSettings,
                prefs.theme,
                prefs.taskReminders,
                prefs.pomoAlerts,
                prefs.lastSyncTime
            ) { arr ->
                SettingsUiState(
                    backendUrl     = arr[0] as String,
                    pomodoro       = arr[1] as PomodoroSettings,
                    theme          = arr[2] as AppTheme,
                    taskReminders  = arr[3] as Boolean,
                    pomoAlerts     = arr[4] as Boolean,
                    lastSyncTime   = arr[5] as Long
                )
            }.collect { _state.value = it }
        }
    }

    fun setBackendUrl(url: String) { viewModelScope.launch { prefs.setBackendUrl(url) } }

    fun updatePomodoro(updated: PomodoroSettings) {
        viewModelScope.launch { prefs.savePomodoroSettings(updated) }
    }

    fun setTheme(theme: AppTheme) { viewModelScope.launch { prefs.setTheme(theme) } }

    fun setTaskReminders(enabled: Boolean) { viewModelScope.launch { prefs.setTaskReminders(enabled) } }
    fun setPomoAlerts(enabled: Boolean)    { viewModelScope.launch { prefs.setPomoAlerts(enabled) }    }

    fun syncNow() {
        _state.update { it.copy(isSyncing = true, syncError = null) }
        val request = OneTimeWorkRequestBuilder<SyncWorker>().build()
        workManager.enqueue(request)
        // Observe completion
        workManager.getWorkInfoByIdLiveData(request.id).observeForever { info ->
            when (info?.state) {
                WorkInfo.State.SUCCEEDED -> {
                    val now = System.currentTimeMillis()
                    _state.update { it.copy(isSyncing = false, lastSyncTime = now) }
                    viewModelScope.launch { prefs.setLastSyncTime(now) }
                }
                WorkInfo.State.FAILED -> {
                    _state.update { it.copy(isSyncing = false, syncError = "Sync failed — check server URL") }
                }
                WorkInfo.State.CANCELLED -> {
                    _state.update { it.copy(isSyncing = false) }
                }
                else -> {}
            }
        }
    }

    fun formatLastSync(): String {
        val ts = _state.value.lastSyncTime
        if (ts == 0L) return "Never"
        return SimpleDateFormat("MMM d, HH:mm", Locale.US).format(Date(ts))
    }
}
```

---

# ╔══════════════════════════════════════════════╗
# ║  TASK 4 — SettingsScreen UI                ║
# ╚══════════════════════════════════════════════╝

**Exact file path:** `android/app/src/main/java/com/jamrah/app/ui/settings/SettingsScreen.kt`

```kotlin
package com.jamrah.app.ui.settings

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.jamrah.app.BuildConfig
import com.jamrah.app.domain.model.AppTheme
import com.jamrah.app.ui.theme.*

@Composable
fun SettingsScreen(viewModel: SettingsViewModel = hiltViewModel()) {
    val state by viewModel.state.collectAsState()
    var urlDraft by remember(state.backendUrl) { mutableStateOf(state.backendUrl) }

    Scaffold(containerColor = JamrahBackground) { padding ->
        LazyColumn(
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(24.dp),
            modifier = Modifier.padding(padding)
        ) {
            item {
                Text("Settings", style = MaterialTheme.typography.headlineLarge, color = JamrahText)
                Spacer(Modifier.height(8.dp))
            }

            // ── SYNC ──────────────────────────────────────
            item {
                SettingsSectionCard(title = "Sync") {
                    OutlinedTextField(
                        value = urlDraft,
                        onValueChange = { urlDraft = it },
                        label = { Text("Backend URL") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth()
                    )
                    Spacer(Modifier.height(8.dp))
                    Row(
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically,
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Column {
                            Text("Last sync", style = MaterialTheme.typography.bodyMedium, color = JamrahTextMuted)
                            Text(viewModel.formatLastSync(), style = MaterialTheme.typography.bodyMedium, color = JamrahText)
                        }
                        Button(
                            onClick = {
                                viewModel.setBackendUrl(urlDraft.trim().trimEnd('/') + "/")
                                viewModel.syncNow()
                            },
                            enabled = !state.isSyncing,
                            colors = ButtonDefaults.buttonColors(containerColor = JamrahBorderStrong)
                        ) {
                            if (state.isSyncing) {
                                CircularProgressIndicator(modifier = Modifier.size(16.dp), strokeWidth = 2.dp, color = Color.White)
                                Spacer(Modifier.width(8.dp))
                            }
                            Text("Sync Now", color = Color.White)
                        }
                    }
                    state.syncError?.let { err ->
                        Spacer(Modifier.height(4.dp))
                        Text(err, style = MaterialTheme.typography.bodyMedium, color = Color(0xFFEF4444))
                    }
                }
            }

            // ── POMODORO ──────────────────────────────────
            item {
                SettingsSectionCard(title = "Pomodoro") {
                    val s = state.pomodoro
                    StepperRow("Focus duration", s.workMinutes, 1, 90, "min") {
                        viewModel.updatePomodoro(s.copy(workMinutes = it))
                    }
                    HorizontalDivider()
                    StepperRow("Short break", s.shortBreakMinutes, 1, 30, "min") {
                        viewModel.updatePomodoro(s.copy(shortBreakMinutes = it))
                    }
                    HorizontalDivider()
                    StepperRow("Long break", s.longBreakMinutes, 1, 60, "min") {
                        viewModel.updatePomodoro(s.copy(longBreakMinutes = it))
                    }
                    HorizontalDivider()
                    StepperRow("Sessions before long break", s.longBreakInterval, 1, 12, "") {
                        viewModel.updatePomodoro(s.copy(longBreakInterval = it))
                    }
                    HorizontalDivider()
                    ToggleRow("Auto-start breaks", s.autoStartBreaks) {
                        viewModel.updatePomodoro(s.copy(autoStartBreaks = it))
                    }
                    HorizontalDivider()
                    ToggleRow("Auto-start focus", s.autoStartFocus) {
                        viewModel.updatePomodoro(s.copy(autoStartFocus = it))
                    }
                    HorizontalDivider()
                    ToggleRow("Timer sounds", s.sounds) {
                        viewModel.updatePomodoro(s.copy(sounds = it))
                    }
                }
            }

            // ── APPEARANCE ────────────────────────────────
            item {
                SettingsSectionCard(title = "Appearance") {
                    Text("Theme", style = MaterialTheme.typography.bodyMedium, color = JamrahText)
                    Spacer(Modifier.height(8.dp))
                    SingleChoiceSegmentedButtonRow(modifier = Modifier.fillMaxWidth()) {
                        AppTheme.values().forEachIndexed { idx, t ->
                            SegmentedButton(
                                selected = state.theme == t,
                                onClick = { viewModel.setTheme(t) },
                                shape = SegmentedButtonDefaults.itemShape(idx, AppTheme.values().size)
                            ) { Text(t.label()) }
                        }
                    }
                }
            }

            // ── NOTIFICATIONS ─────────────────────────────
            item {
                SettingsSectionCard(title = "Notifications") {
                    ToggleRow("Task reminders", state.taskReminders, onToggle = { viewModel.setTaskReminders(it) })
                    HorizontalDivider()
                    ToggleRow("Pomodoro alerts", state.pomoAlerts, onToggle = { viewModel.setPomoAlerts(it) })
                }
            }

            // ── ABOUT ─────────────────────────────────────
            item {
                SettingsSectionCard(title = "About") {
                    Row(horizontalArrangement = Arrangement.SpaceBetween, modifier = Modifier.fillMaxWidth()) {
                        Text("Version", style = MaterialTheme.typography.bodyMedium, color = JamrahTextMuted)
                        Text(BuildConfig.VERSION_NAME, style = MaterialTheme.typography.bodyMedium, color = JamrahText)
                    }
                }
            }
        }
    }
}

@Composable
private fun SettingsSectionCard(title: String, content: @Composable ColumnScope.() -> Unit) {
    Column {
        Text(title, style = MaterialTheme.typography.labelLarge, color = JamrahTextMuted,
            modifier = Modifier.padding(start = 4.dp, bottom = 8.dp))
        Surface(
            shape = RoundedCornerShape(12.dp),
            color = JamrahCard,
            border = BorderStroke(1.dp, JamrahBorder),
            modifier = Modifier.fillMaxWidth()
        ) {
            Column(modifier = Modifier.padding(16.dp), content = content)
        }
    }
}

@Composable
private fun ToggleRow(label: String, value: Boolean, onToggle: (Boolean) -> Unit) {
    Row(
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically,
        modifier = Modifier.fillMaxWidth().padding(vertical = 8.dp)
    ) {
        Text(label, style = MaterialTheme.typography.bodyMedium, color = JamrahText)
        Switch(
            checked = value,
            onCheckedChange = onToggle,
            colors = SwitchDefaults.colors(checkedThumbColor = Color.White, checkedTrackColor = JamrahBorderStrong)
        )
    }
}

@Composable
private fun StepperRow(label: String, value: Int, min: Int, max: Int, unit: String, onChanged: (Int) -> Unit) {
    Row(
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically,
        modifier = Modifier.fillMaxWidth().padding(vertical = 8.dp)
    ) {
        Text(label, style = MaterialTheme.typography.bodyMedium, color = JamrahText,
            modifier = Modifier.weight(1f))
        Row(verticalAlignment = Alignment.CenterVertically) {
            IconButton(
                onClick = { if (value > min) onChanged(value - 1) },
                modifier = Modifier.size(36.dp)
            ) { Text("−", style = MaterialTheme.typography.bodyLarge, color = JamrahText) }
            Text("$value${if (unit.isNotEmpty()) " $unit" else ""}",
                style = MaterialTheme.typography.bodyMedium, color = JamrahText,
                modifier = Modifier.widthIn(min = 48.dp),
                textAlign = androidx.compose.ui.text.style.TextAlign.Center)
            IconButton(
                onClick = { if (value < max) onChanged(value + 1) },
                modifier = Modifier.size(36.dp)
            ) { Text("+", style = MaterialTheme.typography.bodyLarge, color = JamrahText) }
        }
    }
}
```

---

# ╔══════════════════════════════════════════════╗
# ║  TASK 5 — Theme Switching                  ║
# ╚══════════════════════════════════════════════╝

**Update `JamrahTheme.kt`** to accept a dynamic `theme` parameter:

```kotlin
@Composable
fun JamrahTheme(
    appTheme: AppTheme = AppTheme.SYSTEM,
    content: @Composable () -> Unit
) {
    val darkTheme = when (appTheme) {
        AppTheme.DARK   -> true
        AppTheme.LIGHT  -> false
        AppTheme.SYSTEM -> isSystemInDarkTheme()
    }
    MaterialTheme(
        colorScheme = if (darkTheme) JamrahDarkColors else JamrahLightColors,
        typography = JamrahTypography,
        content = content
    )
}
```

**Add dark color scheme in `Color.kt`** (the key is `JamrahDarkColors`):

```kotlin
val JamrahDarkColors = darkColorScheme(
    background = Color(0xFF1A1A1A),
    surface    = Color(0xFF242424),
    onSurface  = Color(0xFFF0EDE8),
    primary    = Color(0xFF3B82F6),
    onPrimary  = Color.White
)
```

**Update `JamrahApp.kt`** to observe theme and pass to JamrahTheme.

**Update `MainActivity.kt`**:

```kotlin
@AndroidEntryPoint
class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            // Read theme from preferences
            val prefs = AppPreferences(this)
            val theme by prefs.theme.collectAsState(initial = AppTheme.SYSTEM)
            JamrahTheme(appTheme = theme) {
                JamrahApp()
            }
        }
    }
}
```

---

# ╔══════════════════════════════════════════════╗
# ║  TASK 6 — Add Settings to Navigation       ║
# ╚══════════════════════════════════════════════╝

**Update `Screen.kt`** (from Phase 5) to add Settings:

```kotlin
object Settings : Screen("settings", Icons.Outlined.Settings, "Settings")
```

**Update `JamrahApp.kt` NavHost**:
```kotlin
composable("settings") { SettingsScreen() }
```

**Update `JamrahBottomNav.kt`** — add Settings as the 6th item (or place gear icon in top AppBar of every screen instead, matching the PC sidebar approach):

Recommended approach: add a **gear icon** to the top AppBar of each main screen (not a bottom nav item) so the bottom nav stays with 5 items. This matches the PC app's sidebar-as-separate-section approach.

Add to each `Scaffold`'s `topBar`:
```kotlin
actions = {
    IconButton(onClick = { onNavigateToSettings() }) {
        Icon(Icons.Outlined.Settings, contentDescription = "Settings")
    }
}
```

---

# ╔══════════════════════════════════════════════╗
# ║  TASK 7 — Dynamic Base URL in Retrofit     ║
# ╚══════════════════════════════════════════════╝

The backend URL can change at runtime. Use an `OkHttp` interceptor that reads from `AppPreferences`:

**Exact file path:** `android/app/src/main/java/com/jamrah/app/data/remote/DynamicUrlInterceptor.kt`

```kotlin
package com.jamrah.app.data.remote

import com.jamrah.app.data.local.AppPreferences
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.runBlocking
import okhttp3.Interceptor
import okhttp3.Response
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Replaces the base URL in every request with the current setting from DataStore.
 * This allows the user to change the server URL in Settings without restarting the app.
 */
@Singleton
class DynamicUrlInterceptor @Inject constructor(
    private val prefs: AppPreferences
) : Interceptor {
    override fun intercept(chain: Interceptor.Chain): Response {
        val baseUrl = runBlocking { prefs.backendUrl.first() }
        val original = chain.request()
        val newUrl = original.url.newBuilder()
            .scheme(if (baseUrl.startsWith("https") ) "https" else "http")
            .host(baseUrl.removePrefix("https://").removePrefix("http://").substringBefore("/").substringBefore(":"))
            .port(baseUrl.removePrefix("https://").removePrefix("http://").substringBefore("/")
                .substringAfter(":", "80").toIntOrNull() ?: 80)
            .build()
        val newRequest = original.newBuilder().url(newUrl).build()
        return chain.proceed(newRequest)
    }
}
```

**Update `NetworkModule.kt`** to add this interceptor to OkHttp:

```kotlin
@Provides
@Singleton
fun provideOkHttpClient(interceptor: DynamicUrlInterceptor): OkHttpClient =
    OkHttpClient.Builder()
        .addInterceptor(interceptor)
        .connectTimeout(30, TimeUnit.SECONDS)
        .readTimeout(30, TimeUnit.SECONDS)
        .build()

@Provides
@Singleton
fun provideRetrofit(client: OkHttpClient): Retrofit =
    Retrofit.Builder()
        .baseUrl(AppPreferences.DEFAULT_URL)   // placeholder, overridden by interceptor
        .client(client)
        .addConverterFactory(GsonConverterFactory.create())
        .build()
```

---

# ╔══════════════════════════════════════════════╗
# ║  REVIEW CALL — END OF PHASE 6              ║
# ╚══════════════════════════════════════════════╝

Build: `cd android && ./gradlew assembleDebug`

### 15-Item Manual Testing Checklist

- [ ] Settings screen is reachable (via gear icon or nav item)
- [ ] Backend URL field shows current URL and is editable
- [ ] Changing URL + Sync Now → requests go to the new URL
- [ ] "Sync Now" button shows spinner while syncing
- [ ] Last sync time updates after successful sync
- [ ] Sync error message shown if server is unreachable
- [ ] Focus duration stepper: min/max respected (1–90)
- [ ] Short break stepper works (1–30)
- [ ] Long break stepper works (1–60)
- [ ] Sessions before long break stepper works (1–12)
- [ ] Auto-start breaks toggle saves and is read by timer service
- [ ] Timer sounds toggle saves (will affect Phase 7 notification sounds)
- [ ] Theme: switch to Dark → whole app goes dark
- [ ] Theme: switch to Light → whole app goes light
- [ ] Settings persist after app kill and relaunch

*End of PHASE_6.md*
