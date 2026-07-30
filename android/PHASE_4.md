# Phase 4 — Stats Page (Android)

## Overview

Phase 4 adds a fully local Stats page to the Jamrah Android app. It surfaces
focus time, completed tasks, habit rates, and goal progress across four time
ranges with prev/next navigation. All data is already persisted in Room from
Phases 0–3; this phase adds aggregate queries, a StatsRepository, a
StatsViewModel, Canvas-based charts, and the StatsScreen UI.

**Room DB version after Phase 4: 4** (no schema changes needed — only new
queries are added to existing DAOs).

---

## File Index

| # | File | Purpose |
|---|------|---------|
| 1 | `SessionDao.kt` | Add `getFocusMinutesByDateRange` query |
| 2 | `TaskDao.kt` | Add `getCompletedTasksByDateRange` query |
| 3 | `StatsModels.kt` | Data classes for stats layer |
| 4 | `StatsUtils.kt` | Pure aggregation helpers |
| 5 | `StatsRepository.kt` | Repository interface |
| 6 | `StatsRepositoryImpl.kt` | Room-backed implementation |
| 7 | `RepositoryModule.kt` | Add StatsRepository binding |
| 8 | `StatsUiState.kt` | UI state + event sealed classes |
| 9 | `StatsViewModel.kt` | ViewModel with date-range logic |
| 10 | `BarChart.kt` | Canvas bar chart composable |
| 11 | `StatCard.kt` | Reusable card wrapper composable |
| 12 | `FocusTimeWidget.kt` | Focus minutes bar chart widget |
| 13 | `TasksCompletedWidget.kt` | Completed tasks bar chart widget |
| 14 | `HabitsRateWidget.kt` | Habit completion rate widget |
| 15 | `GoalsProgressWidget.kt` | Goal progress widget |
| 16 | `QuickStatsWidget.kt` | Quick metric tiles widget |
| 17 | `TimeRangeSelector.kt` | Time-range toggle + prev/next arrows |
| 18 | `StatsScreen.kt` | Top-level screen composable |
| 19 | `JamrahApp.kt` | Add Stats tab |

---

## File 1 — SessionDao.kt (additions only)

**Path:** `app/src/main/java/com/jamrah/data/local/dao/SessionDao.kt`

Add the following query below the existing DAO methods. The existing file is
not shown in full — only the new method is provided. Merge it into the
interface/abstract class body.

```kotlin
// ── New in Phase 4 ────────────────────────────────────────────────────────────
@Query(
    """
    SELECT strftime('%Y-%m-%d', startTime / 1000, 'unixepoch') AS date,
           SUM(focusMinutes) AS amount
    FROM sessions
    WHERE startTime >= :startMs AND startTime <= :endMs
    GROUP BY date
    ORDER BY date ASC
    """
)
suspend fun getFocusMinutesByDateRange(startMs: Long, endMs: Long): List<DateAmount>
```

> `DateAmount` is defined in `StatsModels.kt` (File 3). Room will map the
> projection columns `date` and `amount` automatically.

---

## File 2 — TaskDao.kt (additions only)

**Path:** `app/src/main/java/com/jamrah/data/local/dao/TaskDao.kt`

```kotlin
// ── New in Phase 4 ────────────────────────────────────────────────────────────
@Query(
    """
    SELECT strftime('%Y-%m-%d', completedAt / 1000, 'unixepoch') AS date,
           COUNT(*) AS amount
    FROM tasks
    WHERE completed = 1
      AND completedAt >= :startMs AND completedAt <= :endMs
    GROUP BY date
    ORDER BY date ASC
    """
)
suspend fun getCompletedTasksByDateRange(startMs: Long, endMs: Long): List<DateAmount>
```

---

## File 3 — StatsModels.kt

**Path:** `app/src/main/java/com/jamrah/data/model/StatsModels.kt`

```kotlin
package com.jamrah.data.model

import androidx.room.ColumnInfo

// ─── Room projection ──────────────────────────────────────────────────────────

/**
 * Generic (date, amount) projection returned by aggregate DAO queries.
 * Room maps the SQL aliases 'date' and 'amount' to these fields.
 */
data class DateAmount(
    @ColumnInfo(name = "date") val date: String,   // "YYYY-MM-DD"
    @ColumnInfo(name = "amount") val amount: Double
)

// ─── Chart primitives ─────────────────────────────────────────────────────────

/**
 * A single bar in a bar chart.
 *
 * @param label  Short display label shown below the bar (e.g. "Mon", "W23").
 * @param value  Numeric value represented by the bar height.
 * @param color  ARGB color for the bar fill; defaults to the primary gradient
 *               start colour #8A7CFB.
 */
data class BarData(
    val label: String,
    val value: Float,
    val color: Long = 0xFF8A7CFBu.toLong()
)

// ─── Domain stats ─────────────────────────────────────────────────────────────

/**
 * Aggregated stat for a single time bucket (day / week / month).
 */
data class PeriodStat(
    val label: String,
    val focusMinutes: Float,
    val tasksCompleted: Float
)

/**
 * Completion stats for one habit.
 */
data class HabitStat(
    val habitId: Long,
    val name: String,
    val color: Long,            // ARGB habit colour
    val completionRate: Float,  // 0f–1f
    val streak: Int
)

/**
 * Progress stats for one goal.
 */
data class GoalStat(
    val goalId: Long,
    val title: String,
    val progress: Float,        // 0f–1f
    val completedTasks: Int,
    val totalTasks: Int
)

// ─── Time range ───────────────────────────────────────────────────────────────

enum class StatsTimeRange(val label: String, val bucketCount: Int) {
    WEEK("7 Days", 7),
    MONTH("4 Weeks", 4),
    YEAR("12 Months", 12),
    ALL("All Time", 0)          // bucketCount 0 = dynamic
}

// ─── Top-level state container ────────────────────────────────────────────────

/**
 * All computed stats needed to render the Stats screen.
 */
data class StatsData(
    val focusBars: List<BarData> = emptyList(),
    val taskBars: List<BarData> = emptyList(),
    val habitStats: List<HabitStat> = emptyList(),
    val goalStats: List<GoalStat> = emptyList(),
    val todayPomos: Int = 0,
    val todayFocusMinutes: Int = 0,
    val totalPomos: Int = 0,
    val totalFocusMinutes: Int = 0
)
```

