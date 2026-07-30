package com.jamrah.app.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

/**
 * Room entity for a task.
 * Table name "tasks" matches the PC backend schema exactly.
 * Column names use camelCase to match the JSON from the API.
 */
@Entity(tableName = "tasks")
data class TaskEntity(
    @PrimaryKey
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

    // Sync metadata (not in PC schema — local only)
    val updatedAt: Long = System.currentTimeMillis(), // epoch ms
    val syncStatus: String = "synced"  // "synced" | "pending_create" | "pending_update" | "pending_delete"
)