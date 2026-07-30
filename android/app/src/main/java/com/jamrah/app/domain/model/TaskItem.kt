package com.jamrah.app.domain.model

/**
 * Domain model for a Task.
 * Matches the PC backend entity exactly:
 *   - String IDs matching format "task_{timestamp}_{random}"
 *   - completed as Int (0 = pending, 1 = done) — matches SQLite default
 *   - priority as String ("none" | "Low" | "Medium" | "High")
 *   - recurrence as String ("none" | "daily" | "weekly" | "monthly" | "custom")
 *   - customDays as JSON string e.g. "[0,1,4]" (day-of-week indices, Sun=0)
 *   - scheduledTime as "yyyy-MM-dd" or "yyyy-MM-ddTHH:mm"
 */
data class TaskItem(
    val id: String,
    val name: String,
    val goalId: String? = null,
    val completed: Int = 0,
    val createdAt: String,
    val parentTaskId: String? = null,
    val priority: String = "none",
    val completedAt: String? = null,
    val scheduledTime: String? = null,
    val recurrence: String? = null,
    val customDays: String? = null,
    val durationStart: String? = null,
    val durationEnd: String? = null,
    val notes: String? = null,

    // Transient — set locally when expanding recurring tasks
    val instanceDate: String? = null,
    val baseId: String? = null
)