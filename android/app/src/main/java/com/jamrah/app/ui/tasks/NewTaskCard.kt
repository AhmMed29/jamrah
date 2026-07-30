package com.jamrah.app.ui.tasks

import androidx.compose.animation.*
import androidx.compose.foundation.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.key.*
import androidx.compose.ui.text.input.TextFieldValue
import androidx.compose.ui.unit.dp
import com.jamrah.app.ui.theme.*

/**
 * Mirrors the PC app's #tasks-new-card:
 *   - border: 2px solid #2d2d2d
 *   - background: #fff (card)
 *   - input: font 20px, 'Patrick Hand'
 *   - + toggle button: 36x36 circle, border 2px #2d2d2d
 *   - expanded options: time, recurrence, priority
 */
@Composable
fun NewTaskCard(
    onAdd: (name: String, time: String, recurrence: String, priority: String, customDays: List<Int>) -> Unit,
    modifier: Modifier = Modifier
) {
    var name        by remember { mutableStateOf("") }
    var showOptions by remember { mutableStateOf(false) }
    var time        by remember { mutableStateOf("") }
    var recurrence  by remember { mutableStateOf("none") }
    var priority    by remember { mutableStateOf("none") }
    var customDays  by remember { mutableStateOf(listOf<Int>()) }

    fun submit() {
        if (name.isBlank()) return
        onAdd(name.trim(), time, recurrence, priority, customDays)
        name = ""; time = ""; recurrence = "none"; priority = "none"
        customDays = emptyList(); showOptions = false
    }

    Surface(
        shape = RoundedCornerShape(16.dp),
        border = BorderStroke(2.dp, JamrahBorderStrong),
        color  = JamrahCard,
        modifier = modifier.fillMaxWidth()
    ) {
        Column(modifier = Modifier.padding(12.dp, 12.dp)) {

            // ── Input Row ──
            Row(verticalAlignment = Alignment.CenterVertically) {
                TextField(
                    value = name,
                    onValueChange = { name = it },
                    placeholder = {
                        Text("Add a task...", style = MaterialTheme.typography.bodyLarge,
                            color = JamrahTextMuted)
                    },
                    singleLine = true,
                    colors = TextFieldDefaults.colors(
                        unfocusedContainerColor = Color.Transparent,
                        focusedContainerColor   = Color.Transparent,
                        unfocusedIndicatorColor = Color.Transparent,
                        focusedIndicatorColor   = Color.Transparent
                    ),
                    textStyle = MaterialTheme.typography.bodyLarge.copy(color = JamrahText),
                    keyboardActions = androidx.compose.foundation.text.KeyboardActions(
                        onDone = { submit() }
                    ),
                    modifier = Modifier.weight(1f)
                )

                // + toggle button
                Box(
                    contentAlignment = Alignment.Center,
                    modifier = Modifier
                        .size(36.dp)
                        .clip(CircleShape)
                        .border(2.dp, JamrahBorderStrong, CircleShape)
                        .background(if (showOptions) JamrahBorderStrong else JamrahCard)
                        .clickable { showOptions = !showOptions }
                ) {
                    Icon(
                        imageVector = Icons.Default.Add,
                        contentDescription = "Show options",
                        tint = if (showOptions) Color.White else JamrahBorderStrong,
                        modifier = Modifier.size(20.dp)
                    )
                }
            }

            // ── Options (expanded) ──
            AnimatedVisibility(visible = showOptions) {
                Column(
                    modifier = Modifier
                        .padding(top = 12.dp)
                        .fillMaxWidth()
                ) {
                    HorizontalDivider(
                        color = Color(0x332D2D2D),
                        modifier = Modifier.padding(bottom = 12.dp)
                    )

                    // Time picker
                    val context = androidx.compose.ui.platform.LocalContext.current
                    OutlinedButton(
                        onClick = {
                            val calendar = java.util.Calendar.getInstance()
                            val hour = calendar.get(java.util.Calendar.HOUR_OF_DAY)
                            val minute = calendar.get(java.util.Calendar.MINUTE)
                            android.app.TimePickerDialog(context, { _, h, m ->
                                time = String.format("%02d:%02d", h, m)
                            }, hour, minute, false).show()
                        },
                        modifier = Modifier.fillMaxWidth(),
                        border = BorderStroke(2.dp, JamrahBorder)
                    ) {
                        Text(
                            text = if (time.isEmpty()) "Set Time (AM/PM)" else "Time: $time",
                            style = MaterialTheme.typography.bodyMedium,
                            color = JamrahText
                        )
                    }

                    Spacer(Modifier.height(8.dp))

                    // Recurrence
                    RecurrenceSelector(
                        selected = recurrence,
                        customDays = customDays,
                        onRecurrenceChange = { recurrence = it; if (it != "custom") customDays = emptyList() },
                        onCustomDaysChange = { customDays = it }
                    )

                    Spacer(Modifier.height(8.dp))

                    // Priority
                    PrioritySelector(
                        selected = priority,
                        onSelect = { priority = it }
                    )

                    Spacer(Modifier.height(8.dp))

                    // Add button
                    Button(
                        onClick = ::submit,
                        colors = ButtonDefaults.buttonColors(containerColor = JamrahBorderStrong),
                        shape = RoundedCornerShape(8.dp),
                        modifier = Modifier.align(Alignment.End)
                    ) {
                        Text("+ Add", style = MaterialTheme.typography.labelLarge, color = Color.White)
                    }
                }
            }
        }
    }
}