---

## File 4 — StatsUtils.kt

**Path:** `app/src/main/java/com/jamrah/domain/util/StatsUtils.kt`

```kotlin
package com.jamrah.domain.util

import com.jamrah.data.model.BarData
import com.jamrah.data.model.DateAmount
import com.jamrah.data.model.StatsTimeRange
import java.time.DayOfWeek
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import java.time.temporal.TemporalAdjusters
import java.time.temporal.WeekFields
import java.util.Locale

object StatsUtils {

    private val ISO = DateTimeFormatter.ISO_LOCAL_DATE

    // ── Bar colour gradient (start / end) ─────────────────────────────────────
    private const val COLOR_START = 0xFF8A7CFBu.toLong()
    private const val COLOR_END   = 0xFF3b82f6u.toLong()

    // ── Date-range helpers ────────────────────────────────────────────────────

    /**
     * Returns the [start, end] epoch-millisecond pair for the given
     * [timeRange] and [offset] (0 = current period, -1 = previous, etc.).
     */
    fun dateRangeMs(timeRange: StatsTimeRange, offset: Int): Pair<Long, Long> {
        val today = LocalDate.now()
        val (start, end) = when (timeRange) {
            StatsTimeRange.WEEK -> {
                val anchor = today.plusWeeks(offset.toLong())
                val weekStart = anchor.with(DayOfWeek.MONDAY)
                weekStart to weekStart.plusDays(6)
            }
            StatsTimeRange.MONTH -> {
                val anchor = today.plusWeeks(offset.toLong() * 4)
                val weekStart = anchor
                    .with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY))
                weekStart to weekStart.plusWeeks(3).plusDays(6)
            }
            StatsTimeRange.YEAR -> {
                val anchor = today.plusMonths(offset.toLong() * 12)
                val yearStart = anchor.withDayOfYear(1)
                yearStart to yearStart.plusYears(1).minusDays(1)
            }
            StatsTimeRange.ALL -> {
                LocalDate.of(2000, 1, 1) to today
            }
        }
        return start.toEpochMillis() to end.toEpochMillisEndOfDay()
    }

    /**
     * Generates a label string for the current range to display in the header.
     */
    fun rangeLabel(timeRange: StatsTimeRange, offset: Int): String {
        val (startMs, endMs) = dateRangeMs(timeRange, offset)
        val start = LocalDate.ofEpochDay(startMs / 86_400_000)
        val end   = LocalDate.ofEpochDay(endMs   / 86_400_000)
        return when (timeRange) {
            StatsTimeRange.WEEK  -> "${start.format(shortDate())} – ${end.format(shortDate())}"
            StatsTimeRange.MONTH -> "${start.format(shortDate())} – ${end.format(shortDate())}"
            StatsTimeRange.YEAR  -> start.year.toString()
            StatsTimeRange.ALL   -> "All Time"
        }
    }

    // ── Bucket builders ───────────────────────────────────────────────────────

    /**
     * Converts a raw [DateAmount] list from Room into a [BarData] list aligned
     * to the chart buckets defined by [timeRange] and [offset].
     *
     * Buckets with no data get value = 0.
     */
    fun computeBarData(
        raw: List<DateAmount>,
        timeRange: StatsTimeRange,
        offset: Int,
        color: Long = COLOR_START
    ): List<BarData> {
        val (startMs, _) = dateRangeMs(timeRange, offset)
        val startDate = LocalDate.ofEpochDay(startMs / 86_400_000)
        val lookup = raw.associate { it.date to it.amount.toFloat() }

        return when (timeRange) {
            StatsTimeRange.WEEK -> buildDayBuckets(startDate, 7, lookup, color)
            StatsTimeRange.MONTH -> buildWeekBuckets(startDate, 4, lookup, color)
            StatsTimeRange.YEAR -> buildMonthBuckets(startDate, 12, lookup, color)
            StatsTimeRange.ALL -> {
                if (raw.isEmpty()) emptyList()
                else buildMonthBuckets(
                    startDate = LocalDate.parse(raw.first().date, ISO),
                    count = monthsBetween(
                        LocalDate.parse(raw.first().date, ISO),
                        LocalDate.parse(raw.last().date, ISO)
                    ).coerceAtLeast(1),
                    lookup = lookup,
                    color = color
                )
            }
        }
    }

    // ── Private bucket helpers ────────────────────────────────────────────────

    private fun buildDayBuckets(
        start: LocalDate,
        count: Int,
        lookup: Map<String, Float>,
        color: Long
    ): List<BarData> = (0 until count).map { i ->
        val date = start.plusDays(i.toLong())
        BarData(
            label = date.dayOfWeek.name.take(1),   // "M", "T", "W" …
            value = lookup[date.format(ISO)] ?: 0f,
            color = color
        )
    }

    private fun buildWeekBuckets(
        start: LocalDate,
        count: Int,
        lookup: Map<String, Float>,
        color: Long
    ): List<BarData> = (0 until count).map { i ->
        val weekStart = start.plusWeeks(i.toLong())
        val weekEnd   = weekStart.plusDays(6)
        val total = (0..6).sumOf { d ->
            (lookup[weekStart.plusDays(d.toLong()).format(ISO)] ?: 0f).toDouble()
        }.toFloat()
        val weekFields = WeekFields.of(Locale.getDefault())
        BarData(
            label = "W${weekStart.get(weekFields.weekOfWeekBasedYear())}",
            value = total,
            color = color
        )
    }

    private fun buildMonthBuckets(
        start: LocalDate,
        count: Int,
        lookup: Map<String, Float>,
        color: Long
    ): List<BarData> = (0 until count).map { i ->
        val month = start.withDayOfMonth(1).plusMonths(i.toLong())
        val total = (0 until month.lengthOfMonth()).sumOf { d ->
            (lookup[month.plusDays(d.toLong()).format(ISO)] ?: 0f).toDouble()
        }.toFloat()
        BarData(
            label = month.month.name.take(3),   // "JAN", "FEB" …
            value = total,
            color = color
        )
    }

    private fun monthsBetween(from: LocalDate, to: LocalDate): Int =
        ((to.year - from.year) * 12 + to.monthValue - from.monthValue + 1)
            .coerceAtLeast(1)

    // ── Extension helpers ─────────────────────────────────────────────────────

    private fun LocalDate.toEpochMillis(): Long =
        toEpochDay() * 86_400_000L

    private fun LocalDate.toEpochMillisEndOfDay(): Long =
        toEpochMillis() + 86_399_999L

    private fun shortDate() = DateTimeFormatter.ofPattern("d MMM")
}
```

