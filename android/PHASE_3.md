# PHASE 3 — Habits Page
**Status:** ⏳ Pending Execution (after Phase 2 approved)

---

## 🎯 Goal of Phase 3

By the end of this phase:
- The **Habits page** shows a monthly calendar-style table: habits as rows, days as columns
- Users can toggle habit completion for any day cell (past only)
- Streak and completion percentage are calculated and displayed
- Full CRUD: add, edit, delete habits with color picker
- Data stored in Room; synced via SyncWorker

---

# ╔══════════════════════════════════════════════╗
# ║  TASK 1 — Room Entities                     ║
# ╚══════════════════════════════════════════════╝

## 1.1 — HabitEntity

**Exact file path:** `android/app/src/main/java/com/jamrah/app/data/local/entity/HabitEntity.kt`

```kotlin
package com.jamrah.app.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "habits")
data class HabitEntity(
    @PrimaryKey
    val id: String,
    val name: String,
    val color: String = "#3b82f6",
    val sortOrder: Int = 0,
    val createdAt: String,
    val durationType: String = "yearly",    // "daily"|"3months"|"4months"|"6months"|"yearly"|"custom"
    val durationStart: String? = null,
    val durationEnd: String? = null,

    val syncStatus: String = "synced",
    val updatedAt: Long = System.currentTimeMillis()
)
```

## 1.2 — HabitLogEntity

**Exact file path:** `android/app/src/main/java/com/jamrah/app/data/local/entity/HabitLogEntity.kt`

```kotlin
package com.jamrah.app.data.local.entity

import androidx.room.Entity
import androidx.room.Index
import androidx.room.PrimaryKey

/**
 * One log entry per (habitId, date). Unique constraint ensures no duplicates.
 * value: 0 = unchecked, 1 = checked
 * pendingSync: true when this toggle has not been pushed to server yet
 */
@Entity(
    tableName = "habit_logs",
    indices = [Index(value = ["habitId", "date"], unique = true)]
)
data class HabitLogEntity(
    @PrimaryKey(autoGenerate = true)
    val id: Int = 0,
    val habitId: String,
    val date: String,       // "yyyy-MM-dd"
    val value: Int = 0,     // 0 or 1
    val createdAt: String = "",
    val pendingSync: Boolean = false
)
```

---

# ╔══════════════════════════════════════════════╗
# ║  TASK 2 — DAOs                              ║
# ╚══════════════════════════════════════════════╝

## 2.1 — HabitDao

**Exact file path:** `android/app/src/main/java/com/jamrah/app/data/local/dao/HabitDao.kt`

```kotlin
package com.jamrah.app.data.local.dao

import androidx.room.*
import com.jamrah.app.data.local.entity.HabitEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface HabitDao {

    @Query("SELECT * FROM habits WHERE syncStatus != 'pending_delete' ORDER BY sortOrder ASC, createdAt ASC")
    fun observeAll(): Flow<List<HabitEntity>>

    @Query("SELECT * FROM habits WHERE syncStatus != 'pending_delete'")
    suspend fun getAll(): List<HabitEntity>

    @Upsert
    suspend fun upsert(habit: HabitEntity)

    @Upsert
    suspend fun upsertAll(habits: List<HabitEntity>)

    @Query("UPDATE habits SET syncStatus = 'pending_delete', updatedAt = :ts WHERE id = :id")
    suspend fun markDeleted(id: String, ts: Long = System.currentTimeMillis())

    @Query("DELETE FROM habits WHERE id = :id")
    suspend fun hardDelete(id: String)

    @Query("UPDATE habits SET syncStatus = :status WHERE id = :id")
    suspend fun updateSyncStatus(id: String, status: String)

    @Query("SELECT * FROM habits WHERE syncStatus != 'synced'")
    suspend fun getPending(): List<HabitEntity>
}
```

## 2.2 — HabitLogDao

**Exact file path:** `android/app/src/main/java/com/jamrah/app/data/local/dao/HabitLogDao.kt`

```kotlin
package com.jamrah.app.data.local.dao

import androidx.room.*
import com.jamrah.app.data.local.entity.HabitLogEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface HabitLogDao {

    @Query("SELECT * FROM habit_logs WHERE habitId = :habitId AND date BETWEEN :start AND :end ORDER BY date ASC")
    fun observeLogsInRange(habitId: String, start: String, end: String): Flow<List<HabitLogEntity>>

    @Query("SELECT * FROM habit_logs WHERE habitId = :habitId AND date BETWEEN :start AND :end ORDER BY date ASC")
    suspend fun getLogsInRange(habitId: String, start: String, end: String): List<HabitLogEntity>

    @Query("SELECT * FROM habit_logs WHERE pendingSync = 1")
    suspend fun getPendingLogs(): List<HabitLogEntity>

    @Query("SELECT * FROM habit_logs WHERE habitId = :habitId ORDER BY date DESC")
    suspend fun getLogsForHabit(habitId: String): List<HabitLogEntity>

    /** Insert or update a log entry (replace on conflict since unique index on habitId+date) */
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(log: HabitLogEntity)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertAll(logs: List<HabitLogEntity>)

    @Query("UPDATE habit_logs SET pendingSync = 0 WHERE habitId = :habitId AND date = :date")
    suspend fun clearPending(habitId: String, date: String)

    @Query("DELETE FROM habit_logs WHERE habitId = :habitId")
    suspend fun deleteForHabit(habitId: String)
}
```

---

# ╔══════════════════════════════════════════════╗
# ║  TASK 3 — Database Migration (v3 → v4)      ║
# ╚══════════════════════════════════════════════╝

Update `JamrahDatabase.kt` — add HabitEntity, HabitLogEntity, version 4, MIGRATION_3_4:

