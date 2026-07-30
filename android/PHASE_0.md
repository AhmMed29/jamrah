# PHASE 0 — Environment Setup + Tasks Page + Sync
**Status:** ⏳ Pending Execution
**Agents:** Architect · UI Builder · Data Engineer · Sync Engineer · Reviewer

---

## 🎯 Goal of Phase 0

By the end of this phase:
- The `android/` folder exists and is a working Android Studio project.
- The app launches and shows the **Tasks page only** (no nav bar, no settings, no other pages).
- The Tasks page looks and behaves **exactly like the PC app's Tasks page**.
- All data is stored in a **local Room (SQLite) database** reliably.
- A **sync layer** connects to the existing ASP.NET Core backend at `http://localhost:5000`.
- The app can be installed and tested on a physical Android device or emulator.

---

# ╔══════════════════════════════════╗
# ║  TASK 1 — Android Project Init  ║
# ╚══════════════════════════════════╝

**Agent Role:** Architect
**Deliverable:** A compilable empty Android project inside `android/`

---

## 1.1 — Create the folder & file skeleton

> Everything lives inside `My-Productivity-App/android/`.
> This is a standalone Gradle project; it has NO connection to the Node/Electron app.

### Files to create:

```
android/
├── settings.gradle.kts
├── build.gradle.kts            ← root build file
├── gradle.properties
├── gradle/
│   └── wrapper/
│       ├── gradle-wrapper.jar
│       └── gradle-wrapper.properties
├── gradlew                     ← Unix launcher (chmod +x)
├── gradlew.bat                 ← Windows launcher
└── app/
    ├── build.gradle.kts        ← module build file
    ├── proguard-rules.pro
    └── src/
        ├── main/
        │   ├── AndroidManifest.xml
        │   ├── java/com/jamrah/app/
        │   │   └── MainActivity.kt
        │   └── res/
        │       ├── values/
        │       │   ├── colors.xml
        │       │   ├── strings.xml
        │       │   └── themes.xml
        │       └── font/          (empty — Patrick Hand TTF goes here later)
        └── test/java/com/jamrah/app/
            └── ExampleUnitTest.kt
```

---

## 1.2 — `settings.gradle.kts`

**Exact file path:** `android/settings.gradle.kts`

```kotlin
pluginManagement {
    repositories {
        google()
        mavenCentral()
        gradlePluginPortal()
    }
}

dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google()
        mavenCentral()
    }
}

rootProject.name = "JamrahApp"
include(":app")
```

---

## 1.3 — Root `build.gradle.kts`

**Exact file path:** `android/build.gradle.kts`

```kotlin
// Top-level build file where you can add configuration options
// common to all sub-projects/modules.
plugins {
    alias(libs.plugins.android.application) apply false
    alias(libs.plugins.kotlin.android) apply false
    alias(libs.plugins.kotlin.compose) apply false
    alias(libs.plugins.ksp) apply false
    alias(libs.plugins.hilt) apply false
}
```

> NOTE: We use Gradle version catalogs (libs.versions.toml). Create it next.

---

## 1.4 — Version Catalog `gradle/libs.versions.toml`

**Exact file path:** `android/gradle/libs.versions.toml`

```toml
[versions]
agp = "8.5.0"
kotlin = "2.0.0"
ksp = "2.0.0-1.0.21"
coreKtx = "1.13.1"
lifecycleRuntime = "2.8.1"
activityCompose = "1.9.0"
composeBom = "2024.06.00"
room = "2.6.1"
hilt = "2.51.1"
hiltNavigationCompose = "1.2.0"
retrofit = "2.11.0"
okhttp = "4.12.0"
gson = "2.11.0"
workManager = "2.9.0"
navigationCompose = "2.7.7"
datastorePreferences = "1.1.1"
coil = "2.6.0"
coroutines = "1.8.0"

[libraries]
# AndroidX Core
androidx-core-ktx = { group = "androidx.core", name = "core-ktx", version.ref = "coreKtx" }
androidx-lifecycle-runtime-ktx = { group = "androidx.lifecycle", name = "lifecycle-runtime-ktx", version.ref = "lifecycleRuntime" }
androidx-lifecycle-viewmodel-compose = { group = "androidx.lifecycle", name = "lifecycle-viewmodel-compose", version.ref = "lifecycleRuntime" }
androidx-activity-compose = { group = "androidx.activity", name = "activity-compose", version.ref = "activityCompose" }

# Compose
androidx-compose-bom = { group = "androidx.compose", name = "compose-bom", version.ref = "composeBom" }
androidx-ui = { group = "androidx.compose.ui", name = "ui" }
androidx-ui-graphics = { group = "androidx.compose.ui", name = "ui-graphics" }
androidx-ui-tooling = { group = "androidx.compose.ui", name = "ui-tooling" }
androidx-ui-tooling-preview = { group = "androidx.compose.ui", name = "ui-tooling-preview" }
androidx-material3 = { group = "androidx.compose.material3", name = "material3" }
androidx-material-icons-extended = { group = "androidx.compose.material", name = "material-icons-extended" }

# Navigation
androidx-navigation-compose = { group = "androidx.navigation", name = "navigation-compose", version.ref = "navigationCompose" }

# Room
androidx-room-runtime = { group = "androidx.room", name = "room-runtime", version.ref = "room" }
androidx-room-ktx = { group = "androidx.room", name = "room-ktx", version.ref = "room" }
androidx-room-compiler = { group = "androidx.room", name = "room-compiler", version.ref = "room" }

# Hilt (Dependency Injection)
hilt-android = { group = "com.google.dagger", name = "hilt-android", version.ref = "hilt" }
hilt-compiler = { group = "com.google.dagger", name = "hilt-android-compiler", version.ref = "hilt" }
hilt-navigation-compose = { group = "androidx.hilt", name = "hilt-navigation-compose", version.ref = "hiltNavigationCompose" }

# Network
retrofit = { group = "com.squareup.retrofit2", name = "retrofit", version.ref = "retrofit" }
retrofit-gson = { group = "com.squareup.retrofit2", name = "converter-gson", version.ref = "retrofit" }
okhttp = { group = "com.squareup.okhttp3", name = "okhttp", version.ref = "okhttp" }
okhttp-logging = { group = "com.squareup.okhttp3", name = "logging-interceptor", version.ref = "okhttp" }
gson = { group = "com.google.code.gson", name = "gson", version.ref = "gson" }

# WorkManager
androidx-work-runtime-ktx = { group = "androidx.work", name = "work-runtime-ktx", version.ref = "workManager" }
hilt-work = { group = "androidx.hilt", name = "hilt-work", version.ref = "hiltNavigationCompose" }
hilt-work-compiler = { group = "androidx.hilt", name = "hilt-compiler", version.ref = "hiltNavigationCompose" }

# DataStore
androidx-datastore-preferences = { group = "androidx.datastore", name = "datastore-preferences", version.ref = "datastorePreferences" }

# Coroutines
kotlinx-coroutines-android = { group = "org.jetbrains.kotlinx", name = "kotlinx-coroutines-android", version.ref = "coroutines" }

# Test
junit = { group = "junit", name = "junit", version = "4.13.2" }
androidx-junit = { group = "androidx.test.ext", name = "junit", version = "1.1.5" }
androidx-espresso-core = { group = "androidx.test.espresso", name = "espresso-core", version = "3.5.1" }
androidx-ui-test-manifest = { group = "androidx.compose.ui", name = "ui-test-manifest" }
androidx-ui-test-junit4 = { group = "androidx.compose.ui", name = "ui-test-junit4" }

[plugins]
android-application = { id = "com.android.application", version.ref = "agp" }
kotlin-android = { id = "org.jetbrains.kotlin.android", version.ref = "kotlin" }
kotlin-compose = { id = "org.jetbrains.kotlin.plugin.compose", version.ref = "kotlin" }
ksp = { id = "com.google.devtools.ksp", version.ref = "ksp" }
hilt = { id = "com.google.dagger.hilt.android", version.ref = "hilt" }
```

---

## 1.5 — Module `app/build.gradle.kts`

**Exact file path:** `android/app/build.gradle.kts`

