# PHASE 7 — Notifications & Task Reminders
**Status:** ⏳ Pending Execution (after Phase 6 approved)

---

## 🎯 Goal of Phase 7

By the end of this phase:
- Tasks with a `scheduledTime` automatically trigger an OS notification (5 minutes before due)
- Tapping the notification opens the app on the Tasks page
- A **"Mark Done"** action in the notification completes the task without opening the app
- Pomodoro session-complete notifications fire when a work session ends
- All notification channels are created correctly for Android 8+
- Permissions are handled gracefully for Android 13+ (POST_NOTIFICATIONS)

---

## How Reminders Work — End to End

1. User creates a task with a `scheduledTime` (e.g. "2026-07-26 14:30:00")
2. `TaskRepositoryImpl.createTask()` calls `TaskAlarmScheduler.scheduleTask(task)`
3. `TaskAlarmScheduler` computes the alarm time = scheduledTime − 5 minutes
4. If the alarm time is in the future, `AlarmManager.setExactAndAllowWhileIdle()` is called
5. When the alarm fires → `TaskReminderReceiver.onReceive()` is called
6. `TaskReminderReceiver` calls `NotificationUtils.showTaskNotification(context, task.id, task.name)`
7. The notification shows with title "Task Reminder" and body "Upcoming: {task name}"
8. Notification has a "Mark Done" action button → taps fire `TaskDoneFromNotificationReceiver`
9. `TaskDoneFromNotificationReceiver` enqueues a one-shot `MarkDoneWorker` with the task ID
10. `MarkDoneWorker` calls `TaskRepository.toggleTask(taskId)` which marks it complete in Room + syncs
11. Pomodoro: when `TimerService` detects a work session has finished → calls `NotificationUtils.showSessionCompleteNotification()`

---

# ╔══════════════════════════════════════════════╗
# ║  TASK 1 — Notification Channels            ║
# ╚══════════════════════════════════════════════╝

**Exact file path:** `android/app/src/main/java/com/jamrah/app/notifications/NotificationChannels.kt`

```kotlin
package com.jamrah.app.notifications

import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context

object NotificationChannels {

    const val CHANNEL_TASKS              = "jamrah_task_reminders"
    const val CHANNEL_POMODORO_RUNNING   = "jamrah_pomodoro_running"
    const val CHANNEL_POMODORO_COMPLETE  = "jamrah_pomodoro_complete"

    fun createAll(context: Context) {
        val nm = context.getSystemService(NotificationManager::class.java)

        // Task reminders: HIGH importance so they make sound
        nm.createNotificationChannel(NotificationChannel(
            CHANNEL_TASKS,
            "Task Reminders",
            NotificationManager.IMPORTANCE_HIGH
        ).apply {
            description = "Reminds you of upcoming tasks"
            enableVibration(true)
        })

        // Pomodoro running: LOW importance — persistent, no sound
        nm.createNotificationChannel(NotificationChannel(
            CHANNEL_POMODORO_RUNNING,
            "Pomodoro Timer",
            NotificationManager.IMPORTANCE_LOW
        ).apply {
            description = "Shows timer status while running"
        })

        // Pomodoro complete: HIGH importance — plays a sound/vibrate
        nm.createNotificationChannel(NotificationChannel(
            CHANNEL_POMODORO_COMPLETE,
            "Pomodoro Alerts",
            NotificationManager.IMPORTANCE_HIGH
        ).apply {
            description = "Alerts when a focus session or break ends"
            enableVibration(true)
        })
    }
}
```

**Update `JamrahApplication.kt`** to call `NotificationChannels.createAll(this)` in `onCreate()`:

```kotlin
@HiltAndroidApp
class JamrahApplication : Application() {
    override fun onCreate() {
        super.onCreate()
        NotificationChannels.createAll(this)
    }
}
```

---

# ╔══════════════════════════════════════════════╗
# ║  TASK 2 — NotificationUtils               ║
# ╚══════════════════════════════════════════════╝

**Exact file path:** `android/app/src/main/java/com/jamrah/app/notifications/NotificationUtils.kt`

