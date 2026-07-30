package com.jamrah.app.ui.goals

import com.jamrah.app.domain.model.Goal
import com.jamrah.app.domain.model.TaskItem

data class GoalsUiState(
    val goals: List<Goal>       = emptyList(),
    val tasks: List<TaskItem>   = emptyList(),
    val progressMap: Map<String, Int> = emptyMap(),   // goalId -> 0..100
    val isLoading: Boolean      = false,
    val isSyncing: Boolean      = false,
    val syncError: String?      = null,
    val showAddSheet: Boolean   = false,
    val editingGoal: Goal?      = null
)

sealed class GoalsEvent {
    object ShowAddSheet                   : GoalsEvent()
    object HideAddSheet                   : GoalsEvent()
    data class EditGoal(val goal: Goal)   : GoalsEvent()
    object HideEditSheet                  : GoalsEvent()
    data class CreateGoal(
        val name: String, val color: String,
        val durationType: String, val durationValue: Int?,
        val startDate: String, val endDate: String
    )                                     : GoalsEvent()
    data class UpdateGoal(val goal: Goal) : GoalsEvent()
    data class DeleteGoal(val id: String) : GoalsEvent()
    data class ToggleTask(val taskId: String) : GoalsEvent()
    data class DeleteTask(val taskId: String) : GoalsEvent()
    data class AddTaskToGoal(val goalId: String, val name: String) : GoalsEvent()
    object Sync                           : GoalsEvent()
}