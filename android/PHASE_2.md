# PHASE 2 — Pomodoro Timer + Sessions Page
**Status:** ⏳ Pending Execution (after Phase 1 approved)
**Agents:** Architect · Data Engineer · UI Builder · Sync Engineer · Reviewer

---

## 🎯 Goal of Phase 2

By the end of this phase:
- A **Pomodoro timer** runs in the foreground (survives app backgrounding) with correct phases (Focus → Short Break → Long Break)
- A **persistent notification** shows the current timer state with Pause/Skip actions
- Completed sessions are **auto-saved** to Room and synced to the backend
- A **Sessions history page** shows past sessions grouped by date with stats
- The temp tab bar adds "Timer" and "Sessions" tabs

---

# ╔══════════════════════════════════════════════╗
# ║  TASK 1 — Room Entity & DAO for Sessions   ║
# ╚══════════════════════════════════════════════╝

## 1.1 — SessionEntity

**Exact file path:** `android/app/src/main/java/com/jamrah/app/data/local/entity/SessionEntity.kt`

```kotlin
package com.jamrah.app.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

/**
 * Room entity for a completed Pomodoro session.
 * Table 'sessions'. Mirrors backend Session exactly.
 * Extra local columns: syncStatus.
 */
@Entity(tableName = "sessions")
data class SessionEntity(
    @PrimaryKey
    val id: String,
    val startTime: Long,          // epoch ms
    val endTime: Long,            // epoch ms
    val plannedMinutes: Double,
    val focusMinutes: Double,
    val taskName: String = "",
    val note: String = "",
    val tagId: String? = null,
    val createdAt: Long,          // epoch ms
    val taskId: String? = null,
    val goalId: String? = null,

    // Local sync metadata
    val syncStatus: String = "pending_create"  // auto-send when online
)
```

## 1.2 — SessionDao

**Exact file path:** `android/app/src/main/java/com/jamrah/app/data/local/dao/SessionDao.kt`

```kotlin
package com.jamrah.app.data.local.dao

import androidx.room.*
import com.jamrah.app.data.local.entity.SessionEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface SessionDao {

    /** All sessions ordered newest first — drives the sessions list UI */
    @Query("SELECT * FROM sessions WHERE syncStatus != 'deleted' ORDER BY startTime DESC")
    fun observeAll(): Flow<List<SessionEntity>>

    @Query("SELECT * FROM sessions WHERE syncStatus != 'deleted' ORDER BY startTime DESC")
    suspend fun getAll(): List<SessionEntity>

    @Upsert
    suspend fun upsert(session: SessionEntity)

    @Upsert
    suspend fun upsertAll(sessions: List<SessionEntity>)

    @Query("UPDATE sessions SET syncStatus = 'deleted' WHERE id = :id")
    suspend fun markDeleted(id: String)

    @Query("DELETE FROM sessions WHERE id = :id")
    suspend fun hardDelete(id: String)

    @Query("SELECT * FROM sessions WHERE syncStatus != 'synced' AND syncStatus != 'deleted'")
    suspend fun getPending(): List<SessionEntity>

    @Query("UPDATE sessions SET syncStatus = :status WHERE id = :id")
    suspend fun updateSyncStatus(id: String, status: String)

    @Query("UPDATE sessions SET taskName = :taskName, note = :note WHERE id = :id")
    suspend fun updateTaskNameAndNote(id: String, taskName: String, note: String)

    /** Today's stats — epoch ms range for today midnight to now */
    @Query("""
        SELECT COUNT(*) as pomos, SUM(focusMinutes) as minutes
        FROM sessions
        WHERE startTime >= :dayStart AND syncStatus != 'deleted'
    """)
    suspend fun getTodayStats(dayStart: Long): TodayStatsLocal

    @Query("SELECT COUNT(*) as pomos, SUM(focusMinutes) as minutes FROM sessions WHERE syncStatus != 'deleted'")
    suspend fun getTotalStats(): TotalStatsLocal
}

data class TodayStatsLocal(val pomos: Int, val minutes: Double?)
data class TotalStatsLocal(val pomos: Int, val minutes: Double?)
```

---

# ╔══════════════════════════════════════════════╗
# ║  TASK 2 — Database Migration (v2 → v3)      ║
# ╚══════════════════════════════════════════════╝

**Update `JamrahDatabase.kt`** — add SessionEntity, version 3, migration:

```kotlin
// Add SessionEntity to entities list
@Database(
    entities = [TaskEntity::class, GoalEntity::class, GoalProgressEntity::class, SessionEntity::class],
    version = 3,
    exportSchema = true
)
abstract class JamrahDatabase : RoomDatabase() {
    abstract fun taskDao(): TaskDao
    abstract fun goalDao(): GoalDao
    abstract fun goalProgressDao(): GoalProgressDao
    abstract fun sessionDao(): SessionDao
}

val MIGRATION_2_3 = object : Migration(2, 3) {
    override fun migrate(db: SupportSQLiteDatabase) {
        db.execSQL("""
            CREATE TABLE IF NOT EXISTS sessions (
                id TEXT NOT NULL PRIMARY KEY,
                startTime INTEGER NOT NULL,
                endTime INTEGER NOT NULL,
                plannedMinutes REAL NOT NULL DEFAULT 0,
                focusMinutes REAL NOT NULL DEFAULT 0,
                taskName TEXT NOT NULL DEFAULT '',
                note TEXT NOT NULL DEFAULT '',
                tagId TEXT,
                createdAt INTEGER NOT NULL,
                taskId TEXT,
                goalId TEXT,
                syncStatus TEXT NOT NULL DEFAULT 'pending_create'
            )
        """.trimIndent())
    }
}
```

