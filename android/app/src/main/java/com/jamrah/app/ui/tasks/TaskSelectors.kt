package com.jamrah.app.ui.tasks

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import com.jamrah.app.domain.model.DAY_NAMES
import com.jamrah.app.ui.components.PriorityDot
import com.jamrah.app.ui.theme.*

@Composable
fun RecurrenceSelector(
    selected: String,
    customDays: List<Int>,
    onRecurrenceChange: (String) -> Unit,
    onCustomDaysChange: (List<Int>) -> Unit
) {
    val options = listOf("none" to "None", "daily" to "Daily", "custom" to "Custom")

    Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
        options.forEach { (value, label) ->
            val isActive = selected == value
            Box(
                contentAlignment = Alignment.Center,
                modifier = Modifier
                    .clip(RoundedCornerShape(8.dp))
                    .border(2.dp,
                        if (isActive) JamrahBorderStrong else JamrahBorder,
                        RoundedCornerShape(8.dp))
                    .background(if (isActive) JamrahBorderStrong else JamrahCard)
                    .clickable { onRecurrenceChange(value) }
                    .padding(horizontal = 10.dp, vertical = 4.dp)
            ) {
                Text(label, style = MaterialTheme.typography.bodyMedium,
                    color = if (isActive) Color.White else JamrahTextMuted)
            }
        }
    }

    // Custom day picker
    if (selected == "custom") {
        Spacer(Modifier.height(8.dp))
        Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
            for (i in 0..6) {
                val isOn = customDays.contains(i)
                Box(
                    contentAlignment = Alignment.Center,
                    modifier = Modifier
                        .size(36.dp)
                        .clip(RoundedCornerShape(8.dp))
                        .border(2.dp, JamrahBorderStrong, RoundedCornerShape(8.dp))
                        .background(if (isOn) JamrahBorderStrong else JamrahCard)
                        .clickable {
                            val newDays = if (isOn) customDays - i else (customDays + i).sorted()
                            onCustomDaysChange(newDays)
                        }
                ) {
                    Text(
                        text  = DAY_NAMES[i].take(1),
                        style = MaterialTheme.typography.bodyMedium,
                        color = if (isOn) Color.White else JamrahBorderStrong
                    )
                }
            }
        }
    }
}

@Composable
fun PrioritySelector(selected: String, onSelect: (String) -> Unit) {
    val options = listOf("none" to "None", "Low" to "Low",
        "Medium" to "Medium", "High" to "High")
    Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
        options.forEach { (value, label) ->
            val isActive = selected == value
            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier
                    .clip(RoundedCornerShape(8.dp))
                    .border(2.dp,
                        if (isActive) JamrahBorderStrong else JamrahBorder,
                        RoundedCornerShape(8.dp))
                    .background(JamrahCard)
                    .clickable { onSelect(value) }
                    .padding(horizontal = 10.dp, vertical = 4.dp)
            ) {
                PriorityDot(priority = value, size = 10.dp)
                Spacer(Modifier.width(4.dp))
                Text(label, style = MaterialTheme.typography.bodyMedium,
                    color = if (isActive) JamrahText else JamrahTextMuted)
            }
        }
    }
}