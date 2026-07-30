package com.jamrah.app.ui.goals

import androidx.compose.foundation.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.jamrah.app.ui.components.EmptyState
import com.jamrah.app.ui.theme.JamrahBackground
import com.jamrah.app.ui.theme.JamrahBorderStrong
import com.jamrah.app.ui.theme.JamrahText

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun GoalsScreen(viewModel: GoalsViewModel = hiltViewModel()) {
    val state by viewModel.state.collectAsState()
    val addSheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    val editSheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)

    // Group progress dates per goal (last 28 day keys that have entries)
    // In a full impl, this comes from GoalProgressEntity; for now derive from progressMap > 0
    val topLevelGoals = state.goals.filter { it.parentGoalId == null }

    Scaffold(
        containerColor = JamrahBackground,
        topBar = {
            Column {
                Row(
                    modifier = Modifier.fillMaxWidth().padding(horizontal = 24.dp, vertical = 16.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text("Goals", style = MaterialTheme.typography.headlineLarge, color = JamrahText)
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        if (state.isSyncing) {
                            CircularProgressIndicator(modifier = Modifier.size(16.dp), strokeWidth = 2.dp)
                            Spacer(Modifier.width(8.dp))
                        }
                        IconButton(onClick = { viewModel.onEvent(GoalsEvent.ShowAddSheet) }) {
                            Icon(Icons.Default.Add, contentDescription = "Add goal",
                                tint = JamrahBorderStrong)
                        }
                    }
                }
                HorizontalDivider()
            }
        },
        floatingActionButton = {
            FloatingActionButton(
                onClick = { viewModel.onEvent(GoalsEvent.ShowAddSheet) },
                containerColor = JamrahBorderStrong
            ) {
                Icon(Icons.Default.Add, contentDescription = "Add goal",
                    tint = androidx.compose.ui.graphics.Color.White)
            }
        }
    ) { padding ->
        if (topLevelGoals.isEmpty()) {
            EmptyState(
                icon = "🎯",
                title = "No goals yet",
                subtitle = "Tap + to create your first goal",
                modifier = Modifier.padding(padding)
            )
        } else {
            LazyColumn(
                contentPadding = PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp),
                modifier = Modifier.padding(padding)
            ) {
                items(topLevelGoals, key = { it.id }) { goal ->
                    val tasks = state.tasks.filter { it.goalId == goal.id && it.parentTaskId == null }
                    val progress = state.progressMap[goal.id] ?: 0
                    GoalCard(
                        goal = goal,
                        progress = progress,
                        tasks = tasks,
                        progressDates = emptySet(),   // Phase 4 enhancement
                        onEdit = { viewModel.onEvent(GoalsEvent.EditGoal(goal)) },
                        onDelete = { viewModel.onEvent(GoalsEvent.DeleteGoal(goal.id)) },
                        onToggleTask = { viewModel.onEvent(GoalsEvent.ToggleTask(it)) },
                        onDeleteTask = { viewModel.onEvent(GoalsEvent.DeleteTask(it)) },
                        onAddTask = { viewModel.onEvent(GoalsEvent.AddTaskToGoal(goal.id, it)) }
                    )
                }
            }
        }
    }

    // Add sheet
    if (state.showAddSheet) {
        GoalFormSheet(
            sheetState = addSheetState,
            onDismiss = { viewModel.onEvent(GoalsEvent.HideAddSheet) },
            onSave = { name, color, durationType, durationValue, startDate, endDate ->
                viewModel.onEvent(GoalsEvent.CreateGoal(name, color, durationType, durationValue, startDate, endDate))
            }
        )
    }

    // Edit sheet
    state.editingGoal?.let { goal ->
        GoalFormSheet(
            existingGoal = goal,
            sheetState = editSheetState,
            onDismiss = { viewModel.onEvent(GoalsEvent.HideEditSheet) },
            onSave = { name, color, durationType, durationValue, startDate, endDate ->
                viewModel.onEvent(GoalsEvent.UpdateGoal(
                    goal.copy(name = name, color = color, durationType = durationType,
                        durationValue = durationValue, startDate = startDate, endDate = endDate)
                ))
            }
        )
    }
}