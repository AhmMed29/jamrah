# PHASE 1 — Goals Page
**Status:** ⏳ Pending Execution (after Phase 0 approved)
**Agents:** Architect · Data Engineer · UI Builder · Sync Engineer · Reviewer

---

## 🎯 Goal of Phase 1

By the end of this phase:
- The **Goals page** is fully functional and matches the PC app's card grid design
- Goals are stored in Room locally with offline-first sync
- Each goal card shows: name, color dot, status badge, progress bar, 28-day heatmap, date range, linked tasks list
- The user can add, edit, and delete goals and their linked tasks
- A temporary top TabRow (Tasks | Goals) lets the user switch between screens for testing
- Phase 5 will replace this with the real bottom navigation

---

# ╔══════════════════════════════════════════════╗
# ║  TASK 1 — Room Entities                     ║
# ╚══════════════════════════════════════════════╝

## 1.1 — GoalEntity

**Exact file path:** `android/app/src/main/java/com/jamrah/app/data/local/entity/GoalEntity.kt`

```kotlin
package com.jamrah.app.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

/**
 * Room entity for a Goal.
 * Table 'goals' mirrors the PC backend schema exactly.
 * Extra local columns: syncStatus, updatedAt, status (not in backend schema
 * but stored locally and synced on create/update).
 */
@Entity(tableName = "goals")
data class GoalEntity(
    @PrimaryKey
    val id: String,
    val name: String,
    val description: String = "",
    val color: String = "#3b82f6",
    val tagId: String? = null,
    val startDate: String = "",
    val endDate: String = "",
    val duration: Int = 0,
    val durationType: String? = null,    // "weeks"|"months"|"days"|"custom"
    val durationValue: Int? = null,
    val createdAt: String = "",
    val parentGoalId: String? = null,
    val status: String = "active",       // "active"|"done"|"cancelled"

    // Local sync metadata
    val updatedAt: Long = System.currentTimeMillis(),
    val syncStatus: String = "synced"    // "synced"|"pending_create"|"pending_update"|"pending_delete"
)
```

## 1.2 — GoalProgressEntity

**Exact file path:** `android/app/src/main/java/com/jamrah/app/data/local/entity/GoalProgressEntity.kt`

```kotlin
package com.jamrah.app.data.local.entity

import androidx.room.Entity
import androidx.room.ForeignKey
import androidx.room.Index

/**
 * Stores per-day progress entries for a goal.
 * Table 'goal_progress'. Composite primary key (goalId, date).
 */
@Entity(
    tableName = "goal_progress",
    primaryKeys = ["goalId", "date"],
    indices = [Index(value = ["goalId"])]
)
data class GoalProgressEntity(
    val goalId: String,
    val date: String,            // "yyyy-MM-dd"
    val progressValue: Double = 0.0,
    val focusMinutes: Double = 0.0
)
```

---

# ╔══════════════════════════════════════════════╗
# ║  TASK 2 — DAOs                              ║
# ╚══════════════════════════════════════════════╝

## 2.1 — GoalDao

**Exact file path:** `android/app/src/main/java/com/jamrah/app/data/local/dao/GoalDao.kt`

```kotlin
package com.jamrah.app.data.local.dao

import androidx.room.*
import com.jamrah.app.data.local.entity.GoalEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface GoalDao {

    @Query("SELECT * FROM goals WHERE syncStatus != 'pending_delete' ORDER BY createdAt ASC")
    fun observeAll(): Flow<List<GoalEntity>>

    @Query("SELECT * FROM goals WHERE syncStatus != 'pending_delete'")
    suspend fun getAll(): List<GoalEntity>

    @Query("SELECT * FROM goals WHERE id = :id LIMIT 1")
    suspend fun getById(id: String): GoalEntity?

    @Upsert
    suspend fun upsert(goal: GoalEntity)

    @Upsert
    suspend fun upsertAll(goals: List<GoalEntity>)

    @Query("UPDATE goals SET syncStatus = :status, updatedAt = :updatedAt WHERE id = :id")
    suspend fun updateSyncStatus(id: String, status: String, updatedAt: Long = System.currentTimeMillis())

    @Query("UPDATE goals SET syncStatus = 'pending_delete', updatedAt = :updatedAt WHERE id = :id")
    suspend fun markDeleted(id: String, updatedAt: Long = System.currentTimeMillis())

    @Query("DELETE FROM goals WHERE id = :id")
    suspend fun hardDelete(id: String)

    @Query("SELECT * FROM goals WHERE syncStatus != 'synced'")
    suspend fun getPending(): List<GoalEntity>
}
```

## 2.2 — GoalProgressDao

**Exact file path:** `android/app/src/main/java/com/jamrah/app/data/local/dao/GoalProgressDao.kt`

```kotlin
package com.jamrah.app.data.local.dao

import androidx.room.*
import com.jamrah.app.data.local.entity.GoalProgressEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface GoalProgressDao {

    @Query("SELECT * FROM goal_progress WHERE goalId = :goalId ORDER BY date ASC")
    fun observeForGoal(goalId: String): Flow<List<GoalProgressEntity>>

    @Query("SELECT * FROM goal_progress WHERE goalId = :goalId ORDER BY date ASC")
    suspend fun getForGoal(goalId: String): List<GoalProgressEntity>

    @Upsert
    suspend fun upsert(entry: GoalProgressEntity)

    @Upsert
    suspend fun upsertAll(entries: List<GoalProgressEntity>)

    @Query("DELETE FROM goal_progress WHERE goalId = :goalId")
    suspend fun deleteForGoal(goalId: String)
}
```

---

# ╔══════════════════════════════════════════════╗
# ║  TASK 3 — Database Migration (v1 → v2)      ║
# ╚══════════════════════════════════════════════╝

**Exact file path:** `android/app/src/main/java/com/jamrah/app/data/local/JamrahDatabase.kt` (REPLACE)