```kotlin
package com.jamrah.app.notifications

import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import com.jamrah.app.MainActivity
import com.jamrah.app.R

object NotificationUtils {

    const val EXTRA_TASK_ID   = "extra_task_id"
    const val EXTRA_TASK_NAME = "extra_task_name"

    /**
     * Show a task reminder notification.
     * @param taskId   Used as the notification ID (hash) and for Mark Done action.
     * @param taskName Display name of the task.
     */
    fun showTaskNotification(context: Context, taskId: String, taskName: String) {
        val notifId = taskId.hashCode()

        // Open app intent
        val openIntent = PendingIntent.getActivity(
            context, notifId,
            Intent(context, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            },
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        // Mark done action intent
        val markDoneIntent = PendingIntent.getBroadcast(
            context, notifId + 1,
            Intent(context, TaskDoneFromNotificationReceiver::class.java).apply {
                putExtra(EXTRA_TASK_ID, taskId)
                putExtra(EXTRA_TASK_NAME, taskName)
            },
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val notification = NotificationCompat.Builder(context, NotificationChannels.CHANNEL_TASKS)
            .setSmallIcon(android.R.drawable.ic_popup_reminder)
            .setContentTitle("Task Reminder")
            .setContentText("Upcoming: $taskName")
            .setContentIntent(openIntent)
            .addAction(0, "Mark Done", markDoneIntent)
            .setAutoCancel(true)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setCategory(NotificationCompat.CATEGORY_REMINDER)
            .build()

        runCatching {
            NotificationManagerCompat.from(context).notify(notifId, notification)
        }
    }

    fun cancelTaskNotification(context: Context, taskId: String) {
        NotificationManagerCompat.from(context).cancel(taskId.hashCode())
    }

    /**
     * Show a Pomodoro session-complete notification.
     * @param isBreak true = break ended ("Ready to focus?"), false = work session done.
     */
    fun showSessionCompleteNotification(context: Context, isBreak: Boolean) {
        val (title, body) = if (isBreak)
            "Break over! ⏰" to "Ready to focus again?"
        else
            "Focus session complete! 🍅" to "Great work! Take a break."

        val openIntent = PendingIntent.getActivity(
            context, 9999,
            Intent(context, MainActivity::class.java),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val notification = NotificationCompat.Builder(context, NotificationChannels.CHANNEL_POMODORO_COMPLETE)
            .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
            .setContentTitle(title)
            .setContentText(body)
            .setContentIntent(openIntent)
            .setAutoCancel(true)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .build()

        runCatching {
            NotificationManagerCompat.from(context).notify(9999, notification)
        }
    }
}
```

---

# ╔══════════════════════════════════════════════╗
# ║  TASK 3 — TaskAlarmScheduler              ║
# ╚══════════════════════════════════════════════╝

**Exact file path:** `android/app/src/main/java/com/jamrah/app/notifications/TaskAlarmScheduler.kt`

```kotlin
package com.jamrah.app.notifications

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import com.jamrah.app.domain.model.TaskItem
import java.text.SimpleDateFormat
import java.util.*
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class TaskAlarmScheduler @Inject constructor(
    private val context: Context
) {
    private val alarmManager = context.getSystemService(AlarmManager::class.java)
    private val scheduledTimeFmt = SimpleDateFormat("yyyy-MM-dd HH:mm:ss", Locale.US)

    companion object {
        private const val REMINDER_OFFSET_MS = 5 * 60 * 1000L   // 5 minutes before
    }

    /**
     * Schedule an alarm for this task if it has a scheduledTime in the future.
     * Cancels any existing alarm for the same task first.
     */
    fun scheduleTask(task: TaskItem) {
        cancelTask(task.id)    // Cancel any existing alarm

        val schedStr = task.scheduledTime ?: return
        val schedTime = try {
            scheduledTimeFmt.parse(schedStr)?.time ?: return
        } catch (e: Exception) { return }

        val alarmTime = schedTime - REMINDER_OFFSET_MS
        if (alarmTime <= System.currentTimeMillis()) return    // Already passed

        val pendingIntent = buildPendingIntent(task.id, task.name)

        if (alarmManager.canScheduleExactAlarms()) {
            alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, alarmTime, pendingIntent)
        } else {
            alarmManager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, alarmTime, pendingIntent)
        }
    }

    fun cancelTask(taskId: String) {
        val pendingIntent = buildPendingIntent(taskId, "")
        alarmManager.cancel(pendingIntent)
    }

    fun scheduleAll(tasks: List<TaskItem>) {
        tasks.forEach { scheduleTask(it) }
    }

    private fun buildPendingIntent(taskId: String, taskName: String): PendingIntent {
        val intent = Intent(context, TaskReminderReceiver::class.java).apply {
            putExtra(NotificationUtils.EXTRA_TASK_ID,   taskId)
            putExtra(NotificationUtils.EXTRA_TASK_NAME, taskName)
        }
        return PendingIntent.getBroadcast(
            context, taskId.hashCode(),
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
    }
}
```