Also update `DatabaseModule.kt` to add `MIGRATION_2_3` and `provideSessionDao`.

---

# ╔══════════════════════════════════════════════╗
# ║  TASK 3 — Retrofit DTOs & API              ║
# ╚══════════════════════════════════════════════╝

**Exact file path:** `android/app/src/main/java/com/jamrah/app/data/remote/dto/SessionDto.kt`

```kotlin
package com.jamrah.app.data.remote.dto

import com.google.gson.annotations.SerializedName

data class SessionDto(
    @SerializedName("id")             val id: String,
    @SerializedName("startTime")      val startTime: Long,
    @SerializedName("endTime")        val endTime: Long,
    @SerializedName("plannedMinutes") val plannedMinutes: Double,
    @SerializedName("focusMinutes")   val focusMinutes: Double,
    @SerializedName("taskName")       val taskName: String?,
    @SerializedName("note")           val note: String?,
    @SerializedName("tagId")          val tagId: String?,
    @SerializedName("createdAt")      val createdAt: Long,
    @SerializedName("taskId")         val taskId: String?,
    @SerializedName("goalId")         val goalId: String?
)

data class CreateSessionDto(
    @SerializedName("id")             val id: String,
    @SerializedName("startTime")      val startTime: Long,
    @SerializedName("endTime")        val endTime: Long,
    @SerializedName("plannedMinutes") val plannedMinutes: Double,
    @SerializedName("focusMinutes")   val focusMinutes: Double,
    @SerializedName("taskName")       val taskName: String = "",
    @SerializedName("note")           val note: String = "",
    @SerializedName("tagId")          val tagId: String? = null,
    @SerializedName("createdAt")      val createdAt: Long,
    @SerializedName("taskId")         val taskId: String? = null,
    @SerializedName("goalId")         val goalId: String? = null
)

data class UpdateSessionDto(
    @SerializedName("taskName")  val taskName: String,
    @SerializedName("note")      val note: String,
    @SerializedName("tagId")     val tagId: String? = null,
    @SerializedName("goalId")    val goalId: String? = null
)
```

**Exact file path:** `android/app/src/main/java/com/jamrah/app/data/remote/api/SessionsApi.kt`

```kotlin
package com.jamrah.app.data.remote.api

import com.jamrah.app.data.remote.dto.*
import retrofit2.Response
import retrofit2.http.*

interface SessionsApi {

    @POST("api/sessions")
    suspend fun create(@Body dto: CreateSessionDto): Response<Boolean>

    @PUT("api/sessions/{id}")
    suspend fun update(@Path("id") id: String, @Body dto: UpdateSessionDto): Response<Boolean>

    @GET("api/sessions/{id}")
    suspend fun getById(@Path("id") id: String): Response<SessionDto>

    /** Returns {"2026-07-25": [session,...], ...} */
    @GET("api/sessions/grouped")
    suspend fun getGrouped(): Response<Map<String, List<SessionDto>>>
}
```

---

# ╔══════════════════════════════════════════════╗
# ║  TASK 4 — PomodoroSettings & DataStore     ║
# ╚══════════════════════════════════════════════╝

**Exact file path:** `android/app/src/main/java/com/jamrah/app/data/local/PomodoroSettings.kt`

```kotlin
package com.jamrah.app.data.local

data class PomodoroSettings(
    val workMinutes: Int    = 25,
    val shortBreakMinutes: Int = 5,
    val longBreakMinutes: Int  = 15,
    val longBreakInterval: Int = 4,    // sessions before long break
    val autoStartBreaks: Boolean = false,
    val autoStartFocus: Boolean  = false,
    val sounds: Boolean          = true
)
```

**Extend `AppPreferences.kt`** with pomodoro keys:

```kotlin
companion object {
    val BACKEND_URL          = stringPreferencesKey("backend_url")
    val WORK_MINUTES         = intPreferencesKey("work_minutes")
    val SHORT_BREAK_MINUTES  = intPreferencesKey("short_break_minutes")
    val LONG_BREAK_MINUTES   = intPreferencesKey("long_break_minutes")
    val LONG_BREAK_INTERVAL  = intPreferencesKey("long_break_interval")
    val AUTO_START_BREAKS    = booleanPreferencesKey("auto_start_breaks")
    val AUTO_START_FOCUS     = booleanPreferencesKey("auto_start_focus")
    val SOUNDS               = booleanPreferencesKey("sounds")
    const val DEFAULT_URL    = "http://10.0.2.2:5000/"
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
```

---

# ╔══════════════════════════════════════════════╗
# ║  TASK 5 — Session Repository               ║
# ╚══════════════════════════════════════════════╝

**Exact file path:** `android/app/src/main/java/com/jamrah/app/data/repository/SessionRepository.kt`

```kotlin
package com.jamrah.app.data.repository

import com.jamrah.app.data.local.entity.SessionEntity
import kotlinx.coroutines.flow.Flow

interface SessionRepository {
    fun observeAll(): Flow<List<SessionEntity>>
    suspend fun saveSession(entity: SessionEntity)
    suspend fun updateSession(id: String, taskName: String, note: String)
    suspend fun sync(): Result<Unit>
    suspend fun getTodayStats(): Pair<Int, Double>   // pomos, minutes
    suspend fun getTotalStats(): Pair<Int, Double>
}
```

