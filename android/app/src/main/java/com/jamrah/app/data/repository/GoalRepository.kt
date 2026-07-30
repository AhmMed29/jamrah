package com.jamrah.app.data.repository

import com.jamrah.app.domain.model.Goal
import kotlinx.coroutines.flow.Flow

interface GoalRepository {
    fun observeAll(): Flow<List<Goal>>
    suspend fun createGoal(goal: Goal)
    suspend fun updateGoal(goal: Goal)
    suspend fun deleteGoal(id: String)
    suspend fun getById(id: String): Goal?
    suspend fun sync(): Result<Unit>
}