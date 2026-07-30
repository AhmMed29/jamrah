package com.jamrah.app

import android.content.Context
import androidx.room.Room
import androidx.test.core.app.ApplicationProvider
import com.jamrah.app.data.local.JamrahDatabase
import com.jamrah.app.data.local.MIGRATION_1_2
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner

@RunWith(RobolectricTestRunner::class)
class DatabaseCrashTest {

    @Test
    fun testDatabaseCreation() {
        val context = ApplicationProvider.getApplicationContext<Context>()
        
        // Try creating the DB and querying it to force Room to open it!
        val db = Room.inMemoryDatabaseBuilder(context, JamrahDatabase::class.java)
            .allowMainThreadQueries()
            .build()
            
        // Force database initialization
        db.taskDao().observeAll()
        
        println("Database created successfully without crash!")
        db.close()
    }
}