**Exact file path:** `android/app/src/main/java/com/jamrah/app/data/repository/SessionRepositoryImpl.kt`

```kotlin
package com.jamrah.app.data.repository

import com.jamrah.app.data.local.dao.SessionDao
import com.jamrah.app.data.local.entity.SessionEntity
import com.jamrah.app.data.remote.api.SessionsApi
import com.jamrah.app.data.remote.dto.CreateSessionDto
import com.jamrah.app.data.remote.dto.UpdateSessionDto
import kotlinx.coroutines.flow.Flow
import java.util.*
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class SessionRepositoryImpl @Inject constructor(
    private val dao: SessionDao,
    private val api: SessionsApi
) : SessionRepository {

    override fun observeAll(): Flow<List<SessionEntity>> = dao.observeAll()

    override suspend fun saveSession(entity: SessionEntity) {
        dao.upsert(entity)
        // Try immediate push
        runCatching {
            val resp = api.create(entity.toCreateDto())
            if (resp.isSuccessful) dao.updateSyncStatus(entity.id, "synced")
        }
    }

    override suspend fun updateSession(id: String, taskName: String, note: String) {
        dao.updateTaskNameAndNote(id, taskName, note)
        runCatching {
            api.update(id, UpdateSessionDto(taskName = taskName, note = note))
        }
    }

    override suspend fun sync(): Result<Unit> = runCatching {
        dao.getPending().forEach { entity ->
            runCatching {
                val resp = api.create(entity.toCreateDto())
                if (resp.isSuccessful) dao.updateSyncStatus(entity.id, "synced")
            }
        }
        val resp = api.getGrouped()
        if (resp.isSuccessful) {
            val pendingIds = dao.getPending().map { it.id }.toSet()
            resp.body()?.values?.flatten()
                ?.filter { it.id !in pendingIds }
                ?.forEach { dto ->
                    dao.upsert(SessionEntity(
                        id = dto.id, startTime = dto.startTime, endTime = dto.endTime,
                        plannedMinutes = dto.plannedMinutes, focusMinutes = dto.focusMinutes,
                        taskName = dto.taskName ?: "", note = dto.note ?: "",
                        tagId = dto.tagId, createdAt = dto.createdAt,
                        taskId = dto.taskId, goalId = dto.goalId,
                        syncStatus = "synced"
                    ))
                }
        }
    }

    override suspend fun getTodayStats(): Pair<Int, Double> {
        val cal = Calendar.getInstance().apply {
            set(Calendar.HOUR_OF_DAY, 0); set(Calendar.MINUTE, 0)
            set(Calendar.SECOND, 0); set(Calendar.MILLISECOND, 0)
        }
        val stats = dao.getTodayStats(cal.timeInMillis)
        return Pair(stats.pomos, stats.minutes ?: 0.0)
    }

    override suspend fun getTotalStats(): Pair<Int, Double> {
        val stats = dao.getTotalStats()
        return Pair(stats.pomos, stats.minutes ?: 0.0)
    }

    private fun SessionEntity.toCreateDto() = CreateSessionDto(
        id = id, startTime = startTime, endTime = endTime,
        plannedMinutes = plannedMinutes, focusMinutes = focusMinutes,
        taskName = taskName, note = note, tagId = tagId,
        createdAt = createdAt, taskId = taskId, goalId = goalId
    )
}
```

---

# ╔══════════════════════════════════════════════╗
# ║  TASK 6 — Timer Domain Models              ║
# ╚══════════════════════════════════════════════╝

## 6.1 — TimerPhase

**Exact file path:** `android/app/src/main/java/com/jamrah/app/ui/pomodoro/TimerPhase.kt`

```kotlin
package com.jamrah.app.ui.pomodoro

enum class TimerPhase {
    IDLE, WORK, SHORT_BREAK, LONG_BREAK;

    fun label(): String = when (this) {
        IDLE        -> ""
        WORK        -> "FOCUS"
        SHORT_BREAK -> "SHORT BREAK"
        LONG_BREAK  -> "LONG BREAK"
    }

    fun colorHex(): Long = when (this) {
        IDLE, WORK  -> 0xFF8A7CFB  // purple brand
        SHORT_BREAK -> 0xFF10B981  // green
        LONG_BREAK  -> 0xFF3B82F6  // blue
    }
}
```

## 6.2 — TimerState

**Exact file path:** `android/app/src/main/java/com/jamrah/app/ui/pomodoro/TimerState.kt`

```kotlin
package com.jamrah.app.ui.pomodoro

data class TimerState(
    val phase: TimerPhase    = TimerPhase.IDLE,
    val remainingSeconds: Int= 25 * 60,
    val totalSeconds: Int    = 25 * 60,
    val isRunning: Boolean   = false,
    val sessionCount: Int    = 0,        // completed work sessions since last long break
    val currentTaskName: String = "",
    val progress: Float      = 1f        // 1.0 = full, 0.0 = empty
) {
    fun formattedTime(): String {
        val m = remainingSeconds / 60
        val s = remainingSeconds % 60
        return "%02d:%02d".format(m, s)
    }
}
```

## 6.3 — TimerEvent

**Exact file path:** `android/app/src/main/java/com/jamrah/app/ui/pomodoro/TimerEvent.kt`

