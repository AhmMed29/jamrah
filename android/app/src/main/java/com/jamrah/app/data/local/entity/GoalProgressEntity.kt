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