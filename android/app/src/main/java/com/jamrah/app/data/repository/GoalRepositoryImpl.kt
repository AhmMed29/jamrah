package com.jamrah.app.data.repository

import com.jamrah.app.data.local.dao.GoalDao
import com.jamrah.app.data.local.dao.GoalProgressDao
import com.jamrah.app.data.mapper.*
import com.jamrah.app.data.remote.api.GoalsApi
import com.jamrah.app.domain.model.Goal
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import java.text.SimpleDateFormat
import java.util.*
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class GoalRepositoryImpl @Inject constructor(
    private val dao: GoalDao,
    private val progressDao: GoalProgressDao,
    private val api: GoalsApi
) : GoalRepository {

    override fun observeAll(): Flow<List<Goal>> =
        dao.observeAll().map { list -> list.map { it.toDomain() } }

    override suspend fun createGoal(goal: Goal) {
        dao.upsert(goal.toEntity(syncStatus = "pending_create"))
        runCatching {
            val resp = api.create(goal.toCreateDto())
            if (resp.isSuccessful) dao.updateSyncStatus(goal.id, "synced")
        }
    }

    override suspend fun updateGoal(goal: Goal) {
        dao.upsert(goal.toEntity(syncStatus = "pending_update"))
        runCatching {
            val resp = api.update(goal.id, goal.toUpdateDto())
            if (resp.isSuccessful) dao.updateSyncStatus(goal.id, "synced")
        }
    }

    override suspend fun deleteGoal(id: String) {
        dao.markDeleted(id)
        runCatching {
            val resp = api.delete(id)
            if (resp.isSuccessful) dao.hardDelete(id)
        }
    }

    override suspend fun getById(id: String): Goal? = dao.getById(id)?.toDomain()

    override suspend fun sync(): Result<Unit> = runCatching {
        // 1. Push pending
        dao.getPending().forEach { entity ->
            when (entity.syncStatus) {
                "pending_create" -> {
                    val resp = api.create(entity.toDomain().toCreateDto())
                    if (resp.isSuccessful) dao.updateSyncStatus(entity.id, "synced")
                }
                "pending_update" -> {
                    val resp = api.update(entity.id, entity.toDomain().toUpdateDto())
                    if (resp.isSuccessful) dao.updateSyncStatus(entity.id, "synced")
                }
                "pending_delete" -> {
                    val resp = api.delete(entity.id)
                    if (resp.isSuccessful) dao.hardDelete(entity.id)
                }
            }
        }
        // 2. Pull server goals
        val serverResp = api.getAll()
        if (serverResp.isSuccessful) {
            val pendingIds = dao.getPending().map { it.id }.toSet()
            serverResp.body()?.filter { it.id !in pendingIds }
                ?.forEach { dto -> dao.upsert(dto.toEntity()) }
        }
        // 3. Pull progress for all goals
        dao.getAll().forEach { entity ->
            runCatching {
                val pResp = api.getProgress(entity.id)
                if (pResp.isSuccessful) {
                    pResp.body()?.forEach { dto -> progressDao.upsert(dto.toEntity()) }
                }
            }
        }
    }
}