---

# ╔══════════════════════════════════════════════╗
# ║  TASK 4 — TaskReminderReceiver             ║
# ╚══════════════════════════════════════════════╝

**Exact file path:** `android/app/src/main/java/com/jamrah/app/notifications/TaskReminderReceiver.kt`

```kotlin
package com.jamrah.app.notifications

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

/**
 * Fires when an AlarmManager alarm for a task reminder triggers.
 * Simply shows the notification; no heavy processing here.
 */
class TaskReminderReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val taskId   = intent.getStringExtra(NotificationUtils.EXTRA_TASK_ID)   ?: return
        val taskName = intent.getStringExtra(NotificationUtils.EXTRA_TASK_NAME) ?: return
        NotificationUtils.showTaskNotification(context, taskId, taskName)
    }
}
```

---

# ╔══════════════════════════════════════════════╗
# ║  TASK 5 — BootReceiver                     ║
# ╚══════════════════════════════════════════════╝

**Exact file path:** `android/app/src/main/java/com/jamrah/app/notifications/BootReceiver.kt`

```kotlin
package com.jamrah.app.notifications

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import androidx.work.*
import com.jamrah.app.sync.RescheduleAlarmsWorker

/**
 * Re-schedules all task reminder alarms after device reboot.
 * Alarms are cleared on reboot by the OS, so we must reschedule them.
 */
class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != Intent.ACTION_BOOT_COMPLETED) return
        WorkManager.getInstance(context).enqueue(
            OneTimeWorkRequestBuilder<RescheduleAlarmsWorker>().build()
        )
    }
}
```

---

# ╔══════════════════════════════════════════════╗
# ║  TASK 6 — RescheduleAlarmsWorker           ║
# ╚══════════════════════════════════════════════╝

**Exact file path:** `android/app/src/main/java/com/jamrah/app/sync/RescheduleAlarmsWorker.kt`

```kotlin
package com.jamrah.app.sync

import android.content.Context
import androidx.hilt.work.HiltWorker
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import com.jamrah.app.data.repository.TaskRepository
import com.jamrah.app.notifications.TaskAlarmScheduler
import dagger.assisted.Assisted
import dagger.assisted.AssistedInject

/**
 * Runs after device reboot to restore all task reminder alarms from Room.
 */
@HiltWorker
class RescheduleAlarmsWorker @AssistedInject constructor(
    @Assisted context: Context,
    @Assisted params: WorkerParameters,
    private val taskRepository: TaskRepository,
    private val alarmScheduler: TaskAlarmScheduler
) : CoroutineWorker(context, params) {

    override suspend fun doWork(): Result {
        return try {
            val tasks = taskRepository.getAllTasks()
            alarmScheduler.scheduleAll(tasks.filter {
                it.scheduledTime != null && it.completed == 0
            })
            Result.success()
        } catch (e: Exception) {
            Result.retry()
        }
    }
}
```

Add `getAllTasks(): List<TaskItem>` to `TaskRepository` interface and `TaskRepositoryImpl`.

---

# ╔══════════════════════════════════════════════╗
# ║  TASK 7 — Mark Done from Notification      ║
# ╚══════════════════════════════════════════════╝

**Exact file path:** `android/app/src/main/java/com/jamrah/app/notifications/TaskDoneFromNotificationReceiver.kt`

```kotlin
package com.jamrah.app.notifications

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import androidx.work.*

/**
 * Fired when the user taps "Mark Done" in the task reminder notification.
 * Enqueues a one-shot WorkManager job to toggle the task as complete.
 * (Cannot call Room directly from a BroadcastReceiver safely.)
 */
class TaskDoneFromNotificationReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val taskId = intent.getStringExtra(NotificationUtils.EXTRA_TASK_ID) ?: return
        val notifId = taskId.hashCode()

        // Cancel the notification
        androidx.core.app.NotificationManagerCompat.from(context).cancel(notifId)

        // Enqueue mark-done job
        WorkManager.getInstance(context).enqueue(
            OneTimeWorkRequestBuilder<MarkDoneWorker>()
                .setInputData(workDataOf(MarkDoneWorker.KEY_TASK_ID to taskId))
                .build()
        )
    }
}
```

**Exact file path:** `android/app/src/main/java/com/jamrah/app/notifications/MarkDoneWorker.kt`

