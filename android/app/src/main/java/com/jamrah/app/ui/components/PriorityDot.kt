package com.jamrah.app.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import com.jamrah.app.ui.theme.*

/**
 * Priority dot: 8dp circle, matching PC app colors.
 * High = #ef4444, Medium = #10b981, anything else = #d1d5db
 */
@Composable
fun PriorityDot(priority: String, size: Dp = 8.dp, modifier: Modifier = Modifier) {
    val color = when (priority) {
        "High"   -> PriorityHigh
        "Medium" -> PriorityMedium
        else     -> PriorityNone
    }
    Box(
        modifier = modifier
            .size(size)
            .clip(CircleShape)
            .background(color)
    )
}