```kotlin
package com.jamrah.app.ui.pomodoro

sealed class TimerEvent {
    object Start                         : TimerEvent()
    object Pause                         : TimerEvent()
    object Resume                        : TimerEvent()
    object Skip                          : TimerEvent()
    object Reset                         : TimerEvent()
    data class SetTaskName(val name: String) : TimerEvent()
}
```

---

# ╔══════════════════════════════════════════════╗
# ║  TASK 7 — TimerService (Foreground)        ║
# ╚══════════════════════════════════════════════╝

**Exact file path:** `android/app/src/main/java/com/jamrah/app/ui/pomodoro/TimerService.kt`

```kotlin
package com.jamrah.app.ui.pomodoro

import android.app.*
import android.content.Intent
import android.os.Binder
import android.os.IBinder
import androidx.core.app.NotificationCompat
import com.jamrah.app.MainActivity
import com.jamrah.app.R
import com.jamrah.app.data.local.AppPreferences
import com.jamrah.app.data.local.entity.SessionEntity
import com.jamrah.app.data.repository.SessionRepository
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.*
import java.util.UUID
import javax.inject.Inject

@AndroidEntryPoint
class TimerService : Service() {

    @Inject lateinit var prefs: AppPreferences
    @Inject lateinit var sessionRepo: SessionRepository

    inner class TimerBinder : Binder() {
        fun getService(): TimerService = this@TimerService
    }

    private val binder = TimerBinder()
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main)

    private val _state = MutableStateFlow(TimerState())
    val state: StateFlow<TimerState> = _state.asStateFlow()

    private var tickJob: Job? = null
    private var sessionStartMs = 0L
    private var workMinutes = 25
    private var shortBreakMinutes = 5
    private var longBreakMinutes = 15
    private var longBreakInterval = 4

    companion object {
        const val CHANNEL_ID = "jamrah_timer"
        const val NOTIF_ID   = 1001
        const val ACTION_PAUSE = "ACTION_PAUSE"
        const val ACTION_SKIP  = "ACTION_SKIP"
    }

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
        scope.launch {
            prefs.pomodoroSettings.collect { settings ->
                workMinutes       = settings.workMinutes
                shortBreakMinutes = settings.shortBreakMinutes
                longBreakMinutes  = settings.longBreakMinutes
                longBreakInterval = settings.longBreakInterval
            }
        }
    }

    override fun onBind(intent: Intent): IBinder = binder

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_PAUSE -> if (_state.value.isRunning) pauseTimer() else resumeTimer()
            ACTION_SKIP  -> skip()
        }
        return START_STICKY
    }

    fun startWork() {
        val totalSec = workMinutes * 60
        _state.update { TimerState(
            phase = TimerPhase.WORK,
            totalSeconds = totalSec,
            remainingSeconds = totalSec,
            isRunning = true,
            sessionCount = it.sessionCount,
            currentTaskName = it.currentTaskName,
            progress = 1f
        )}
        sessionStartMs = System.currentTimeMillis()
        startForeground(NOTIF_ID, buildNotification())
        startTicking()
    }

    fun pauseTimer() {
        tickJob?.cancel()
        _state.update { it.copy(isRunning = false) }
        updateNotification()
    }

    fun resumeTimer() {
        _state.update { it.copy(isRunning = true) }
        startTicking()
        updateNotification()
    }

    fun skip() {
        tickJob?.cancel()
        val current = _state.value
        when (current.phase) {
            TimerPhase.WORK -> {
                val newCount = current.sessionCount + 1
                saveSession(current)
                val isLongBreak = newCount % longBreakInterval == 0
                val breakSec = if (isLongBreak) longBreakMinutes * 60 else shortBreakMinutes * 60
                val nextPhase = if (isLongBreak) TimerPhase.LONG_BREAK else TimerPhase.SHORT_BREAK
                _state.update { it.copy(
                    phase = nextPhase,
                    totalSeconds = breakSec,
                    remainingSeconds = breakSec,
                    sessionCount = newCount,
                    progress = 1f,
                    isRunning = true
                )}
                sessionStartMs = System.currentTimeMillis()
                startTicking()
            }
            TimerPhase.SHORT_BREAK, TimerPhase.LONG_BREAK -> {
                val workSec = workMinutes * 60
                _state.update { it.copy(
                    phase = TimerPhase.WORK,
                    totalSeconds = workSec,
                    remainingSeconds = workSec,
                    progress = 1f,
                    isRunning = true
                )}
                sessionStartMs = System.currentTimeMillis()
                startTicking()
            }
            TimerPhase.IDLE -> startWork()
        }
        updateNotification()
    }

    fun reset() {
        tickJob?.cancel()
        val totalSec = workMinutes * 60
        _state.update { TimerState(
            phase = TimerPhase.IDLE,
            totalSeconds = totalSec,
            remainingSeconds = totalSec,
            sessionCount = 0,
            currentTaskName = it.currentTaskName
        )}
        stopForeground(STOP_FOREGROUND_REMOVE)
    }

    fun setTaskName(name: String) {
        _state.update { it.copy(currentTaskName = name) }
    }

    private fun startTicking() {
        tickJob?.cancel()
        tickJob = scope.launch {
            while (true) {
                delay(1000L)
                val current = _state.value
                if (!current.isRunning) break
                val newRemaining = current.remainingSeconds - 1
                val progress = newRemaining.toFloat() / current.totalSeconds.toFloat()
                if (newRemaining <= 0) {
                    _state.update { it.copy(remainingSeconds = 0, progress = 0f, isRunning = false) }
                    onPhaseComplete()
                    break
                } else {
                    _state.update { it.copy(remainingSeconds = newRemaining, progress = progress) }
                    updateNotification()
                }
            }
        }
    }

    private fun onPhaseComplete() {
        val current = _state.value
        when (current.phase) {
            TimerPhase.WORK -> {
                val newCount = current.sessionCount + 1
                saveSession(current)
                val isLongBreak = newCount % longBreakInterval == 0
                val breakSec = if (isLongBreak) longBreakMinutes * 60 else shortBreakMinutes * 60
                val nextPhase = if (isLongBreak) TimerPhase.LONG_BREAK else TimerPhase.SHORT_BREAK
                _state.update { it.copy(
                    phase = nextPhase,
                    totalSeconds = breakSec,
                    remainingSeconds = breakSec,
                    sessionCount = newCount,
                    progress = 1f,
                    isRunning = true
                )}
                sessionStartMs = System.currentTimeMillis()
                startTicking()
            }
            TimerPhase.SHORT_BREAK, TimerPhase.LONG_BREAK -> {
                val workSec = workMinutes * 60
                _state.update { it.copy(
                    phase = TimerPhase.IDLE,
                    totalSeconds = workSec,
                    remainingSeconds = workSec,
                    progress = 1f
                )}
            }
            TimerPhase.IDLE -> {}
        }
        updateNotification()
    }

    private fun saveSession(state: TimerState) {
        val endMs = System.currentTimeMillis()
        val focusMin = ((endMs - sessionStartMs) / 60000.0).coerceAtLeast(0.0)
        scope.launch(Dispatchers.IO) {
            val entity = SessionEntity(
                id = "session_${System.currentTimeMillis()}_${UUID.randomUUID().toString().take(6)}",
                startTime = sessionStartMs,
                endTime = endMs,
                plannedMinutes = state.totalSeconds / 60.0,
                focusMinutes = focusMin,
                taskName = state.currentTaskName,
                createdAt = endMs
            )
            sessionRepo.saveSession(entity)
        }
    }

    private fun createNotificationChannel() {
        val channel = NotificationChannel(
            CHANNEL_ID, "Pomodoro Timer",
            NotificationManager.IMPORTANCE_LOW
        ).apply { description = "Shows current timer state" }
        getSystemService(NotificationManager::class.java).createNotificationChannel(channel)
    }

    private fun buildNotification(): Notification {
        val s = _state.value
        val openIntent = PendingIntent.getActivity(
            this, 0,
            Intent(this, MainActivity::class.java),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        val pauseIntent = PendingIntent.getService(
            this, 1,
            Intent(this, TimerService::class.java).apply { action = ACTION_PAUSE },
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        val skipIntent = PendingIntent.getService(
            this, 2,
            Intent(this, TimerService::class.java).apply { action = ACTION_SKIP },
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
            .setContentTitle(s.phase.label().ifEmpty { "Pomodoro" })
            .setContentText(s.formattedTime())
            .setContentIntent(openIntent)
            .addAction(0, if (s.isRunning) "Pause" else "Resume", pauseIntent)
            .addAction(0, "Skip", skipIntent)
            .setOngoing(true)
            .setSilent(true)
            .build()
    }

    private fun updateNotification() {
        val nm = getSystemService(NotificationManager::class.java)
        nm.notify(NOTIF_ID, buildNotification())
    }

    override fun onDestroy() {
        super.onDestroy()
        scope.cancel()
    }
}
```

