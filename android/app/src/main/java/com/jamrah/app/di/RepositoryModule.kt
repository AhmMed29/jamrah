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

    @Binds
    @Singleton
    abstract fun bindGoalRepository(impl: com.jamrah.app.data.repository.GoalRepositoryImpl): com.jamrah.app.data.repository.GoalRepository
}