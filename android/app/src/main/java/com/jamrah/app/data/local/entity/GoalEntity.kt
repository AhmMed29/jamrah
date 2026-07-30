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