```kotlin
@Database(
    entities = [TaskEntity::class, GoalEntity::class, GoalProgressEntity::class,
                SessionEntity::class, HabitEntity::class, HabitLogEntity::class],
    version = 4,
    exportSchema = true
)
abstract class JamrahDatabase : RoomDatabase() {
    abstract fun taskDao(): TaskDao
    abstract fun goalDao(): GoalDao
    abstract fun goalProgressDao(): GoalProgressDao
    abstract fun sessionDao(): SessionDao
    abstract fun habitDao(): HabitDao
    abstract fun habitLogDao(): HabitLogDao
}

val MIGRATION_3_4 = object : Migration(3, 4) {
    override fun migrate(db: SupportSQLiteDatabase) {
        db.execSQL("""
            CREATE TABLE IF NOT EXISTS habits (
                id TEXT NOT NULL PRIMARY KEY,
                name TEXT NOT NULL,
                color TEXT NOT NULL DEFAULT '#3b82f6',
                sortOrder INTEGER NOT NULL DEFAULT 0,
                createdAt TEXT NOT NULL DEFAULT '',
                durationType TEXT NOT NULL DEFAULT 'yearly',
                durationStart TEXT,
                durationEnd TEXT,
                syncStatus TEXT NOT NULL DEFAULT 'synced',
                updatedAt INTEGER NOT NULL DEFAULT 0
            )
        """.trimIndent())
        db.execSQL("""
            CREATE TABLE IF NOT EXISTS habit_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
                habitId TEXT NOT NULL,
                date TEXT NOT NULL,
                value INTEGER NOT NULL DEFAULT 0,
                createdAt TEXT NOT NULL DEFAULT '',
                pendingSync INTEGER NOT NULL DEFAULT 0
            )
        """.trimIndent())
        db.execSQL("CREATE UNIQUE INDEX IF NOT EXISTS index_habit_logs_habitId_date ON habit_logs(habitId, date)")
    }
}
```

Update `DatabaseModule.kt`: add migration + provideHabitDao + provideHabitLogDao.

---

# ╔══════════════════════════════════════════════╗
# ║  TASK 4 — Retrofit DTOs & API              ║
# ╚══════════════════════════════════════════════╝

**Exact file path:** `android/app/src/main/java/com/jamrah/app/data/remote/dto/HabitDto.kt`

```kotlin
package com.jamrah.app.data.remote.dto

import com.google.gson.annotations.SerializedName

data class HabitDto(
    @SerializedName("id")            val id: String,
    @SerializedName("name")          val name: String,
    @SerializedName("color")         val color: String?,
    @SerializedName("sortOrder")     val sortOrder: Int?,
    @SerializedName("createdAt")     val createdAt: String?,
    @SerializedName("durationType")  val durationType: String?,
    @SerializedName("durationStart") val durationStart: String?,
    @SerializedName("durationEnd")   val durationEnd: String?
)

data class CreateHabitDto(
    @SerializedName("id")            val id: String,
    @SerializedName("name")          val name: String,
    @SerializedName("color")         val color: String = "#3b82f6",
    @SerializedName("durationType")  val durationType: String = "yearly",
    @SerializedName("durationStart") val durationStart: String? = null,
    @SerializedName("durationEnd")   val durationEnd: String? = null
)

data class UpdateHabitDto(
    @SerializedName("name")          val name: String,
    @SerializedName("color")         val color: String,
    @SerializedName("durationType")  val durationType: String,
    @SerializedName("durationStart") val durationStart: String?,
    @SerializedName("durationEnd")   val durationEnd: String?
)

data class HabitLogDto(
    @SerializedName("habitId") val habitId: String,
    @SerializedName("date")    val date: String,
    @SerializedName("value")   val value: Int
)

data class CreateHabitLogDto(
    @SerializedName("date")  val date: String,
    @SerializedName("value") val value: Int
)
```

**Exact file path:** `android/app/src/main/java/com/jamrah/app/data/remote/api/HabitsApi.kt`

```kotlin
package com.jamrah.app.data.remote.api

import com.jamrah.app.data.remote.dto.*
import retrofit2.Response
import retrofit2.http.*

interface HabitsApi {

    @GET("api/habits")
    suspend fun getAll(): Response<List<HabitDto>>

    @POST("api/habits")
    suspend fun create(@Body dto: CreateHabitDto): Response<Boolean>

    @PUT("api/habits/{id}")
    suspend fun update(@Path("id") id: String, @Body dto: UpdateHabitDto): Response<Boolean>

    @DELETE("api/habits/{id}")
    suspend fun delete(@Path("id") id: String): Response<Boolean>

    @GET("api/habits/{habitId}/logs")
    suspend fun getLogs(
        @Path("habitId") habitId: String,
        @Query("startDate") startDate: String,
        @Query("endDate") endDate: String
    ): Response<List<HabitLogDto>>

    @POST("api/habits/{habitId}/logs")
    suspend fun setLog(
        @Path("habitId") habitId: String,
        @Body dto: CreateHabitLogDto
    ): Response<Boolean>
}
```

Update `NetworkModule.kt`: add `provideHabitsApi()`.

---

# ╔══════════════════════════════════════════════╗
# ║  TASK 5 — Domain Model & Utils              ║
# ╚══════════════════════════════════════════════╝

**Exact file path:** `android/app/src/main/java/com/jamrah/app/domain/model/Habit.kt`

```kotlin
package com.jamrah.app.domain.model

data class Habit(
    val id: String,
    val name: String,
    val color: String = "#3b82f6",
    val sortOrder: Int = 0,
    val createdAt: String = "",
    val durationType: String = "yearly",
    val durationStart: String? = null,
    val durationEnd: String? = null
)
```