---

## File 5 — StatsRepository.kt

**Path:** `app/src/main/java/com/jamrah/domain/repository/StatsRepository.kt`

```kotlin
package com.jamrah.domain.repository

import com.jamrah.data.model.DateAmount
import com.jamrah.data.model.GoalStat
import com.jamrah.data.model.HabitStat

interface StatsRepository {

    /** Focus minutes per day in [startMs, endMs]. */
    suspend fun getFocusByRange(startMs: Long, endMs: Long): List<DateAmount>

    /** Completed task count per day in [startMs, endMs]. */
    suspend fun getTasksByRange(startMs: Long, endMs: Long): List<DateAmount>

    /** Completion rate and streak for every active habit in [startMs, endMs]. */
    suspend fun getHabitStats(startMs: Long, endMs: Long): List<HabitStat>

    /** Progress percentage for every active goal. */
    suspend fun getGoalStats(): List<GoalStat>

    /** Total sessions (pomo count) in [startMs, endMs]. */
    suspend fun getPomosInRange(startMs: Long, endMs: Long): Int

    /** Total focus minutes across all time. */
    suspend fun getTotalFocusMinutes(): Int

    /** Total sessions (pomo count) across all time. */
    suspend fun getTotalPomos(): Int
}
```

---

## File 6 — StatsRepositoryImpl.kt

**Path:** `app/src/main/java/com/jamrah/data/repository/StatsRepositoryImpl.kt`

```kotlin
package com.jamrah.data.repository

import com.jamrah.data.local.dao.GoalDao
import com.jamrah.data.local.dao.HabitDao
import com.jamrah.data.local.dao.HabitLogDao
import com.jamrah.data.local.dao.SessionDao
import com.jamrah.data.local.dao.TaskDao
import com.jamrah.data.model.DateAmount
import com.jamrah.data.model.GoalStat
import com.jamrah.data.model.HabitStat
import com.jamrah.domain.repository.StatsRepository
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import javax.inject.Inject

class StatsRepositoryImpl @Inject constructor(
    private val sessionDao: SessionDao,
    private val taskDao: TaskDao,
    private val habitDao: HabitDao,
    private val habitLogDao: HabitLogDao,
    private val goalDao: GoalDao
) : StatsRepository {

    private val ISO = DateTimeFormatter.ISO_LOCAL_DATE

    // ── Focus ─────────────────────────────────────────────────────────────────

    override suspend fun getFocusByRange(startMs: Long, endMs: Long): List<DateAmount> =
        sessionDao.getFocusMinutesByDateRange(startMs, endMs)

    // ── Tasks ─────────────────────────────────────────────────────────────────

    override suspend fun getTasksByRange(startMs: Long, endMs: Long): List<DateAmount> =
        taskDao.getCompletedTasksByDateRange(startMs, endMs)

    // ── Habits ────────────────────────────────────────────────────────────────

    override suspend fun getHabitStats(startMs: Long, endMs: Long): List<HabitStat> {
        val habits = habitDao.getAllHabitsOnce()     // suspend, returns List<Habit>
        val startDate = LocalDate.ofEpochDay(startMs / 86_400_000)
        val endDate   = LocalDate.ofEpochDay(endMs   / 86_400_000)
        val totalDays = (endDate.toEpochDay() - startDate.toEpochDay() + 1).coerceAtLeast(1)

        return coroutineScope {
            habits.map { habit ->
                async {
                    val logCount = habitLogDao.getLogCountByHabit(
                        habitId  = habit.id,
                        startMs  = startMs,
                        endMs    = endMs
                    )
                    val rate = (logCount.toFloat() / totalDays).coerceIn(0f, 1f)

                    // Simple streak: consecutive days from today going backwards
                    val streak = computeStreak(habit.id, endDate)

                    HabitStat(
                        habitId        = habit.id,
                        name           = habit.name,
                        color          = habit.color,
                        completionRate = rate,
                        streak         = streak
                    )
                }
            }.map { it.await() }
        }
    }

    private suspend fun computeStreak(habitId: Long, from: LocalDate): Int {
        var streak = 0
        var date = from
        val todayMs = from.toEpochDay() * 86_400_000L
        while (true) {
            val dayStart = date.toEpochDay() * 86_400_000L
            val dayEnd   = dayStart + 86_399_999L
            val count = habitLogDao.getLogCountByHabit(habitId, dayStart, dayEnd)
            if (count == 0) break
            streak++
            date = date.minusDays(1)
            if (date.toEpochDay() * 86_400_000L < todayMs - 365 * 86_400_000L) break
        }
        return streak
    }

    // ── Goals ─────────────────────────────────────────────────────────────────

    override suspend fun getGoalStats(): List<GoalStat> {
        val goals = goalDao.getAllGoalsOnce()    // suspend, returns List<Goal>
        return goals.map { goal ->
            val total     = taskDao.countTasksForGoal(goal.id)
            val completed = taskDao.countCompletedTasksForGoal(goal.id)
            val progress  = if (total > 0) completed.toFloat() / total else 0f
            GoalStat(
                goalId         = goal.id,
                title          = goal.title,
                progress       = progress,
                completedTasks = completed,
                totalTasks     = total
            )
        }
    }

    // ── Aggregates ────────────────────────────────────────────────────────────

    override suspend fun getPomosInRange(startMs: Long, endMs: Long): Int =
        sessionDao.countSessionsInRange(startMs, endMs)

    override suspend fun getTotalFocusMinutes(): Int =
        sessionDao.sumAllFocusMinutes()

    override suspend fun getTotalPomos(): Int =
        sessionDao.countAllSessions()
}
```

> **Note:** `getAllHabitsOnce()`, `getAllGoalsOnce()`, `countTasksForGoal()`,
> `countCompletedTasksForGoal()`, `countSessionsInRange()`,
> `sumAllFocusMinutes()`, and `countAllSessions()` are simple `@Query` suspend
> functions that must be present in their respective DAOs. Add them if missing
> — they are trivial `SELECT COUNT(*)`/`SELECT SUM(...)` queries with no
> `GROUP BY`.