---

# ╔══════════════════════════════════════════════╗
# ║  TASK 8 — Update AndroidManifest.xml       ║
# ╚══════════════════════════════════════════════╝

Add inside `<application>`:
```xml
<service
    android:name=".ui.pomodoro.TimerService"
    android:exported="false"
    android:foregroundServiceType="specialUse" />
```

Add permissions before `<application>`:
```xml
<uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE_SPECIAL_USE" />
```

---

# ╔══════════════════════════════════════════════╗
# ║  TASK 9 — TimerViewModel                   ║
# ╚══════════════════════════════════════════════╝

**Exact file path:** `android/app/src/main/java/com/jamrah/app/ui/pomodoro/TimerViewModel.kt`

```kotlin
package com.jamrah.app.ui.pomodoro

import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.ServiceConnection
import android.os.IBinder
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class TimerViewModel @Inject constructor(
    @ApplicationContext private val context: Context
) : ViewModel() {

    private var timerService: TimerService? = null
    private val _bound = MutableStateFlow(false)

    val timerState: StateFlow<TimerState> = _bound
        .flatMapLatest { bound ->
            if (bound) timerService?.state ?: flowOf(TimerState())
            else flowOf(TimerState())
        }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), TimerState())

    private val connection = object : ServiceConnection {
        override fun onServiceConnected(name: ComponentName, service: IBinder) {
            timerService = (service as TimerService.TimerBinder).getService()
            _bound.value = true
        }
        override fun onServiceDisconnected(name: ComponentName) {
            timerService = null
            _bound.value = false
        }
    }

    init {
        val intent = Intent(context, TimerService::class.java)
        context.startService(intent)
        context.bindService(intent, connection, Context.BIND_AUTO_CREATE)
    }

    fun onEvent(event: TimerEvent) {
        val s = timerService ?: return
        when (event) {
            TimerEvent.Start          -> s.startWork()
            TimerEvent.Pause          -> s.pauseTimer()
            TimerEvent.Resume         -> s.resumeTimer()
            TimerEvent.Skip           -> s.skip()
            TimerEvent.Reset          -> s.reset()
            is TimerEvent.SetTaskName -> s.setTaskName(event.name)
        }
    }

    override fun onCleared() {
        super.onCleared()
        context.unbindService(connection)
    }
}
```