```kotlin
plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
    alias(libs.plugins.kotlin.compose)
    alias(libs.plugins.ksp)
    alias(libs.plugins.hilt)
}

android {
    namespace = "com.jamrah.app"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.jamrah.app"
        minSdk = 26           // Android 8.0+
        targetSdk = 35
        versionCode = 1
        versionName = "0.1.0"

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }

    buildFeatures {
        compose = true
    }
}

dependencies {
    // Core
    implementation(libs.androidx.core.ktx)
    implementation(libs.androidx.lifecycle.runtime.ktx)
    implementation(libs.androidx.lifecycle.viewmodel.compose)
    implementation(libs.androidx.activity.compose)

    // Compose BOM — all compose libs use BOM version
    implementation(platform(libs.androidx.compose.bom))
    implementation(libs.androidx.ui)
    implementation(libs.androidx.ui.graphics)
    implementation(libs.androidx.ui.tooling.preview)
    implementation(libs.androidx.material3)
    implementation(libs.androidx.material.icons.extended)
    debugImplementation(libs.androidx.ui.tooling)
    debugImplementation(libs.androidx.ui.test.manifest)

    // Navigation
    implementation(libs.androidx.navigation.compose)

    // Room
    implementation(libs.androidx.room.runtime)
    implementation(libs.androidx.room.ktx)
    ksp(libs.androidx.room.compiler)

    // Hilt
    implementation(libs.hilt.android)
    implementation(libs.hilt.navigation.compose)
    ksp(libs.hilt.compiler)

    // Retrofit + OkHttp
    implementation(libs.retrofit)
    implementation(libs.retrofit.gson)
    implementation(libs.okhttp)
    implementation(libs.okhttp.logging)
    implementation(libs.gson)

    // WorkManager + Hilt integration
    implementation(libs.androidx.work.runtime.ktx)
    implementation(libs.hilt.work)
    ksp(libs.hilt.work.compiler)

    // DataStore (for settings: backend URL, etc.)
    implementation(libs.androidx.datastore.preferences)

    // Coroutines
    implementation(libs.kotlinx.coroutines.android)

    // Tests
    testImplementation(libs.junit)
    androidTestImplementation(libs.androidx.junit)
    androidTestImplementation(libs.androidx.espresso.core)
    androidTestImplementation(platform(libs.androidx.compose.bom))
    androidTestImplementation(libs.androidx.ui.test.junit4)
}
```

---

## 1.6 — `gradle-wrapper.properties`

**Exact file path:** `android/gradle/wrapper/gradle-wrapper.properties`

```properties
distributionBase=GRADLE_USER_HOME
distributionPath=wrapper/dists
distributionUrl=https\://services.gradle.org/distributions/gradle-8.7-bin.zip
networkTimeout=10000
validateDistributionUrl=true
zipStoreBase=GRADLE_USER_HOME
zipStorePath=wrapper/dists
```

---

## 1.7 — `AndroidManifest.xml`

**Exact file path:** `android/app/src/main/AndroidManifest.xml`

```xml
<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">

    <!-- Required for syncing with the backend -->
    <uses-permission android:name="android.permission.INTERNET" />
    <!-- Required for WorkManager scheduling -->
    <uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED" />
    <!-- Required for task notifications -->
    <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
    <!-- Required for exact alarms (task reminders) -->
    <uses-permission android:name="android.permission.SCHEDULE_EXACT_ALARM" />

    <application
        android:name=".JamrahApplication"
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="@string/app_name"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:supportsRtl="false"
        android:theme="@style/Theme.JamrahApp">

        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:windowSoftInputMode="adjustResize">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>

    </application>

</manifest>
```

---

## 1.8 — `JamrahApplication.kt`

**Exact file path:** `android/app/src/main/java/com/jamrah/app/JamrahApplication.kt`

```kotlin
package com.jamrah.app

import android.app.Application
import androidx.hilt.work.HiltWorkerFactory
import androidx.work.Configuration
import dagger.hilt.android.HiltAndroidApp
import javax.inject.Inject

@HiltAndroidApp
class JamrahApplication : Application(), Configuration.Provider {

    @Inject
    lateinit var workerFactory: HiltWorkerFactory

    override val workManagerConfiguration: Configuration
        get() = Configuration.Builder()
            .setWorkerFactory(workerFactory)
            .build()
}
```

---

## 1.9 — `MainActivity.kt`

**Exact file path:** `android/app/src/main/java/com/jamrah/app/MainActivity.kt`

```kotlin
package com.jamrah.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import com.jamrah.app.ui.JamrahApp
import com.jamrah.app.ui.theme.JamrahTheme
import dagger.hilt.android.AndroidEntryPoint

@AndroidEntryPoint
class MainActivity : ComponentActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()                // full-bleed, handles status bar insets
        setContent {
            JamrahTheme {
                JamrahApp()              // single entry point — only tasks for now
            }
        }
    }
}
```

---

# ╔═════════════════════════════════════════╗
# ║  TASK 2 — Design System & Theme        ║
# ╚═════════════════════════════════════════╝

**Agent Role:** UI Builder
**Goal:** Establish the Jamrah design system in Compose, pixel-perfect match to the PC app.

---

## 2.1 — Patrick Hand Font

**Steps:**
1. Download `PatrickHand-Regular.ttf` from Google Fonts API.
2. Place at: `android/app/src/main/res/font/patrick_hand_regular.ttf`

---

## 2.2 — Theme Colors

**Exact file path:** `android/app/src/main/java/com/jamrah/app/ui/theme/Color.kt`

```kotlin
package com.jamrah.app.ui.theme

import androidx.compose.ui.graphics.Color

// ── Jamrah Base Palette (mirrors PC app tokens) ──
val JamrahBackground = Color(0xFFFAF9F7)     // cream background
val JamrahCard       = Color(0xFFFFFFFF)     // card/input background
val JamrahText       = Color(0xFF2D2D2D)     // primary text
val JamrahTextMuted  = Color(0x802D2D2D)     // 50% opacity text
val JamrahBorder     = Color(0x332D2D2D)     // subtle borders (20% opacity)
val JamrahBorderStrong = Color(0xFF2D2D2D)   // strong border (checkbox, cards)

// ── Priority Colors ──
val PriorityHigh     = Color(0xFFEF4444)     // red
val PriorityMedium   = Color(0xFF10B981)     // emerald green
val PriorityLow      = Color(0xFF9CA3AF)     // gray
val PriorityNone     = Color(0xFFD1D5DB)     // light gray

// ── Semantic ──
val DestructiveRed   = Color(0xFFDC2626)
val DestructiveBg    = Color(0xFFFEF2F2)
val DestructiveBorder= Color(0xFFFECACA)
val SuccessGreen     = Color(0xFF10B981)

// ── Dark Theme (mirror if needed) ──
val JamrahDarkBackground = Color(0xFF1A1A1A)
val JamrahDarkCard       = Color(0xFF2A2A2A)
val JamrahDarkText       = Color(0xFFF5F5F5)
```

---

## 2.3 — Typography

**Exact file path:** `android/app/src/main/java/com/jamrah/app/ui/theme/Type.kt`

```kotlin
package com.jamrah.app.ui.theme

import androidx.compose.material3.Typography
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp
import com.jamrah.app.R

val PatrickHand = FontFamily(
    Font(R.font.patrick_hand_regular, FontWeight.Normal)
)

val JamrahTypography = Typography(
    // Title in header: "Tasks"
    headlineLarge = TextStyle(
        fontFamily = PatrickHand,
        fontWeight = FontWeight.Normal,
        fontSize = 30.sp
    ),
    // Day name: "Mon"
    headlineMedium = TextStyle(
        fontFamily = PatrickHand,
        fontWeight = FontWeight.Normal,
        fontSize = 24.sp
    ),
    // Date display: "Jul 25, 2026"
    bodySmall = TextStyle(
        fontFamily = PatrickHand,
        fontWeight = FontWeight.Normal,
        fontSize = 14.sp
    ),
    // Task title in list
    bodyLarge = TextStyle(
        fontFamily = PatrickHand,
        fontWeight = FontWeight.Normal,
        fontSize = 18.sp
    ),
    // Task meta (time, recurrence)
    bodyMedium = TextStyle(
        fontFamily = PatrickHand,
        fontWeight = FontWeight.Normal,
        fontSize = 14.sp
    ),
    // Detail panel title
    displaySmall = TextStyle(
        fontFamily = PatrickHand,
        fontWeight = FontWeight.Normal,
        fontSize = 30.sp
    ),
    // Field labels
    labelMedium = TextStyle(
        fontFamily = PatrickHand,
        fontWeight = FontWeight.Normal,
        fontSize = 14.sp
    ),
    // Buttons
    labelLarge = TextStyle(
        fontFamily = PatrickHand,
        fontWeight = FontWeight.Normal,
        fontSize = 18.sp
    )
)
```

---

## 2.4 — Theme Entry Point

**Exact file path:** `android/app/src/main/java/com/jamrah/app/ui/theme/Theme.kt`

```kotlin
package com.jamrah.app.ui.theme

import android.os.Build
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable

private val LightColorScheme = lightColorScheme(
    background        = JamrahBackground,
    surface           = JamrahCard,
    onBackground      = JamrahText,
    onSurface         = JamrahText,
    outline           = JamrahBorder,
    primary           = JamrahText,
    onPrimary         = JamrahCard,
    error             = DestructiveRed,
)

@Composable
fun JamrahTheme(
    content: @Composable () -> Unit
) {
    MaterialTheme(
        colorScheme = LightColorScheme,
        typography  = JamrahTypography,
        content     = content
    )
}
```

---

# ╔═════════════════════════════════════════════╗
# ║  TASK 3 — Domain Model                     ║
# ╚═════════════════════════════════════════════╝

**Agent Role:** Data Engineer
**Goal:** Define the single source-of-truth domain model for tasks.

---

## 3.1 — `TaskItem.kt` (domain model)

**Exact file path:** `android/app/src/main/java/com/jamrah/app/domain/model/TaskItem.kt`

