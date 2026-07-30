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