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