```kotlin
package com.jamrah.app.domain.model

/**
 * Domain model for a Task.
 * Matches the PC backend entity exactly:
 *   - String IDs matching format "task_{timestamp}_{random}"
 *   - completed as Int (0 = pending, 1 = done) — matches SQLite default
 *   - priority as String ("none" | "Low" | "Medium" | "High")
 *   - recurrence as String ("none" | "daily" | "weekly" | "monthly" | "custom")
 *   - customDays as JSON string e.g. "[0,1,4]" (day-of-week indices, Sun=0)
 *   - scheduledTime as "yyyy-MM-dd" or "yyyy-MM-ddTHH:mm"
 */
data class TaskItem(
    val id: String,
    val name: String,
    val goalId: String? = null,
    val completed: Int = 0,
    val createdAt: String,
    val parentTaskId: String? = null,
    val priority: String = "none",
    val completedAt: String? = null,
    val scheduledTime: String? = null,
    val recurrence: String? = null,
    val customDays: String? = null,
    val durationStart: String? = null,
    val durationEnd: String? = null,
    val notes: String? = null,

    // Transient — set locally when expanding recurring tasks
    val instanceDate: String? = null,
    val baseId: String? = null
)
```

---

## 3.2 — Task Utilities

**Exact file path:** `android/app/src/main/java/com/jamrah/app/domain/model/TaskUtils.kt`

```kotlin
package com.jamrah.app.domain.model

import java.text.SimpleDateFormat
import java.util.*

private val sdf = SimpleDateFormat("yyyy-MM-dd", Locale.US)

val DAY_NAMES = arrayOf("Sun","Mon","Tue","Wed","Thu","Fri","Sat")
val MONTH_NAMES = arrayOf("Jan","Feb","Mar","Apr","May","Jun",
    "Jul","Aug","Sep","Oct","Nov","Dec")

/** Generate a new unique task ID matching the PC app's format */
fun newTaskId(): String {
    val random = (Math.random() * 1e10).toLong().toString(36).take(6)
    return "task_${System.currentTimeMillis()}_$random"
}

/** Format a Date to "yyyy-MM-dd" */
fun dateKey(date: Date): String = sdf.format(date)

/** Today's key */
fun todayKey(): String = dateKey(Date())

/** Priority numeric value for sorting */
fun priorityValue(p: String): Int = when (p) {
    "High"   -> 3
    "Medium" -> 2
    "Low"    -> 1
    else     -> 0
}

/** Color resource ID for a priority string */
fun recLabel(recurrence: String?, customDays: String?): String {
    if (recurrence.isNullOrEmpty() || recurrence == "none") return ""
    if (recurrence == "custom" && !customDays.isNullOrEmpty()) {
        return try {
            val days = com.google.gson.Gson().fromJson(customDays, Array<Int>::class.java)
            "Custom (${days.joinToString(", ") { DAY_NAMES[it] }})"
        } catch (e: Exception) { "Custom" }
    }
    return when (recurrence) {
        "daily"   -> "Daily"
        "weekly"  -> "Weekly"
        "monthly" -> "Monthly"
        else      -> recurrence
    }
}

/**
 * Expand recurring tasks — mirrors the PC expandRecurringTasks() function.
 * Returns the expanded list (including copies for each occurrence date).
 */
fun expandRecurringTasks(tasks: List<TaskItem>): List<TaskItem> {
    val today = Calendar.getInstance().apply {
        set(Calendar.HOUR_OF_DAY, 0); set(Calendar.MINUTE, 0)
        set(Calendar.SECOND, 0); set(Calendar.MILLISECOND, 0)
    }.time
    val todayK = dateKey(today)

    val expanded = mutableListOf<TaskItem>()
    tasks.forEach { task ->
        if (task.recurrence.isNullOrEmpty() || task.recurrence == "none" || task.parentTaskId != null) {
            expanded.add(task); return@forEach
        }

        val startStr = task.durationStart
            ?: (task.createdAt.take(10).ifEmpty { task.scheduledTime?.take(10) ?: todayK })
        val endStr = task.durationEnd

        val cal = Calendar.getInstance()
        val startCal = Calendar.getInstance()
        try { startCal.time = sdf.parse(startStr) ?: today }
        catch (e: Exception) { startCal.time = today }

        val endCal = Calendar.getInstance()
        try {
            if (!endStr.isNullOrEmpty()) endCal.time = sdf.parse(endStr)!!
            else { endCal.time = today; endCal.add(Calendar.YEAR, 1) }
        } catch (e: Exception) {
            endCal.time = today; endCal.add(Calendar.YEAR, 1)
        }

        cal.time = startCal.time
        var count = 0
        while (!cal.time.after(endCal.time) && count < 2000) {
            val dk = dateKey(cal.time)
            if (dk >= todayK) {
                val parsed = if (!task.customDays.isNullOrEmpty()) {
                    try { com.google.gson.Gson().fromJson(task.customDays, Array<Int>::class.java).toList() }
                    catch (e: Exception) { emptyList() }
                } else emptyList<Int>()

                val dayOfWeek = cal.get(Calendar.DAY_OF_WEEK) - 1 // 0=Sun
                val shouldInclude = when (task.recurrence) {
                    "daily"   -> true
                    "weekly"  -> true
                    "monthly" -> true
                    "custom"  -> parsed.contains(dayOfWeek)
                    else      -> false
                }
                if (shouldInclude) {
                    expanded.add(task.copy(instanceDate = dk, baseId = task.id))
                }
            }
            when (task.recurrence) {
                "daily"   -> cal.add(Calendar.DAY_OF_YEAR, 1)
                "weekly"  -> cal.add(Calendar.WEEK_OF_YEAR, 1)
                "monthly" -> cal.add(Calendar.MONTH, 1)
                "custom"  -> cal.add(Calendar.DAY_OF_YEAR, 1)
                else      -> break
            }
            count++
        }
    }
    return expanded
}
```

---

# ╔═════════════════════════════════════════════╗
# ║  TASK 4 — Room Database Layer              ║
# ╚═════════════════════════════════════════════╝

**Agent Role:** Data Engineer
**Goal:** Persistent local storage that mirrors the PC's SQLite schema exactly.

---

## 4.1 — Room Entity

**Exact file path:** `android/app/src/main/java/com/jamrah/app/data/local/entity/TaskEntity.kt`

```kotlin
package com.jamrah.app.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

/**
 * Room entity for a task.
 * Table name "tasks" matches the PC backend schema exactly.
 * Column names use camelCase to match the JSON from the API.
 */
@Entity(tableName = "tasks")
data class TaskEntity(
    @PrimaryKey
    val id: String,
    val name: String,
    val goalId: String? = null,
    val completed: Int = 0,
    val createdAt: String,
    val parentTaskId: String? = null,
    val priority: String = "none",
    val completedAt: String? = null,
    val scheduledTime: String? = null,
    val recurrence: String? = null,
    val customDays: String? = null,
    val durationStart: String? = null,
    val durationEnd: String? = null,
    val notes: String? = null,

    // Sync metadata (not in PC schema — local only)
    val updatedAt: Long = System.currentTimeMillis(), // epoch ms
    val syncStatus: String = "synced"  // "synced" | "pending_create" | "pending_update" | "pending_delete"
)
```

---

## 4.2 — DAO

**Exact file path:** `android/app/src/main/java/com/jamrah/app/data/local/dao/TaskDao.kt`

```kotlin
package com.jamrah.app.data.local.dao

import androidx.room.*
import com.jamrah.app.data.local.entity.TaskEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface TaskDao {

    /** Observe all tasks as a Flow — auto-recomposes UI on change */
    @Query("SELECT * FROM tasks WHERE syncStatus != 'pending_delete' ORDER BY createdAt DESC")
    fun observeAll(): Flow<List<TaskEntity>>

    /** One-shot read for sync purposes */
    @Query("SELECT * FROM tasks")
    suspend fun getAll(): List<TaskEntity>

    @Query("SELECT * FROM tasks WHERE id = :id LIMIT 1")
    suspend fun getById(id: String): TaskEntity?

    /** Upsert: insert or replace on conflict */
    @Upsert
    suspend fun upsert(task: TaskEntity)

    @Upsert
    suspend fun upsertAll(tasks: List<TaskEntity>)

    @Query("UPDATE tasks SET syncStatus = :status, updatedAt = :updatedAt WHERE id = :id")
    suspend fun updateSyncStatus(id: String, status: String, updatedAt: Long = System.currentTimeMillis())

    @Query("UPDATE tasks SET completed = :completed, completedAt = :completedAt, syncStatus = 'pending_update', updatedAt = :updatedAt WHERE id = :id")
    suspend fun toggleCompleted(id: String, completed: Int, completedAt: String?, updatedAt: Long = System.currentTimeMillis())

    @Query("UPDATE tasks SET syncStatus = 'pending_delete', updatedAt = :updatedAt WHERE id = :id")
    suspend fun markDeleted(id: String, updatedAt: Long = System.currentTimeMillis())

    @Query("DELETE FROM tasks WHERE id = :id")
    suspend fun hardDelete(id: String)

    @Query("SELECT * FROM tasks WHERE syncStatus != 'synced'")
    suspend fun getPending(): List<TaskEntity>

    @Query("SELECT * FROM tasks WHERE parentTaskId = :parentId AND syncStatus != 'pending_delete'")
    suspend fun getSubtasks(parentId: String): List<TaskEntity>
}
```