---

## File 7 — RepositoryModule.kt (additions only)

**Path:** `app/src/main/java/com/jamrah/di/RepositoryModule.kt`

Add the following binding inside the existing `@Module` object. Do not remove
existing bindings.

```kotlin
// ── Phase 4 ───────────────────────────────────────────────────────────────────
@Binds
@Singleton
abstract fun bindStatsRepository(impl: StatsRepositoryImpl): StatsRepository
```

Also add the required import at the top of the file if not already present:

```kotlin
import com.jamrah.data.repository.StatsRepositoryImpl
import com.jamrah.domain.repository.StatsRepository
```

---

## File 8 — StatsUiState.kt

**Path:** `app/src/main/java/com/jamrah/ui/stats/StatsUiState.kt`

```kotlin
package com.jamrah.ui.stats

import com.jamrah.data.model.StatsData
import com.jamrah.data.model.StatsTimeRange

// ─── UI State ─────────────────────────────────────────────────────────────────

data class StatsUiState(
    val timeRange: StatsTimeRange = StatsTimeRange.WEEK,
    /** 0 = current period, -1 = previous, -2 = two periods ago, etc. */
    val rangeOffset: Int = 0,
    val rangeLabel: String = "",
    val data: StatsData = StatsData(),
    val isLoading: Boolean = false,
    val error: String? = null
)

// ─── Events ───────────────────────────────────────────────────────────────────

sealed class StatsEvent {
    data class SetTimeRange(val range: StatsTimeRange) : StatsEvent()
    object PrevRange : StatsEvent()
    object NextRange : StatsEvent()
    object Refresh   : StatsEvent()
}
```

---

## File 9 — StatsViewModel.kt

**Path:** `app/src/main/java/com/jamrah/ui/stats/StatsViewModel.kt`

```kotlin
package com.jamrah.ui.stats

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.jamrah.data.model.StatsData
import com.jamrah.data.model.StatsTimeRange
import com.jamrah.domain.repository.StatsRepository
import com.jamrah.domain.util.StatsUtils
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import java.time.LocalDate
import javax.inject.Inject

@HiltViewModel
class StatsViewModel @Inject constructor(
    private val statsRepository: StatsRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(StatsUiState())
    val uiState: StateFlow<StatsUiState> = _uiState.asStateFlow()

    init {
        loadStats()
    }

    // ── Event handler ─────────────────────────────────────────────────────────

    fun onEvent(event: StatsEvent) {
        when (event) {
            is StatsEvent.SetTimeRange -> {
                _uiState.update { it.copy(timeRange = event.range, rangeOffset = 0) }
                loadStats()
            }
            StatsEvent.PrevRange -> {
                _uiState.update { it.copy(rangeOffset = it.rangeOffset - 1) }
                loadStats()
            }
            StatsEvent.NextRange -> {
                val canGoNext = _uiState.value.rangeOffset < 0
                if (canGoNext) {
                    _uiState.update { it.copy(rangeOffset = it.rangeOffset + 1) }
                    loadStats()
                }
            }
            StatsEvent.Refresh -> loadStats()
        }
    }

    // ── Data loading ──────────────────────────────────────────────────────────

    private fun loadStats() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }

            val state  = _uiState.value
            val range  = state.timeRange
            val offset = state.rangeOffset

            val (startMs, endMs) = StatsUtils.dateRangeMs(range, offset)
            val label = StatsUtils.rangeLabel(range, offset)

            try {
                val data = coroutineScope {
                    val focusRaw    = async { statsRepository.getFocusByRange(startMs, endMs) }
                    val tasksRaw    = async { statsRepository.getTasksByRange(startMs, endMs) }
                    val habitStats  = async { statsRepository.getHabitStats(startMs, endMs) }
                    val goalStats   = async { statsRepository.getGoalStats() }
                    val totalFocus  = async { statsRepository.getTotalFocusMinutes() }
                    val totalPomos  = async { statsRepository.getTotalPomos() }
                    val pomosRange  = async { statsRepository.getPomosInRange(startMs, endMs) }

                    // Today's metrics
                    val todayStart = LocalDate.now().toEpochDay() * 86_400_000L
                    val todayEnd   = todayStart + 86_399_999L
                    val todayFocus = async { statsRepository.getFocusByRange(todayStart, todayEnd) }
                    val todayPomos = async { statsRepository.getPomosInRange(todayStart, todayEnd) }

                    val focusBars = StatsUtils.computeBarData(focusRaw.await(), range, offset)
                    val taskBars  = StatsUtils.computeBarData(tasksRaw.await(), range, offset)

                    StatsData(
                        focusBars            = focusBars,
                        taskBars             = taskBars,
                        habitStats           = habitStats.await(),
                        goalStats            = goalStats.await(),
                        todayPomos           = todayPomos.await(),
                        todayFocusMinutes    = todayFocus.await().sumOf { it.amount }.toInt(),
                        totalPomos           = totalPomos.await(),
                        totalFocusMinutes    = totalFocus.await()
                    )
                }

                _uiState.update {
                    it.copy(
                        data       = data,
                        rangeLabel = label,
                        isLoading  = false
                    )
                }
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(isLoading = false, error = e.message ?: "Unknown error")
                }
            }
        }
    }
}
```

---

## File 10 — BarChart.kt

**Path:** `app/src/main/java/com/jamrah/ui/stats/components/BarChart.kt`