---

# ╔══════════════════════════════════════════════╗
# ║  TASK 10 — UI: Timer Circle                ║
# ╚══════════════════════════════════════════════╝

**Exact file path:** `android/app/src/main/java/com/jamrah/app/ui/pomodoro/TimerCircle.kt`

```kotlin
package com.jamrah.app.ui.pomodoro

import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.*
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

/**
 * Circular progress timer using Canvas.
 * Arc sweeps from top (-90°) clockwise by progress*360°.
 * Center shows time text + phase label.
 */
@Composable
fun TimerCircle(
    state: TimerState,
    size: Dp = 280.dp,
    strokeWidth: Dp = 12.dp,
    modifier: Modifier = Modifier
) {
    val phaseColor = Color(state.phase.colorHex())
    val trackColor = Color(0xFFF3F4F6)
    val animatedProgress by animateFloatAsState(
        targetValue = state.progress,
        animationSpec = tween(300),
        label = "timer_progress"
    )

    Box(
        contentAlignment = Alignment.Center,
        modifier = modifier.size(size)
    ) {
        Canvas(modifier = Modifier.fillMaxSize()) {
            val strokePx = strokeWidth.toPx()
            val inset = strokePx / 2f
            val arcRect = Size(this.size.width - strokePx, this.size.height - strokePx)
            // Track (background arc)
            drawArc(
                color = trackColor,
                startAngle = -90f,
                sweepAngle = 360f,
                useCenter = false,
                topLeft = Offset(inset, inset),
                size = arcRect,
                style = Stroke(width = strokePx, cap = StrokeCap.Round)
            )
            // Progress arc
            drawArc(
                color = phaseColor,
                startAngle = -90f,
                sweepAngle = animatedProgress * 360f,
                useCenter = false,
                topLeft = Offset(inset, inset),
                size = arcRect,
                style = Stroke(width = strokePx, cap = StrokeCap.Round)
            )
        }
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Text(
                text = state.formattedTime(),
                fontSize = 56.sp,
                color = Color(0xFF0B1C30),
                fontFamily = MaterialTheme.typography.headlineLarge.fontFamily
            )
            if (state.phase != TimerPhase.IDLE) {
                Text(
                    text = state.phase.label(),
                    style = MaterialTheme.typography.bodyMedium,
                    color = Color(0xFF6B7280),
                    letterSpacing = 2.sp
                )
            }
        }
    }
}
```

---

# ╔══════════════════════════════════════════════╗
# ║  TASK 11 — PomodoroScreen                  ║
# ╚══════════════════════════════════════════════╝

**Exact file path:** `android/app/src/main/java/com/jamrah/app/ui/pomodoro/PomodoroScreen.kt`

```kotlin
package com.jamrah.app.ui.pomodoro

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.jamrah.app.ui.theme.JamrahBackground
import com.jamrah.app.ui.theme.JamrahText
import com.jamrah.app.ui.theme.JamrahTextMuted

@Composable
fun PomodoroScreen(viewModel: TimerViewModel = hiltViewModel()) {
    val state by viewModel.timerState.collectAsState()
    val phaseColor = Color(state.phase.colorHex())
    var taskInput by remember { mutableStateOf(state.currentTaskName) }

    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        modifier = Modifier
            .fillMaxSize()
            .background(JamrahBackground)
            .padding(24.dp)
    ) {
        Spacer(Modifier.height(24.dp))

        Text("Pomodoro", style = MaterialTheme.typography.headlineLarge, color = JamrahText)

        Spacer(Modifier.height(32.dp))

        // Timer circle
        TimerCircle(state = state, size = 260.dp)

        Spacer(Modifier.height(32.dp))

        // Session count dots
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            val longBreakInterval = 4  // default; ideally from settings
            repeat(longBreakInterval) { i ->
                Box(
                    modifier = Modifier
                        .size(12.dp)
                        .clip(CircleShape)
                        .background(
                            if (i < (state.sessionCount % longBreakInterval))
                                phaseColor else Color(0xFFE5E7EB)
                        )
                )
            }
        }

        Spacer(Modifier.height(32.dp))

        // Controls
        Row(
            horizontalArrangement = Arrangement.spacedBy(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Reset
            IconButton(onClick = { viewModel.onEvent(TimerEvent.Reset) }) {
                Icon(Icons.Outlined.Refresh, contentDescription = "Reset",
                    tint = JamrahTextMuted, modifier = Modifier.size(24.dp))
            }

            // Play / Pause — main button (48x48dp)
            Box(
                contentAlignment = Alignment.Center,
                modifier = Modifier
                    .size(64.dp)
                    .clip(RoundedCornerShape(14.dp))
                    .background(phaseColor)
            ) {
                IconButton(
                    onClick = {
                        when {
                            state.phase == TimerPhase.IDLE -> viewModel.onEvent(TimerEvent.Start)
                            state.isRunning                -> viewModel.onEvent(TimerEvent.Pause)
                            else                           -> viewModel.onEvent(TimerEvent.Resume)
                        }
                    }
                ) {
                    Icon(
                        imageVector = if (state.isRunning) Icons.Filled.Pause else Icons.Filled.PlayArrow,
                        contentDescription = if (state.isRunning) "Pause" else "Play",
                        tint = Color.White,
                        modifier = Modifier.size(32.dp)
                    )
                }
            }

            // Skip
            IconButton(onClick = { viewModel.onEvent(TimerEvent.Skip) }) {
                Icon(Icons.Outlined.SkipNext, contentDescription = "Skip",
                    tint = JamrahTextMuted, modifier = Modifier.size(24.dp))
            }
        }

        Spacer(Modifier.height(32.dp))

        // Current task input
        OutlinedTextField(
            value = taskInput,
            onValueChange = {
                taskInput = it
                viewModel.onEvent(TimerEvent.SetTaskName(it))
            },
            placeholder = { Text("What are you working on?", color = JamrahTextMuted) },
            singleLine = true,
            textStyle = MaterialTheme.typography.bodyLarge,
            modifier = Modifier.fillMaxWidth()
        )
    }
}
```

