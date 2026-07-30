package com.jamrah.app.ui.tasks

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Close
import androidx.compose.material.icons.outlined.Delete
import androidx.compose.material.icons.outlined.Edit
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.unit.dp
import com.jamrah.app.domain.model.TaskItem
import com.jamrah.app.domain.model.MONTH_NAMES
import com.jamrah.app.domain.model.recLabel
import com.jamrah.app.ui.components.PriorityDot
import com.jamrah.app.ui.components.TaskCheckbox
import com.jamrah.app.ui.theme.*

/**
 * Mirrors the PC app's task detail panel, shown as a ModalBottomSheet on mobile.
 *
 * View mode shows:
 *   - Checkbox + Title + Close button
 *   - Meta (priority dot + label, time, recurrence, date, duration)
 *   - Notes (read-only)
 *   - Subtasks list
 *   - Edit / Delete buttons
 *
 * Edit mode shows all editable fields.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TaskDetailSheet(
    task: TaskItem,
    subtasks: List<TaskItem>,
    sheetState: SheetState,
    onClose: () -> Unit,
    onToggle: () -> Unit,
    onDelete: () -> Unit,
    onUpdate: (TaskItem) -> Unit,
    onAddSubtask: (String) -> Unit,
    onDeleteSubtask: (String) -> Unit,
    onToggleSubtask: (String) -> Unit
) {
    var isEditMode by remember { mutableStateOf(false) }

    // Edit state — mirrors all task fields
    var editName       by remember(task.id) { mutableStateOf(task.name) }
    var editPriority   by remember(task.id) { mutableStateOf(task.priority) }
    var editTime       by remember(task.id) { mutableStateOf(task.scheduledTime?.substringAfter('T', "") ?: "") }
    var editRecurrence by remember(task.id) { mutableStateOf(task.recurrence ?: "none") }
    var editCustomDays by remember(task.id) {
        mutableStateOf(
            if (!task.customDays.isNullOrEmpty()) {
                try { com.google.gson.Gson().fromJson(task.customDays, Array<Int>::class.java).toList() }
                catch (e: Exception) { emptyList() }
            } else emptyList()
        )
    }
    var editDurationStart by remember(task.id) { mutableStateOf(task.durationStart ?: "") }
    var editDurationEnd   by remember(task.id) { mutableStateOf(task.durationEnd ?: "") }
    var editNotes         by remember(task.id) { mutableStateOf(task.notes ?: "") }
    var newSubtaskName    by remember { mutableStateOf("") }

    ModalBottomSheet(
        onDismissRequest = onClose,
        sheetState       = sheetState,
        containerColor   = MaterialTheme.colorScheme.surface,
        dragHandle       = { BottomSheetDefaults.DragHandle() }
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 24.dp, vertical = 8.dp)
                .verticalScroll(rememberScrollState())
        ) {
            // ── Title Row ──
            Row(verticalAlignment = Alignment.Top) {
                TaskCheckbox(
                    checked  = task.completed == 1,
                    onToggle = onToggle,
                    size     = 28.dp,
                    modifier = Modifier.padding(top = 4.dp)
                )
                Spacer(Modifier.width(12.dp))
                if (isEditMode) {
                    OutlinedTextField(
                        value = editName,
                        onValueChange = { editName = it },
                        textStyle = MaterialTheme.typography.displaySmall,
                        colors = OutlinedTextFieldDefaults.colors(
                            unfocusedBorderColor = JamrahBorder,
                            focusedBorderColor = JamrahBorderStrong
                        ),
                        modifier = Modifier.weight(1f)
                    )
                } else {
                    Text(
                        text = task.name,
                        style = MaterialTheme.typography.displaySmall,
                        textDecoration = if (task.completed == 1) TextDecoration.LineThrough else null,
                        color = if (task.completed == 1) JamrahTextMuted else JamrahText,
                        modifier = Modifier.weight(1f)
                    )
                }
                Spacer(Modifier.width(8.dp))
                IconButton(onClick = onClose) {
                    Icon(Icons.Outlined.Close, contentDescription = "Close", tint = JamrahTextMuted)
                }
            }

            Spacer(Modifier.height(16.dp))

            // ── Meta row ──
            val pLabel = if (task.priority.isNotEmpty() && task.priority != "none") task.priority else "None"
            Row(
                horizontalArrangement = Arrangement.spacedBy(16.dp),
                verticalAlignment     = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    PriorityDot(task.priority, 10.dp)
                    Text(pLabel, style = MaterialTheme.typography.bodyMedium, color = JamrahTextMuted)
                }
                task.scheduledTime?.let { st ->
                    val t = st.substringAfter('T', "")
                    if (t.isNotEmpty()) Text(t.take(5), style = MaterialTheme.typography.bodyMedium, color = JamrahTextMuted)
                }
                val rec = recLabel(task.recurrence, task.customDays)
                if (rec.isNotEmpty()) Text(rec, style = MaterialTheme.typography.bodyMedium, color = JamrahTextMuted)
            }

            Spacer(Modifier.height(24.dp))

            if (isEditMode) {
                // ── Edit Mode Fields ──
                Text("Priority", style = MaterialTheme.typography.labelMedium, color = JamrahTextMuted)
                Spacer(Modifier.height(8.dp))
                PrioritySelector(selected = editPriority, onSelect = { editPriority = it })

                Spacer(Modifier.height(16.dp))

                Text("Schedule", style = MaterialTheme.typography.labelMedium, color = JamrahTextMuted)
                Spacer(Modifier.height(8.dp))
                val context = androidx.compose.ui.platform.LocalContext.current
                OutlinedButton(
                    onClick = {
                        val calendar = java.util.Calendar.getInstance()
                        val hour = calendar.get(java.util.Calendar.HOUR_OF_DAY)
                        val minute = calendar.get(java.util.Calendar.MINUTE)
                        android.app.TimePickerDialog(context, { _, h, m ->
                            editTime = String.format("%02d:%02d", h, m)
                        }, hour, minute, false).show()
                    },
                    modifier = Modifier.fillMaxWidth(),
                    border = BorderStroke(2.dp, JamrahBorder)
                ) {
                    Text(
                        text = if (editTime.isEmpty()) "Set Time (AM/PM)" else "Time: $editTime",
                        style = MaterialTheme.typography.bodyMedium,
                        color = JamrahText
                    )
                }

                Spacer(Modifier.height(16.dp))

                Text("Repeat", style = MaterialTheme.typography.labelMedium, color = JamrahTextMuted)
                Spacer(Modifier.height(8.dp))
                RecurrenceSelector(
                    selected = editRecurrence,
                    customDays = editCustomDays,
                    onRecurrenceChange = { editRecurrence = it; if (it != "custom") editCustomDays = emptyList() },
                    onCustomDaysChange = { editCustomDays = it }
                )

                if (editRecurrence != "none") {
                    Spacer(Modifier.height(16.dp))
                    Text("Duration", style = MaterialTheme.typography.labelMedium, color = JamrahTextMuted)
                    Spacer(Modifier.height(8.dp))
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        OutlinedTextField(
                            value = editDurationStart,
                            onValueChange = { editDurationStart = it },
                            label = { Text("Start (yyyy-MM-dd)") },
                            modifier = Modifier.weight(1f)
                        )
                        OutlinedTextField(
                            value = editDurationEnd,
                            onValueChange = { editDurationEnd = it },
                            label = { Text("End (yyyy-MM-dd)") },
                            modifier = Modifier.weight(1f)
                        )
                    }
                }

                Spacer(Modifier.height(16.dp))

                Text("Notes", style = MaterialTheme.typography.labelMedium, color = JamrahTextMuted)
                Spacer(Modifier.height(8.dp))
                OutlinedTextField(
                    value = editNotes,
                    onValueChange = { editNotes = it },
                    placeholder = { Text("Write notes here...") },
                    minLines = 6,
                    modifier = Modifier.fillMaxWidth()
                )

            } else {
                // ── View Mode ──
                Text("Notes", style = MaterialTheme.typography.labelMedium, color = JamrahTextMuted)
                Spacer(Modifier.height(8.dp))
                Text(
                    text = task.notes?.takeIf { it.isNotEmpty() } ?: "No notes.",
                    style = MaterialTheme.typography.bodyLarge,
                    color = if (task.notes.isNullOrEmpty()) JamrahTextMuted else JamrahText
                )
            }

            Spacer(Modifier.height(24.dp))

            // ── Subtasks ──
            Text("Subtasks", style = MaterialTheme.typography.labelMedium, color = JamrahTextMuted)
            Spacer(Modifier.height(8.dp))
            if (subtasks.isEmpty()) {
                Text("No subtasks.", style = MaterialTheme.typography.bodyMedium, color = JamrahTextMuted)
            } else {
                subtasks.forEach { st ->
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp)
                    ) {
                        TaskCheckbox(
                            checked = st.completed == 1,
                            onToggle = { onToggleSubtask(st.id) },
                            size = 18.dp
                        )
                        Spacer(Modifier.width(8.dp))
                        Text(
                            text = st.name,
                            style = MaterialTheme.typography.bodyMedium,
                            color = if (st.completed == 1) JamrahTextMuted else JamrahText,
                            textDecoration = if (st.completed == 1) TextDecoration.LineThrough else null,
                            modifier = Modifier.weight(1f)
                        )
                        IconButton(onClick = { onDeleteSubtask(st.id) }) {
                            Icon(Icons.Outlined.Delete, contentDescription = "Delete subtask",
                                tint = Color(0xFFEF4444), modifier = Modifier.size(16.dp))
                        }
                    }
                }
            }

            // Add subtask input (only in edit mode)
            if (isEditMode) {
                Spacer(Modifier.height(8.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedTextField(
                        value = newSubtaskName,
                        onValueChange = { newSubtaskName = it },
                        placeholder = { Text("Add subtask...") },
                        singleLine = true,
                        modifier = Modifier.weight(1f)
                    )
                    Button(
                        onClick = {
                            if (newSubtaskName.isNotBlank()) {
                                onAddSubtask(newSubtaskName.trim())
                                newSubtaskName = ""
                            }
                        },
                        colors = ButtonDefaults.buttonColors(containerColor = JamrahBorderStrong)
                    ) {
                        Text("+ Add")
                    }
                }
            }

            Spacer(Modifier.height(32.dp))

            // ── Action Buttons ──
            if (isEditMode) {
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedButton(
                        onClick = { isEditMode = false },
                        modifier = Modifier.weight(1f),
                        border = BorderStroke(2.dp, JamrahBorder)
                    ) {
                        Text("Cancel", style = MaterialTheme.typography.labelLarge)
                    }
                    Button(
                        onClick = {
                            val dayPart = task.scheduledTime?.take(10)
                                ?: task.createdAt.take(10)
                            val newSched = if (editTime.isNotEmpty()) "${dayPart}T${editTime}"
                            else if (editRecurrence != "none") dayPart
                            else task.scheduledTime
                            val customDaysJson = if (editRecurrence == "custom" && editCustomDays.isNotEmpty())
                                com.google.gson.Gson().toJson(editCustomDays) else null
                            onUpdate(task.copy(
                                name = editName.ifBlank { task.name },
                                priority = editPriority,
                                scheduledTime = newSched,
                                recurrence = editRecurrence,
                                customDays = customDaysJson,
                                durationStart = editDurationStart.ifEmpty { null },
                                durationEnd = editDurationEnd.ifEmpty { null },
                                notes = editNotes.ifEmpty { null }
                            ))
                            isEditMode = false
                        },
                        modifier = Modifier.weight(1f),
                        colors = ButtonDefaults.buttonColors(containerColor = JamrahBorderStrong)
                    ) {
                        Text("Save", style = MaterialTheme.typography.labelLarge)
                    }
                }
                Spacer(Modifier.height(12.dp))
            } else {
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedButton(
                        onClick = { isEditMode = true },
                        modifier = Modifier.weight(1f),
                        border = BorderStroke(2.dp, JamrahBorder)
                    ) {
                        Icon(Icons.Outlined.Edit, contentDescription = null, modifier = Modifier.size(20.dp))
                        Spacer(Modifier.width(8.dp))
                        Text("Edit", style = MaterialTheme.typography.labelLarge)
                    }
                }
                Spacer(Modifier.height(12.dp))
            }

            // Delete button (always visible)
            OutlinedButton(
                onClick = { onDelete(); onClose() },
                modifier = Modifier.fillMaxWidth(),
                border = BorderStroke(2.dp, Color(0xFFFECACA)),
                colors = ButtonDefaults.outlinedButtonColors(contentColor = Color(0xFFDC2626))
            ) {
                Icon(Icons.Outlined.Delete, contentDescription = null, modifier = Modifier.size(20.dp))
                Spacer(Modifier.width(8.dp))
                Text("Delete task", style = MaterialTheme.typography.labelLarge)
            }

            Spacer(Modifier.height(32.dp))
        }
    }
}