package com.jamrah.app.ui.tasks

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.jamrah.app.ui.theme.JamrahBackground

/**
 * Root Tasks screen.
 * Layout:
 *   - TasksHeader (fixed top)
 *   - NewTaskCard
 *   - TasksListSection (scrollable)
 *   - TaskDetailSheet (bottom sheet, shown when a task is selected)
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TasksScreen(
    viewModel: TasksViewModel = hiltViewModel()
) {
    val state by viewModel.state.collectAsState()
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    var showSettings by remember { mutableStateOf(false) }

    val filteredTasks = remember(state.tasks, state.currentDate, state.filterMode, state.sortMode) {
        viewModel.getFilteredTasks()
    }

    val selectedTask = remember(state.selectedTaskId, state.tasks) {
        state.selectedTaskId?.let { id -> state.tasks.find { it.id == id } }
    }

    val subtasks = remember(state.selectedTaskId, state.tasks) {
        state.selectedTaskId?.let { id -> viewModel.getSubtasks(id) } ?: emptyList()
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(JamrahBackground)
    ) {
        Column(modifier = Modifier.fillMaxSize()) {
            // Header
            TasksHeader(
                currentDate  = state.currentDate,
                filterMode   = state.filterMode,
                sortMode     = state.sortMode,
                isSyncing    = state.isSyncing,
                onPrevDay    = { viewModel.onEvent(TasksEvent.NavigatePrevDay) },
                onNextDay    = { viewModel.onEvent(TasksEvent.NavigateNextDay) },
                onToday      = { viewModel.onEvent(TasksEvent.NavigateToday) },
                onCycleFilter = { viewModel.onEvent(TasksEvent.CycleFilter) },
                onCycleSort   = { viewModel.onEvent(TasksEvent.CycleSort) },
                onSync        = { viewModel.onEvent(TasksEvent.Sync) },
                onSettingsClick = { showSettings = true }
            )

            // Scrollable body
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(horizontal = 16.dp)
            ) {
                Spacer(Modifier.height(16.dp))

                // New task card
                NewTaskCard(
                    onAdd = { name, time, recurrence, priority, customDays ->
                        viewModel.onEvent(TasksEvent.AddTask(name, time, recurrence, priority, customDays))
                    }
                )

                Spacer(Modifier.height(16.dp))

                // Task list
                TasksListSection(
                    tasks       = filteredTasks,
                    allTasks    = state.tasks,
                    selectedId  = state.selectedTaskId,
                    expandedIds = state.expandedTaskIds,
                    onSelect    = { viewModel.onEvent(TasksEvent.SelectTask(it)) },
                    onToggleExpand = { viewModel.onEvent(TasksEvent.ToggleExpanded(it)) },
                    onToggle    = { viewModel.onEvent(TasksEvent.ToggleTask(it)) },
                    onDelete    = { viewModel.onEvent(TasksEvent.DeleteTask(it)) }
                )
            }
        }

        // Sync error snackbar
        state.syncError?.let { err ->
            LaunchedEffect(err) {
                kotlinx.coroutines.delay(3000)
                viewModel.onEvent(TasksEvent.ClearSyncError)
            }
            Snackbar(
                modifier = Modifier.padding(16.dp).align(androidx.compose.ui.Alignment.BottomStart)
            ) {
                Text("Sync error: $err")
            }
        }
    }

    // Settings Dialog
    if (showSettings) {
        val context = androidx.compose.ui.platform.LocalContext.current
        var ipInput by remember { mutableStateOf("") }
        
        LaunchedEffect(Unit) {
            val prefs = context.getSharedPreferences("jamrah_prefs", android.content.Context.MODE_PRIVATE)
            ipInput = prefs.getString("server_ip", "10.0.2.2") ?: "10.0.2.2"
        }

        AlertDialog(
            onDismissRequest = { showSettings = false },
            title = { Text("Network Sync Settings") },
            text = {
                Column {
                    Text("Enter the Local IP Address of your PC to sync tasks over Wi-Fi.")
                    Spacer(Modifier.height(8.dp))
                    OutlinedTextField(
                        value = ipInput,
                        onValueChange = { ipInput = it },
                        label = { Text("PC IP Address") },
                        singleLine = true
                    )
                }
            },
            confirmButton = {
                TextButton(onClick = {
                    viewModel.onEvent(TasksEvent.UpdateServerIp(ipInput))
                    showSettings = false
                }) {
                    Text("Save")
                }
            },
            dismissButton = {
                TextButton(onClick = { showSettings = false }) {
                    Text("Cancel")
                }
            }
        )
    }

    // Detail bottom sheet
    if (selectedTask != null) {
        TaskDetailSheet(
            task            = selectedTask,
            subtasks        = subtasks,
            sheetState      = sheetState,
            onClose         = { viewModel.onEvent(TasksEvent.CloseDetail) },
            onToggle        = { viewModel.onEvent(TasksEvent.ToggleTask(selectedTask)) },
            onDelete        = { viewModel.onEvent(TasksEvent.DeleteTask(selectedTask.id)) },
            onUpdate        = { viewModel.onEvent(TasksEvent.UpdateTask(it)) },
            onAddSubtask    = { viewModel.onEvent(TasksEvent.AddSubtask(selectedTask.id, it)) },
            onDeleteSubtask = { viewModel.onEvent(TasksEvent.DeleteTask(it)) },
            onToggleSubtask = { subtaskId -> 
                val st = subtasks.find { it.id == subtaskId }
                if (st != null) viewModel.onEvent(TasksEvent.ToggleTask(st))
            }
        )
    }
}