```kotlin
package com.jamrah.app.data.local

import androidx.room.Database
import androidx.room.RoomDatabase
import androidx.room.migration.Migration
import androidx.sqlite.db.SupportSQLiteDatabase
import com.jamrah.app.data.local.dao.GoalDao
import com.jamrah.app.data.local.dao.GoalProgressDao
import com.jamrah.app.data.local.dao.TaskDao
import com.jamrah.app.data.local.entity.GoalEntity
import com.jamrah.app.data.local.entity.GoalProgressEntity
import com.jamrah.app.data.local.entity.TaskEntity

@Database(
    entities = [
        TaskEntity::class,
        GoalEntity::class,
        GoalProgressEntity::class
    ],
    version = 2,
    exportSchema = true
)
abstract class JamrahDatabase : RoomDatabase() {
    abstract fun taskDao(): TaskDao
    abstract fun goalDao(): GoalDao
    abstract fun goalProgressDao(): GoalProgressDao
}

val MIGRATION_1_2 = object : Migration(1, 2) {
    override fun migrate(db: SupportSQLiteDatabase) {
        db.execSQL("""
            CREATE TABLE IF NOT EXISTS goals (
                id TEXT NOT NULL PRIMARY KEY,
                name TEXT NOT NULL,
                description TEXT NOT NULL DEFAULT '',
                color TEXT NOT NULL DEFAULT '#3b82f6',
                tagId TEXT,
                startDate TEXT NOT NULL DEFAULT '',
                endDate TEXT NOT NULL DEFAULT '',
                duration INTEGER NOT NULL DEFAULT 0,
                durationType TEXT,
                durationValue INTEGER,
                createdAt TEXT NOT NULL DEFAULT '',
                parentGoalId TEXT,
                status TEXT NOT NULL DEFAULT 'active',
                updatedAt INTEGER NOT NULL DEFAULT 0,
                syncStatus TEXT NOT NULL DEFAULT 'synced'
            )
        """.trimIndent())
        db.execSQL("""
            CREATE TABLE IF NOT EXISTS goal_progress (
                goalId TEXT NOT NULL,
                date TEXT NOT NULL,
                progressValue REAL NOT NULL DEFAULT 0.0,
                focusMinutes REAL NOT NULL DEFAULT 0.0,
                PRIMARY KEY (goalId, date)
            )
        """.trimIndent())
        db.execSQL("CREATE INDEX IF NOT EXISTS index_goal_progress_goalId ON goal_progress(goalId)")
    }
}
```

**Update `DatabaseModule.kt`** — add migration and new DAOs:

**Exact file path:** `android/app/src/main/java/com/jamrah/app/di/DatabaseModule.kt` (REPLACE)

```kotlin
package com.jamrah.app.di

import android.content.Context
import androidx.room.Room
import com.jamrah.app.data.local.JamrahDatabase
import com.jamrah.app.data.local.MIGRATION_1_2
import com.jamrah.app.data.local.dao.GoalDao
import com.jamrah.app.data.local.dao.GoalProgressDao
import com.jamrah.app.data.local.dao.TaskDao
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object DatabaseModule {

    @Provides
    @Singleton
    fun provideDatabase(@ApplicationContext context: Context): JamrahDatabase =
        Room.databaseBuilder(context, JamrahDatabase::class.java, "jamrah.db")
            .addMigrations(MIGRATION_1_2)
            .fallbackToDestructiveMigrationOnDowngrade()
            .build()

    @Provides @Singleton
    fun provideTaskDao(db: JamrahDatabase): TaskDao = db.taskDao()

    @Provides @Singleton
    fun provideGoalDao(db: JamrahDatabase): GoalDao = db.goalDao()

    @Provides @Singleton
    fun provideGoalProgressDao(db: JamrahDatabase): GoalProgressDao = db.goalProgressDao()
}
```

---

# ╔══════════════════════════════════════════════╗
# ║  TASK 4 — Retrofit DTOs                     ║
# ╚══════════════════════════════════════════════╝

**Exact file path:** `android/app/src/main/java/com/jamrah/app/data/remote/dto/GoalDto.kt`

```kotlin
package com.jamrah.app.data.remote.dto

import com.google.gson.annotations.SerializedName

data class GoalDto(
    @SerializedName("id")            val id: String,
    @SerializedName("name")          val name: String,
    @SerializedName("description")   val description: String?,
    @SerializedName("color")         val color: String?,
    @SerializedName("tagId")         val tagId: String?,
    @SerializedName("startDate")     val startDate: String?,
    @SerializedName("endDate")       val endDate: String?,
    @SerializedName("duration")      val duration: Int?,
    @SerializedName("durationType")  val durationType: String?,
    @SerializedName("durationValue") val durationValue: Int?,
    @SerializedName("createdAt")     val createdAt: String?,
    @SerializedName("parentGoalId")  val parentGoalId: String?
)

data class CreateGoalDto(
    @SerializedName("id")            val id: String,
    @SerializedName("name")          val name: String,
    @SerializedName("description")   val description: String = "",
    @SerializedName("color")         val color: String = "#3b82f6",
    @SerializedName("startDate")     val startDate: String = "",
    @SerializedName("endDate")       val endDate: String = "",
    @SerializedName("duration")      val duration: Int = 0,
    @SerializedName("durationType")  val durationType: String? = null,
    @SerializedName("durationValue") val durationValue: Int? = null,
    @SerializedName("parentGoalId")  val parentGoalId: String? = null
)

data class UpdateGoalDto(
    @SerializedName("name")          val name: String,
    @SerializedName("description")   val description: String = "",
    @SerializedName("color")         val color: String = "#3b82f6",
    @SerializedName("tagId")         val tagId: String? = null,
    @SerializedName("startDate")     val startDate: String = "",
    @SerializedName("endDate")       val endDate: String = "",
    @SerializedName("duration")      val duration: Int = 0,
    @SerializedName("durationType")  val durationType: String? = null,
    @SerializedName("durationValue") val durationValue: Int? = null,
    @SerializedName("parentGoalId")  val parentGoalId: String? = null
)

data class GoalProgressDto(
    @SerializedName("goalId")        val goalId: String,
    @SerializedName("date")          val date: String,
    @SerializedName("progressValue") val progressValue: Double,
    @SerializedName("focusMinutes")  val focusMinutes: Double
)

data class SaveGoalProgressDto(
    @SerializedName("goalId")        val goalId: String,
    @SerializedName("date")          val date: String,
    @SerializedName("progressValue") val progressValue: Double = 0.0,
    @SerializedName("focusMinutes")  val focusMinutes: Double = 0.0
)
```

---

# ╔══════════════════════════════════════════════╗
# ║  TASK 5 — Retrofit API Interface            ║
# ╚══════════════════════════════════════════════╝

**Exact file path:** `android/app/src/main/java/com/jamrah/app/data/remote/api/GoalsApi.kt`