---

## 4.3 — Database

**Exact file path:** `android/app/src/main/java/com/jamrah/app/data/local/JamrahDatabase.kt`

```kotlin
package com.jamrah.app.data.local

import androidx.room.Database
import androidx.room.RoomDatabase
import com.jamrah.app.data.local.dao.TaskDao
import com.jamrah.app.data.local.entity.TaskEntity

@Database(
    entities = [TaskEntity::class],
    version = 1,
    exportSchema = true
)
abstract class JamrahDatabase : RoomDatabase() {
    abstract fun taskDao(): TaskDao
}
```

---

## 4.4 — DI: Database Module

**Exact file path:** `android/app/src/main/java/com/jamrah/app/di/DatabaseModule.kt`

```kotlin
package com.jamrah.app.di

import android.content.Context
import androidx.room.Room
import com.jamrah.app.data.local.JamrahDatabase
import com.jamrah.app.data.local.dao.TaskDao
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object DatabaseModule {

    @Provides
    @Singleton
    fun provideDatabase(@ApplicationContext context: Context): JamrahDatabase =
        Room.databaseBuilder(context, JamrahDatabase::class.java, "jamrah.db")
            .fallbackToDestructiveMigrationOnDowngrade()
            .build()

    @Provides
    @Singleton
    fun provideTaskDao(db: JamrahDatabase): TaskDao = db.taskDao()
}
```

---

# ╔═════════════════════════════════════════════╗
# ║  TASK 5 — Network Layer (Retrofit)         ║
# ╚═════════════════════════════════════════════╝

**Agent Role:** Data Engineer
**Goal:** HTTP client that talks to the existing ASP.NET Core backend.

---

## 5.1 — API DTOs (mirrors backend DTOs exactly)

**Exact file path:** `android/app/src/main/java/com/jamrah/app/data/remote/dto/TaskDto.kt`

```kotlin
package com.jamrah.app.data.remote.dto

import com.google.gson.annotations.SerializedName

/** Mirrors the backend's TaskItem JSON response */
data class TaskDto(
    @SerializedName("id")            val id: String,
    @SerializedName("name")          val name: String,
    @SerializedName("goalId")        val goalId: String?,
    @SerializedName("completed")     val completed: Int,
    @SerializedName("createdAt")     val createdAt: String,
    @SerializedName("parentTaskId")  val parentTaskId: String?,
    @SerializedName("priority")      val priority: String,
    @SerializedName("completedAt")   val completedAt: String?,
    @SerializedName("scheduledTime") val scheduledTime: String?,
    @SerializedName("recurrence")    val recurrence: String?,
    @SerializedName("customDays")    val customDays: String?,
    @SerializedName("durationStart") val durationStart: String?,
    @SerializedName("durationEnd")   val durationEnd: String?,
    @SerializedName("notes")         val notes: String?
)

/** Mirrors CreateTaskItemDto */
data class CreateTaskDto(
    @SerializedName("id")            val id: String,
    @SerializedName("name")          val name: String,
    @SerializedName("goalId")        val goalId: String? = null,
    @SerializedName("parentTaskId")  val parentTaskId: String? = null,
    @SerializedName("priority")      val priority: String = "none",
    @SerializedName("scheduledTime") val scheduledTime: String? = null,
    @SerializedName("recurrence")    val recurrence: String? = null,
    @SerializedName("customDays")    val customDays: String? = null,
    @SerializedName("durationStart") val durationStart: String? = null,
    @SerializedName("durationEnd")   val durationEnd: String? = null,
    @SerializedName("notes")         val notes: String? = null
)

/** Mirrors UpdateTaskItemDto */
data class UpdateTaskDto(
    @SerializedName("name")          val name: String? = null,
    @SerializedName("priority")      val priority: String? = null,
    @SerializedName("scheduledTime") val scheduledTime: String? = null,
    @SerializedName("recurrence")    val recurrence: String? = null,
    @SerializedName("customDays")    val customDays: String? = null,
    @SerializedName("durationStart") val durationStart: String? = null,
    @SerializedName("durationEnd")   val durationEnd: String? = null,
    @SerializedName("notes")         val notes: String? = null
)
```

---

## 5.2 — API Interface

**Exact file path:** `android/app/src/main/java/com/jamrah/app/data/remote/api/TasksApi.kt`

```kotlin
package com.jamrah.app.data.remote.api

import com.jamrah.app.data.remote.dto.CreateTaskDto
import com.jamrah.app.data.remote.dto.TaskDto
import com.jamrah.app.data.remote.dto.UpdateTaskDto
import retrofit2.Response
import retrofit2.http.*

interface TasksApi {

    @GET("api/tasks")
    suspend fun getAll(): Response<List<TaskDto>>

    @POST("api/tasks")
    suspend fun create(@Body dto: CreateTaskDto): Response<Boolean>

    @PUT("api/tasks/{id}")
    suspend fun update(@Path("id") id: String, @Body dto: UpdateTaskDto): Response<Boolean>

    @PUT("api/tasks/{id}/toggle")
    suspend fun toggle(@Path("id") id: String): Response<Boolean>

    @DELETE("api/tasks/{id}")
    suspend fun delete(@Path("id") id: String): Response<Boolean>
}
```

---

## 5.3 — DataStore for settings (backend URL)

**Exact file path:** `android/app/src/main/java/com/jamrah/app/data/local/AppPreferences.kt`

```kotlin
package com.jamrah.app.data.local

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import javax.inject.Inject
import javax.inject.Singleton

private val Context.dataStore: DataStore<Preferences> by preferencesDataStore(name = "jamrah_prefs")

@Singleton
class AppPreferences @Inject constructor(
    @ApplicationContext private val context: Context
) {
    companion object {
        val BACKEND_URL = stringPreferencesKey("backend_url")
        const val DEFAULT_URL = "http://10.0.2.2:5000/"  // 10.0.2.2 = localhost for emulator
    }

    val backendUrl: Flow<String> = context.dataStore.data.map { prefs ->
        prefs[BACKEND_URL] ?: DEFAULT_URL
    }

    suspend fun setBackendUrl(url: String) {
        context.dataStore.edit { it[BACKEND_URL] = url }
    }
}
```

> 💡 **Note for you:** `10.0.2.2` is the Android emulator's alias for `localhost` on the host machine.
> On a real device on the same WiFi network, you'll use your PC's local IP (e.g. `http://192.168.1.x:5000/`).

---

## 5.4 — DI: Network Module

**Exact file path:** `android/app/src/main/java/com/jamrah/app/di/NetworkModule.kt`

```kotlin
package com.jamrah.app.di

import com.google.gson.Gson
import com.google.gson.GsonBuilder
import com.jamrah.app.data.local.AppPreferences
import com.jamrah.app.data.remote.api.TasksApi
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.runBlocking
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.util.concurrent.TimeUnit
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object NetworkModule {

    @Provides
    @Singleton
    fun provideGson(): Gson = GsonBuilder().setLenient().create()

    @Provides
    @Singleton
    fun provideOkHttp(): OkHttpClient = OkHttpClient.Builder()
        .connectTimeout(10, TimeUnit.SECONDS)
        .readTimeout(15, TimeUnit.SECONDS)
        .writeTimeout(15, TimeUnit.SECONDS)
        .addInterceptor(HttpLoggingInterceptor().apply {
            level = HttpLoggingInterceptor.Level.BODY
        })
        .build()

    /**
     * Retrofit is provided with a dynamic base URL.
     * The base URL is read from DataStore at startup.
     * Future improvement: make Retrofit URL change at runtime without restart.
     */
    @Provides
    @Singleton
    fun provideRetrofit(
        okHttp: OkHttpClient,
        gson: Gson,
        prefs: AppPreferences
    ): Retrofit {
        val baseUrl = runBlocking { prefs.backendUrl.first() }
        return Retrofit.Builder()
            .baseUrl(baseUrl.trimEnd('/') + "/")
            .client(okHttp)
            .addConverterFactory(GsonConverterFactory.create(gson))
            .build()
    }

    @Provides
    @Singleton
    fun provideTasksApi(retrofit: Retrofit): TasksApi =
        retrofit.create(TasksApi::class.java)
}
```

---

# ╔═════════════════════════════════════════════╗
# ║  TASK 6 — Repository                       ║
# ╚═════════════════════════════════════════════╝

**Agent Role:** Data Engineer
**Goal:** Bridge between DAO (local) and API (remote), provide the ViewModel with Flows.

---

## 6.1 — Mappers

**Exact file path:** `android/app/src/main/java/com/jamrah/app/data/mapper/TaskMapper.kt`

