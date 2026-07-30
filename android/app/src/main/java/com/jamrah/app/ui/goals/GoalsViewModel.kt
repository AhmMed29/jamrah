package com.jamrah.app.ui.goals

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.jamrah.app.data.repository.GoalRepository
import com.jamrah.app.data.repository.TaskRepository
import com.jamrah.app.domain.model.*
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.*
import javax.inject.Inject

@HiltViewModel
class GoalsViewModel @Inject constructor(
    private val goalRepo: GoalRepository,
    private val taskRepo: TaskRepository
) : ViewModel() {

    private val _state = MutableStateFlow(GoalsUiState())
    val state: StateFlow<GoalsUiState> = _state.asStateFlow()

    private val nowFmt = SimpleDateFormat("yyyy-MM-dd HH:mm:ss", Locale.US)
    private val dateFmt = SimpleDateFormat("yyyy-MM-dd", Locale.US)

    init {
        viewModelScope.launch {
            combine(goalRepo.observeAll(), taskRepo.observeAll()) { goals, tasks ->
                val cache = mutableMapOf<String, Double>()
                val progressMap = goals.associate { g ->
                    g.id to (computeGoalProgress(g.id, tasks, goals, cache) * 100).toInt()
                }
                GoalsUiState(goals = goals, tasks = tasks, progressMap = progressMap)
            }.collect { newState ->
                _state.update { it.copy(
                    goals = newState.goals,
                    tasks = newState.tasks,
                    progressMap = newState.progressMap
                )}
            }
        }
    }

    fun onEvent(event: GoalsEvent) {
        when (event) {
            GoalsEvent.ShowAddSheet  -> _state.update { it.copy(showAddSheet = true) }
            GoalsEvent.HideAddSheet  -> _state.update { it.copy(showAddSheet = false) }
            is GoalsEvent.EditGoal   -> _state.update { it.copy(editingGoal = event.goal) }
            GoalsEvent.HideEditSheet -> _state.update { it.copy(editingGoal = null) }

            is GoalsEvent.CreateGoal -> viewModelScope.launch {
                val days = computeDurationDays(event.durationType, event.durationValue ?: 1)
                val end = if (event.endDate.isNotEmpty()) event.endDate else {
                    val cal = Calendar.getInstance()
                    if (event.startDate.isNotEmpty()) {
                        try { cal.time = dateFmt.parse(event.startDate)!! } catch (e: Exception) {}
                    }
                    cal.add(Calendar.DAY_OF_YEAR, days)
                    dateFmt.format(cal.time)
                }
                val goal = Goal(
                    id = newGoalId(), name = event.name, color = event.color,
                    startDate = event.startDate, endDate = end, duration = days,
                    durationType = event.durationType, durationValue = event.durationValue,
                    createdAt = nowFmt.format(Date())
                )
                goalRepo.createGoal(goal)
                _state.update { it.copy(showAddSheet = false) }
            }

            is GoalsEvent.UpdateGoal -> viewModelScope.launch {
                goalRepo.updateGoal(event.goal)
                _state.update { it.copy(editingGoal = null) }
            }

            is GoalsEvent.DeleteGoal -> viewModelScope.launch {
                goalRepo.deleteGoal(event.id)
                if (_state.value.editingGoal?.id == event.id)
                    _state.update { it.copy(editingGoal = null) }
            }

            is GoalsEvent.ToggleTask -> viewModelScope.launch { taskRepo.toggleTask(event.taskId) }
            is GoalsEvent.DeleteTask -> viewModelScope.launch { taskRepo.deleteTask(event.taskId) }

            is GoalsEvent.AddTaskToGoal -> viewModelScope.launch {
                if (event.name.isBlank()) return@launch
                val task = TaskItem(
                    id = newTaskId(), name = event.name, goalId = event.goalId,
                    createdAt = nowFmt.format(Date())
                )
                taskRepo.createTask(task)
            }

            GoalsEvent.Sync -> viewModelScope.launch {
                _state.update { it.copy(isSyncing = true, syncError = null) }
                val result = goalRepo.sync()
                _state.update { it.copy(
                    isSyncing = false,
                    syncError = result.exceptionOrNull()?.message
                )}
            }
        }
    }
}