```kotlin
package com.jamrah.app.data.remote.api

import com.jamrah.app.data.remote.dto.*
import retrofit2.Response
import retrofit2.http.*

interface GoalsApi {

    @GET("api/goals")
    suspend fun getAll(): Response<List<GoalDto>>

    @GET("api/goals/{id}")
    suspend fun getById(@Path("id") id: String): Response<GoalDto>

    @POST("api/goals")
    suspend fun create(@Body dto: CreateGoalDto): Response<Boolean>

    @PUT("api/goals/{id}")
    suspend fun update(@Path("id") id: String, @Body dto: UpdateGoalDto): Response<Boolean>

    @DELETE("api/goals/{id}")
    suspend fun delete(@Path("id") id: String): Response<Boolean>

    @GET("api/goals/{goalId}/progress")
    suspend fun getProgress(@Path("goalId") goalId: String): Response<List<GoalProgressDto>>

    @POST("api/goals/progress")
    suspend fun saveProgress(@Body dto: SaveGoalProgressDto): Response<Boolean>
}
```

**Update `NetworkModule.kt`** — add GoalsApi provider at the bottom of the object:

```kotlin
@Provides
@Singleton
fun provideGoalsApi(retrofit: Retrofit): GoalsApi =
    retrofit.create(GoalsApi::class.java)
```

---

# ╔══════════════════════════════════════════════╗
# ║  TASK 6 — Domain Model                      ║
# ╚══════════════════════════════════════════════╝

## 6.1 — Goal.kt

**Exact file path:** `android/app/src/main/java/com/jamrah/app/domain/model/Goal.kt`

```kotlin
package com.jamrah.app.domain.model

data class Goal(
    val id: String,
    val name: String,
    val description: String = "",
    val color: String = "#3b82f6",
    val tagId: String? = null,
    val startDate: String = "",
    val endDate: String = "",
    val duration: Int = 0,
    val durationType: String? = null,
    val durationValue: Int? = null,
    val createdAt: String = "",
    val parentGoalId: String? = null,
    val status: String = "active"      // "active"|"done"|"cancelled"
)
```

## 6.2 — GoalUtils.kt

**Exact file path:** `android/app/src/main/java/com/jamrah/app/domain/model/GoalUtils.kt`

```kotlin
package com.jamrah.app.domain.model

import java.text.SimpleDateFormat
import java.util.*

private val goalDateFmt = SimpleDateFormat("yyyy-MM-dd", Locale.US)
private val goalDisplayFmt = SimpleDateFormat("MMM d, yyyy", Locale.US)

fun newGoalId(): String {
    val rand = (Math.random() * 1e10).toLong().toString(36).take(6)
    return "goal_${System.currentTimeMillis()}_$rand"
}

fun formatGoalDate(dateStr: String?): String {
    if (dateStr.isNullOrEmpty()) return "-"
    return try {
        val d = goalDateFmt.parse(dateStr) ?: return dateStr
        goalDisplayFmt.format(d)
    } catch (e: Exception) { dateStr }
}

fun formatDuration(goal: Goal): String {
    val type = goal.durationType ?: "months"
    val v = goal.durationValue ?: 1
    return when (type) {
        "days"    -> "$v ${if (v == 1) "day" else "days"}"
        "weeks"   -> "$v ${if (v == 1) "week" else "weeks"}"
        "months"  -> "$v ${if (v == 1) "month" else "months"}"
        "custom"  -> "$v ${if (v == 1) "day" else "days"}"
        else      -> "-"
    }
}

fun computeDurationDays(type: String?, value: Int): Int = when (type) {
    "days"   -> value
    "weeks"  -> value * 7
    "months" -> value * 30
    "custom" -> value
    else     -> 30
}

/**
 * Compute goal progress (0.0..1.0) from linked tasks and sub-goals.
 * Mirrors the PC app's computeGoalProgress().
 */
fun computeGoalProgress(
    goalId: String,
    tasks: List<TaskItem>,
    allGoals: List<Goal>,
    cache: MutableMap<String, Double> = mutableMapOf()
): Double {
    cache[goalId]?.let { return it }

    val myTasks = tasks.filter { it.goalId == goalId && it.parentTaskId == null }
    val taskRatio = if (myTasks.isNotEmpty())
        myTasks.count { it.completed == 1 }.toDouble() / myTasks.size
    else -1.0

    val children = allGoals.filter { it.parentGoalId == goalId }
    val childRatios = children.map { computeGoalProgress(it.id, tasks, allGoals, cache) }
    val childAvg = if (childRatios.isNotEmpty()) childRatios.average() else -1.0

    val result = when {
        taskRatio >= 0 && childAvg >= 0 -> (taskRatio + childAvg) / 2
        taskRatio >= 0 -> taskRatio
        childAvg >= 0  -> childAvg
        else           -> 0.0
    }
    cache[goalId] = result
    return result
}

data class StatusStyle(val bgColor: Long, val textColor: Long, val label: String)
val STATUS_STYLES = mapOf(
    "active"    to StatusStyle(0xFFEFF6FF, 0xFF3B82F6, "Active"),
    "done"      to StatusStyle(0xFFECFDF5, 0xFF10B981, "Done"),
    "cancelled" to StatusStyle(0xFFFEF2F2, 0xFFEF4444, "Cancelled")
)
fun getStatusStyle(status: String) = STATUS_STYLES[status] ?: STATUS_STYLES["active"]!!

/** Generate last 28 day keys (today first, 27 days back) */
fun last28DayKeys(): List<String> {
    val fmt = SimpleDateFormat("yyyy-MM-dd", Locale.US)
    val today = Calendar.getInstance()
    return (0..27).map { i ->
        val d = Calendar.getInstance().apply { time = today.time; add(Calendar.DAY_OF_YEAR, -i) }
        fmt.format(d.time)
    }.reversed()   // oldest first
}
```

---

# ╔══════════════════════════════════════════════╗
# ║  TASK 7 — Mapper                            ║
# ╚══════════════════════════════════════════════╝

**Exact file path:** `android/app/src/main/java/com/jamrah/app/data/mapper/GoalMapper.kt`