```kotlin
package com.jamrah.app.data.mapper

import com.jamrah.app.data.local.entity.TaskEntity
import com.jamrah.app.data.remote.dto.CreateTaskDto
import com.jamrah.app.data.remote.dto.TaskDto
import com.jamrah.app.data.remote.dto.UpdateTaskDto
import com.jamrah.app.domain.model.TaskItem

fun TaskEntity.toDomain(): TaskItem = TaskItem(
    id = id, name = name, goalId = goalId,
    completed = completed, createdAt = createdAt,
    parentTaskId = parentTaskId, priority = priority,
    completedAt = completedAt, scheduledTime = scheduledTime,
    recurrence = recurrence, customDays = customDays,
    durationStart = durationStart, durationEnd = durationEnd,
    notes = notes
)

fun TaskItem.toEntity(syncStatus: String = "synced"): TaskEntity = TaskEntity(
    id = id, name = name, goalId = goalId,
    completed = completed, createdAt = createdAt,
    parentTaskId = parentTaskId, priority = priority,
    completedAt = completedAt, scheduledTime = scheduledTime,
    recurrence = recurrence, customDays = customDays,
    durationStart = durationStart, durationEnd = durationEnd,
    notes = notes, syncStatus = syncStatus
)

fun TaskDto.toEntity(): TaskEntity = TaskEntity(
    id = id, name = name, goalId = goalId,
    completed = completed, createdAt = createdAt,
    parentTaskId = parentTaskId, priority = priority,
    completedAt = completedAt, scheduledTime = scheduledTime,
    recurrence = recurrence, customDays = customDays,
    durationStart = durationStart, durationEnd = durationEnd,
    notes = notes, syncStatus = "synced"
)

fun TaskItem.toCreateDto(): CreateTaskDto = CreateTaskDto(
    id = id, name = name, goalId = goalId,
    parentTaskId = parentTaskId, priority = priority,
    scheduledTime = scheduledTime, recurrence = recurrence,
    customDays = customDays, durationStart = durationStart,
    durationEnd = durationEnd, notes = notes
)

fun TaskItem.toUpdateDto(): UpdateTaskDto = UpdateTaskDto(
    name = name, priority = priority,
    scheduledTime = scheduledTime, recurrence = recurrence,
    customDays = customDays, durationStart = durationStart,
    durationEnd = durationEnd, notes = notes
)
```

---

## 6.2 — Repository Interface

**Exact file path:** `android/app/src/main/java/com/jamrah/app/data/repository/TaskRepository.kt`

```kotlin
package com.jamrah.app.data.repository

import com.jamrah.app.domain.model.TaskItem
import kotlinx.coroutines.flow.Flow

interface TaskRepository {
    fun observeAll(): Flow<List<TaskItem>>
    suspend fun createTask(task: TaskItem)
    suspend fun updateTask(task: TaskItem)
    suspend fun toggleTask(id: String)
    suspend fun deleteTask(id: String)
    suspend fun getById(id: String): TaskItem?
    suspend fun sync(): Result<Unit>       // pull server + push pending
}
```

---

## 6.3 — Repository Implementation

**Exact file path:** `android/app/src/main/java/com/jamrah/app/data/repository/TaskRepositoryImpl.kt`

```kotlin
package com.jamrah.app.data.repository

import com.jamrah.app.data.local.dao.TaskDao
import com.jamrah.app.data.mapper.*
import com.jamrah.app.data.remote.api.TasksApi
import com.jamrah.app.data.remote.dto.UpdateTaskDto
import com.jamrah.app.domain.model.TaskItem
import com.jamrah.app.domain.model.newTaskId
import com.jamrah.app.domain.model.todayKey
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import java.text.SimpleDateFormat
import java.util.*
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class TaskRepositoryImpl @Inject constructor(
    private val dao: TaskDao,
    private val api: TasksApi
) : TaskRepository {

    private val isoFmt = SimpleDateFormat("yyyy-MM-dd HH:mm:ss", Locale.US)

    override fun observeAll(): Flow<List<TaskItem>> =
        dao.observeAll().map { list -> list.map { it.toDomain() } }

    override suspend fun createTask(task: TaskItem) {
        // 1. Write locally as pending_create
        dao.upsert(task.toEntity(syncStatus = "pending_create"))
        // 2. Try to push immediately (fire-and-forget; SyncWorker handles failures)
        runCatching {
            val response = api.create(task.toCreateDto())
            if (response.isSuccessful) {
                dao.updateSyncStatus(task.id, "synced")
            }
        }
    }

    override suspend fun updateTask(task: TaskItem) {
        dao.upsert(task.toEntity(syncStatus = "pending_update"))
        runCatching {
            val response = api.update(task.id, task.toUpdateDto())
            if (response.isSuccessful) dao.updateSyncStatus(task.id, "synced")
        }
    }

    override suspend fun toggleTask(id: String) {
        val entity = dao.getById(id) ?: return
        val nowCompleted = if (entity.completed == 0) 1 else 0
        val completedAt = if (nowCompleted == 1) todayKey() else null
        dao.toggleCompleted(id, nowCompleted, completedAt)
        runCatching {
            val response = api.toggle(id)
            if (response.isSuccessful) dao.updateSyncStatus(id, "synced")
        }
    }

    override suspend fun deleteTask(id: String) {
        // Also delete subtasks locally
        val subtasks = dao.getSubtasks(id)
        subtasks.forEach { dao.markDeleted(it.id) }
        dao.markDeleted(id)
        runCatching {
            val response = api.delete(id)
            if (response.isSuccessful) {
                dao.hardDelete(id)
                subtasks.forEach { dao.hardDelete(it.id) }
            }
        }
    }

    override suspend fun getById(id: String): TaskItem? =
        dao.getById(id)?.toDomain()

    /**
     * Full sync: push all pending local changes, then pull server state.
     * Called by SyncWorker and on app foreground.
     */
    override suspend fun sync(): Result<Unit> = runCatching {
        // 1. Push pending changes
        val pending = dao.getPending()
        pending.forEach { entity ->
            when (entity.syncStatus) {
                "pending_create" -> {
                    val resp = api.create(entity.toDomain().toCreateDto())
                    if (resp.isSuccessful) dao.updateSyncStatus(entity.id, "synced")
                }
                "pending_update" -> {
                    val dto = UpdateTaskDto(
                        name = entity.name, priority = entity.priority,
                        scheduledTime = entity.scheduledTime,
                        recurrence = entity.recurrence,
                        customDays = entity.customDays,
                        durationStart = entity.durationStart,
                        durationEnd = entity.durationEnd,
                        notes = entity.notes
                    )
                    val resp = api.update(entity.id, dto)
                    if (resp.isSuccessful) dao.updateSyncStatus(entity.id, "synced")
                }
                "pending_delete" -> {
                    val resp = api.delete(entity.id)
                    if (resp.isSuccessful) dao.hardDelete(entity.id)
                }
            }
        }

        // 2. Pull server state
        val serverResp = api.getAll()
        if (serverResp.isSuccessful) {
            val serverTasks = serverResp.body() ?: emptyList()
            // Upsert all server tasks (overwrites local synced rows, keeps pending ones)
            val localPendingIds = dao.getPending().map { it.id }.toSet()
            serverTasks
                .filter { it.id !in localPendingIds }
                .forEach { dto -> dao.upsert(dto.toEntity()) }
        }
    }
}
```

---

## 6.4 — DI: Repository Module

**Exact file path:** `android/app/src/main/java/com/jamrah/app/di/RepositoryModule.kt`

```kotlin
package com.jamrah.app.di

import com.jamrah.app.data.repository.TaskRepository
import com.jamrah.app.data.repository.TaskRepositoryImpl
import dagger.Binds
import dagger.Module
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
abstract class RepositoryModule {

    @Binds
    @Singleton
    abstract fun bindTaskRepository(impl: TaskRepositoryImpl): TaskRepository
}
```

---

# ╔═════════════════════════════════════════════╗
# ║  TASK 7 — ViewModel                        ║
# ╚═════════════════════════════════════════════╝

**Agent Role:** UI Builder
**Goal:** All UI state and business logic isolated from composables.

---

## 7.1 — State classes

**Exact file path:** `android/app/src/main/java/com/jamrah/app/ui/tasks/TasksState.kt`

```kotlin
package com.jamrah.app.ui.tasks

import com.jamrah.app.domain.model.TaskItem
import java.util.Date

enum class FilterMode { ALL, ACTIVE, COMPLETED }
enum class SortMode   { PRIORITY_DESC, DATE_ASC, DATE_DESC }

data class TasksUiState(
    val currentDate: Date       = Date(),
    val tasks: List<TaskItem>   = emptyList(),
    val filterMode: FilterMode  = FilterMode.ALL,
    val sortMode: SortMode      = SortMode.PRIORITY_DESC,
    val selectedTaskId: String? = null,
    val isLoading: Boolean      = false,
    val isSyncing: Boolean      = false,
    val syncError: String?      = null,
    val newTaskName: String     = "",
    val newTaskTime: String     = "",        // "HH:mm"
    val newTaskRecurrence: String = "none",
    val newTaskPriority: String   = "none",
    val newTaskCustomDays: List<Int> = emptyList(),
    val showNewOptions: Boolean   = false,
    val expandedTaskIds: Set<String> = emptySet()
)

sealed class TasksEvent {
    object NavigatePrevDay : TasksEvent()
    object NavigateNextDay : TasksEvent()
    object NavigateToday   : TasksEvent()
    data class SelectTask(val id: String)     : TasksEvent()
    data class ToggleTask(val id: String)     : TasksEvent()
    data class DeleteTask(val id: String)     : TasksEvent()
    data class ToggleExpanded(val id: String) : TasksEvent()
    object CycleFilter     : TasksEvent()
    object CycleSort       : TasksEvent()
    data class AddTask(
        val name: String, val time: String, val recurrence: String,
        val priority: String, val customDays: List<Int>
    ) : TasksEvent()
    data class UpdateTask(val task: TaskItem) : TasksEvent()
    data class AddSubtask(val parentId: String, val name: String) : TasksEvent()
    object Sync            : TasksEvent()
    object CloseDetail     : TasksEvent()
}
```