```kotlin
package com.jamrah.ui.stats.components

import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Paint
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.drawscope.drawIntoCanvas
import androidx.compose.ui.graphics.nativeCanvas
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.unit.dp
import com.jamrah.data.model.BarData

/**
 * Animated vertical bar chart drawn entirely on Canvas.
 *
 * @param bars      List of [BarData] to display.
 * @param modifier  Layout modifier; caller controls height.
 */
@Composable
fun BarChart(
    bars: List<BarData>,
    modifier: Modifier = Modifier
) {
    // Animation progress: 0f → 1f on first composition
    val animProgress = remember { Animatable(0f) }
    LaunchedEffect(bars) {
        animProgress.snapTo(0f)
        animProgress.animateTo(
            targetValue = 1f,
            animationSpec = tween(durationMillis = 600)
        )
    }

    if (bars.isEmpty()) return

    val maxValue = bars.maxOf { it.value }.takeIf { it > 0f } ?: 1f

    Canvas(modifier = modifier.fillMaxSize()) {
        val progress = animProgress.value
        val totalWidth = size.width
        val totalHeight = size.height
        val labelAreaHeight = 28.dp.toPx()
        val chartHeight = totalHeight - labelAreaHeight
        val barWidth = (totalWidth / bars.size) * 0.55f
        val gap      = (totalWidth / bars.size) * 0.45f / 2f

        // Max value reference line
        val lineY = 8.dp.toPx()
        drawLine(
            color = Color.White.copy(alpha = 0.1f),
            start = Offset(0f, lineY),
            end   = Offset(totalWidth, lineY),
            strokeWidth = 1.dp.toPx()
        )

        bars.forEachIndexed { index, bar ->
            val barX = index * (totalWidth / bars.size) + gap
            val normalised = (bar.value / maxValue).coerceIn(0f, 1f)
            val barH = ((chartHeight - lineY) * normalised * progress).coerceAtLeast(2f)
            val barTop = chartHeight - barH

            // Bar fill
            drawRoundRect(
                color        = Color(bar.color),
                topLeft      = Offset(barX, barTop),
                size         = Size(barWidth, barH),
                cornerRadius = CornerRadius(4.dp.toPx(), 4.dp.toPx())
            )

            // Label below bar
            drawLabel(
                text   = bar.label,
                x      = barX + barWidth / 2f,
                y      = totalHeight - 2.dp.toPx()
            )
        }
    }
}

// ── Canvas text helper ────────────────────────────────────────────────────────

private fun DrawScope.drawLabel(text: String, x: Float, y: Float) {
    drawIntoCanvas { canvas ->
        val paint = android.graphics.Paint().apply {
            color     = android.graphics.Color.argb(179, 255, 255, 255)   // white 70%
            textSize  = 11.dp.toPx()
            textAlign = android.graphics.Paint.Align.CENTER
            isAntiAlias = true
        }
        canvas.nativeCanvas.drawText(text, x, y, paint)
    }
}
```

---

## File 11 — StatCard.kt

**Path:** `app/src/main/java/com/jamrah/ui/stats/components/StatCard.kt`

```kotlin
package com.jamrah.ui.stats.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

private val CardBackground = Brush.verticalGradient(
    colors = listOf(
        Color(0xFF1E1B3A),
        Color(0xFF16132E)
    )
)

/**
 * Reusable glass-style card wrapper for stat widgets.
 *
 * @param title    Card heading text.
 * @param subtitle Optional secondary heading (e.g. date range).
 * @param content  Composable content drawn inside the card.
 */
@Composable
fun StatCard(
    title: String,
    subtitle: String? = null,
    modifier: Modifier = Modifier,
    content: @Composable () -> Unit
) {
    Box(
        modifier = modifier
            .clip(RoundedCornerShape(16.dp))
            .background(CardBackground)
            .padding(16.dp)
    ) {
        Column {
            Text(
                text       = title,
                color      = Color.White,
                fontSize   = 14.sp,
                fontWeight = FontWeight.SemiBold,
                letterSpacing = 0.3.sp
            )
            if (subtitle != null) {
                Spacer(Modifier.height(2.dp))
                Text(
                    text     = subtitle,
                    color    = Color.White.copy(alpha = 0.5f),
                    fontSize = 11.sp
                )
            }
            Spacer(Modifier.height(12.dp))
            content()
        }
    }
}
```

---

## File 12 — FocusTimeWidget.kt

**Path:** `app/src/main/java/com/jamrah/ui/stats/widgets/FocusTimeWidget.kt`

```kotlin
package com.jamrah.ui.stats.widgets

import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.jamrah.data.model.BarData
import com.jamrah.ui.stats.components.BarChart
import com.jamrah.ui.stats.components.StatCard

/**
 * Widget that shows daily/weekly/monthly focus minutes as a bar chart.
 *
 * @param bars     Prepared [BarData] list from [StatsViewModel].
 * @param subtitle Current range label (e.g. "21 Jul – 27 Jul").
 */
@Composable
fun FocusTimeWidget(
    bars: List<BarData>,
    subtitle: String,
    modifier: Modifier = Modifier
) {
    StatCard(
        title    = "Focus Time",
        subtitle = subtitle,
        modifier = modifier.fillMaxWidth()
    ) {
        BarChart(
            bars     = bars,
            modifier = Modifier
                .fillMaxWidth()
                .height(140.dp)
        )
    }
}
```

---

## File 13 — TasksCompletedWidget.kt

**Path:** `app/src/main/java/com/jamrah/ui/stats/widgets/TasksCompletedWidget.kt`

```kotlin
package com.jamrah.ui.stats.widgets

import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.jamrah.data.model.BarData
import com.jamrah.ui.stats.components.BarChart
import com.jamrah.ui.stats.components.StatCard

/**
 * Widget that shows completed task counts per bucket as a bar chart.
 */
@Composable
fun TasksCompletedWidget(
    bars: List<BarData>,
    subtitle: String,
    modifier: Modifier = Modifier
) {
    StatCard(
        title    = "Tasks Completed",
        subtitle = subtitle,
        modifier = modifier.fillMaxWidth()
    ) {
        BarChart(
            bars     = bars,
            modifier = Modifier
                .fillMaxWidth()
                .height(140.dp)
        )
    }
}
```

---

## File 14 — HabitsRateWidget.kt

**Path:** `app/src/main/java/com/jamrah/ui/stats/widgets/HabitsRateWidget.kt`