```kotlin
package com.jamrah.app.data.mapper

import com.jamrah.app.data.local.entity.GoalEntity
import com.jamrah.app.data.local.entity.GoalProgressEntity
import com.jamrah.app.data.remote.dto.*
import com.jamrah.app.domain.model.Goal

fun GoalEntity.toDomain(): Goal = Goal(
    id = id, name = name, description = description, color = color,
    tagId = tagId, startDate = startDate, endDate = endDate,
    duration = duration, durationType = durationType, durationValue = durationValue,
    createdAt = createdAt, parentGoalId = parentGoalId, status = status
)

fun Goal.toEntity(syncStatus: String = "synced"): GoalEntity = GoalEntity(
    id = id, name = name, description = description, color = color,
    tagId = tagId, startDate = startDate, endDate = endDate,
    duration = duration, durationType = durationType, durationValue = durationValue,
    createdAt = createdAt, parentGoalId = parentGoalId, status = status,
    syncStatus = syncStatus
)

fun GoalDto.toEntity(): GoalEntity = GoalEntity(
    id = id, name = name, description = description ?: "", color = color ?: "#3b82f6",
    tagId = tagId, startDate = startDate ?: "", endDate = endDate ?: "",
    duration = duration ?: 0, durationType = durationType, durationValue = durationValue,
    createdAt = createdAt ?: "", parentGoalId = parentGoalId, status = "active",
    syncStatus = "synced"
)

fun Goal.toCreateDto(): CreateGoalDto = CreateGoalDto(
    id = id, name = name, description = description, color = color,
    startDate = startDate, endDate = endDate, duration = duration,
    durationType = durationType, durationValue = durationValue,
    parentGoalId = parentGoalId
)

fun Goal.toUpdateDto(): UpdateGoalDto = UpdateGoalDto(
    name = name, description = description, color = color, tagId = tagId,
    startDate = startDate, endDate = endDate, duration = duration,
    durationType = durationType, durationValue = durationValue,
    parentGoalId = parentGoalId
)

fun GoalProgressDto.toEntity(): GoalProgressEntity =
    GoalProgressEntity(goalId = goalId, date = date,
        progressValue = progressValue, focusMinutes = focusMinutes)
```

---

# ╔══════════════════════════════════════════════╗
# ║  TASK 8 — Repository                        ║
# ╚══════════════════════════════════════════════╝

## 8.1 — Interface

**Exact file path:** `android/app/src/main/java/com/jamrah/app/data/repository/GoalRepository.kt`

```kotlin
package com.jamrah.app.data.repository

import com.jamrah.app.domain.model.Goal
import kotlinx.coroutines.flow.Flow

interface GoalRepository {
    fun observeAll(): Flow<List<Goal>>
    suspend fun createGoal(goal: Goal)
    suspend fun updateGoal(goal: Goal)
    suspend fun deleteGoal(id: String)
    suspend fun getById(id: String): Goal?
    suspend fun sync(): Result<Unit>
}
```

## 8.2 — Implementation

**Exact file path:** `android/app/src/main/java/com/jamrah/app/data/repository/GoalRepositoryImpl.kt`

```kotlin
package com.jamrah.app.data.repository

import com.jamrah.app.data.local.dao.GoalDao
import com.jamrah.app.data.local.dao.GoalProgressDao
import com.jamrah.app.data.mapper.*
import com.jamrah.app.data.remote.api.GoalsApi
import com.jamrah.app.domain.model.Goal
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import java.text.SimpleDateFormat
import java.util.*
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class GoalRepositoryImpl @Inject constructor(
    private val dao: GoalDao,
    private val progressDao: GoalProgressDao,
    private val api: GoalsApi
) : GoalRepository {

    override fun observeAll(): Flow<List<Goal>> =
        dao.observeAll().map { list -> list.map { it.toDomain() } }

    override suspend fun createGoal(goal: Goal) {
        dao.upsert(goal.toEntity(syncStatus = "pending_create"))
        runCatching {
            val resp = api.create(goal.toCreateDto())
            if (resp.isSuccessful) dao.updateSyncStatus(goal.id, "synced")
        }
    }

    override suspend fun updateGoal(goal: Goal) {
        dao.upsert(goal.toEntity(syncStatus = "pending_update"))
        runCatching {
            val resp = api.update(goal.id, goal.toUpdateDto())
            if (resp.isSuccessful) dao.updateSyncStatus(goal.id, "synced")
        }
    }

    override suspend fun deleteGoal(id: String) {
        dao.markDeleted(id)
        runCatching {
            val resp = api.delete(id)
            if (resp.isSuccessful) dao.hardDelete(id)
        }
    }

    override suspend fun getById(id: String): Goal? = dao.getById(id)?.toDomain()

    override suspend fun sync(): Result<Unit> = runCatching {
        // 1. Push pending
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
        // 2. Pull server goals
        val serverResp = api.getAll()
        if (serverResp.isSuccessful) {
            val pendingIds = dao.getPending().map { it.id }.toSet()
            serverResp.body()?.filter { it.id !in pendingIds }
                ?.forEach { dto -> dao.upsert(dto.toEntity()) }
        }
        // 3. Pull progress for all goals
        dao.getAll().forEach { entity ->
            runCatching {
                val pResp = api.getProgress(entity.id)
                if (pResp.isSuccessful) {
                    pResp.body()?.forEach { dto -> progressDao.upsert(dto.toEntity()) }
                }
            }
        }
    }
}
```

## 8.3 — Update RepositoryModule

Add to `android/app/src/main/java/com/jamrah/app/di/RepositoryModule.kt`:

```kotlin
@Binds @Singleton
abstract fun bindGoalRepository(impl: GoalRepositoryImpl): GoalRepository
```

---

# ╔══════════════════════════════════════════════╗
# ║  TASK 9 — ViewModel                         ║
# ╚══════════════════════════════════════════════╝

## 9.1 — State

**Exact file path:** `android/app/src/main/java/com/jamrah/app/ui/goals/GoalsState.kt`