**Exact file path:** `android/app/src/main/java/com/jamrah/app/domain/model/HabitUtils.kt`

```kotlin
package com.jamrah.app.domain.model

import java.text.SimpleDateFormat
import java.util.*

private val habitDateFmt = SimpleDateFormat("yyyy-MM-dd", Locale.US)

val HABIT_PRESET_COLORS = listOf(
    "#3b82f6", "#ef4444", "#10b981", "#f59e0b",
    "#8b5cf6", "#ec4899", "#14b8a6", "#f97316",
    "#6366f1", "#84cc16"
)

fun newHabitId(): String {
    val rand = (Math.random() * 1e10).toLong().toString(36).take(6)
    return "habit_${System.currentTimeMillis()}_$rand"
}

/** Total days the habit should be tracked (for % computation) */
fun getHabitTotalDays(habit: Habit): Int {
    return when (habit.durationType) {
        "daily"    -> 365   // approximate ongoing
        "3months"  -> 90
        "4months"  -> 120
        "6months"  -> 180
        "yearly"   -> 365
        "custom"   -> {
            val s = habit.durationStart ?: return 365
            val e = habit.durationEnd   ?: return 365
            try {
                val start = habitDateFmt.parse(s)!!
                val end   = habitDateFmt.parse(e)!!
                ((end.time - start.time) / 86400000L).toInt().coerceAtLeast(1)
            } catch (ex: Exception) { 365 }
        }
        else -> 365
    }
}

/** Completion % based on logs in range */
fun calcPct(habit: Habit, logsMap: Map<String, Int>): Int {
    val totalDays = getHabitTotalDays(habit)
    val checked = logsMap.values.count { it == 1 }
    return ((checked.toDouble() / totalDays) * 100).toInt().coerceIn(0, 100)
}

/**
 * Streak = consecutive checked days going backward from today.
 * logsMap: date string -> 0|1
 */
fun calcStreak(logsMap: Map<String, Int>, todayKey: String): Int {
    var streak = 0
    val cal = Calendar.getInstance()
    try { cal.time = habitDateFmt.parse(todayKey)!! } catch (e: Exception) { return 0 }
    val fmt = habitDateFmt
    for (i in 0..364) {
        val dk = fmt.format(cal.time)
        if (logsMap[dk] == 1) streak++ else break
        cal.add(Calendar.DAY_OF_YEAR, -1)
    }
    return streak
}

/** Generate all date keys for a given month as "yyyy-MM-dd" strings */
fun daysInMonth(year: Int, month: Int): List<String> {
    val daysCount = Calendar.getInstance().apply {
        set(year, month, 1)
    }.getActualMaximum(Calendar.DAY_OF_MONTH)
    return (1..daysCount).map { day ->
        "%04d-%02d-%02d".format(year, month + 1, day)
    }
}
```

---

# ╔══════════════════════════════════════════════╗
# ║  TASK 6 — Repository                        ║
# ╚══════════════════════════════════════════════╝

**Exact file path:** `android/app/src/main/java/com/jamrah/app/data/repository/HabitRepository.kt`

```kotlin
package com.jamrah.app.data.repository

import com.jamrah.app.domain.model.Habit
import kotlinx.coroutines.flow.Flow

interface HabitRepository {
    fun observeAll(): Flow<List<Habit>>
    suspend fun createHabit(habit: Habit)
    suspend fun updateHabit(habit: Habit)
    suspend fun deleteHabit(id: String)
    suspend fun toggleLog(habitId: String, date: String, currentValue: Int)
    suspend fun getLogsForMonth(habitId: String, year: Int, month: Int): Map<String, Int>
    suspend fun sync(): Result<Unit>
}
```

**Exact file path:** `android/app/src/main/java/com/jamrah/app/data/repository/HabitRepositoryImpl.kt`

