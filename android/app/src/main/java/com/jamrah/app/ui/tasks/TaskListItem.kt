package com.jamrah.app.ui.tasks

import androidx.compose.animation.*
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.combinedClickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Delete
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.jamrah.app.domain.model.TaskItem
import com.jamrah.app.domain.model.recLabel
import com.jamrah.app.ui.components.PriorityDot
import com.jamrah.app.ui.components.TaskCheckbox
import com.jamrah.app.ui.theme.*

/**
 * Mirrors the PC app's .task-item row exactly.
 * - height: auto (padding 8dp top/bottom, 12dp left/right)
 * - border-bottom: 1px solid rgba(45,45,45,0.05)
 * - checkbox → priority dot → text → delete btn
 * - selected: background #f3f3f3
 * - completed: opacity 0.5
 */
@OptIn(androidx.compose.foundation.ExperimentalFoundationApi::class)
@Composable
fun TaskListItem(
    task: TaskItem,
    isSelected: Boolean,
    hasSubtasks: Boolean,
    onSelect: () -> Unit,
    onToggleExpand: () -> Unit,
    onToggleComplete: () -> Unit,
    onDelete: () -> Unit,
    modifier: Modifier = Modifier
) {
    var showDelete by remember { mutableStateOf(false) }

    val bgColor = if (isSelected) Color(0xFFF3F3F3) else Color.Transparent
    val alpha   = if (task.completed == 1) 0.5f else 1f

    Row(
        verticalAlignment = Alignment.CenterVertically,
        modifier = modifier
            .fillMaxWidth()
            .background(bgColor)
            .combinedClickable(
                onClick = if (hasSubtasks) onToggleExpand else onSelect,
                onDoubleClick = if (hasSubtasks) onSelect else null,
                onLongClick = { showDelete = !showDelete }
            )
            .padding(horizontal = 12.dp, vertical = 8.dp)
            .alpha(alpha)
    ) {
        // Checkbox
        TaskCheckbox(
            checked  = task.completed == 1,
            onToggle = onToggleComplete
        )

        Spacer(Modifier.width(12.dp))

        // Priority dot
        PriorityDot(priority = task.priority)

        Spacer(Modifier.width(12.dp))

        // Content
        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = task.name,
                style = MaterialTheme.typography.bodyLarge,
                color = JamrahText,
                textDecoration = if (task.completed == 1) TextDecoration.LineThrough else null,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
            // Meta row (time · recurrence)
            val metaParts = buildList {
                task.scheduledTime?.let { st ->
                    val timePart = st.substringAfter('T', "")
                    if (timePart.isNotEmpty()) add(timePart.take(5))
                }
                val rec = recLabel(task.recurrence, task.customDays)
                if (rec.isNotEmpty()) add(rec)
            }
            if (metaParts.isNotEmpty()) {
                Text(
                    text = metaParts.joinToString(" · "),
                    style = MaterialTheme.typography.bodyMedium,
                    color = JamrahTextMuted,
                    modifier = Modifier.padding(top = 2.dp)
                )
            }
        }

        // Delete button (visible on long-press or hover equivalent)
        AnimatedVisibility(visible = showDelete) {
            IconButton(onClick = onDelete) {
                Icon(
                    imageVector = Icons.Outlined.Delete,
                    contentDescription = "Delete task",
                    tint = Color(0xFFEF4444),
                    modifier = Modifier.size(18.dp)
                )
            }
        }
    }

    // Divider under each item (mirrors border-bottom: 1px)
    HorizontalDivider(color = Color(0x0D2D2D2D), thickness = 1.dp)
}