```kotlin
package com.jamrah.app.ui.goals

import com.jamrah.app.domain.model.Goal
import com.jamrah.app.domain.model.TaskItem

data class GoalsUiState(
    val goals: List<Goal>       = emptyList(),
    val tasks: List<TaskItem>   = emptyList(),
    val progressMap: Map<String, Int> = emptyMap(),   // goalId -> 0..100
    val isLoading: Boolean      = false,
    val isSyncing: Boolean      = false,
    val syncError: String?      = null,
    val showAddSheet: Boolean   = false,
    val editingGoal: Goal?      = null
)

sealed class GoalsEvent {
    object ShowAddSheet                   : GoalsEvent()
    object HideAddSheet                   : GoalsEvent()
    data class EditGoal(val goal: Goal)   : GoalsEvent()
    object HideEditSheet                  : GoalsEvent()
    data class CreateGoal(
        val name: String, val color: String,
        val durationType: String, val durationValue: Int?,
        val startDate: String, val endDate: String
    )                                     : GoalsEvent()
    data class UpdateGoal(val goal: Goal) : GoalsEvent()
    data class DeleteGoal(val id: String) : GoalsEvent()
    data class ToggleTask(val taskId: String) : GoalsEvent()
    data class DeleteTask(val taskId: String) : GoalsEvent()
    data class AddTaskToGoal(val goalId: String, val name: String) : GoalsEvent()
    object Sync                           : GoalsEvent()
}
```

## 9.2 — ViewModel

**Exact file path:** `android/app/src/main/java/com/jamrah/app/ui/goals/GoalsViewModel.kt`

```kotlin
package com.jamrah.app.ui.goals

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.jamrah.app.data.repository.GoalRepository
import com.jamrah.app.data.repository.TaskRepository
import com.jamrah.app.domain.model.*
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.*
import javax.inject.Inject

@HiltViewModel
class GoalsViewModel @Inject constructor(
    private val goalRepo: GoalRepository,
    private val taskRepo: TaskRepository
) : ViewModel() {

    private val _state = MutableStateFlow(GoalsUiState())
    val state: StateFlow<GoalsUiState> = _state.asStateFlow()

    private val nowFmt = SimpleDateFormat("yyyy-MM-dd HH:mm:ss", Locale.US)
    private val dateFmt = SimpleDateFormat("yyyy-MM-dd", Locale.US)

    init {
        viewModelScope.launch {
            combine(goalRepo.observeAll(), taskRepo.observeAll()) { goals, tasks ->
                val cache = mutableMapOf<String, Double>()
                val progressMap = goals.associate { g ->
                    g.id to (computeGoalProgress(g.id, tasks, goals, cache) * 100).toInt()
                }
                GoalsUiState(goals = goals, tasks = tasks, progressMap = progressMap)
            }.collect { newState ->
                _state.update { it.copy(
                    goals = newState.goals,
                    tasks = newState.tasks,
                    progressMap = newState.progressMap
                )}
            }
        }
    }

    fun onEvent(event: GoalsEvent) {
        when (event) {
            GoalsEvent.ShowAddSheet  -> _state.update { it.copy(showAddSheet = true) }
            GoalsEvent.HideAddSheet  -> _state.update { it.copy(showAddSheet = false) }
            is GoalsEvent.EditGoal   -> _state.update { it.copy(editingGoal = event.goal) }
            GoalsEvent.HideEditSheet -> _state.update { it.copy(editingGoal = null) }

            is GoalsEvent.CreateGoal -> viewModelScope.launch {
                val days = computeDurationDays(event.durationType, event.durationValue ?: 1)
                val end = if (event.endDate.isNotEmpty()) event.endDate else {
                    val cal = Calendar.getInstance()
                    if (event.startDate.isNotEmpty()) {
                        try { cal.time = dateFmt.parse(event.startDate)!! } catch (e: Exception) {}
                    }
                    cal.add(Calendar.DAY_OF_YEAR, days)
                    dateFmt.format(cal.time)
                }
                val goal = Goal(
                    id = newGoalId(), name = event.name, color = event.color,
                    startDate = event.startDate, endDate = end, duration = days,
                    durationType = event.durationType, durationValue = event.durationValue,
                    createdAt = nowFmt.format(Date())
                )
                goalRepo.createGoal(goal)
                _state.update { it.copy(showAddSheet = false) }
            }

            is GoalsEvent.UpdateGoal -> viewModelScope.launch {
                goalRepo.updateGoal(event.goal)
                _state.update { it.copy(editingGoal = null) }
            }

            is GoalsEvent.DeleteGoal -> viewModelScope.launch {
                goalRepo.deleteGoal(event.id)
                if (_state.value.editingGoal?.id == event.id)
                    _state.update { it.copy(editingGoal = null) }
            }

            is GoalsEvent.ToggleTask -> viewModelScope.launch { taskRepo.toggleTask(event.taskId) }
            is GoalsEvent.DeleteTask -> viewModelScope.launch { taskRepo.deleteTask(event.taskId) }

            is GoalsEvent.AddTaskToGoal -> viewModelScope.launch {
                if (event.name.isBlank()) return@launch
                val task = TaskItem(
                    id = newTaskId(), name = event.name, goalId = event.goalId,
                    createdAt = nowFmt.format(Date())
                )
                taskRepo.createTask(task)
            }

            GoalsEvent.Sync -> viewModelScope.launch {
                _state.update { it.copy(isSyncing = true, syncError = null) }
                val result = goalRepo.sync()
                _state.update { it.copy(
                    isSyncing = false,
                    syncError = result.exceptionOrNull()?.message
                )}
            }
        }
    }
}
```

---

# ╔══════════════════════════════════════════════╗
# ║  TASK 10 — Compose UI                       ║
# ╚══════════════════════════════════════════════╝

## 10.1 — GoalHeatmap

**Exact file path:** `android/app/src/main/java/com/jamrah/app/ui/goals/GoalHeatmap.kt`

```kotlin
package com.jamrah.app.ui.goals

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import com.jamrah.app.domain.model.GoalProgressEntity
import com.jamrah.app.domain.model.last28DayKeys

/**
 * GitHub-style 4x7 grid of 6dp dots representing last 28 days.
 * Colored = goal color, empty = #ebedf0.
 */
@Composable
fun GoalHeatmap(
    goalColor: String,
    progressDates: Set<String>,   // dates that have a progress entry
    modifier: Modifier = Modifier
) {
    val days = last28DayKeys()    // 28 keys, oldest first
    val color = runCatching {
        Color(android.graphics.Color.parseColor(goalColor))
    }.getOrDefault(Color(0xFF3B82F6))
    val emptyColor = Color(0xFFEBEDF0)

    // 4 columns × 7 rows
    Row(modifier = modifier, horizontalArrangement = Arrangement.spacedBy(2.dp)) {
        for (col in 0..3) {
            Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
                for (row in 0..6) {
                    val idx = col * 7 + row
                    val dayKey = days.getOrNull(idx)
                    val hasEntry = dayKey != null && progressDates.contains(dayKey)
                    Box(
                        modifier = Modifier
                            .size(6.dp)
                            .background(
                                color = if (hasEntry) color else emptyColor,
                                shape = RoundedCornerShape(1.dp)
                            )
                    )
                }
            }
        }
    }
}
```