```kotlin
package com.jamrah.ui.stats.widgets

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.jamrah.data.model.HabitStat
import com.jamrah.ui.stats.components.StatCard
import kotlin.math.roundToInt

/**
 * Widget listing each habit with its completion rate as a coloured progress bar.
 */
@Composable
fun HabitsRateWidget(
    habits: List<HabitStat>,
    modifier: Modifier = Modifier
) {
    StatCard(
        title    = "Habit Completion",
        modifier = modifier.fillMaxWidth()
    ) {
        if (habits.isEmpty()) {
            Text(
                text     = "No habit data for this period.",
                color    = Color.White.copy(alpha = 0.4f),
                fontSize = 12.sp
            )
            return@StatCard
        }

        Column(verticalArrangement = androidx.compose.foundation.layout.Arrangement.spacedBy(10.dp)) {
            habits.forEach { habit ->
                HabitRow(habit)
            }
        }
    }
}

@Composable
private fun HabitRow(habit: HabitStat) {
    val pct = (habit.completionRate * 100).roundToInt()
    val habitColor = Color(habit.color)

    Column(modifier = Modifier.fillMaxWidth()) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text       = habit.name,
                color      = Color.White,
                fontSize   = 12.sp,
                fontWeight = FontWeight.Medium,
                modifier   = Modifier.weight(1f)
            )
            Spacer(Modifier.width(8.dp))
            Text(
                text     = "$pct%",
                color    = habitColor,
                fontSize = 11.sp,
                fontWeight = FontWeight.SemiBold
            )
            if (habit.streak > 1) {
                Spacer(Modifier.width(6.dp))
                Text(
                    text     = "🔥${habit.streak}",
                    color    = Color(0xFFFFB347),
                    fontSize = 11.sp
                )
            }
        }
        Spacer(Modifier.height(4.dp))
        LinearProgressIndicator(
            progress          = { habit.completionRate },
            modifier          = Modifier
                .fillMaxWidth()
                .height(6.dp),
            color             = habitColor,
            trackColor        = habitColor.copy(alpha = 0.15f),
            strokeCap         = StrokeCap.Round
        )
    }
}
```

---

## File 15 — GoalsProgressWidget.kt

**Path:** `app/src/main/java/com/jamrah/ui/stats/widgets/GoalsProgressWidget.kt`

```kotlin
package com.jamrah.ui.stats.widgets

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.jamrah.data.model.GoalStat
import com.jamrah.ui.stats.components.StatCard
import kotlin.math.roundToInt

private val GoalProgressColor = Color(0xFF8A7CFB)
private val GoalTrackColor    = Color(0xFF8A7CFB).copy(alpha = 0.15f)

/**
 * Widget listing goals with a linear progress bar each.
 */
@Composable
fun GoalsProgressWidget(
    goals: List<GoalStat>,
    modifier: Modifier = Modifier
) {
    StatCard(
        title    = "Goals Progress",
        modifier = modifier.fillMaxWidth()
    ) {
        if (goals.isEmpty()) {
            Text(
                text     = "No active goals.",
                color    = Color.White.copy(alpha = 0.4f),
                fontSize = 12.sp
            )
            return@StatCard
        }

        Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
            goals.forEach { goal ->
                GoalRow(goal)
            }
        }
    }
}

@Composable
private fun GoalRow(goal: GoalStat) {
    val pct = (goal.progress * 100).roundToInt()

    Column(modifier = Modifier.fillMaxWidth()) {
        Row(
            modifier          = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text       = goal.title,
                color      = Color.White,
                fontSize   = 12.sp,
                fontWeight = FontWeight.Medium,
                modifier   = Modifier.weight(1f),
                maxLines   = 1,
                overflow   = androidx.compose.ui.text.style.TextOverflow.Ellipsis
            )
            Text(
                text       = "${goal.completedTasks}/${goal.totalTasks}",
                color      = Color.White.copy(alpha = 0.5f),
                fontSize   = 11.sp
            )
            Text(
                text       = "  $pct%",
                color      = GoalProgressColor,
                fontSize   = 11.sp,
                fontWeight = FontWeight.SemiBold
            )
        }
        Spacer(Modifier.height(4.dp))
        LinearProgressIndicator(
            progress   = { goal.progress },
            modifier   = Modifier
                .fillMaxWidth()
                .height(6.dp),
            color      = GoalProgressColor,
            trackColor = GoalTrackColor,
            strokeCap  = StrokeCap.Round
        )
    }
}
```

---

## File 16 — QuickStatsWidget.kt

**Path:** `app/src/main/java/com/jamrah/ui/stats/widgets/QuickStatsWidget.kt`

```kotlin
package com.jamrah.ui.stats.widgets

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.jamrah.ui.stats.components.StatCard

/**
 * Widget with 4 quick-glance metric tiles arranged in a 2×2 grid.
 */
@Composable
fun QuickStatsWidget(
    todayPomos: Int,
    todayFocusMinutes: Int,
    totalPomos: Int,
    totalFocusMinutes: Int,
    modifier: Modifier = Modifier
) {
    StatCard(
        title    = "Quick Stats",
        modifier = modifier.fillMaxWidth()
    ) {
        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Row(
                modifier            = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                MetricTile(
                    label    = "Today Pomos",
                    value    = todayPomos.toString(),
                    icon     = "🍅",
                    modifier = Modifier.weight(1f)
                )
                MetricTile(
                    label    = "Today Focus",
                    value    = formatMinutes(todayFocusMinutes),
                    icon     = "⏱",
                    modifier = Modifier.weight(1f)
                )
            }
            Row(
                modifier            = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                MetricTile(
                    label    = "Total Pomos",
                    value    = totalPomos.toString(),
                    icon     = "📊",
                    modifier = Modifier.weight(1f)
                )
                MetricTile(
                    label    = "Total Focus",
                    value    = formatMinutes(totalFocusMinutes),
                    icon     = "🎯",
                    modifier = Modifier.weight(1f)
                )
            }
        }
    }
}

@Composable
private fun MetricTile(
    label: String,
    value: String,
    icon: String,
    modifier: Modifier = Modifier
) {
    Box(
        modifier = modifier
            .background(
                color = Color.White.copy(alpha = 0.05f),
                shape = RoundedCornerShape(12.dp)
            )
            .padding(12.dp)
    ) {
        Column {
            Text(text = icon, fontSize = 18.sp)
            Spacer(Modifier.height(4.dp))
            Text(
                text       = value,
                color      = Color.White,
                fontSize   = 20.sp,
                fontWeight = FontWeight.Bold
            )
            Text(
                text     = label,
                color    = Color.White.copy(alpha = 0.5f),
                fontSize = 11.sp
            )
        }
    }
}

private fun formatMinutes(minutes: Int): String {
    val h = minutes / 60
    val m = minutes % 60
    return if (h > 0) "${h}h ${m}m" else "${m}m"
}
```

