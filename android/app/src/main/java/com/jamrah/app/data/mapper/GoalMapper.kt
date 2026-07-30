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