## 10.2 — GoalCard

**Exact file path:** `android/app/src/main/java/com/jamrah/app/ui/goals/GoalCard.kt`

```kotlin
package com.jamrah.app.ui.goals

import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.jamrah.app.domain.model.*
import com.jamrah.app.ui.components.TaskCheckbox
import com.jamrah.app.ui.theme.*

@Composable
fun GoalCard(
    goal: Goal,
    progress: Int,
    tasks: List<TaskItem>,
    progressDates: Set<String>,
    onEdit: () -> Unit,
    onDelete: () -> Unit,
    onToggleTask: (String) -> Unit,
    onDeleteTask: (String) -> Unit,
    onAddTask: (String) -> Unit,
    modifier: Modifier = Modifier
) {
    val goalColor = runCatching {
        Color(android.graphics.Color.parseColor(goal.color))
    }.getOrDefault(Color(0xFF3B82F6))
    val statusStyle = getStatusStyle(goal.status)
    val animatedProgress by animateFloatAsState(
        targetValue = progress / 100f,
        animationSpec = tween(600),
        label = "goal_progress"
    )
    var newTaskName by remember { mutableStateOf("") }

    Card(
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = JamrahCard),
        border = BorderStroke(1.dp, Color(0xFFF3F4F6)),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
        modifier = modifier.fillMaxWidth()
    ) {
        Column(modifier = Modifier.padding(20.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {

            // ── Header: color dot + name + edit/delete ──
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween,
                modifier = Modifier.fillMaxWidth()
            ) {
                Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.weight(1f)) {
                    Box(modifier = Modifier.size(12.dp).clip(CircleShape).background(goalColor))
                    Spacer(Modifier.width(8.dp))
                    Text(
                        text = goal.name,
                        style = MaterialTheme.typography.bodyLarge,
                        color = JamrahText,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                }
                Row {
                    IconButton(onClick = onEdit, modifier = Modifier.size(32.dp)) {
                        Icon(Icons.Outlined.Edit, contentDescription = "Edit goal",
                            tint = JamrahTextMuted, modifier = Modifier.size(16.dp))
                    }
                    IconButton(onClick = onDelete, modifier = Modifier.size(32.dp)) {
                        Icon(Icons.Outlined.Close, contentDescription = "Delete goal",
                            tint = Color(0xFFEF4444), modifier = Modifier.size(16.dp))
                    }
                }
            }

            // ── Progress section ──
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Row(
                    horizontalArrangement = Arrangement.SpaceBetween,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    // Status badge
                    Surface(
                        shape = RoundedCornerShape(12.dp),
                        color = Color(statusStyle.bgColor)
                    ) {
                        Text(
                            text = statusStyle.label,
                            style = MaterialTheme.typography.bodyMedium,
                            color = Color(statusStyle.textColor),
                            modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp)
                        )
                    }
                    Text(
                        text = "$progress%",
                        style = MaterialTheme.typography.bodyMedium,
                        color = JamrahTextMuted
                    )
                }
                // Progress bar
                LinearProgressIndicator(
                    progress = { animatedProgress },
                    modifier = Modifier.fillMaxWidth().height(8.dp).clip(RoundedCornerShape(4.dp)),
                    color = goalColor,
                    trackColor = Color(0xFFF3F4F6)
                )
                // Heatmap
                GoalHeatmap(goalColor = goal.color, progressDates = progressDates)
            }

            // ── Meta: dates + duration ──
            Row(
                horizontalArrangement = Arrangement.SpaceBetween,
                modifier = Modifier.fillMaxWidth()
            ) {
                Text(
                    text = "${formatGoalDate(goal.startDate)} → ${formatGoalDate(goal.endDate)}",
                    style = MaterialTheme.typography.bodyMedium,
                    color = JamrahTextMuted
                )
                Text(
                    text = formatDuration(goal),
                    style = MaterialTheme.typography.bodyMedium,
                    color = JamrahTextMuted
                )
            }

            // ── Tasks section ──
            HorizontalDivider(color = Color(0xFFF3F4F6))
            Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                Row(
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text("Tasks", style = MaterialTheme.typography.bodyMedium, color = JamrahText)
                    TextButton(
                        onClick = { if (newTaskName.isBlank()) {} },
                        contentPadding = PaddingValues(horizontal = 8.dp, vertical = 2.dp)
                    ) {
                        Icon(Icons.Outlined.Add, contentDescription = "Add task",
                            modifier = Modifier.size(16.dp), tint = Color(0xFF3B82F6))
                        Spacer(Modifier.width(4.dp))
                        Text("Add", color = Color(0xFF3B82F6), style = MaterialTheme.typography.bodyMedium)
                    }
                }

                if (tasks.isEmpty()) {
                    Text("No tasks yet", style = MaterialTheme.typography.bodyMedium, color = JamrahTextMuted)
                } else {
                    tasks.take(5).forEach { task ->
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            TaskCheckbox(
                                checked = task.completed == 1,
                                onToggle = { onToggleTask(task.id) },
                                size = 16.dp
                            )
                            Spacer(Modifier.width(8.dp))
                            Text(
                                text = task.name,
                                style = MaterialTheme.typography.bodyMedium,
                                color = if (task.completed == 1) JamrahTextMuted else JamrahText,
                                textDecoration = if (task.completed == 1) TextDecoration.LineThrough else null,
                                modifier = Modifier.weight(1f),
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis
                            )
                            IconButton(onClick = { onDeleteTask(task.id) }, modifier = Modifier.size(28.dp)) {
                                Icon(Icons.Outlined.Close, contentDescription = "Delete task",
                                    tint = JamrahTextMuted, modifier = Modifier.size(14.dp))
                            }
                        }
                    }
                }

                // Add task input
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedTextField(
                        value = newTaskName,
                        onValueChange = { newTaskName = it },
                        placeholder = { Text("New task...", style = MaterialTheme.typography.bodyMedium) },
                        singleLine = true,
                        textStyle = MaterialTheme.typography.bodyMedium,
                        modifier = Modifier.weight(1f)
                    )
                    IconButton(
                        onClick = {
                            if (newTaskName.isNotBlank()) {
                                onAddTask(newTaskName.trim())
                                newTaskName = ""
                            }
                        }
                    ) {
                        Icon(Icons.Outlined.Add, contentDescription = "Add",
                            tint = Color(0xFF3B82F6))
                    }
                }
            }
        }
    }
}
```