---

## File 17 — TimeRangeSelector.kt

**Path:** `app/src/main/java/com/jamrah/ui/stats/components/TimeRangeSelector.kt`

```kotlin
package com.jamrah.ui.stats.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.size
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowLeft
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowRight
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.jamrah.data.model.StatsTimeRange
import com.jamrah.ui.stats.StatsEvent

private val ActiveColor   = Color(0xFF8A7CFB)
private val InactiveColor = Color.White.copy(alpha = 0.4f)

/**
 * Top row of the Stats screen:
 *   ← | 7 Days | 4 Weeks | 12 Months | All Time | →
 */
@Composable
fun TimeRangeSelector(
    selectedRange: StatsTimeRange,
    rangeOffset: Int,
    onEvent: (StatsEvent) -> Unit,
    modifier: Modifier = Modifier
) {
    Row(
        modifier          = modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        // Prev arrow
        IconButton(
            onClick = { onEvent(StatsEvent.PrevRange) },
            modifier = Modifier.size(36.dp)
        ) {
            Icon(
                imageVector = Icons.AutoMirrored.Filled.KeyboardArrowLeft,
                contentDescription = "Previous period",
                tint = Color.White.copy(alpha = 0.7f)
            )
        }

        // Range buttons
        Row(horizontalArrangement = Arrangement.spacedBy(0.dp)) {
            StatsTimeRange.entries.forEach { range ->
                val isSelected = range == selectedRange
                TextButton(onClick = { onEvent(StatsEvent.SetTimeRange(range)) }) {
                    Text(
                        text       = range.label,
                        color      = if (isSelected) ActiveColor else InactiveColor,
                        fontSize   = 12.sp,
                        fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal
                    )
                }
            }
        }

        // Next arrow (disabled when at current period)
        IconButton(
            onClick  = { onEvent(StatsEvent.NextRange) },
            enabled  = rangeOffset < 0,
            modifier = Modifier.size(36.dp)
        ) {
            Icon(
                imageVector = Icons.AutoMirrored.Filled.KeyboardArrowRight,
                contentDescription = "Next period",
                tint = if (rangeOffset < 0)
                    Color.White.copy(alpha = 0.7f)
                else
                    Color.White.copy(alpha = 0.2f)
            )
        }
    }
}
```

---

## File 18 — StatsScreen.kt

**Path:** `app/src/main/java/com/jamrah/ui/stats/StatsScreen.kt`

```kotlin
package com.jamrah.ui.stats

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.jamrah.ui.stats.components.TimeRangeSelector
import com.jamrah.ui.stats.widgets.FocusTimeWidget
import com.jamrah.ui.stats.widgets.GoalsProgressWidget
import com.jamrah.ui.stats.widgets.HabitsRateWidget
import com.jamrah.ui.stats.widgets.QuickStatsWidget
import com.jamrah.ui.stats.widgets.TasksCompletedWidget

private val ScreenBackground = Brush.verticalGradient(
    colors = listOf(Color(0xFF0E0C1E), Color(0xFF13111F))
)

/**
 * Top-level Stats screen.
 *
 * Layout:
 *  - TimeRangeSelector pinned at the top
 *  - LazyVerticalGrid of stat widgets (adaptive min 300 dp → 1-2 cols on phone,
 *    2-3 cols on tablet)
 */
@Composable
fun StatsScreen(
    viewModel: StatsViewModel = hiltViewModel()
) {
    val state by viewModel.uiState.collectAsState()

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(ScreenBackground)
    ) {
        if (state.isLoading && state.data.focusBars.isEmpty()) {
            CircularProgressIndicator(
                modifier = Modifier.align(Alignment.Center),
                color    = Color(0xFF8A7CFB)
            )
            return@Box
        }

        if (state.error != null) {
            Text(
                text     = "Error: ${state.error}",
                color    = Color(0xFFFF5E5E),
                fontSize = 14.sp,
                modifier = Modifier
                    .align(Alignment.Center)
                    .padding(24.dp)
            )
            return@Box
        }

        LazyColumn(
            modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(bottom = 24.dp)
        ) {
            // ── Pinned header ─────────────────────────────────────────────────
            item {
                TimeRangeSelector(
                    selectedRange = state.timeRange,
                    rangeOffset   = state.rangeOffset,
                    onEvent       = viewModel::onEvent,
                    modifier      = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 8.dp, vertical = 8.dp)
                )
            }

            // ── Widgets grid ──────────────────────────────────────────────────
            item {
                LazyVerticalGrid(
                    columns = GridCells.Adaptive(minSize = 300.dp),
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 12.dp),
                    contentPadding      = PaddingValues(vertical = 6.dp),
                    verticalArrangement   = Arrangement.spacedBy(12.dp),
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                    // IMPORTANT: nested LazyVerticalGrid inside LazyColumn
                    // requires a fixed height. We use userScrollEnabled = false
                    // and let the outer LazyColumn handle scrolling.
                    userScrollEnabled = false
                ) {
                    item {
                        QuickStatsWidget(
                            todayPomos         = state.data.todayPomos,
                            todayFocusMinutes  = state.data.todayFocusMinutes,
                            totalPomos         = state.data.totalPomos,
                            totalFocusMinutes  = state.data.totalFocusMinutes
                        )
                    }
                    item {
                        FocusTimeWidget(
                            bars     = state.data.focusBars,
                            subtitle = state.rangeLabel
                        )
                    }
                    item {
                        TasksCompletedWidget(
                            bars     = state.data.taskBars,
                            subtitle = state.rangeLabel
                        )
                    }
                    item {
                        HabitsRateWidget(habits = state.data.habitStats)
                    }
                    item {
                        GoalsProgressWidget(goals = state.data.goalStats)
                    }
                }
            }
        }
    }
}
```

> **Nested `LazyVerticalGrid` caveat:** Because `LazyVerticalGrid` is nested
> inside `LazyColumn`, set `userScrollEnabled = false` on the grid and give it
> an explicit height, or use a non-lazy `FlowRow`/`Column` grid alternative to
> avoid unbounded height issues. For simplicity here, `userScrollEnabled =
> false` is set; the outer `LazyColumn` provides scroll behaviour.

---

## File 19 — JamrahApp.kt (additions only)

