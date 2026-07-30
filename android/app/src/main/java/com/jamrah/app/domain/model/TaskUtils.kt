package com.jamrah.app.domain.model

import java.text.SimpleDateFormat
import java.util.*

private val sdf = SimpleDateFormat("yyyy-MM-dd", Locale.US)

val DAY_NAMES = arrayOf("Sun","Mon","Tue","Wed","Thu","Fri","Sat")
val MONTH_NAMES = arrayOf("Jan","Feb","Mar","Apr","May","Jun",
    "Jul","Aug","Sep","Oct","Nov","Dec")

/** Generate a new unique task ID matching the PC app's format */
fun newTaskId(): String {
    val random = (Math.random() * 1e10).toLong().toString(36).take(6)
    return "task_${System.currentTimeMillis()}_$random"
}

/** Format a Date to "yyyy-MM-dd" */
fun dateKey(date: Date): String = sdf.format(date)

/** Today's key */
fun todayKey(): String = dateKey(Date())

/** Priority numeric value for sorting */
fun priorityValue(p: String): Int = when (p) {
    "High"   -> 3
    "Medium" -> 2
    "Low"    -> 1
    else     -> 0
}

/** Color resource ID for a priority string */
fun recLabel(recurrence: String?, customDays: String?): String {
    if (recurrence.isNullOrEmpty() || recurrence == "none") return ""
    if (recurrence == "custom" && !customDays.isNullOrEmpty()) {
        return try {
            val days = com.google.gson.Gson().fromJson(customDays, Array<Int>::class.java)
            "Custom (${days.joinToString(", ") { DAY_NAMES[it] }})"
        } catch (e: Exception) { "Custom" }
    }
    return when (recurrence) {
        "daily"   -> "Daily"
        "weekly"  -> "Weekly"
        "monthly" -> "Monthly"
        else      -> recurrence
    }
}

/**
 * Expand recurring tasks — mirrors the PC expandRecurringTasks() function.
 * Returns the expanded list (including copies for each occurrence date).
 */
fun expandRecurringTasks(tasks: List<TaskItem>): List<TaskItem> {
    val today = Calendar.getInstance().apply {
        set(Calendar.HOUR_OF_DAY, 0); set(Calendar.MINUTE, 0)
        set(Calendar.SECOND, 0); set(Calendar.MILLISECOND, 0)
    }.time
    val todayK = dateKey(today)

    val expanded = mutableListOf<TaskItem>()
    tasks.forEach { task ->
        if (task.recurrence.isNullOrEmpty() || task.recurrence == "none" || task.parentTaskId != null) {
            expanded.add(task); return@forEach
        }

        val startStr = task.durationStart
            ?: (task.createdAt.take(10).ifEmpty { task.scheduledTime?.take(10) ?: todayK })
        val endStr = task.durationEnd

        val cal = Calendar.getInstance()
        val startCal = Calendar.getInstance()
        try { startCal.time = sdf.parse(startStr) ?: today }
        catch (e: Exception) { startCal.time = today }

        val endCal = Calendar.getInstance()
        try {
            if (!endStr.isNullOrEmpty()) endCal.time = sdf.parse(endStr)!!
            else { endCal.time = today; endCal.add(Calendar.YEAR, 1) }
        } catch (e: Exception) {
            endCal.time = today; endCal.add(Calendar.YEAR, 1)
        }

        cal.time = startCal.time
        var count = 0
        while (!cal.time.after(endCal.time) && count < 2000) {
            val dk = dateKey(cal.time)
            if (dk >= todayK) {
                val parsed = if (!task.customDays.isNullOrEmpty()) {
                    try { com.google.gson.Gson().fromJson(task.customDays, Array<Int>::class.java).toList() }
                    catch (e: Exception) { emptyList() }
                } else emptyList<Int>()

                val dayOfWeek = cal.get(Calendar.DAY_OF_WEEK) - 1 // 0=Sun
                val shouldInclude = when (task.recurrence) {
                    "daily"   -> true
                    "weekly"  -> true
                    "monthly" -> true
                    "custom"  -> parsed.contains(dayOfWeek)
                    else      -> false
                }
                if (shouldInclude) {
                    expanded.add(task.copy(instanceDate = dk, baseId = task.id))
                }
            }
            when (task.recurrence) {
                "daily"   -> cal.add(Calendar.DAY_OF_YEAR, 1)
                "weekly"  -> cal.add(Calendar.WEEK_OF_YEAR, 1)
                "monthly" -> cal.add(Calendar.MONTH, 1)
                "custom"  -> cal.add(Calendar.DAY_OF_YEAR, 1)
                else      -> break
            }
            count++
        }
    }
    return expanded
}