## 10.3 — GoalFormSheet

**Exact file path:** `android/app/src/main/java/com/jamrah/app/ui/goals/GoalFormSheet.kt`

```kotlin
package com.jamrah.app.ui.goals

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import com.jamrah.app.domain.model.Goal
import com.jamrah.app.domain.model.computeDurationDays
import com.jamrah.app.ui.theme.*

private val GOAL_COLORS = listOf(
    "#3b82f6", "#ef4444", "#10b981", "#f59e0b",
    "#8b5cf6", "#ec4899", "#14b8a6", "#f97316",
    "#6366f1", "#84cc16"
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun GoalFormSheet(
    existingGoal: Goal? = null,
    sheetState: SheetState,
    onDismiss: () -> Unit,
    onSave: (name: String, color: String, durationType: String, durationValue: Int?, startDate: String, endDate: String) -> Unit
) {
    var name           by remember(existingGoal?.id) { mutableStateOf(existingGoal?.name ?: "") }
    var color          by remember(existingGoal?.id) { mutableStateOf(existingGoal?.color ?: "#3b82f6") }
    var durationType   by remember(existingGoal?.id) { mutableStateOf(existingGoal?.durationType ?: "months") }
    var durationValue  by remember(existingGoal?.id) { mutableStateOf(existingGoal?.durationValue?.toString() ?: "1") }
    var startDate      by remember(existingGoal?.id) { mutableStateOf(existingGoal?.startDate ?: "") }
    var endDate        by remember(existingGoal?.id) { mutableStateOf(existingGoal?.endDate ?: "") }

    val durationOptions = listOf("days" to "Days", "weeks" to "Weeks", "months" to "Months", "custom" to "Custom")

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = sheetState,
        containerColor = JamrahCard
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(24.dp)
                .verticalScroll(rememberScrollState()),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            Text(
                text = if (existingGoal == null) "New Goal" else "Edit Goal",
                style = MaterialTheme.typography.headlineMedium,
                color = JamrahText
            )

            // Name
            OutlinedTextField(
                value = name, onValueChange = { name = it },
                label = { Text("Goal name") },
                singleLine = true,
                modifier = Modifier.fillMaxWidth()
            )

            // Color picker
            Text("Color", style = MaterialTheme.typography.labelMedium, color = JamrahTextMuted)
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                GOAL_COLORS.forEach { hex ->
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

            // Duration type
            Text("Duration", style = MaterialTheme.typography.labelMedium, color = JamrahTextMuted)
            Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                durationOptions.forEach { (value, label) ->
                    val isActive = durationType == value
                    Surface(
                        shape = RoundedCornerShape(8.dp),
                        color = if (isActive) JamrahBorderStrong else JamrahCard,
                        border = BorderStroke(1.dp, if (isActive) JamrahBorderStrong else JamrahBorder),
                        modifier = Modifier.clickable { durationType = value }
                    ) {
                        Text(label,
                            style = MaterialTheme.typography.bodyMedium,
                            color = if (isActive) Color.White else JamrahTextMuted,
                            modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp)
                        )
                    }
                }
            }
            if (durationType == "custom") {
                OutlinedTextField(
                    value = durationValue, onValueChange = { durationValue = it },
                    label = { Text("Days count") },
                    singleLine = true, modifier = Modifier.fillMaxWidth()
                )
            }

            // Dates
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedTextField(
                    value = startDate, onValueChange = { startDate = it },
                    label = { Text("Start (yyyy-MM-dd)") },
                    singleLine = true, modifier = Modifier.weight(1f)
                )
                OutlinedTextField(
                    value = endDate, onValueChange = { endDate = it },
                    label = { Text("End (yyyy-MM-dd)") },
                    singleLine = true, modifier = Modifier.weight(1f)
                )
            }

            // Actions
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.padding(top = 8.dp)) {
                OutlinedButton(onClick = onDismiss, modifier = Modifier.weight(1f)) {
                    Text("Cancel")
                }
                Button(
                    onClick = {
                        if (name.isNotBlank()) {
                            val dv = durationValue.toIntOrNull()
                            onSave(name.trim(), color, durationType, dv, startDate, endDate)
                        }
                    },
                    modifier = Modifier.weight(1f),
                    colors = ButtonDefaults.buttonColors(containerColor = JamrahBorderStrong)
                ) {
                    Text("Save Goal", color = Color.White)
                }
            }
            Spacer(Modifier.height(16.dp))
        }
    }
}
```

## 10.4 — GoalsScreen

**Exact file path:** `android/app/src/main/java/com/jamrah/app/ui/goals/GoalsScreen.kt`

