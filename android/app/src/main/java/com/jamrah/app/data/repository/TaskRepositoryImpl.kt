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