```kotlin
package com.jamrah.app.data.repository

import com.jamrah.app.data.local.dao.HabitDao
import com.jamrah.app.data.local.dao.HabitLogDao
import com.jamrah.app.data.local.entity.HabitEntity
import com.jamrah.app.data.local.entity.HabitLogEntity
import com.jamrah.app.data.remote.api.HabitsApi
import com.jamrah.app.data.remote.dto.*
import com.jamrah.app.domain.model.Habit
import com.jamrah.app.domain.model.daysInMonth
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import java.text.SimpleDateFormat
import java.util.*
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class HabitRepositoryImpl @Inject constructor(
    private val dao: HabitDao,
    private val logDao: HabitLogDao,
    private val api: HabitsApi
) : HabitRepository {

    private val fmt = SimpleDateFormat("yyyy-MM-dd", Locale.US)
    private val nowFmt = SimpleDateFormat("yyyy-MM-dd HH:mm:ss", Locale.US)

    override fun observeAll(): Flow<List<Habit>> =
        dao.observeAll().map { list -> list.map { it.toDomain() } }

    override suspend fun createHabit(habit: Habit) {
        dao.upsert(habit.toEntity("pending_create"))
        runCatching {
            val resp = api.create(habit.toCreateDto())
            if (resp.isSuccessful) dao.updateSyncStatus(habit.id, "synced")
        }
    }

    override suspend fun updateHabit(habit: Habit) {
        dao.upsert(habit.toEntity("pending_update"))
        runCatching {
            val resp = api.update(habit.id, habit.toUpdateDto())
            if (resp.isSuccessful) dao.updateSyncStatus(habit.id, "synced")
        }
    }

    override suspend fun deleteHabit(id: String) {
        dao.markDeleted(id)
        logDao.deleteForHabit(id)
        runCatching {
            val resp = api.delete(id)
            if (resp.isSuccessful) dao.hardDelete(id)
        }
    }

    override suspend fun toggleLog(habitId: String, date: String, currentValue: Int) {
        val newValue = if (currentValue == 0) 1 else 0
        logDao.upsert(HabitLogEntity(
            habitId = habitId, date = date, value = newValue,
            createdAt = nowFmt.format(Date()), pendingSync = true
        ))
        runCatching {
            val resp = api.setLog(habitId, CreateHabitLogDto(date = date, value = newValue))
            if (resp.isSuccessful) logDao.clearPending(habitId, date)
        }
    }

    override suspend fun getLogsForMonth(habitId: String, year: Int, month: Int): Map<String, Int> {
        val days = daysInMonth(year, month)
        val start = days.first()
        val end   = days.last()
        val logs  = logDao.getLogsInRange(habitId, start, end)
        return logs.associate { it.date to it.value }
    }

    override suspend fun sync(): Result<Unit> = runCatching {
        // Push habit changes
        dao.getPending().forEach { entity ->
            when (entity.syncStatus) {
                "pending_create" -> {
                    val resp = api.create(entity.toDomain().toCreateDto())
                    if (resp.isSuccessful) dao.updateSyncStatus(entity.id, "synced")
                }
                "pending_update" -> {
                    val resp = api.update(entity.id, entity.toDomain().toUpdateDto())
                    if (resp.isSuccessful) dao.updateSyncStatus(entity.id, "synced")
                }
                "pending_delete" -> {
                    val resp = api.delete(entity.id)
                    if (resp.isSuccessful) dao.hardDelete(entity.id)
                }
            }
        }
        // Push pending log toggles
        logDao.getPendingLogs().forEach { log ->
            runCatching {
                val resp = api.setLog(log.habitId, CreateHabitLogDto(date = log.date, value = log.value))
                if (resp.isSuccessful) logDao.clearPending(log.habitId, log.date)
            }
        }
        // Pull habits from server
        val serverResp = api.getAll()
        if (serverResp.isSuccessful) {
            val pendingIds = dao.getPending().map { it.id }.toSet()
            serverResp.body()?.filter { it.id !in pendingIds }?.forEach { dto ->
                dao.upsert(HabitEntity(
                    id = dto.id, name = dto.name, color = dto.color ?: "#3b82f6",
                    sortOrder = dto.sortOrder ?: 0, createdAt = dto.createdAt ?: "",
                    durationType = dto.durationType ?: "yearly",
                    durationStart = dto.durationStart, durationEnd = dto.durationEnd,
                    syncStatus = "synced"
                ))
            }
        }
        // Pull last 3 months of logs for all habits
        dao.getAll().forEach { entity ->
            runCatching {
                val today = fmt.format(Date())
                val cal = Calendar.getInstance()
                cal.add(Calendar.MONTH, -3)
                val start = fmt.format(cal.time)
                val logsResp = api.getLogs(entity.id, start, today)
                if (logsResp.isSuccessful) {
                    logsResp.body()?.forEach { dto ->
                        logDao.upsert(HabitLogEntity(
                            habitId = dto.habitId, date = dto.date, value = dto.value,
                            pendingSync = false
                        ))
                    }
                }
            }
        }
    }

    // Mapper helpers
    private fun HabitEntity.toDomain() = Habit(id, name, color, sortOrder, createdAt, durationType, durationStart, durationEnd)
    private fun Habit.toEntity(status: String) = HabitEntity(id, name, color, sortOrder, createdAt, durationType, durationStart, durationEnd, syncStatus = status)
    private fun Habit.toCreateDto() = CreateHabitDto(id, name, color, durationType, durationStart, durationEnd)
    private fun Habit.toUpdateDto() = UpdateHabitDto(name, color, durationType, durationStart, durationEnd)
}
```

Update `RepositoryModule.kt` to bind `HabitRepositoryImpl`.

---

# ╔══════════════════════════════════════════════╗
# ║  TASK 7 — ViewModel                         ║
# ╚══════════════════════════════════════════════╝

**Exact file path:** `android/app/src/main/java/com/jamrah/app/ui/habits/HabitsState.kt`

```kotlin
package com.jamrah.app.ui.habits

import com.jamrah.app.domain.model.Habit

data class HabitsUiState(
    val habits: List<Habit>       = emptyList(),
    // Map: habitId -> (Map: dateKey -> 0|1)
    val logsMap: Map<String, Map<String, Int>> = emptyMap(),
    val displayYear: Int          = java.util.Calendar.getInstance().get(java.util.Calendar.YEAR),
    val displayMonth: Int         = java.util.Calendar.getInstance().get(java.util.Calendar.MONTH),
    val isLoading: Boolean        = false,
    val showAddSheet: Boolean     = false,
    val editingHabit: Habit?      = null
)

sealed class HabitsEvent {
    data class ToggleLog(val habitId: String, val date: String, val currentValue: Int) : HabitsEvent()
    object PrevMonth              : HabitsEvent()
    object NextMonth              : HabitsEvent()
    object ShowAddSheet           : HabitsEvent()
    object HideAddSheet           : HabitsEvent()
    data class EditHabit(val habit: Habit) : HabitsEvent()
    object HideEditSheet          : HabitsEvent()
    data class CreateHabit(val name: String, val color: String, val durationType: String,
                           val durationStart: String?, val durationEnd: String?) : HabitsEvent()
    data class UpdateHabit(val habit: Habit) : HabitsEvent()
    data class DeleteHabit(val id: String)  : HabitsEvent()
}
```

**Exact file path:** `android/app/src/main/java/com/jamrah/app/ui/habits/HabitsViewModel.kt`