```kotlin
package com.jamrah.app.notifications

import android.content.Context
import androidx.hilt.work.HiltWorker
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import com.jamrah.app.data.repository.TaskRepository
import dagger.assisted.Assisted
import dagger.assisted.AssistedInject

@HiltWorker
class MarkDoneWorker @AssistedInject constructor(
    @Assisted context: Context,
    @Assisted params: WorkerParameters,
    private val taskRepository: TaskRepository
) : CoroutineWorker(context, params) {

    companion object { const val KEY_TASK_ID = "task_id" }

    override suspend fun doWork(): Result {
        val taskId = inputData.getString(KEY_TASK_ID) ?: return Result.failure()
        return try {
            taskRepository.toggleTask(taskId)
            Result.success()
        } catch (e: Exception) {
            Result.retry()
        }
    }
}
```

---

# ╔══════════════════════════════════════════════╗
# ║  TASK 8 — AndroidManifest Updates         ║
# ╚══════════════════════════════════════════════╝

Add permissions:
```xml
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
<uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED" />
<uses-permission android:name="android.permission.SCHEDULE_EXACT_ALARM" />
<uses-permission android:name="android.permission.USE_EXACT_ALARM" />
<uses-permission android:name="android.permission.VIBRATE" />
```

Add receivers inside `<application>`:
```xml
<receiver
    android:name=".notifications.TaskReminderReceiver"
    android:exported="false" />

<receiver
    android:name=".notifications.BootReceiver"
    android:exported="true">
    <intent-filter>
        <action android:name="android.intent.action.BOOT_COMPLETED" />
    </intent-filter>
</receiver>

<receiver
    android:name=".notifications.TaskDoneFromNotificationReceiver"
    android:exported="false" />
```

---

# ╔══════════════════════════════════════════════╗
# ║  TASK 9 — Integrate with TaskRepositoryImpl ║
# ╚══════════════════════════════════════════════╝

**Update `TaskRepositoryImpl.kt`** — inject `TaskAlarmScheduler` and call it:

```kotlin
@Singleton
class TaskRepositoryImpl @Inject constructor(
    private val dao: TaskDao,
    private val api: TasksApi,
    private val alarmScheduler: TaskAlarmScheduler   // ← new injection
) : TaskRepository {

    override suspend fun createTask(task: TaskItem) {
        dao.upsert(task.toEntity("pending_create"))
        // Schedule reminder if task has a scheduledTime
        if (task.scheduledTime != null && task.completed == 0) {
            alarmScheduler.scheduleTask(task)
        }
        runCatching {
            val resp = api.create(task.toCreateDto())
            if (resp.isSuccessful) dao.updateSyncStatus(task.id, "synced")
        }
    }

    override suspend fun updateTask(task: TaskItem) {
        dao.upsert(task.toEntity("pending_update"))
        // Re-schedule alarm (cancel old, set new)
        alarmScheduler.cancelTask(task.id)
        if (task.scheduledTime != null && task.completed == 0) {
            alarmScheduler.scheduleTask(task)
        }
        runCatching {
            val resp = api.update(task.id, task.toUpdateDto())
            if (resp.isSuccessful) dao.updateSyncStatus(task.id, "synced")
        }
    }

    override suspend fun deleteTask(id: String) {
        alarmScheduler.cancelTask(id)    // Cancel reminder
        dao.markDeleted(id)
        // ... rest unchanged
    }

    override suspend fun toggleTask(taskId: String) {
        val entity = dao.getById(taskId) ?: return
        val newCompleted = if (entity.completed == 1) 0 else 1
        dao.updateCompleted(taskId, newCompleted, if (newCompleted == 1) System.currentTimeMillis() else null)
        // Cancel reminder when completing
        if (newCompleted == 1) alarmScheduler.cancelTask(taskId)
        // ... rest unchanged
    }
}
```

---

# ╔══════════════════════════════════════════════╗
# ║  TASK 10 — Integrate with TimerService     ║
# ╚══════════════════════════════════════════════╝

**Update `TimerService.kt`** `onPhaseComplete()` to call notification:

```kotlin
private fun onPhaseComplete() {
    val current = _state.value
    when (current.phase) {
        TimerPhase.WORK -> {
            saveSession(current)
            // Show session-complete notification
            val prefs = AppPreferences(applicationContext)
            NotificationUtils.showSessionCompleteNotification(applicationContext, isBreak = false)
            // ... rest of phase transition logic unchanged
        }
        TimerPhase.SHORT_BREAK, TimerPhase.LONG_BREAK -> {
            NotificationUtils.showSessionCompleteNotification(applicationContext, isBreak = true)
            // ... rest unchanged
        }
        TimerPhase.IDLE -> {}
    }
    updateNotification()
}
```