**Path:** `app/src/main/java/com/jamrah/ui/JamrahApp.kt`

Find the existing tab/navigation setup and add the Stats destination. Only the
diff-relevant portion is shown.

```kotlin
// ── Imports to add ────────────────────────────────────────────────────────────
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.BarChart
import com.jamrah.ui.stats.StatsScreen

// ── Inside the navigation destinations list / NavHost ─────────────────────────

// Add a Stats tab item alongside Tasks, Goals, Pomodoro, Habits:
NavigationBarItem(
    selected = currentDestination == "stats",
    onClick  = { navController.navigate("stats") { launchSingleTop = true } },
    icon     = {
        Icon(
            imageVector        = Icons.Outlined.BarChart,
            contentDescription = "Stats"
        )
    },
    label    = { Text("Stats") }
)

// ── Inside NavHost composable ─────────────────────────────────────────────────
composable("stats") {
    StatsScreen()
}
```

---

## DAO Helper Queries (Required — add if missing)

The following simple queries must exist in their DAOs. Add them if they are not
already present.

### SessionDao.kt

```kotlin
@Query("SELECT COUNT(*) FROM sessions WHERE startTime >= :startMs AND startTime <= :endMs")
suspend fun countSessionsInRange(startMs: Long, endMs: Long): Int

@Query("SELECT COALESCE(SUM(focusMinutes), 0) FROM sessions")
suspend fun sumAllFocusMinutes(): Int

@Query("SELECT COUNT(*) FROM sessions")
suspend fun countAllSessions(): Int
```

### TaskDao.kt

```kotlin
@Query("SELECT COUNT(*) FROM tasks WHERE goalId = :goalId")
suspend fun countTasksForGoal(goalId: Long): Int

@Query("SELECT COUNT(*) FROM tasks WHERE goalId = :goalId AND completed = 1")
suspend fun countCompletedTasksForGoal(goalId: Long): Int
```

### HabitLogDao.kt

```kotlin
@Query(
    """
    SELECT COUNT(*) FROM habit_logs
    WHERE habitId = :habitId AND loggedAt >= :startMs AND loggedAt <= :endMs
    """
)
suspend fun getLogCountByHabit(habitId: Long, startMs: Long, endMs: Long): Int
```

### HabitDao.kt

```kotlin
@Query("SELECT * FROM habits WHERE isArchived = 0")
suspend fun getAllHabitsOnce(): List<Habit>
```

### GoalDao.kt

```kotlin
@Query("SELECT * FROM goals WHERE isArchived = 0")
suspend fun getAllGoalsOnce(): List<Goal>
```

---

## Build & Integration Notes

1. **Room version stays at 4.** No migration script needed — only new `@Query`
   methods on existing tables.
2. **Hilt** automatically satisfies `StatsRepositoryImpl`'s constructor via the
   new binding in `RepositoryModule`.
3. **No internet permission** required — all stats are computed locally.
4. **`StatsUtils`** uses `java.time.*` — ensure `coreLibraryDesugaringEnabled
   = true` in `build.gradle` (app) with `coreLibraryDesugaring
   "com.android.tools.build:desugaring:..."` if `minSdk < 26`.
5. `LazyVerticalGrid` inside `LazyColumn` — use `userScrollEnabled = false` and
   either compute a fixed height or replace with a simple `Column` wrapping
   `FlowRow` (Compose 1.6+) if height calculation is inconvenient.
6. Import `androidx.hilt:hilt-navigation-compose` for `hiltViewModel()` in
   `StatsScreen.kt`.

---

## REVIEW CALL

Before marking Phase 4 complete, a developer must walk through every item in
the checklist below. Check off each item manually in a running build on a
physical device or emulator (API 26+).

---

## ✅ Test Checklist (15 Items)

| # | Test | Expected Result |
|---|------|----------------|
| 1 | **Build success** — clean build with no compilation errors after adding all files. | `./gradlew assembleDebug` exits 0. |
| 2 | **Stats tab visible** — launch the app and tap the Stats tab in the bottom navigation bar. | Stats screen appears, no crash. |
| 3 | **Loading indicator** — open Stats screen with an empty database. | Spinner shows briefly, then empty-state messages appear in widgets. |
| 4 | **Focus Time bars render** — seed at least 5 sessions across different days, then open Stats (7 Days). | `FocusTimeWidget` shows bars of proportional height for each day that has data; empty days show zero-height bar stubs. |
| 5 | **Tasks Completed bars render** — complete 3+ tasks on different days, then open Stats (7 Days). | `TasksCompletedWidget` bars match the completed-task count per day. |
| 6 | **Habit completion rates** — log a habit every day for 5 of 7 days in the current week. | `HabitsRateWidget` shows ≈71% progress bar for that habit; colour matches the habit's configured colour. |
| 7 | **Habit streak** — log a habit for 3 consecutive days ending today. | Streak label shows `🔥3` next to the habit row. |
| 8 | **Goals progress** — create a goal with 4 tasks, complete 2 of them. | `GoalsProgressWidget` shows `2/4` and a 50% progress bar. |
| 9 | **Quick Stats tiles** — complete a session today. | `Today Pomos` tile increments; `Today Focus` tile shows the correct duration. |
| 10 | **Time range: 4 Weeks** — switch to `4 Weeks`. | `FocusTimeWidget` and `TasksCompletedWidget` show 4 week-labelled bars (W{n}); values are summed per week. |
| 11 | **Time range: 12 Months** — switch to `12 Months`. | Both bar charts show up to 12 month-labelled bars with monthly aggregates. |
| 12 | **Time range: All Time** — switch to `All Time`. | Charts display all historical data bucketed by month; prev/next arrows are hidden or disabled. |
| 13 | **Prev/Next navigation** — in `7 Days` view, tap `←` twice then `→` once. | Range label updates correctly (e.g., `14 Jul – 20 Jul` then `21 Jul – 27 Jul`); chart data changes to match the selected week. |
| 14 | **Next arrow disabled at current period** — navigate to the current week. | `→` arrow appears dimmed/disabled; tapping it does nothing. |
| 15 | **No crash on empty habits/goals** — open Stats with no habits and no goals added. | `HabitsRateWidget` shows "No habit data for this period." and `GoalsProgressWidget` shows "No active goals." — no crash or NPE. |
