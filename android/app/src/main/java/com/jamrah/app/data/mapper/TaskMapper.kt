package com.jamrah.app.data.mapper

import com.jamrah.app.data.local.entity.TaskEntity
import com.jamrah.app.data.remote.dto.CreateTaskDto
import com.jamrah.app.data.remote.dto.TaskDto
import com.jamrah.app.data.remote.dto.UpdateTaskDto
import com.jamrah.app.domain.model.TaskItem

fun TaskEntity.toDomain(): TaskItem = TaskItem(
    id = id, name = name, goalId = goalId,
    completed = completed, createdAt = createdAt,
    parentTaskId = parentTaskId, priority = priority,
    completedAt = completedAt, scheduledTime = scheduledTime,
    recurrence = recurrence, customDays = customDays,
    durationStart = durationStart, durationEnd = durationEnd,
    notes = notes
)

fun TaskItem.toEntity(syncStatus: String = "synced"): TaskEntity = TaskEntity(
    id = id, name = name, goalId = goalId,
    completed = completed, createdAt = createdAt,
    parentTaskId = parentTaskId, priority = priority,
    completedAt = completedAt, scheduledTime = scheduledTime,
    recurrence = recurrence, customDays = customDays,
    durationStart = durationStart, durationEnd = durationEnd,
    notes = notes, syncStatus = syncStatus
)

fun TaskDto.toEntity(): TaskEntity = TaskEntity(
    id = id, name = name, goalId = goalId,
    completed = completed, createdAt = createdAt,
    parentTaskId = parentTaskId, priority = priority,
    completedAt = completedAt, scheduledTime = scheduledTime,
    recurrence = recurrence, customDays = customDays,
    durationStart = durationStart, durationEnd = durationEnd,
    notes = notes, syncStatus = "synced"
)

fun TaskItem.toCreateDto(): CreateTaskDto = CreateTaskDto(
    id = id, name = name, goalId = goalId,
    parentTaskId = parentTaskId, priority = priority,
    scheduledTime = scheduledTime, recurrence = recurrence,
    customDays = customDays, durationStart = durationStart,
    durationEnd = durationEnd, notes = notes
)

fun TaskItem.toUpdateDto(): UpdateTaskDto = UpdateTaskDto(
    name = name, priority = priority,
    scheduledTime = scheduledTime, recurrence = recurrence,
    customDays = customDays, durationStart = durationStart,
    durationEnd = durationEnd, notes = notes
)