```kotlin
package com.jamrah.app.ui.goals

import androidx.compose.foundation.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.jamrah.app.ui.components.EmptyState
import com.jamrah.app.ui.theme.JamrahBackground
import com.jamrah.app.ui.theme.JamrahBorderStrong
import com.jamrah.app.ui.theme.JamrahText

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun GoalsScreen(viewModel: GoalsViewModel = hiltViewModel()) {
    val state by viewModel.state.collectAsState()
    val addSheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    val editSheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)

    // Group progress dates per goal (last 28 day keys that have entries)
    // In a full impl, this comes from GoalProgressEntity; for now derive from progressMap > 0
    val topLevelGoals = state.goals.filter { it.parentGoalId == null }

    Scaffold(
        containerColor = JamrahBackground,
        topBar = {
            Column {
                Row(
                    modifier = Modifier.fillMaxWidth().padding(horizontal = 24.dp, vertical = 16.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text("Goals", style = MaterialTheme.typography.headlineLarge, color = JamrahText)
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        if (state.isSyncing) {
                            CircularProgressIndicator(modifier = Modifier.size(16.dp), strokeWidth = 2.dp)
                            Spacer(Modifier.width(8.dp))
                        }
                        IconButton(onClick = { viewModel.onEvent(GoalsEvent.ShowAddSheet) }) {
                            Icon(Icons.Default.Add, contentDescription = "Add goal",
                                tint = JamrahBorderStrong)
                        }
                    }
                }
                HorizontalDivider()
            }
        },
        floatingActionButton = {
            FloatingActionButton(
                onClick = { viewModel.onEvent(GoalsEvent.ShowAddSheet) },
                containerColor = JamrahBorderStrong
            ) {
                Icon(Icons.Default.Add, contentDescription = "Add goal",
                    tint = androidx.compose.ui.graphics.Color.White)
            }
        }
    ) { padding ->
        if (topLevelGoals.isEmpty()) {
            EmptyState(
                icon = "🎯",
                title = "No goals yet",
                subtitle = "Tap + to create your first goal",
                modifier = Modifier.padding(padding)
            )
        } else {
            LazyColumn(
                contentPadding = PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp),
                modifier = Modifier.padding(padding)
            ) {
                items(topLevelGoals, key = { it.id }) { goal ->
                    val tasks = state.tasks.filter { it.goalId == goal.id && it.parentTaskId == null }
                    val progress = state.progressMap[goal.id] ?: 0
                    GoalCard(
                        goal = goal,
                        progress = progress,
                        tasks = tasks,
                        progressDates = emptySet(),   // Phase 4 enhancement
                        onEdit = { viewModel.onEvent(GoalsEvent.EditGoal(goal)) },
                        onDelete = { viewModel.onEvent(GoalsEvent.DeleteGoal(goal.id)) },
                        onToggleTask = { viewModel.onEvent(GoalsEvent.ToggleTask(it)) },
                        onDeleteTask = { viewModel.onEvent(GoalsEvent.DeleteTask(it)) },
                        onAddTask = { viewModel.onEvent(GoalsEvent.AddTaskToGoal(goal.id, it)) }
                    )
                }
            }
        }
    }

    // Add sheet
    if (state.showAddSheet) {
        GoalFormSheet(
            sheetState = addSheetState,
            onDismiss = { viewModel.onEvent(GoalsEvent.HideAddSheet) },
            onSave = { name, color, durationType, durationValue, startDate, endDate ->
                viewModel.onEvent(GoalsEvent.CreateGoal(name, color, durationType, durationValue, startDate, endDate))
            }
        )
    }

    // Edit sheet
    state.editingGoal?.let { goal ->
        GoalFormSheet(
            existingGoal = goal,
            sheetState = editSheetState,
            onDismiss = { viewModel.onEvent(GoalsEvent.HideEditSheet) },
            onSave = { name, color, durationType, durationValue, startDate, endDate ->
                viewModel.onEvent(GoalsEvent.UpdateGoal(
                    goal.copy(name = name, color = color, durationType = durationType,
                        durationValue = durationValue, startDate = startDate, endDate = endDate)
                ))
            }
        )
    }
}
```

---

# ╔══════════════════════════════════════════════╗
# ║  TASK 11 — Update JamrahApp (Temp TabRow)  ║
# ╚══════════════════════════════════════════════╝

**Exact file path:** `android/app/src/main/java/com/jamrah/app/ui/JamrahApp.kt` (REPLACE)

```kotlin
package com.jamrah.app.ui

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import com.jamrah.app.ui.goals.GoalsScreen
import com.jamrah.app.ui.tasks.TasksScreen

/**
 * Temporary two-tab layout for testing Phase 0 + Phase 1.
 * Phase 5 will replace this with the real NavHost + BottomNav.
 */
@Composable
fun JamrahApp() {
    var selectedTab by remember { mutableIntStateOf(0) }
    val tabs = listOf("Tasks", "Goals")

    Column(modifier = Modifier.fillMaxSize()) {
        TabRow(selectedTabIndex = selectedTab) {
            tabs.forEachIndexed { index, title ->
                Tab(
                    selected = selectedTab == index,
                    onClick  = { selectedTab = index },
                    text     = { Text(title, style = MaterialTheme.typography.bodyLarge) }
                )
            }
        }
        when (selectedTab) {
            0 -> TasksScreen()
            1 -> GoalsScreen()
        }
    }
}
```

---

# ╔══════════════════════════════════════════════╗
# ║  TASK 12 — Update SyncWorker               ║
# ╚══════════════════════════════════════════════╝

**Exact file path:** `android/app/src/main/java/com/jamrah/app/sync/SyncWorker.kt` — add GoalRepository injection:

```kotlin
@HiltWorker
class SyncWorker @AssistedInject constructor(
    @Assisted context: Context,
    @Assisted workerParams: WorkerParameters,
    private val taskRepository: TaskRepository,
    private val goalRepository: GoalRepository     // ← new
) : CoroutineWorker(context, workerParams) {

    override suspend fun doWork(): Result {
        return try {
            taskRepository.sync()
            goalRepository.sync()                  // ← new
            Result.success()
        } catch (e: Exception) {
            if (runAttemptCount < 3) Result.retry() else Result.failure()
        }
    }
    // companion object unchanged...
}
```

---

# ╔══════════════════════════════════════════════╗
# ║  REVIEW CALL — END OF PHASE 1              ║
# ╚══════════════════════════════════════════════╝

Build verification:
```bash
cd android
./gradlew assembleDebug
```

### 20-Item Manual Testing Checklist

- [ ] App launches to Tasks tab (no crash)
- [ ] "Goals" tab appears in temp TabRow, tap switches screens
- [ ] Goals page header shows "Goals" + + button
- [ ] Tapping + opens Add Goal bottom sheet
- [ ] Name, color swatch, duration type, date fields work
- [ ] Save creates a goal card visible immediately
- [ ] Goal card shows: name, color dot, status badge "Active", 0% progress
- [ ] Progress bar is empty initially
- [ ] Heatmap shows 28 empty dots
- [ ] Date range shown correctly (start → end)
- [ ] Duration label shown ("1 month", "3 months", etc.)
- [ ] Linked tasks section shows "No tasks yet"
- [ ] Type in task name input + tap Add → task appears in card
- [ ] Checkbox on task toggles completion
- [ ] Completed task shows line-through + muted text
- [ ] Progress % updates after toggling tasks (e.g. 1/2 tasks = 50%)
- [ ] Edit icon opens Edit Goal bottom sheet pre-filled with existing values
- [ ] Save edit updates the card
- [ ] Delete button (×) on card removes the goal
- [ ] Goal persists after app kill and relaunch (Room storage)

*End of PHASE_1.md*