Also update `TimerService` to use `NotificationChannels.CHANNEL_POMODORO_RUNNING` instead of the hardcoded `"jamrah_timer"` constant from Phase 2.

---

# ╔══════════════════════════════════════════════╗
# ║  TASK 11 — POST_NOTIFICATIONS Permission   ║
# ╚══════════════════════════════════════════════╝

**Exact file path:** `android/app/src/main/java/com/jamrah/app/ui/components/NotificationPermissionRequest.kt`

```kotlin
package com.jamrah.app.ui.components

import android.Manifest
import android.os.Build
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.platform.LocalContext
import com.google.accompanist.permissions.*

/**
 * Shows a rationale dialog on first app launch (Android 13+) requesting
 * POST_NOTIFICATIONS permission. Call from JamrahApp or MainActivity.
 */
@OptIn(ExperimentalPermissionsApi::class)
@Composable
fun NotificationPermissionRequest() {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) return

    val permState = rememberPermissionState(Manifest.permission.POST_NOTIFICATIONS)
    var showRationale by remember { mutableStateOf(false) }

    LaunchedEffect(Unit) {
        if (!permState.status.isGranted && !permState.status.shouldShowRationale) {
            permState.launchPermissionRequest()
        } else if (permState.status.shouldShowRationale) {
            showRationale = true
        }
    }

    if (showRationale) {
        AlertDialog(
            onDismissRequest = { showRationale = false },
            title = { Text("Enable Notifications") },
            text = { Text("Jamrah needs notification permission to remind you about upcoming tasks.") },
            confirmButton = {
                TextButton(onClick = {
                    showRationale = false
                    permState.launchPermissionRequest()
                }) { Text("Allow") }
            },
            dismissButton = {
                TextButton(onClick = { showRationale = false }) { Text("Not Now") }
            }
        )
    }
}
```

Add `accompanist-permissions` to `libs.versions.toml`:
```toml
[versions]
accompanist = "0.34.0"

[libraries]
accompanist-permissions = { group = "com.google.accompanist", name = "accompanist-permissions", version.ref = "accompanist" }
```

Add to `app/build.gradle.kts`:
```kotlin
implementation(libs.accompanist.permissions)
```

**Call `NotificationPermissionRequest()` from `JamrahApp.kt`**:
```kotlin
@Composable
fun JamrahApp() {
    NotificationPermissionRequest()    // ← add at the top
    // ... rest of the composable
}
```

---

# ╔══════════════════════════════════════════════╗
# ║  TASK 12 — Provide Context for Scheduler  ║
# ╚══════════════════════════════════════════════╝

Update `DatabaseModule.kt` (or a new `AppModule.kt`) to provide `Context` for `TaskAlarmScheduler`:

```kotlin
@Module
@InstallIn(SingletonComponent::class)
object AppModule {

    @Provides
    @Singleton
    fun provideTaskAlarmScheduler(@ApplicationContext context: Context): TaskAlarmScheduler =
        TaskAlarmScheduler(context)
}
```

---

# ╔══════════════════════════════════════════════╗
# ║  REVIEW CALL — END OF PHASE 7              ║
# ╚══════════════════════════════════════════════╝

Build: `cd android && ./gradlew assembleDebug`

### 15-Item Manual Testing Checklist

- [ ] App builds and launches without crash
- [ ] First launch on Android 13+: permission dialog appears for notifications
- [ ] Grant notification permission → dialog dismisses
- [ ] Create a task with a scheduledTime 10 minutes in the future
- [ ] After 5 minutes: notification appears with task name "Upcoming: {name}"
- [ ] Notification has "Mark Done" action button
- [ ] Tap notification → app opens on Tasks screen
- [ ] Tap "Mark Done" on notification → task marked complete without opening app
- [ ] Marked task appears with checkmark in Tasks list after app opens
- [ ] Complete a Pomodoro session → "Focus session complete! 🍅" notification appears
- [ ] Complete a break → "Break over! ⏰" notification appears
- [ ] Kill and restart device → task reminder alarms re-scheduled (BootReceiver fired)
- [ ] Delete task with scheduledTime → alarm cancelled, no notification fires
- [ ] Notification channels visible in System Settings > Apps > Jamrah > Notifications
- [ ] Exact alarm permission shown in Settings screen if not granted (Android 12+)

*End of PHASE_7.md*
