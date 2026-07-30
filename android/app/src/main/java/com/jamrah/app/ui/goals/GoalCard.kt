package com.jamrah.app.ui.goals

import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.jamrah.app.domain.model.*
import com.jamrah.app.ui.components.TaskCheckbox
import com.jamrah.app.ui.theme.*

@Composable
fun GoalCard(
    goal: Goal,
    progress: Int,
    tasks: List<TaskItem>,
    progressDates: Set<String>,
    onEdit: () -> Unit,
    onDelete: () -> Unit,
    onToggleTask: (String) -> Unit,
    onDeleteTask: (String) -> Unit,
    onAddTask: (String) -> Unit,
    modifier: Modifier = Modifier
) {
    val goalColor = runCatching {
        Color(android.graphics.Color.parseColor(goal.color))
    }.getOrDefault(Color(0xFF3B82F6))
    val statusStyle = getStatusStyle(goal.status)
    val animatedProgress by animateFloatAsState(
        targetValue = progress / 100f,
        animationSpec = tween(600),
        label = "goal_progress"
    )
    var newTaskName by remember { mutableStateOf("") }

    Card(
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = JamrahCard),
        border = BorderStroke(1.dp, Color(0xFFF3F4F6)),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
        modifier = modifier.fillMaxWidth()
    ) {
        Column(modifier = Modifier.padding(20.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {

            // ── Header: color dot + name + edit/delete ──
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween,
                modifier = Modifier.fillMaxWidth()
            ) {
                Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.weight(1f)) {
                    Box(modifier = Modifier.size(12.dp).clip(CircleShape).background(goalColor))
                    Spacer(Modifier.width(8.dp))
                    Text(
                        text = goal.name,
                        style = MaterialTheme.typography.bodyLarge,
                        color = JamrahText,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                }
                Row {
                    IconButton(onClick = onEdit, modifier = Modifier.size(32.dp)) {
                        Icon(Icons.Outlined.Edit, contentDescription = "Edit goal",
                            tint = JamrahTextMuted, modifier = Modifier.size(16.dp))
                    }
                    IconButton(onClick = onDelete, modifier = Modifier.size(32.dp)) {
                        Icon(Icons.Outlined.Close, contentDescription = "Delete goal",
                            tint = Color(0xFFEF4444), modifier = Modifier.size(16.dp))
                    }
                }
            }

            // ── Progress section ──
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Row(
                    horizontalArrangement = Arrangement.SpaceBetween,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    // Status badge
                    Surface(
                        shape = RoundedCornerShape(12.dp),
                        color = Color(statusStyle.bgColor)
                    ) {
                        Text(
                            text = statusStyle.label,
                            style = MaterialTheme.typography.bodyMedium,
                            color = Color(statusStyle.textColor),
                            modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp)
                        )
                    }
                    Text(
                        text = "$progress%",
                        style = MaterialTheme.typography.bodyMedium,
                        color = JamrahTextMuted
                    )
                }
                // Progress bar
                LinearProgressIndicator(
                    progress = { animatedProgress },
                    modifier = Modifier.fillMaxWidth().height(8.dp).clip(RoundedCornerShape(4.dp)),
                    color = goalColor,
                    trackColor = Color(0xFFF3F4F6)
                )
                // Heatmap
                GoalHeatmap(goalColor = goal.color, progressDates = progressDates)
            }

            // ── Meta: dates + duration ──
            Row(
                horizontalArrangement = Arrangement.SpaceBetween,
                modifier = Modifier.fillMaxWidth()
            ) {
                Text(
                    text = "${formatGoalDate(goal.startDate)} → ${formatGoalDate(goal.endDate)}",
                    style = MaterialTheme.typography.bodyMedium,
                    color = JamrahTextMuted
                )
                Text(
                    text = formatDuration(goal),
                    style = MaterialTheme.typography.bodyMedium,
                    color = JamrahTextMuted
                )
            }

            // ── Tasks section ──
            HorizontalDivider(color = Color(0xFFF3F4F6))
            Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                Row(
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text("Tasks", style = MaterialTheme.typography.bodyMedium, color = JamrahText)
                    TextButton(
                        onClick = { if (newTaskName.isBlank()) {} },
                        contentPadding = PaddingValues(horizontal = 8.dp, vertical = 2.dp)
                    ) {
                        Icon(Icons.Outlined.Add, contentDescription = "Add task",
                            modifier = Modifier.size(16.dp), tint = Color(0xFF3B82F6))
                        Spacer(Modifier.width(4.dp))
                        Text("Add", color = Color(0xFF3B82F6), style = MaterialTheme.typography.bodyMedium)
                    }
                }

                if (tasks.isEmpty()) {
                    Text("No tasks yet", style = MaterialTheme.typography.bodyMedium, color = JamrahTextMuted)
                } else {
                    tasks.take(5).forEach { task ->
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            TaskCheckbox(
                                checked = task.completed == 1,
                                onToggle = { onToggleTask(task.id) },
                                size = 16.dp
                            )
                            Spacer(Modifier.width(8.dp))
                            Text(
                                text = task.name,
                                style = MaterialTheme.typography.bodyMedium,
                                color = if (task.completed == 1) JamrahTextMuted else JamrahText,
                                textDecoration = if (task.completed == 1) TextDecoration.LineThrough else null,
                                modifier = Modifier.weight(1f),
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis
                            )
                            IconButton(onClick = { onDeleteTask(task.id) }, modifier = Modifier.size(28.dp)) {
                                Icon(Icons.Outlined.Close, contentDescription = "Delete task",
                                    tint = JamrahTextMuted, modifier = Modifier.size(14.dp))
                            }
                        }
                    }
                }

                // Add task input
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedTextField(
                        value = newTaskName,
                        onValueChange = { newTaskName = it },
                        placeholder = { Text("New task...", style = MaterialTheme.typography.bodyMedium) },
                        singleLine = true,
                        textStyle = MaterialTheme.typography.bodyMedium,
                        modifier = Modifier.weight(1f)
                    )
                    IconButton(
                        onClick = {
                            if (newTaskName.isNotBlank()) {
                                onAddTask(newTaskName.trim())
                                newTaskName = ""
                            }
                        }
                    ) {
                        Icon(Icons.Outlined.Add, contentDescription = "Add",
                            tint = Color(0xFF3B82F6))
                    }
                }
            }
        }
    }
}