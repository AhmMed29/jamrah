package com.jamrah.app.ui.tasks

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.jamrah.app.data.repository.TaskRepository
import com.jamrah.app.domain.model.*
import com.jamrah.app.data.local.preferences.AppPreferences
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.*
import javax.inject.Inject

@HiltViewModel
class TasksViewModel @Inject constructor(
    private val repo: TaskRepository,
    private val appPreferences: AppPreferences
) : ViewModel() {

    private val _state = MutableStateFlow(TasksUiState())
    val state: StateFlow<TasksUiState> = _state.asStateFlow()

    private val dateFmt = SimpleDateFormat("yyyy-MM-dd", Locale.US)
    private val isoFmt  = SimpleDateFormat("yyyy-MM-dd'T'HH:mm", Locale.US)
    private val nowFmt  = SimpleDateFormat("yyyy-MM-dd HH:mm:ss", Locale.US)

    init {
        // Collect all tasks from Room and recompute filtered list on every change
        viewModelScope.launch {
            repo.observeAll().collect { tasks ->
                _state.update { it.copy(tasks = tasks) }
            }
        }
        viewModelScope.launch {
            repo.sync()
        }
    }

    fun onEvent(event: TasksEvent) {
        when (event) {
            is TasksEvent.NavigatePrevDay -> {
                val cal = Calendar.getInstance().apply { time = _state.value.currentDate }
                cal.add(Calendar.DAY_OF_YEAR, -1)
                _state.update { it.copy(currentDate = cal.time) }
            }
            is TasksEvent.NavigateNextDay -> {
                val cal = Calendar.getInstance().apply { time = _state.value.currentDate }
                cal.add(Calendar.DAY_OF_YEAR, 1)
                _state.update { it.copy(currentDate = cal.time) }
            }
            is TasksEvent.NavigateToday -> {
                _state.update { it.copy(currentDate = Date()) }
            }
            is TasksEvent.CycleFilter -> {
                val next = when (_state.value.filterMode) {
                    FilterMode.ALL       -> FilterMode.ACTIVE
                    FilterMode.ACTIVE    -> FilterMode.COMPLETED
                    FilterMode.COMPLETED -> FilterMode.ALL
                }
                _state.update { it.copy(filterMode = next) }
            }
            is TasksEvent.CycleSort -> {
                val next = when (_state.value.sortMode) {
                    SortMode.PRIORITY_DESC -> SortMode.DATE_ASC
                    SortMode.DATE_ASC      -> SortMode.DATE_DESC
                    SortMode.DATE_DESC     -> SortMode.PRIORITY_DESC
                }
                _state.update { it.copy(sortMode = next) }
            }
            is TasksEvent.SelectTask -> {
                _state.update { it.copy(selectedTaskId = event.id) }
            }
            is TasksEvent.CloseDetail -> {
                _state.update { it.copy(selectedTaskId = null) }
            }
            is TasksEvent.ToggleExpanded -> {
                val ids = _state.value.expandedTaskIds.toMutableSet()
                if (ids.contains(event.id)) ids.remove(event.id) else ids.add(event.id)
                _state.update { it.copy(expandedTaskIds = ids) }
            }
            is TasksEvent.ToggleTask -> {
                viewModelScope.launch {
                    val task = event.task
                    if (task.baseId != null && task.instanceDate != null) {
                        // Checking a recurring instance -> create completed override
                        val overrideTask = TaskItem(
                            id = newTaskId(),
                            name = task.name,
                            parentTaskId = task.baseId,
                            completed = 0,
                            scheduledTime = task.instanceDate,
                            priority = task.priority,
                            recurrence = "none",
                            createdAt = nowFmt.format(Date())
                        )
                        repo.createTask(overrideTask)
                        repo.toggleTask(overrideTask.id)
                        repo.sync()
                    } else if (task.parentTaskId != null && task.scheduledTime != null && task.recurrence == "none") {
                        // Unchecking an override -> delete it
                        repo.deleteTask(task.id)
                    } else {
                        repo.toggleTask(task.id)
                    }
                    repo.sync()
                }
            }
            is TasksEvent.DeleteTask -> {
                viewModelScope.launch {
                    repo.deleteTask(event.id)
                    if (_state.value.selectedTaskId == event.id) {
                        _state.update { it.copy(selectedTaskId = null) }
                    }
                    repo.sync()
                }
            }
            is TasksEvent.AddTask -> {
                if (event.name.isBlank()) return
                viewModelScope.launch {
                    val dayKey = dateFmt.format(_state.value.currentDate)
                    val sched = if (event.time.isNotEmpty()) "${dayKey}T${event.time}"
                                else if (event.recurrence != "none") dayKey
                                else null
                    val customDaysJson = if (event.recurrence == "custom" && event.customDays.isNotEmpty())
                        com.google.gson.Gson().toJson(event.customDays) else ""
                    val task = TaskItem(
                        id = newTaskId(),
                        name = event.name,
                        priority = event.priority,
                        scheduledTime = sched,
                        recurrence = event.recurrence,
                        customDays = customDaysJson.ifEmpty { null },
                        createdAt = nowFmt.format(Date())
                    )
                    repo.createTask(task)
                    _state.update { it.copy(selectedTaskId = task.id) }
                    repo.sync()
                }
            }
            is TasksEvent.UpdateTask -> {
                viewModelScope.launch { 
                    repo.updateTask(event.task) 
                    repo.sync()
                }
            }
            is TasksEvent.AddSubtask -> {
                if (event.name.isBlank()) return
                viewModelScope.launch {
                    val subtask = TaskItem(
                        id = newTaskId(), name = event.name,
                        parentTaskId = event.parentId, priority = "none",
                        createdAt = nowFmt.format(Date())
                    )
                    repo.createTask(subtask)
                    repo.sync()
                }
            }
            is TasksEvent.Sync -> {
                viewModelScope.launch {
                    _state.update { it.copy(isSyncing = true, syncError = null) }
                    val result = repo.sync()
                    _state.update { it.copy(
                        isSyncing = false,
                        syncError = result.exceptionOrNull()?.message
                    )}
                }
            }
            is TasksEvent.ClearSyncError -> {
                _state.update { it.copy(syncError = null) }
            }
            is TasksEvent.UpdateServerIp -> {
                appPreferences.serverIpAddress = event.ip
            }
        }
    }

    /** Derived: tasks filtered for today's date, sorted, and expanded */
    fun getFilteredTasks(): List<TaskItem> {
        val s = _state.value
        val dayKey = dateFmt.format(s.currentDate)

        // Only top-level tasks for this computation
        val topLevel = s.tasks.filter { it.parentTaskId == null }

        // Sort
        val sorted = when (s.sortMode) {
            SortMode.PRIORITY_DESC -> topLevel.sortedByDescending { priorityValue(it.priority) }
            SortMode.DATE_ASC      -> topLevel.sortedBy { it.instanceDate ?: it.scheduledTime ?: it.createdAt }
            SortMode.DATE_DESC     -> topLevel.sortedByDescending { it.instanceDate ?: it.scheduledTime ?: it.createdAt }
        }

        // Identify overrides
        val overrides = s.tasks.filter { it.parentTaskId != null && it.scheduledTime != null && it.recurrence == "none" }

        // Expand recurring tasks
        val expanded = expandRecurringTasks(sorted)

        // Filter by current date and remove base recurring task if overridden
        var filtered = expanded.filter { t ->
            val td = (t.instanceDate ?: t.scheduledTime ?: t.createdAt).take(10)
            if (td == dayKey) {
                if (t.baseId != null) {
                    val hasOverride = overrides.any { it.parentTaskId == t.baseId && it.scheduledTime?.take(10) == t.instanceDate }
                    !hasOverride
                } else true
            } else false
        }

        // Add overrides for this day
        val dayOverrides = overrides.filter { it.scheduledTime?.take(10) == dayKey }
        filtered = filtered + dayOverrides

        // Apply filter mode
        filtered = when (s.filterMode) {
            FilterMode.ACTIVE    -> filtered.filter { it.completed == 0 }
            FilterMode.COMPLETED -> filtered.filter { it.completed == 1 }
            FilterMode.ALL       -> filtered
        }

        return filtered
    }

    fun getSubtasks(parentId: String): List<TaskItem> =
        _state.value.tasks.filter { it.parentTaskId == parentId }
}