```kotlin
package com.jamrah.app.ui.habits

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.jamrah.app.data.repository.HabitRepository
import com.jamrah.app.domain.model.*
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.*
import javax.inject.Inject

@HiltViewModel
class HabitsViewModel @Inject constructor(
    private val repo: HabitRepository
) : ViewModel() {

    private val _state = MutableStateFlow(HabitsUiState())
    val state: StateFlow<HabitsUiState> = _state.asStateFlow()
    private val nowFmt = SimpleDateFormat("yyyy-MM-dd HH:mm:ss", Locale.US)

    init {
        viewModelScope.launch {
            repo.observeAll().collect { habits ->
                _state.update { it.copy(habits = habits) }
                loadLogsForCurrentMonth()
            }
        }
    }

    private fun loadLogsForCurrentMonth() {
        val s = _state.value
        viewModelScope.launch {
            val logsMap = s.habits.associate { habit ->
                habit.id to repo.getLogsForMonth(habit.id, s.displayYear, s.displayMonth)
            }
            _state.update { it.copy(logsMap = logsMap) }
        }
    }

    fun onEvent(event: HabitsEvent) {
        when (event) {
            is HabitsEvent.ToggleLog -> viewModelScope.launch {
                repo.toggleLog(event.habitId, event.date, event.currentValue)
                // Refresh logs for this month
                val s = _state.value
                val habit = s.habits.find { it.id == event.habitId } ?: return@launch
                val updatedLogs = repo.getLogsForMonth(habit.id, s.displayYear, s.displayMonth)
                val newMap = s.logsMap.toMutableMap().apply { put(habit.id, updatedLogs) }
                _state.update { it.copy(logsMap = newMap) }
            }

            HabitsEvent.PrevMonth -> {
                val cal = Calendar.getInstance().apply {
                    set(_state.value.displayYear, _state.value.displayMonth, 1)
                    add(Calendar.MONTH, -1)
                }
                _state.update { it.copy(displayYear = cal.get(Calendar.YEAR), displayMonth = cal.get(Calendar.MONTH)) }
                loadLogsForCurrentMonth()
            }

            HabitsEvent.NextMonth -> {
                val cal = Calendar.getInstance().apply {
                    set(_state.value.displayYear, _state.value.displayMonth, 1)
                    add(Calendar.MONTH, 1)
                }
                val today = Calendar.getInstance()
                // Don't allow going past current month
                if (cal.get(Calendar.YEAR) > today.get(Calendar.YEAR) ||
                    (cal.get(Calendar.YEAR) == today.get(Calendar.YEAR) && cal.get(Calendar.MONTH) > today.get(Calendar.MONTH)))
                    return
                _state.update { it.copy(displayYear = cal.get(Calendar.YEAR), displayMonth = cal.get(Calendar.MONTH)) }
                loadLogsForCurrentMonth()
            }

            HabitsEvent.ShowAddSheet  -> _state.update { it.copy(showAddSheet = true) }
            HabitsEvent.HideAddSheet  -> _state.update { it.copy(showAddSheet = false) }
            is HabitsEvent.EditHabit  -> _state.update { it.copy(editingHabit = event.habit) }
            HabitsEvent.HideEditSheet -> _state.update { it.copy(editingHabit = null) }

            is HabitsEvent.CreateHabit -> viewModelScope.launch {
                val habit = Habit(
                    id = newHabitId(), name = event.name, color = event.color,
                    sortOrder = _state.value.habits.size,
                    createdAt = nowFmt.format(Date()),
                    durationType = event.durationType,
                    durationStart = event.durationStart,
                    durationEnd = event.durationEnd
                )
                repo.createHabit(habit)
                _state.update { it.copy(showAddSheet = false) }
            }

            is HabitsEvent.UpdateHabit -> viewModelScope.launch {
                repo.updateHabit(event.habit)
                _state.update { it.copy(editingHabit = null) }
            }

            is HabitsEvent.DeleteHabit -> viewModelScope.launch {
                repo.deleteHabit(event.id)
                _state.update { it.copy(editingHabit = null) }
            }
        }
    }
}
```

---

# ╔══════════════════════════════════════════════╗
# ║  TASK 8 — Compose UI                        ║
# ╚══════════════════════════════════════════════╝

## 8.1 — HabitCell

**Exact file path:** `android/app/src/main/java/com/jamrah/app/ui/habits/HabitCell.kt`

```kotlin
package com.jamrah.app.ui.habits

import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
import androidx.compose.material3.Icon
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp

/**
 * A single day toggle cell for a habit.
 * checked: filled color + checkmark
 * unchecked: border at 40% opacity
 * future: 40% opacity, not clickable
 */
@Composable
fun HabitCell(
    habitColor: Color,
    isChecked: Boolean,
    isFuture: Boolean,
    onToggle: () -> Unit,
    modifier: Modifier = Modifier
) {
    val bgColor by animateColorAsState(
        targetValue = if (isChecked) habitColor else Color.Transparent,
        animationSpec = tween(200),
        label = "habit_cell_bg"
    )
    val borderColor = habitColor.copy(alpha = 0.4f)

    Box(
        contentAlignment = Alignment.Center,
        modifier = modifier
            .size(36.dp)
            .alpha(if (isFuture) 0.35f else 1f)
            .clip(RoundedCornerShape(6.dp))
            .background(bgColor)
            .border(1.5.dp, if (isChecked) Color.Transparent else borderColor, RoundedCornerShape(6.dp))
            .then(if (!isFuture) Modifier.clickable(onClick = onToggle) else Modifier)
    ) {
        if (isChecked) {
            Icon(
                imageVector = Icons.Default.Check,
                contentDescription = "Checked",
                tint = Color.White,
                modifier = Modifier.size(20.dp)
            )
        }
    }
}
```

