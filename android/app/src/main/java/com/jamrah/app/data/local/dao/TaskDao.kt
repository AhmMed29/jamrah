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