---

## 7.2 — ViewModel

**Exact file path:** `android/app/src/main/java/com/jamrah/app/ui/tasks/TasksViewModel.kt`

```kotlin
package com.jamrah.app.ui.tasks

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.jamrah.app.data.repository.TaskRepository
import com.jamrah.app.domain.model.*
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.*
import javax.inject.Inject

@HiltViewModel
class TasksViewModel @Inject constructor(
    private val repo: TaskRepository
) : ViewModel() {

    private val _state = MutableStateFlow(TasksUiState())
    val state: StateFlow<TasksUiState> = _state.asStateFlow()

    private val dateFmt = SimpleDateFormat("yyyy-MM-dd", Locale.US)
    private val isoFmt  = SimpleDateFormat("yyyy-MM-dd'T'HH:mm", Locale.US)
    private val nowFmt  = SimpleDateFormat("yyyy-MM-dd HH:mm:ss", Locale.US)

    init {
        // Collect all tasks from Room and recompute filtered list on every change
        viewModelScope.launch {
            repo.observeAll().collect { tasks ->
                _state.update { it.copy(tasks = tasks) }
            }
        }
    }

    fun onEvent(event: TasksEvent) {
        when (event) {
            is TasksEvent.NavigatePrevDay -> {
                val cal = Calendar.getInstance().apply { time = _state.value.currentDate }
                cal.add(Calendar.DAY_OF_YEAR, -1)
                _state.update { it.copy(currentDate = cal.time) }
            }
            is TasksEvent.NavigateNextDay -> {
                val cal = Calendar.getInstance().apply { time = _state.value.currentDate }
                cal.add(Calendar.DAY_OF_YEAR, 1)
                _state.update { it.copy(currentDate = cal.time) }
            }
            is TasksEvent.NavigateToday -> {
                _state.update { it.copy(currentDate = Date()) }
            }
            is TasksEvent.CycleFilter -> {
                val next = when (_state.value.filterMode) {
                    FilterMode.ALL       -> FilterMode.ACTIVE
                    FilterMode.ACTIVE    -> FilterMode.COMPLETED
                    FilterMode.COMPLETED -> FilterMode.ALL
                }
                _state.update { it.copy(filterMode = next) }
            }
            is TasksEvent.CycleSort -> {
                val next = when (_state.value.sortMode) {
                    SortMode.PRIORITY_DESC -> SortMode.DATE_ASC
                    SortMode.DATE_ASC      -> SortMode.DATE_DESC
                    SortMode.DATE_DESC     -> SortMode.PRIORITY_DESC
                }
                _state.update { it.copy(sortMode = next) }
            }
            is TasksEvent.SelectTask -> {
                _state.update { it.copy(selectedTaskId = event.id) }
            }
            is TasksEvent.CloseDetail -> {
                _state.update { it.copy(selectedTaskId = null) }
            }
            is TasksEvent.ToggleExpanded -> {
                val ids = _state.value.expandedTaskIds.toMutableSet()
                if (ids.contains(event.id)) ids.remove(event.id) else ids.add(event.id)
                _state.update { it.copy(expandedTaskIds = ids) }
            }
            is TasksEvent.ToggleTask -> {
                viewModelScope.launch { repo.toggleTask(event.id) }
            }
            is TasksEvent.DeleteTask -> {
                viewModelScope.launch {
                    repo.deleteTask(event.id)
                    if (_state.value.selectedTaskId == event.id) {
                        _state.update { it.copy(selectedTaskId = null) }
                    }
                }
            }
            is TasksEvent.AddTask -> {
                if (event.name.isBlank()) return
                viewModelScope.launch {
                    val dayKey = dateFmt.format(_state.value.currentDate)
                    val sched = if (event.time.isNotEmpty()) "${dayKey}T${event.time}"
                                else if (event.recurrence != "none") dayKey
                                else null
                    val customDaysJson = if (event.recurrence == "custom" && event.customDays.isNotEmpty())
                        com.google.gson.Gson().toJson(event.customDays) else ""
                    val task = TaskItem(
                        id = newTaskId(),
                        name = event.name,
                        priority = event.priority,
                        scheduledTime = sched,
                        recurrence = event.recurrence,
                        customDays = customDaysJson.ifEmpty { null },
                        createdAt = nowFmt.format(Date())
                    )
                    repo.createTask(task)
                    _state.update { it.copy(selectedTaskId = task.id) }
                }
            }
            is TasksEvent.UpdateTask -> {
                viewModelScope.launch { repo.updateTask(event.task) }
            }
            is TasksEvent.AddSubtask -> {
                if (event.name.isBlank()) return
                viewModelScope.launch {
                    val subtask = TaskItem(
                        id = newTaskId(), name = event.name,
                        parentTaskId = event.parentId, priority = "none",
                        createdAt = nowFmt.format(Date())
                    )
                    repo.createTask(subtask)
                }
            }
            is TasksEvent.Sync -> {
                viewModelScope.launch {
                    _state.update { it.copy(isSyncing = true, syncError = null) }
                    val result = repo.sync()
                    _state.update { it.copy(
                        isSyncing = false,
                        syncError = result.exceptionOrNull()?.message
                    )}
                }
            }
        }
    }

    /** Derived: tasks filtered for today's date, sorted, and expanded */
    fun getFilteredTasks(): List<TaskItem> {
        val s = _state.value
        val dayKey = dateFmt.format(s.currentDate)

        // Only top-level tasks for this computation
        val topLevel = s.tasks.filter { it.parentTaskId == null }

        // Sort
        val sorted = when (s.sortMode) {
            SortMode.PRIORITY_DESC -> topLevel.sortedByDescending { priorityValue(it.priority) }
            SortMode.DATE_ASC      -> topLevel.sortedBy { it.instanceDate ?: it.scheduledTime ?: it.createdAt }
            SortMode.DATE_DESC     -> topLevel.sortedByDescending { it.instanceDate ?: it.scheduledTime ?: it.createdAt }
        }

        // Expand recurring tasks
        val expanded = expandRecurringTasks(sorted)

        // Filter by current date
        var filtered = expanded.filter { t ->
            val td = (t.instanceDate ?: t.scheduledTime ?: t.createdAt).take(10)
            td == dayKey
        }

        // Apply filter mode
        filtered = when (s.filterMode) {
            FilterMode.ACTIVE    -> filtered.filter { it.completed == 0 }
            FilterMode.COMPLETED -> filtered.filter { it.completed == 1 }
            FilterMode.ALL       -> filtered
        }

        return filtered
    }

    fun getSubtasks(parentId: String): List<TaskItem> =
        _state.value.tasks.filter { it.parentTaskId == parentId }
}
```

---

# ╔══════════════════════════════════════════════════════╗
# ║  TASK 8 — Tasks Page UI (Jetpack Compose)           ║
# ╚══════════════════════════════════════════════════════╝

**Agent Role:** UI Builder
**Goal:** Tasks page that is pixel-perfect to the PC app, adapted for mobile vertical scroll.

### Mobile Adaptation Rules
- PC app: left column (list) + right column (detail panel), side by side.
- Mobile: vertical scroll — list on top, detail panel slides up from bottom as a **bottom sheet** when a task is selected.
- All colors, fonts, sizes, interactions are identical to PC.
- The resizable divider does not exist on mobile (replaced by the bottom sheet).

---

## 8.1 — App Entry Point

**Exact file path:** `android/app/src/main/java/com/jamrah/app/ui/JamrahApp.kt`

```kotlin
package com.jamrah.app.ui

import androidx.compose.runtime.Composable
import com.jamrah.app.ui.tasks.TasksScreen

/**
 * For Phase 0: only the Tasks screen.
 * Navigation will be added in future phases.
 */
@Composable
fun JamrahApp() {
    TasksScreen()
}
```

---

## 8.2 — Reusable Components

### 8.2.1 — Task Checkbox

**Exact file path:** `android/app/src/main/java/com/jamrah/app/ui/components/TaskCheckbox.kt`

```kotlin
package com.jamrah.app.ui.components

import androidx.compose.animation.animateColorAsState
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
```

### 8.2.2 — Priority Dot

**Exact file path:** `android/app/src/main/java/com/jamrah/app/ui/components/PriorityDot.kt`

```kotlin
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
```

---

## 8.3 — Task List Item

**Exact file path:** `android/app/src/main/java/com/jamrah/app/ui/tasks/TaskListItem.kt`

```kotlin
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
```

---

## 8.4 — Tasks List Section

**Exact file path:** `android/app/src/main/java/com/jamrah/app/ui/tasks/TasksListSection.kt`