## 8.2 — HabitRow

**Exact file path:** `android/app/src/main/java/com/jamrah/app/ui/habits/HabitRow.kt`

```kotlin
package com.jamrah.app.ui.habits

import androidx.compose.foundation.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.jamrah.app.domain.model.Habit
import com.jamrah.app.domain.model.calcPct
import com.jamrah.app.domain.model.calcStreak
import com.jamrah.app.domain.model.todayKey
import com.jamrah.app.ui.theme.JamrahText
import com.jamrah.app.ui.theme.JamrahTextMuted

@Composable
fun HabitRow(
    habit: Habit,
    dayKeys: List<String>,
    logsMap: Map<String, Int>,
    todayKeyStr: String,
    scrollState: ScrollState,
    onToggle: (date: String, currentValue: Int) -> Unit,
    onLongPress: () -> Unit,
    modifier: Modifier = Modifier
) {
    val habitColor = runCatching {
        Color(android.graphics.Color.parseColor(habit.color))
    }.getOrDefault(Color(0xFF3B82F6))

    val pct    = calcPct(habit, logsMap)
    val streak = calcStreak(logsMap, todayKeyStr)

    Row(
        verticalAlignment = Alignment.CenterVertically,
        modifier = modifier.fillMaxWidth().height(52.dp)
    ) {
        // Sticky habit name column (fixed 140dp)
        Row(
            verticalAlignment = Alignment.CenterVertically,
            modifier = Modifier
                .width(140.dp)
                .fillMaxHeight()
                .combinedClickable(onClick = {}, onLongClick = onLongPress)
                .padding(horizontal = 8.dp)
        ) {
            Box(modifier = Modifier.size(10.dp).clip(CircleShape).background(habitColor))
            Spacer(Modifier.width(6.dp))
            Text(
                text = habit.name,
                style = MaterialTheme.typography.bodyMedium,
                color = JamrahText,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
        }

        // Scrollable day cells
        Row(
            horizontalArrangement = Arrangement.spacedBy(4.dp),
            modifier = Modifier
                .weight(1f)
                .horizontalScroll(scrollState)
                .padding(horizontal = 4.dp)
        ) {
            dayKeys.forEach { dk ->
                val value    = logsMap[dk] ?: 0
                val isFuture = dk > todayKeyStr
                HabitCell(
                    habitColor = habitColor,
                    isChecked  = value == 1,
                    isFuture   = isFuture,
                    onToggle   = { onToggle(dk, value) }
                )
            }
        }

        // Stats column (fixed 90dp)
        Column(
            horizontalAlignment = Alignment.End,
            modifier = Modifier.width(90.dp).padding(end = 8.dp)
        ) {
            Text("$pct%", style = MaterialTheme.typography.bodyMedium, color = JamrahText)
            if (streak > 0) {
                Text("🔥 $streak", style = MaterialTheme.typography.bodyMedium, color = JamrahTextMuted)
            }
        }
    }
}
```

## 8.3 — HabitsScreen

**Exact file path:** `android/app/src/main/java/com/jamrah/app/ui/habits/HabitsScreen.kt`

