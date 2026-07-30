package com.jamrah.app.ui.goals

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import com.jamrah.app.domain.model.Goal
import com.jamrah.app.domain.model.computeDurationDays
import com.jamrah.app.ui.theme.*

private val GOAL_COLORS = listOf(
    "#3b82f6", "#ef4444", "#10b981", "#f59e0b",
    "#8b5cf6", "#ec4899", "#14b8a6", "#f97316",
    "#6366f1", "#84cc16"
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun GoalFormSheet(
    existingGoal: Goal? = null,
    sheetState: SheetState,
    onDismiss: () -> Unit,
    onSave: (name: String, color: String, durationType: String, durationValue: Int?, startDate: String, endDate: String) -> Unit
) {
    var name           by remember(existingGoal?.id) { mutableStateOf(existingGoal?.name ?: "") }
    var color          by remember(existingGoal?.id) { mutableStateOf(existingGoal?.color ?: "#3b82f6") }
    var durationType   by remember(existingGoal?.id) { mutableStateOf(existingGoal?.durationType ?: "months") }
    var durationValue  by remember(existingGoal?.id) { mutableStateOf(existingGoal?.durationValue?.toString() ?: "1") }
    var startDate      by remember(existingGoal?.id) { mutableStateOf(existingGoal?.startDate ?: "") }
    var endDate        by remember(existingGoal?.id) { mutableStateOf(existingGoal?.endDate ?: "") }

    val durationOptions = listOf("days" to "Days", "weeks" to "Weeks", "months" to "Months", "custom" to "Custom")

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = sheetState,
        containerColor = JamrahCard
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(24.dp)
                .verticalScroll(rememberScrollState()),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            Text(
                text = if (existingGoal == null) "New Goal" else "Edit Goal",
                style = MaterialTheme.typography.headlineMedium,
                color = JamrahText
            )

            // Name
            OutlinedTextField(
                value = name, onValueChange = { name = it },
                label = { Text("Goal name") },
                singleLine = true,
                modifier = Modifier.fillMaxWidth()
            )

            // Color picker
            Text("Color", style = MaterialTheme.typography.labelMedium, color = JamrahTextMuted)
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                GOAL_COLORS.forEach { hex ->
                    val parsed = runCatching { Color(android.graphics.Color.parseColor(hex)) }.getOrDefault(Color.Blue)
                    Box(
                        modifier = Modifier
                            .size(28.dp)
                            .clip(CircleShape)
                            .background(parsed)
                            .then(if (color == hex) Modifier.border(3.dp, JamrahBorderStrong, CircleShape) else Modifier)
                            .clickable { color = hex }
                    )
                }
            }

            // Duration type
            Text("Duration", style = MaterialTheme.typography.labelMedium, color = JamrahTextMuted)
            Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                durationOptions.forEach { (value, label) ->
                    val isActive = durationType == value
                    Surface(
                        shape = RoundedCornerShape(8.dp),
                        color = if (isActive) JamrahBorderStrong else JamrahCard,
                        border = BorderStroke(1.dp, if (isActive) JamrahBorderStrong else JamrahBorder),
                        modifier = Modifier.clickable { durationType = value }
                    ) {
                        Text(label,
                            style = MaterialTheme.typography.bodyMedium,
                            color = if (isActive) Color.White else JamrahTextMuted,
                            modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp)
                        )
                    }
                }
            }
            if (durationType == "custom") {
                OutlinedTextField(
                    value = durationValue, onValueChange = { durationValue = it },
                    label = { Text("Days count") },
                    singleLine = true, modifier = Modifier.fillMaxWidth()
                )
            }

            // Dates
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedTextField(
                    value = startDate, onValueChange = { startDate = it },
                    label = { Text("Start (yyyy-MM-dd)") },
                    singleLine = true, modifier = Modifier.weight(1f)
                )
                OutlinedTextField(
                    value = endDate, onValueChange = { endDate = it },
                    label = { Text("End (yyyy-MM-dd)") },
                    singleLine = true, modifier = Modifier.weight(1f)
                )
            }

            // Actions
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.padding(top = 8.dp)) {
                OutlinedButton(onClick = onDismiss, modifier = Modifier.weight(1f)) {
                    Text("Cancel")
                }
                Button(
                    onClick = {
                        if (name.isNotBlank()) {
                            val dv = durationValue.toIntOrNull()
                            onSave(name.trim(), color, durationType, dv, startDate, endDate)
                        }
                    },
                    modifier = Modifier.weight(1f),
                    colors = ButtonDefaults.buttonColors(containerColor = JamrahBorderStrong)
                ) {
                    Text("Save Goal", color = Color.White)
                }
            }
            Spacer(Modifier.height(16.dp))
        }
    }
}