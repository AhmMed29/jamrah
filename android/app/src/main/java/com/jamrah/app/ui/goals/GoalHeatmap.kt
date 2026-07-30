package com.jamrah.app.ui.goals

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp

import com.jamrah.app.domain.model.last28DayKeys

/**
 * GitHub-style 4x7 grid of 6dp dots representing last 28 days.
 * Colored = goal color, empty = #ebedf0.
 */
@Composable
fun GoalHeatmap(
    goalColor: String,
    progressDates: Set<String>,   // dates that have a progress entry
    modifier: Modifier = Modifier
) {
    val days = last28DayKeys()    // 28 keys, oldest first
    val color = runCatching {
        Color(android.graphics.Color.parseColor(goalColor))
    }.getOrDefault(Color(0xFF3B82F6))
    val emptyColor = Color(0xFFEBEDF0)

    // 4 columns × 7 rows
    Row(modifier = modifier, horizontalArrangement = Arrangement.spacedBy(2.dp)) {
        for (col in 0..3) {
            Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
                for (row in 0..6) {
                    val idx = col * 7 + row
                    val dayKey = days.getOrNull(idx)
                    val hasEntry = dayKey != null && progressDates.contains(dayKey)
                    Box(
                        modifier = Modifier
                            .size(6.dp)
                            .background(
                                color = if (hasEntry) color else emptyColor,
                                shape = RoundedCornerShape(1.dp)
                            )
                    )
                }
            }
        }
    }
}