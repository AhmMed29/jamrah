package com.jamrah.app.di

import android.content.Context
import androidx.room.Room
import com.jamrah.app.data.local.JamrahDatabase
import com.jamrah.app.data.local.MIGRATION_1_2
import com.jamrah.app.data.local.dao.GoalDao
import com.jamrah.app.data.local.dao.GoalProgressDao
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
            .addMigrations(MIGRATION_1_2)
            .fallbackToDestructiveMigration()
            .build()

    @Provides @Singleton
    fun provideTaskDao(db: JamrahDatabase): TaskDao = db.taskDao()

    @Provides @Singleton
    fun provideGoalDao(db: JamrahDatabase): GoalDao = db.goalDao()

    @Provides @Singleton
    fun provideGoalProgressDao(db: JamrahDatabase): GoalProgressDao = db.goalProgressDao()
}