```kotlin
package com.jamrah.app.ui.tasks

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.jamrah.app.domain.model.TaskItem
import com.jamrah.app.ui.theme.JamrahTextMuted

/**
 * The scrollable list of tasks for the selected day.
 * Mirrors the PC app's #tasks-list section.
 */
@Composable
fun TasksListSection(
    tasks: List<TaskItem>,
    allTasks: List<TaskItem>,
    selectedId: String?,
    expandedIds: Set<String>,
    onSelect: (String) -> Unit,
    onToggleExpand: (String) -> Unit,
    onToggle: (String) -> Unit,
    onDelete: (String) -> Unit,
    modifier: Modifier = Modifier
) {
    if (tasks.isEmpty()) {
        Box(
            contentAlignment = Alignment.Center,
            modifier = modifier.fillMaxWidth().padding(vertical = 48.dp)
        ) {
            Text("No tasks.", style = MaterialTheme.typography.bodyLarge, color = JamrahTextMuted)
        }
        return
    }

    LazyColumn(modifier = modifier.fillMaxWidth()) {
        items(tasks, key = { "${it.id}_${it.instanceDate}" }) { task ->
            val subtasks = allTasks.filter { it.parentTaskId == task.id }
            val hasSubtasks = subtasks.isNotEmpty()
            val isExpanded = expandedIds.contains(task.id)

            TaskListItem(
                task = task,
                isSelected = task.id == selectedId,
                hasSubtasks = hasSubtasks,
                onSelect = { onSelect(task.id) },
                onToggleExpand = { onToggleExpand(task.id) },
                onToggleComplete = { onToggle(task.id) },
                onDelete = { onDelete(task.id) }
            )

            // Show subtasks when expanded
            if (hasSubtasks && isExpanded) {
                subtasks.forEach { sub ->
                    TaskListItem(
                        task = sub,
                        isSelected = sub.id == selectedId,
                        hasSubtasks = false,
                        onSelect = { onSelect(sub.id) },
                        onToggleExpand = {},
                        onToggleComplete = { onToggle(sub.id) },
                        onDelete = { onDelete(sub.id) },
                        modifier = Modifier.padding(start = 36.dp)
                    )
                }
            }
        }
    }
}
```

---

## 8.5 — New Task Card

**Exact file path:** `android/app/src/main/java/com/jamrah/app/ui/tasks/NewTaskCard.kt`

```kotlin
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
                    OutlinedTextField(
                        value = time,
                        onValueChange = { time = it },
                        label = { Text("Time (HH:mm)", style = MaterialTheme.typography.bodyMedium) },
                        placeholder = { Text("e.g. 09:00") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth()
                    )

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
```

---

## 8.6 — Recurrence & Priority Selectors

**Exact file path:** `android/app/src/main/java/com/jamrah/app/ui/tasks/TaskSelectors.kt`

```kotlin
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
    val options = listOf("none" to "None", "daily" to "Daily",
        "weekly" to "Weekly", "monthly" to "Monthly", "custom" to "Custom")

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
```

---

## 8.7 — Task Detail Bottom Sheet

**Exact file path:** `android/app/src/main/java/com/jamrah/app/ui/tasks/TaskDetailSheet.kt`

```kotlin
package com.jamrah.app.ui.tasks

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
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
                OutlinedTextField(
                    value = editTime,
                    onValueChange = { editTime = it },
                    label = { Text("Time (HH:mm)") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )

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
                    color = if (task.notes.isNullOrEmpty()) JamrahTextMuted else JamrahText,
                    lineHeight = MaterialTheme.typography.bodyLarge.lineHeight * 1.6f
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
```

---

## 8.8 — Tasks Header

**Exact file path:** `android/app/src/main/java/com/jamrah/app/ui/tasks/TasksHeader.kt`

```kotlin
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
            // Left: "Tasks"
            Text(
                text = "Tasks",
                style = MaterialTheme.typography.headlineLarge,
                color = JamrahText
            )

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
```

---

## 8.9 — Tasks Screen (Root Composable)

**Exact file path:** `android/app/src/main/java/com/jamrah/app/ui/tasks/TasksScreen.kt`

```kotlin
package com.jamrah.app.ui.tasks

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.jamrah.app.ui.theme.JamrahBackground

/**
 * Root Tasks screen.
 * Layout:
 *   - TasksHeader (fixed top)
 *   - NewTaskCard
 *   - TasksListSection (scrollable)
 *   - TaskDetailSheet (bottom sheet, shown when a task is selected)
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TasksScreen(
    viewModel: TasksViewModel = hiltViewModel()
) {
    val state by viewModel.state.collectAsState()
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)

    val filteredTasks = remember(state.tasks, state.currentDate, state.filterMode, state.sortMode) {
        viewModel.getFilteredTasks()
    }

    val selectedTask = remember(state.selectedTaskId, state.tasks) {
        state.selectedTaskId?.let { id -> state.tasks.find { it.id == id } }
    }

    val subtasks = remember(state.selectedTaskId, state.tasks) {
        state.selectedTaskId?.let { id -> viewModel.getSubtasks(id) } ?: emptyList()
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(JamrahBackground)
    ) {
        Column(modifier = Modifier.fillMaxSize()) {
            // Header
            TasksHeader(
                currentDate  = state.currentDate,
                filterMode   = state.filterMode,
                sortMode     = state.sortMode,
                isSyncing    = state.isSyncing,
                onPrevDay    = { viewModel.onEvent(TasksEvent.NavigatePrevDay) },
                onNextDay    = { viewModel.onEvent(TasksEvent.NavigateNextDay) },
                onToday      = { viewModel.onEvent(TasksEvent.NavigateToday) },
                onCycleFilter = { viewModel.onEvent(TasksEvent.CycleFilter) },
                onCycleSort   = { viewModel.onEvent(TasksEvent.CycleSort) },
                onSync        = { viewModel.onEvent(TasksEvent.Sync) }
            )

            // Scrollable body
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(horizontal = 16.dp)
            ) {
                Spacer(Modifier.height(16.dp))

                // New task card
                NewTaskCard(
                    onAdd = { name, time, recurrence, priority, customDays ->
                        viewModel.onEvent(TasksEvent.AddTask(name, time, recurrence, priority, customDays))
                    }
                )

                Spacer(Modifier.height(16.dp))

                // Task list
                TasksListSection(
                    tasks       = filteredTasks,
                    allTasks    = state.tasks,
                    selectedId  = state.selectedTaskId,
                    expandedIds = state.expandedTaskIds,
                    onSelect    = { viewModel.onEvent(TasksEvent.SelectTask(it)) },
                    onToggleExpand = { viewModel.onEvent(TasksEvent.ToggleExpanded(it)) },
                    onToggle    = { viewModel.onEvent(TasksEvent.ToggleTask(it)) },
                    onDelete    = { viewModel.onEvent(TasksEvent.DeleteTask(it)) }
                )
            }
        }

        // Sync error snackbar
        state.syncError?.let { err ->
            Snackbar(
                modifier = Modifier.padding(16.dp).align(androidx.compose.ui.Alignment.BottomStart)
            ) {
                Text("Sync error: $err")
            }
        }
    }

    // Detail bottom sheet
    if (selectedTask != null) {
        TaskDetailSheet(
            task            = selectedTask,
            subtasks        = subtasks,
            sheetState      = sheetState,
            onClose         = { viewModel.onEvent(TasksEvent.CloseDetail) },
            onToggle        = { viewModel.onEvent(TasksEvent.ToggleTask(selectedTask.id)) },
            onDelete        = { viewModel.onEvent(TasksEvent.DeleteTask(selectedTask.id)) },
            onUpdate        = { viewModel.onEvent(TasksEvent.UpdateTask(it)) },
            onAddSubtask    = { viewModel.onEvent(TasksEvent.AddSubtask(selectedTask.id, it)) },
            onDeleteSubtask = { viewModel.onEvent(TasksEvent.DeleteTask(it)) },
            onToggleSubtask = { viewModel.onEvent(TasksEvent.ToggleTask(it)) }
        )
    }
}
```

---

# ╔═════════════════════════════════════════════╗
# ║  TASK 9 — Sync Worker (WorkManager)        ║
# ╚═════════════════════════════════════════════╝

**Agent Role:** Sync Engineer
**Goal:** Background sync every 15 minutes, and on app foreground.

---

## 9.1 — How Sync Works (Education for the .NET dev)