---

# ╔══════════════════════════════════════════════╗
# ║  TASK 12 — SessionsScreen                  ║
# ╚══════════════════════════════════════════════╝

**Exact file path:** `android/app/src/main/java/com/jamrah/app/ui/pomodoro/SessionsScreen.kt`

```kotlin
package com.jamrah.app.ui.pomodoro

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.jamrah.app.data.local.entity.SessionEntity
import com.jamrah.app.ui.theme.*
import java.text.SimpleDateFormat
import java.util.*

@Composable
fun SessionsScreen(viewModel: SessionsViewModel = hiltViewModel()) {
    val state by viewModel.state.collectAsState()
    val timeFmt = remember { SimpleDateFormat("HH:mm", Locale.US) }

    Scaffold(containerColor = JamrahBackground) { padding ->
        LazyColumn(
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp),
            modifier = Modifier.padding(padding)
        ) {
            // Stats row
            item {
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    StatChip("Today", "${state.todayPomos} 🍅", modifier = Modifier.weight(1f))
                    StatChip("Focus", "${state.todayMinutes.toInt()}m", modifier = Modifier.weight(1f))
                    StatChip("Total", "${state.totalPomos} 🍅", modifier = Modifier.weight(1f))
                    StatChip("All time", "${(state.totalMinutes / 60).toInt()}h", modifier = Modifier.weight(1f))
                }
                Spacer(Modifier.height(16.dp))
            }

            // Grouped sessions
            state.grouped.forEach { (date, sessions) ->
                stickyHeader {
                    Surface(color = JamrahBackground) {
                        Text(
                            text = date,
                            style = MaterialTheme.typography.bodyMedium,
                            color = JamrahTextMuted,
                            modifier = Modifier.padding(vertical = 8.dp)
                        )
                    }
                }
                items(sessions, key = { it.id }) { session ->
                    SessionRow(
                        session = session,
                        timeFmt = timeFmt,
                        onEdit = { viewModel.onEditSession(session) }
                    )
                }
            }
        }
    }

    // Edit sheet
    state.editingSession?.let { session ->
        SessionEditSheet(
            session = session,
            onDismiss = { viewModel.dismissEdit() },
            onSave = { name, note -> viewModel.saveEdit(session.id, name, note) }
        )
    }
}

@Composable
private fun StatChip(label: String, value: String, modifier: Modifier = Modifier) {
    Surface(
        shape = MaterialTheme.shapes.medium,
        color = JamrahCard,
        border = BorderStroke(1.dp, JamrahBorder),
        modifier = modifier
    ) {
        Column(modifier = Modifier.padding(12.dp)) {
            Text(label, style = MaterialTheme.typography.bodyMedium, color = JamrahTextMuted)
            Text(value, style = MaterialTheme.typography.bodyLarge, color = JamrahText)
        }
    }
}

@Composable
private fun SessionRow(
    session: SessionEntity,
    timeFmt: SimpleDateFormat,
    onEdit: () -> Unit
) {
    val startStr = timeFmt.format(Date(session.startTime))
    val endStr   = timeFmt.format(Date(session.endTime))
    Surface(
        shape = MaterialTheme.shapes.medium,
        color = JamrahCard,
        modifier = Modifier.fillMaxWidth()
    ) {
        Row(
            verticalAlignment = androidx.compose.ui.Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween,
            modifier = Modifier.padding(12.dp)
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = session.taskName.ifEmpty { "No task" },
                    style = MaterialTheme.typography.bodyLarge,
                    color = if (session.taskName.isEmpty()) JamrahTextMuted else JamrahText
                )
                Text(
                    text = "$startStr - $endStr",
                    style = MaterialTheme.typography.bodyMedium,
                    color = JamrahTextMuted
                )
            }
            Text(
                text = "${session.focusMinutes.toInt()}m",
                style = MaterialTheme.typography.bodyMedium,
                color = Color(0xFF8A7CFB)
            )
            IconButton(onClick = onEdit, modifier = Modifier.size(36.dp)) {
                Icon(androidx.compose.material.icons.Icons.Outlined.Edit,
                    contentDescription = "Edit session",
                    tint = JamrahTextMuted, modifier = Modifier.size(16.dp))
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun SessionEditSheet(
    session: SessionEntity,
    onDismiss: () -> Unit,
    onSave: (String, String) -> Unit
) {
    var taskName by remember { mutableStateOf(session.taskName) }
    var note     by remember { mutableStateOf(session.note) }
    val sheetState = rememberModalBottomSheetState()

    ModalBottomSheet(onDismissRequest = onDismiss, sheetState = sheetState) {
        Column(modifier = Modifier.padding(24.dp).fillMaxWidth(),
            verticalArrangement = Arrangement.spacedBy(16.dp)) {
            Text("Edit Session", style = MaterialTheme.typography.headlineMedium)
            OutlinedTextField(
                value = taskName, onValueChange = { taskName = it },
                label = { Text("Task name") }, singleLine = true,
                modifier = Modifier.fillMaxWidth()
            )
            OutlinedTextField(
                value = note, onValueChange = { note = it },
                label = { Text("Note") }, minLines = 3,
                modifier = Modifier.fillMaxWidth()
            )
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedButton(onClick = onDismiss, modifier = Modifier.weight(1f)) { Text("Cancel") }
                Button(
                    onClick = { onSave(taskName, note) },
                    modifier = Modifier.weight(1f),
                    colors = ButtonDefaults.buttonColors(containerColor = JamrahBorderStrong)
                ) { Text("Save", color = Color.White) }
            }
            Spacer(Modifier.height(16.dp))
        }
    }
}
```

