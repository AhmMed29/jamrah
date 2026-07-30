package com.jamrah.app.ui.tasks

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.jamrah.app.domain.model.DAY_NAMES
import com.jamrah.app.domain.model.MONTH_NAMES
import com.jamrah.app.ui.theme.JamrahText
import com.jamrah.app.ui.theme.JamrahTextMuted
import java.util.Calendar
import java.util.Date

/**
 * Mirrors the PC app's tasks header:
 *   - "Tasks" title (left)
 *   - ‹ Day Name + Date Display › + [Today] button (center)
 *   - Filter + Sort buttons (right)
 */
@Composable
fun TasksHeader(
    currentDate: Date,
    filterMode: FilterMode,
    sortMode: SortMode,
    isSyncing: Boolean,
    onPrevDay: () -> Unit,
    onNextDay: () -> Unit,
    onToday: () -> Unit,
    onCycleFilter: () -> Unit,
    onCycleSort: () -> Unit,
    onSync: () -> Unit,
    onSettingsClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    val cal = Calendar.getInstance().apply { time = currentDate }
    val dayName = DAY_NAMES[cal.get(Calendar.DAY_OF_WEEK) - 1]
    val month   = MONTH_NAMES[cal.get(Calendar.MONTH)]
    val day     = cal.get(Calendar.DAY_OF_MONTH)
    val year    = cal.get(Calendar.YEAR)

    val isToday = run {
        val today = Calendar.getInstance()
        cal.get(Calendar.DAY_OF_YEAR) == today.get(Calendar.DAY_OF_YEAR) &&
            cal.get(Calendar.YEAR) == today.get(Calendar.YEAR)
    }

    Column(
        modifier = modifier
            .fillMaxWidth()
            .padding(horizontal = 24.dp, vertical = 16.dp)
    ) {
        // Top row
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween,
            modifier = Modifier.fillMaxWidth()
        ) {
            // Left: "Tasks" and Settings
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    text = "Tasks",
                    style = MaterialTheme.typography.headlineLarge,
                    color = JamrahText
                )
                Spacer(Modifier.width(8.dp))
                IconButton(onClick = onSettingsClick, modifier = Modifier.size(24.dp)) {
                    Text("⚙", style = MaterialTheme.typography.bodyLarge, color = JamrahTextMuted)
                }
            }

            // Right: filter + sort
            Row(horizontalArrangement = Arrangement.spacedBy(16.dp), verticalAlignment = Alignment.CenterVertically) {
                if (isSyncing) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(16.dp),
                        strokeWidth = 2.dp
                    )
                } else {
                    TextButton(onClick = onSync, contentPadding = PaddingValues(0.dp)) {
                        Text("⇄", style = MaterialTheme.typography.bodyLarge, color = JamrahTextMuted)
                    }
                }
                TextButton(onClick = onCycleFilter, contentPadding = PaddingValues(0.dp)) {
                    Text(
                        text = filterMode.name.lowercase(),
                        style = MaterialTheme.typography.bodyLarge,
                        color = JamrahTextMuted
                    )
                }
                TextButton(onClick = onCycleSort, contentPadding = PaddingValues(0.dp)) {
                    val (label, icon) = when (sortMode) {
                        SortMode.PRIORITY_DESC -> "Priority" to "↓"
                        SortMode.DATE_ASC      -> "Date" to "↑"
                        SortMode.DATE_DESC     -> "Date" to "↓"
                    }
                    Text("$label $icon", style = MaterialTheme.typography.bodyLarge, color = JamrahTextMuted)
                }
            }
        }

        Spacer(Modifier.height(8.dp))

        // Date navigation row
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.Center,
            modifier = Modifier.fillMaxWidth()
        ) {
            TextButton(onClick = onPrevDay, contentPadding = PaddingValues(horizontal = 4.dp)) {
                Text("‹", style = MaterialTheme.typography.headlineMedium, color = JamrahTextMuted)
            }

            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                modifier = Modifier.padding(horizontal = 8.dp)
            ) {
                Text(dayName, style = MaterialTheme.typography.headlineMedium, color = JamrahText)
                Text("$month $day, $year", style = MaterialTheme.typography.bodySmall, color = JamrahTextMuted)
            }

            TextButton(onClick = onNextDay, contentPadding = PaddingValues(horizontal = 4.dp)) {
                Text("›", style = MaterialTheme.typography.headlineMedium, color = JamrahTextMuted)
            }

            if (!isToday) {
                Spacer(Modifier.width(8.dp))
                OutlinedButton(
                    onClick = onToday,
                    contentPadding = PaddingValues(horizontal = 12.dp, vertical = 4.dp)
                ) {
                    Text("Today", style = MaterialTheme.typography.bodyMedium, color = JamrahText)
                }
            }
        }

        HorizontalDivider(color = MaterialTheme.colorScheme.outline, modifier = Modifier.padding(top = 8.dp))
    }
}