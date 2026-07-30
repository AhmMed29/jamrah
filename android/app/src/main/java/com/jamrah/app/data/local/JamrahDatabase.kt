package com.jamrah.app.data.local

import androidx.room.Database
import androidx.room.RoomDatabase
import androidx.room.migration.Migration
import androidx.sqlite.db.SupportSQLiteDatabase
import com.jamrah.app.data.local.dao.GoalDao
import com.jamrah.app.data.local.dao.GoalProgressDao
import com.jamrah.app.data.local.dao.TaskDao
import com.jamrah.app.data.local.entity.GoalEntity
import com.jamrah.app.data.local.entity.GoalProgressEntity
import com.jamrah.app.data.local.entity.TaskEntity

@Database(
    entities = [
        TaskEntity::class,
        GoalEntity::class,
        GoalProgressEntity::class
    ],
    version = 3,
    exportSchema = true
)
abstract class JamrahDatabase : RoomDatabase() {
    abstract fun taskDao(): TaskDao
    abstract fun goalDao(): GoalDao
    abstract fun goalProgressDao(): GoalProgressDao
}

val MIGRATION_1_2 = object : Migration(1, 2) {
    override fun migrate(db: SupportSQLiteDatabase) {
        db.execSQL("""
            CREATE TABLE IF NOT EXISTS goals (
                id TEXT NOT NULL PRIMARY KEY,
                name TEXT NOT NULL,
                description TEXT NOT NULL DEFAULT '',
                color TEXT NOT NULL DEFAULT '#3b82f6',
                tagId TEXT,
                startDate TEXT NOT NULL DEFAULT '',
                endDate TEXT NOT NULL DEFAULT '',
                duration INTEGER NOT NULL DEFAULT 0,
                durationType TEXT,
                durationValue INTEGER,
                createdAt TEXT NOT NULL DEFAULT '',
                parentGoalId TEXT,
                status TEXT NOT NULL DEFAULT 'active',
                updatedAt INTEGER NOT NULL DEFAULT 0,
                syncStatus TEXT NOT NULL DEFAULT 'synced'
            )
        """.trimIndent())
        db.execSQL("""
            CREATE TABLE IF NOT EXISTS goal_progress (
                goalId TEXT NOT NULL,
                date TEXT NOT NULL,
                progressValue REAL NOT NULL DEFAULT 0.0,
                focusMinutes REAL NOT NULL DEFAULT 0.0,
                PRIMARY KEY (goalId, date)
            )
        """.trimIndent())
        db.execSQL("CREATE INDEX IF NOT EXISTS index_goal_progress_goalId ON goal_progress(goalId)")
    }
}