## 12.1 — SessionsViewModel

**Exact file path:** `android/app/src/main/java/com/jamrah/app/ui/pomodoro/SessionsViewModel.kt`

```kotlin
package com.jamrah.app.ui.pomodoro

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.jamrah.app.data.local.entity.SessionEntity
import com.jamrah.app.data.repository.SessionRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.*
import javax.inject.Inject

data class SessionsUiState(
    val grouped: Map<String, List<SessionEntity>> = emptyMap(),
    val todayPomos: Int = 0,
    val todayMinutes: Double = 0.0,
    val totalPomos: Int = 0,
    val totalMinutes: Double = 0.0,
    val editingSession: SessionEntity? = null
)

@HiltViewModel
class SessionsViewModel @Inject constructor(
    private val repo: SessionRepository
) : ViewModel() {

    private val _state = MutableStateFlow(SessionsUiState())
    val state: StateFlow<SessionsUiState> = _state.asStateFlow()

    private val groupFmt = SimpleDateFormat("yyyy-MM-dd", Locale.US)

    init {
        viewModelScope.launch {
            repo.observeAll().collect { sessions ->
                val grouped = sessions.groupBy { groupFmt.format(Date(it.startTime)) }
                _state.update { it.copy(grouped = grouped) }
            }
        }
        refreshStats()
    }

    private fun refreshStats() {
        viewModelScope.launch {
            val (tp, tm) = repo.getTodayStats()
            val (total, totalM) = repo.getTotalStats()
            _state.update { it.copy(
                todayPomos = tp, todayMinutes = tm,
                totalPomos = total, totalMinutes = totalM
            )}
        }
    }

    fun onEditSession(session: SessionEntity) {
        _state.update { it.copy(editingSession = session) }
    }

    fun dismissEdit() {
        _state.update { it.copy(editingSession = null) }
    }

    fun saveEdit(id: String, taskName: String, note: String) {
        viewModelScope.launch {
            repo.updateSession(id, taskName, note)
            _state.update { it.copy(editingSession = null) }
        }
    }
}
```

---

# ╔══════════════════════════════════════════════╗
# ║  TASK 13 — Update JamrahApp (temp tabs)    ║
# ╚══════════════════════════════════════════════╝

Update `JamrahApp.kt` to add "Timer" and "Sessions" tabs:

```kotlin
val tabs = listOf("Tasks", "Goals", "Timer", "Sessions")
// ...
2 -> PomodoroScreen()
3 -> SessionsScreen()
```

---

# ╔══════════════════════════════════════════════╗
# ║  REVIEW CALL — END OF PHASE 2              ║
# ╚══════════════════════════════════════════════╝

Build:
```bash
cd android && ./gradlew assembleDebug
```

### 25-Item Manual Testing Checklist

- [ ] App launches without crash
- [ ] Timer tab shows correctly
- [ ] Timer circle drawn (circular arc)
- [ ] Play button starts 25:00 countdown (decrements every second)
- [ ] Timer continues when app goes to background
- [ ] Notification appears with phase label + time + Pause/Skip actions
- [ ] Pause button (notification) pauses timer
- [ ] Skip button (notification) moves to break phase
- [ ] Session count dots update (1 dot fills per completed work session)
- [ ] After N sessions: long break phase starts
- [ ] Completed work session saves to Room (visible in Sessions tab after skip)
- [ ] Sessions tab shows grouped by date
- [ ] Stats row shows today's pomos + focus minutes
- [ ] Total stats correct
- [ ] Tap session row → edit sheet opens pre-filled
- [ ] Edit task name + note → save → updates in list
- [ ] Task name input on timer screen works
- [ ] Reset button goes back to IDLE state
- [ ] Notification disappears after reset
- [ ] Circle color changes per phase (purple=work, green=short break, blue=long break)
- [ ] Sessions persist after app kill
- [ ] Sync pushes sessions to backend (visible in PC app sessions list)
- [ ] Timer resumes correctly after binding reconnects
- [ ] Session ring count resets after long break
- [ ] Foreground service runs with notification on Android 14

*End of PHASE_2.md*
