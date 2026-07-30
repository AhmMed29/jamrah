package com.jamrah.app.ui.tasks

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.jamrah.app.domain.model.TaskItem
import com.jamrah.app.ui.theme.JamrahTextMuted

/**
 * The scrollable list of tasks for the selected day.
 * Mirrors the PC app's #tasks-list section.
 */
@Composable
fun TasksListSection(
    tasks: List<TaskItem>,
    allTasks: List<TaskItem>,
    selectedId: String?,
    expandedIds: Set<String>,
    onSelect: (String) -> Unit,
    onToggleExpand: (String) -> Unit,
    onToggle: (TaskItem) -> Unit,
    onDelete: (String) -> Unit,
    modifier: Modifier = Modifier
) {
    if (tasks.isEmpty()) {
        Box(
            contentAlignment = Alignment.Center,
            modifier = modifier.fillMaxWidth().padding(vertical = 48.dp)
        ) {
            Text("No tasks.", style = MaterialTheme.typography.bodyLarge, color = JamrahTextMuted)
        }
        return
    }

    LazyColumn(modifier = modifier.fillMaxWidth()) {
        items(tasks, key = { "${it.id}_${it.instanceDate}" }) { task ->
            val subtasks = allTasks.filter { it.parentTaskId == task.id }
            val hasSubtasks = subtasks.isNotEmpty()
            val isExpanded = expandedIds.contains(task.id)

            TaskListItem(
                task = task,
                isSelected = task.id == selectedId,
                hasSubtasks = hasSubtasks,
                onSelect = { onSelect(task.id) },
                onToggleExpand = { onToggleExpand(task.id) },
                onToggleComplete = { onToggle(task) },
                onDelete = { onDelete(task.id) }
            )

            // Show subtasks when expanded
            if (hasSubtasks && isExpanded) {
                subtasks.forEach { sub ->
                    TaskListItem(
                        task = sub,
                        isSelected = sub.id == selectedId,
                        hasSubtasks = false,
                        onSelect = { onSelect(sub.id) },
                        onToggleExpand = {},
                        onToggleComplete = { onToggle(sub) },
                        onDelete = { onDelete(sub.id) },
                        modifier = Modifier.padding(start = 36.dp)
                    )
                }
            }
        }
    }
}