```
┌──────────────────────────────────────────────────────────────────────┐
│                      SYNC FLOW EXPLAINED                             │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Android App (Kotlin/Room)          Backend (.NET/SQLite)            │
│  ─────────────────────────          ──────────────────────           │
│                                                                      │
│  1. User creates task offline                                        │
│     → saved to Room with syncStatus = "pending_create"              │
│                                                                      │
│  2. SyncWorker runs (every 15 min OR on app open):                  │
│                                                                      │
│     PUSH phase (local → server):                                     │
│     ┌──────────────────────────────────────────────────────┐        │
│     │ For each row where syncStatus != "synced":           │        │
│     │   pending_create → POST /api/tasks             (body: CreateTaskDto) │
│     │   pending_update → PUT  /api/tasks/{id}        (body: UpdateTaskDto) │
│     │   pending_delete → DELETE /api/tasks/{id}                     │
│     │   On HTTP 200 → update syncStatus = "synced"                  │
│     └──────────────────────────────────────────────────────┘        │
│                                                                      │
│     PULL phase (server → local):                                     │
│     ┌──────────────────────────────────────────────────────┐        │
│     │ GET /api/tasks → returns all tasks as JSON           │        │
│     │ For each task from server:                           │        │
│     │   if NOT in pending list → upsert to Room            │        │
│     │   (pending items are protected from overwrite)       │        │
│     └──────────────────────────────────────────────────────┘        │
│                                                                      │
│  3. Room emits new data → Flow → ViewModel → UI recomposes           │
│                                                                      │
│  CONFLICT RULE: pending_* items always win over server data.         │
│  This is intentional: the phone's latest change takes priority.     │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

**Why is this safe?**
- The PC app (Electron) also talks to the same backend at `localhost`.
- Both write to the same SQLite DB through the REST API.
- The phone is the "client"; the backend is always the truth for other devices.
- When the phone is offline, changes queue as "pending". When back online, they push to the server.
- The server's response reflects what other clients (PC) may have changed.

---

## 9.2 — `SyncWorker.kt`

**Exact file path:** `android/app/src/main/java/com/jamrah/app/sync/SyncWorker.kt`

```kotlin
package com.jamrah.app.sync

import android.content.Context
import androidx.hilt.work.HiltWorker
import androidx.work.*
import com.jamrah.app.data.repository.TaskRepository
import dagger.assisted.Assisted
import dagger.assisted.AssistedInject
import java.util.concurrent.TimeUnit

@HiltWorker
class SyncWorker @AssistedInject constructor(
    @Assisted context: Context,
    @Assisted workerParams: WorkerParameters,
    private val taskRepository: TaskRepository
) : CoroutineWorker(context, workerParams) {

    override suspend fun doWork(): Result {
        return try {
            taskRepository.sync().fold(
                onSuccess = { Result.success() },
                onFailure = {
                    if (runAttemptCount < 3) Result.retry()
                    else Result.failure()
                }
            )
        } catch (e: Exception) {
            Result.failure()
        }
    }

    companion object {
        const val WORK_NAME = "JamrahSyncWorker"

        fun schedule(context: Context) {
            val request = PeriodicWorkRequestBuilder<SyncWorker>(15, TimeUnit.MINUTES)
                .setConstraints(
                    Constraints.Builder()
                        .setRequiredNetworkType(NetworkType.CONNECTED)
                        .build()
                )
                .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 1, TimeUnit.MINUTES)
                .build()

            WorkManager.getInstance(context).enqueueUniquePeriodicWork(
                WORK_NAME,
                ExistingPeriodicWorkPolicy.KEEP,
                request
            )
        }
    }
}
```

---

## 9.3 — Schedule sync in Application

Add this call to `JamrahApplication.onCreate()`:

```kotlin
override fun onCreate() {
    super.onCreate()
    SyncWorker.schedule(this)   // periodic background sync
}
```

---

## 9.4 — Foreground sync on app open

In `MainActivity.onResume()`, trigger a one-shot sync:

```kotlin
override fun onResume() {
    super.onResume()
    // Trigger one-shot sync when app comes to foreground
    val oneShot = OneTimeWorkRequestBuilder<SyncWorker>()
        .setConstraints(
            Constraints.Builder()
                .setRequiredNetworkType(NetworkType.CONNECTED)
                .build()
        )
        .build()
    WorkManager.getInstance(this).enqueue(oneShot)
}
```

---

# ╔═════════════════════════════════════════════╗
# ║  TASK 10 — Backend: Add `updatedAt` field  ║
# ╚═════════════════════════════════════════════╝

**Agent Role:** Sync Engineer (backend side)
**⚠️ ONLY ALLOWED BACKEND CHANGE IN THIS PHASE.**

> The Android sync strategy requires knowing when a server task was last modified.
> Currently the backend has no `updatedAt` column on the `tasks` table.
> We need to add it as a **non-breaking optional migration** in the backend's `Program.cs`.

**The change is:**
Add this one SQL line to the `legacyColumns` array in `backend/Program.cs`
(in the block that already safely tries each ALTER TABLE):

```csharp
"ALTER TABLE tasks ADD COLUMN updatedAt TEXT",
```

**That's it.** This is backward-compatible:
- Existing tasks get `updatedAt = NULL`, which is fine.
- The backend `TasksController.Update()` and `Create()` methods will optionally set it.

> NOTE: You will set `updatedAt` in the controller only if you want server-side timestamping.
> The Android app uses its own local `updatedAt` for conflict detection anyway.
> So this column is optional for Phase 0 — the sync will work without it.

---

# ╔═════════════════════════════════════════════╗
# ║  TASK 11 — Testing Plan                    ║
# ╚═════════════════════════════════════════════╝

**Agent Role:** Reviewer

## 11.1 — Automated Tests

### Unit tests to write:

**File:** `android/app/src/test/java/com/jamrah/app/domain/TaskUtilsTest.kt`

```kotlin
class TaskUtilsTest {
    @Test fun `newTaskId starts with task_`() { assert(newTaskId().startsWith("task_")) }
    @Test fun `priorityValue High returns 3`() { assertEquals(3, priorityValue("High")) }
    @Test fun `recLabel daily returns Daily`() { assertEquals("Daily", recLabel("daily", null)) }
    @Test fun `expandRecurringTasks returns single non-recurring task`() {
        val task = TaskItem(id="1", name="Test", createdAt=todayKey(), completed=0)
        val result = expandRecurringTasks(listOf(task))
        assertEquals(1, result.size)
    }
}
```

### Run tests:
```bash
cd android
./gradlew test
```

---

## 11.2 — Build Verification

```bash
cd android
./gradlew assembleDebug
```

Expected: `BUILD SUCCESSFUL` with APK at `app/build/outputs/apk/debug/app-debug.apk`

---

## 11.3 — Manual Verification Checklist

After installing on device/emulator, verify:

- [ ] App launches to Tasks page (not a blank screen or crash)
- [ ] Header shows "Tasks" + today's date with prev/next day navigation
- [ ] "Today" button appears when not on today, disappears when on today
- [ ] "+ Add" form appears when tapping the ⊕ button
- [ ] Adding a task with Enter key or "Add" button works
- [ ] Task appears in the list immediately
- [ ] Task persists after killing and relaunching the app
- [ ] Tapping a task opens the detail bottom sheet
- [ ] Detail shows correct: title, priority dot, notes, subtasks
- [ ] Checkbox toggle marks task complete (line-through + opacity)
- [ ] Edit mode: all fields editable and Save works
- [ ] Delete task removes it from list
- [ ] Delete subtask works from detail panel
- [ ] Filter (all/active/completed) cycles correctly
- [ ] Sort (Priority/Date) cycles correctly
- [ ] Day navigation: prev day → tasks from that day show
- [ ] Recurring tasks: a daily task appears every day
- [ ] Custom day task: only appears on selected days
- [ ] Sync button triggers sync (spinner shows during sync)
- [ ] Tasks created on PC appear on Android after sync
- [ ] Tasks created on Android appear in PC app after sync

---

# ╔═════════════════════════════════════════════╗
# ║  📣 REVIEW CALL — END OF PHASE 0           ║
# ╚═════════════════════════════════════════════╝

> **ALL AGENTS: Phase 0 is complete. Calling Reviewer Agent.**

The Reviewer Agent must:

1. **Read all created files** and check for:
   - Compilation errors (missing imports, wrong types, typos)
   - Incomplete `@Inject` / Hilt wiring
   - Missing `@AndroidEntryPoint` on MainActivity
   - Missing `@HiltAndroidApp` on Application
   - Any Room entity mismatch with the DAO
   - Any Retrofit method signature issues
   - Import statements are complete

2. **Run the build:**
   ```bash
   cd android
   ./gradlew assembleDebug 2>&1
   ```
   Report ALL build errors and fix them before marking Phase 0 complete.

3. **Run unit tests:**
   ```bash
   cd android
   ./gradlew test
   ```

4. **Report to user:**
   - List of files created
   - Build result (SUCCESS or FAILED with errors)
   - What the user should see when they launch the app
   - Instructions to install and test:
     ```
     adb install app/build/outputs/apk/debug/app-debug.apk
     ```
   - Ask for user feedback on:
     a) Does the app launch?
     b) Does the Tasks page look like the PC app?
     c) Can you add, toggle, delete tasks?
     d) Does sync work (if backend is running)?

---

## 📝 Notes for Future Phases

After Phase 0 is complete and approved:

- **Phase 1:** Goals page (same design philosophy)
- **Phase 2:** Pomodoro/Sessions page
- **Phase 3:** Habits page
- **Phase 4:** Stats page
- **Phase 5:** Navigation (bottom nav bar between pages)
- **Phase 6:** Settings (backend URL config, dark mode)
- **Phase 7:** Notifications (task reminders, Pomodoro alerts)
- **Phase 8:** Sync improvements (real-time if backend adds WebSocket)

---

*End of PHASE_0.md*
