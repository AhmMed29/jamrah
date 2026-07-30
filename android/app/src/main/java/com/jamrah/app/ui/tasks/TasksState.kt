package com.jamrah.app.ui.tasks

import com.jamrah.app.domain.model.TaskItem
import java.util.Date

enum class FilterMode { ALL, ACTIVE, COMPLETED }
enum class SortMode   { PRIORITY_DESC, DATE_ASC, DATE_DESC }

data class TasksUiState(
    val currentDate: Date       = Date(),
    val tasks: List<TaskItem>   = emptyList(),
    val filterMode: FilterMode  = FilterMode.ALL,
    val sortMode: SortMode      = SortMode.PRIORITY_DESC,
    val selectedTaskId: String? = null,
    val isLoading: Boolean      = false,
    val isSyncing: Boolean      = false,
    val syncError: String?      = null,
    val newTaskName: String     = "",
    val newTaskTime: String     = "",        // "HH:mm"
    val newTaskRecurrence: String = "none",
    val newTaskPriority: String   = "none",
    val newTaskCustomDays: List<Int> = emptyList(),
    val showNewOptions: Boolean   = false,
    val expandedTaskIds: Set<String> = emptySet()
)

sealed class TasksEvent {
    object NavigatePrevDay : TasksEvent()
    object NavigateNextDay : TasksEvent()
    object NavigateToday   : TasksEvent()
    data class SelectTask(val id: String)     : TasksEvent()
    data class ToggleTask(val task: TaskItem)     : TasksEvent()
    data class DeleteTask(val id: String)     : TasksEvent()
    data class ToggleExpanded(val id: String) : TasksEvent()
    object CycleFilter     : TasksEvent()
    object CycleSort       : TasksEvent()
    data class AddTask(
        val name: String, val time: String, val recurrence: String,
        val priority: String, val customDays: List<Int>
    ) : TasksEvent()
    data class UpdateTask(val task: TaskItem) : TasksEvent()
    data class AddSubtask(val parentId: String, val name: String) : TasksEvent()
    object Sync            : TasksEvent()
    object CloseDetail     : TasksEvent()
    object ClearSyncError  : TasksEvent()
    data class UpdateServerIp(val ip: String) : TasksEvent()
}