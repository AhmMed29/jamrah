package com.jamrah.app.ui.components

import androidx.compose.animation.animateColorAsState
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
import androidx.compose.material3.Icon
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import com.jamrah.app.ui.theme.JamrahBorderStrong

/**
 * Checkbox styled exactly as the PC app's .task-checkbox:
 *   - 20x20dp, border-radius 4dp
 *   - border: 2dp rgba(45,45,45,0.4)
 *   - checked: background #2d2d2d, white checkmark
 */
@Composable
fun TaskCheckbox(
    checked: Boolean,
    onToggle: () -> Unit,
    size: Dp = 20.dp,
    modifier: Modifier = Modifier
) {
    val bg by animateColorAsState(
        targetValue = if (checked) JamrahBorderStrong else Color.Transparent,
        label = "checkbox_bg"
    )
    val borderColor by animateColorAsState(
        targetValue = if (checked) JamrahBorderStrong else Color(0x662D2D2D),
        label = "checkbox_border"
    )

    Box(
        contentAlignment = Alignment.Center,
        modifier = modifier
            .size(size)
            .clip(RoundedCornerShape(4.dp))
            .background(bg)
            .border(2.dp, borderColor, RoundedCornerShape(4.dp))
            .clickable(onClick = onToggle)
    ) {
        if (checked) {
            Icon(
                imageVector = Icons.Default.Check,
                contentDescription = "Done",
                tint = Color.White,
                modifier = Modifier.size(size * 0.7f)
            )
        }
    }
}