```kotlin
package com.jamrah.app.ui.habits

import androidx.compose.foundation.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.outlined.Close
import androidx.compose.material.icons.outlined.Edit
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.jamrah.app.domain.model.*
import com.jamrah.app.ui.components.EmptyState
import com.jamrah.app.ui.theme.*
import java.text.SimpleDateFormat
import java.util.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HabitsScreen(viewModel: HabitsViewModel = hiltViewModel()) {
    val state by viewModel.state.collectAsState()
    val sharedScroll = rememberScrollState()
    val addSheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    val editSheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)

    val cal = Calendar.getInstance().apply {
        set(state.displayYear, state.displayMonth, 1)
    }
    val dayKeys  = daysInMonth(state.displayYear, state.displayMonth)
    val todayStr = SimpleDateFormat("yyyy-MM-dd", Locale.US).format(Date())
    val monthNames = arrayOf("January","February","March","April","May","June",
        "July","August","September","October","November","December")

    var longPressHabit by remember { mutableStateOf<com.jamrah.app.domain.model.Habit?>(null) }

    Scaffold(
        containerColor = JamrahBackground,
        floatingActionButton = {
            FloatingActionButton(onClick = { viewModel.onEvent(HabitsEvent.ShowAddSheet) },
                containerColor = JamrahBorderStrong) {
                Icon(Icons.Default.Add, contentDescription = "Add habit", tint = Color.White)
            }
        }
    ) { padding ->
        Column(modifier = Modifier.padding(padding).fillMaxSize()) {
            // Header
            Row(
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 12.dp)
            ) {
                Text("Habits", style = MaterialTheme.typography.headlineLarge, color = JamrahText)
                Row(verticalAlignment = Alignment.CenterVertically) {
                    TextButton(onClick = { viewModel.onEvent(HabitsEvent.PrevMonth) }) {
                        Text("‹", style = MaterialTheme.typography.headlineMedium, color = JamrahTextMuted)
                    }
                    Text(
                        text = "${monthNames[state.displayMonth]} ${state.displayYear}",
                        style = MaterialTheme.typography.bodyLarge,
                        color = JamrahText
                    )
                    TextButton(onClick = { viewModel.onEvent(HabitsEvent.NextMonth) }) {
                        Text("›", style = MaterialTheme.typography.headlineMedium, color = JamrahTextMuted)
                    }
                }
            }

            HorizontalDivider()

            // Column headers (day numbers)
            Row(modifier = Modifier.fillMaxWidth().height(44.dp)) {
                Spacer(Modifier.width(140.dp))
                Row(
                    horizontalArrangement = Arrangement.spacedBy(4.dp),
                    modifier = Modifier.weight(1f).horizontalScroll(sharedScroll).padding(horizontal = 4.dp)
                ) {
                    val dayNames = arrayOf("S","M","T","W","T","F","S")
                    dayKeys.forEach { dk ->
                        val dayNum = dk.takeLast(2).trimStart('0')
                        val dayOfWeek = Calendar.getInstance().apply {
                            time = SimpleDateFormat("yyyy-MM-dd", Locale.US).parse(dk)!!
                        }.get(Calendar.DAY_OF_WEEK) - 1
                        val isToday = dk == todayStr
                        Column(
                            horizontalAlignment = Alignment.CenterHorizontally,
                            verticalArrangement = Arrangement.Center,
                            modifier = Modifier.size(36.dp)
                        ) {
                            Text(dayNum,
                                style = MaterialTheme.typography.bodyMedium,
                                color = if (isToday) Color(0xFF2563EB) else JamrahText)
                            Text(dayNames[dayOfWeek],
                                style = MaterialTheme.typography.bodyMedium,
                                color = JamrahTextMuted)
                        }
                    }
                }
                Spacer(Modifier.width(90.dp))
            }

            HorizontalDivider()

            // Habit rows
            if (state.habits.isEmpty()) {
                EmptyState(icon = "🔁", title = "No habits yet", subtitle = "Tap + to start tracking")
            } else {
                LazyColumn {
                    items(state.habits, key = { it.id }) { habit ->
                        val logsMap = state.logsMap[habit.id] ?: emptyMap()
                        HabitRow(
                            habit = habit,
                            dayKeys = dayKeys,
                            logsMap = logsMap,
                            todayKeyStr = todayStr,
                            scrollState = sharedScroll,
                            onToggle = { date, cur ->
                                viewModel.onEvent(HabitsEvent.ToggleLog(habit.id, date, cur))
                            },
                            onLongPress = { longPressHabit = habit }
                        )
                        HorizontalDivider(color = Color(0x0D2D2D2D))
                    }
                }
            }
        }
    }

    // Add sheet
    if (state.showAddSheet) {
        HabitFormSheet(
            sheetState = addSheetState,
            onDismiss = { viewModel.onEvent(HabitsEvent.HideAddSheet) },
            onSave = { name, color, durationType, start, end ->
                viewModel.onEvent(HabitsEvent.CreateHabit(name, color, durationType, start, end))
            }
        )
    }

    // Edit sheet (via long press)
    longPressHabit?.let { habit ->
        HabitOptionsSheet(
            habit = habit,
            onDismiss = { longPressHabit = null },
            onEdit = {
                longPressHabit = null
                viewModel.onEvent(HabitsEvent.EditHabit(habit))
            },
            onDelete = {
                longPressHabit = null
                viewModel.onEvent(HabitsEvent.DeleteHabit(habit.id))
            }
        )
    }

    state.editingHabit?.let { habit ->
        HabitFormSheet(
            existingHabit = habit,
            sheetState = editSheetState,
            onDismiss = { viewModel.onEvent(HabitsEvent.HideEditSheet) },
            onSave = { name, color, durationType, start, end ->
                viewModel.onEvent(HabitsEvent.UpdateHabit(
                    habit.copy(name = name, color = color, durationType = durationType,
                        durationStart = start, durationEnd = end)
                ))
            }
        )
    }
}
```

## 8.4 — HabitFormSheet

**Exact file path:** `android/app/src/main/java/com/jamrah/app/ui/habits/HabitFormSheet.kt`

