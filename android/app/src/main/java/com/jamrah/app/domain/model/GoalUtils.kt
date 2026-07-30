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