```kotlin
package com.jamrah.app.ui.habits

import androidx.compose.foundation.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import com.jamrah.app.domain.model.HABIT_PRESET_COLORS
import com.jamrah.app.domain.model.Habit
import com.jamrah.app.ui.theme.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HabitFormSheet(
    existingHabit: Habit? = null,
    sheetState: SheetState,
    onDismiss: () -> Unit,
    onSave: (name: String, color: String, durationType: String, durationStart: String?, durationEnd: String?) -> Unit
) {
    var name          by remember(existingHabit?.id) { mutableStateOf(existingHabit?.name ?: "") }
    var color         by remember(existingHabit?.id) { mutableStateOf(existingHabit?.color ?: "#3b82f6") }
    var durationType  by remember(existingHabit?.id) { mutableStateOf(existingHabit?.durationType ?: "yearly") }
    var durationStart by remember(existingHabit?.id) { mutableStateOf(existingHabit?.durationStart ?: "") }
    var durationEnd   by remember(existingHabit?.id) { mutableStateOf(existingHabit?.durationEnd ?: "") }

    val durationOptions = listOf(
        "daily" to "Daily", "3months" to "3 Months", "4months" to "4 Months",
        "6months" to "6 Months", "yearly" to "Yearly", "custom" to "Custom"
    )

    ModalBottomSheet(onDismissRequest = onDismiss, sheetState = sheetState, containerColor = JamrahCard) {
        Column(
            modifier = Modifier.fillMaxWidth().padding(24.dp).verticalScroll(rememberScrollState()),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            Text(if (existingHabit == null) "New Habit" else "Edit Habit",
                style = MaterialTheme.typography.headlineMedium, color = JamrahText)

            OutlinedTextField(
                value = name, onValueChange = { name = it },
                label = { Text("Habit name") }, singleLine = true,
                modifier = Modifier.fillMaxWidth()
            )

            // Color picker
            Text("Color", style = MaterialTheme.typography.labelMedium, color = JamrahTextMuted)
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                HABIT_PRESET_COLORS.forEach { hex ->
                    val parsed = runCatching { Color(android.graphics.Color.parseColor(hex)) }.getOrDefault(Color.Blue)
                    Box(
                        modifier = Modifier
                            .size(28.dp)
                            .clip(CircleShape)
                            .background(parsed)
                            .then(if (color == hex) Modifier.border(3.dp, JamrahBorderStrong, CircleShape) else Modifier)
                            .clickable { color = hex }
                    )
                }
            }

            // Duration
            Text("Duration", style = MaterialTheme.typography.labelMedium, color = JamrahTextMuted)
            Row(horizontalArrangement = Arrangement.spacedBy(6.dp), modifier = Modifier.horizontalScroll(rememberScrollState())) {
                durationOptions.forEach { (value, label) ->
                    val isActive = durationType == value
                    Surface(
                        shape = RoundedCornerShape(8.dp),
                        color = if (isActive) JamrahBorderStrong else JamrahCard,
                        border = BorderStroke(1.dp, if (isActive) JamrahBorderStrong else JamrahBorder),
                        modifier = Modifier.clickable { durationType = value }
                    ) {
                        Text(label, style = MaterialTheme.typography.bodyMedium,
                            color = if (isActive) Color.White else JamrahTextMuted,
                            modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp))
                    }
                }
            }

            if (durationType == "custom") {
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedTextField(
                        value = durationStart, onValueChange = { durationStart = it },
                        label = { Text("Start (yyyy-MM-dd)") },
                        modifier = Modifier.weight(1f)
                    )
                    OutlinedTextField(
                        value = durationEnd, onValueChange = { durationEnd = it },
                        label = { Text("End (yyyy-MM-dd)") },
                        modifier = Modifier.weight(1f)
                    )
                }
            }

            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedButton(onClick = onDismiss, modifier = Modifier.weight(1f)) { Text("Cancel") }
                Button(
                    onClick = {
                        if (name.isNotBlank()) {
                            onSave(name.trim(), color, durationType,
                                durationStart.ifEmpty { null }, durationEnd.ifEmpty { null })
                        }
                    },
                    modifier = Modifier.weight(1f),
                    colors = ButtonDefaults.buttonColors(containerColor = JamrahBorderStrong)
                ) { Text("Save", color = Color.White) }
            }
            Spacer(Modifier.height(16.dp))
        }
    }
}
```

## 8.5 — HabitOptionsSheet (long press)

**Exact file path:** `android/app/src/main/java/com/jamrah/app/ui/habits/HabitOptionsSheet.kt`

```kotlin
package com.jamrah.app.ui.habits

import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Delete
import androidx.compose.material.icons.outlined.Edit
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import com.jamrah.app.domain.model.Habit
import com.jamrah.app.ui.theme.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HabitOptionsSheet(
    habit: Habit,
    onDismiss: () -> Unit,
    onEdit: () -> Unit,
    onDelete: () -> Unit
) {
    val sheetState = rememberModalBottomSheetState()
    ModalBottomSheet(onDismissRequest = onDismiss, sheetState = sheetState, containerColor = JamrahCard) {
        Column(modifier = Modifier.fillMaxWidth().padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Text(habit.name, style = MaterialTheme.typography.bodyLarge, color = JamrahText)
            HorizontalDivider()
            TextButton(onClick = onEdit, modifier = Modifier.fillMaxWidth()) {
                Icon(Icons.Outlined.Edit, contentDescription = "Edit", tint = JamrahText)
                Spacer(Modifier.width(8.dp))
                Text("Edit habit", color = JamrahText)
            }
            TextButton(onClick = onDelete, modifier = Modifier.fillMaxWidth()) {
                Icon(Icons.Outlined.Delete, contentDescription = "Delete", tint = Color(0xFFEF4444))
                Spacer(Modifier.width(8.dp))
                Text("Delete habit", color = Color(0xFFEF4444))
            }
            Spacer(Modifier.height(8.dp))
        }
    }
}
```

---

# ╔══════════════════════════════════════════════╗
# ║  TASK 9 — Update JamrahApp & SyncWorker    ║
# ╚══════════════════════════════════════════════╝

Update `JamrahApp.kt` tabs:
```kotlin
val tabs = listOf("Tasks", "Goals", "Timer", "Sessions", "Habits")
// case 4 -> HabitsScreen()
```

Update `SyncWorker.kt` to inject and call `habitRepository.sync()`.

---

# ╔══════════════════════════════════════════════╗
# ║  REVIEW CALL — END OF PHASE 3              ║
# ╚══════════════════════════════════════════════╝

Build: `cd android && ./gradlew assembleDebug`

### 20-Item Manual Testing Checklist

- [ ] Habits tab visible and accessible
- [ ] Month header shows current month + year
- [ ] Prev/Next month arrows change displayed month
- [ ] Cannot navigate past current month
- [ ] Day column headers show date numbers + day-of-week abbreviations
- [ ] Today's column highlighted in blue
- [ ] Tapping + opens Add Habit bottom sheet
- [ ] Name + color swatch + duration type work
- [ ] Save creates a habit row in the table
- [ ] Habit color dot shown in the row name cell
- [ ] Day cells appear for all days of the month
- [ ] Tapping an unchecked cell → cell fills with habit color + checkmark
- [ ] Tapping a checked cell → cell reverts to empty
- [ ] Future day cells are faded and not clickable
- [ ] Percentage column shows correct completion %
- [ ] Streak column shows 🔥 N for consecutive days
- [ ] Long press habit name → options sheet (Edit / Delete)
- [ ] Edit habit updates name/color/duration correctly
- [ ] Delete habit removes entire row + all its logs
- [ ] Data persists after app kill and relaunch

*End of PHASE_3.md*
