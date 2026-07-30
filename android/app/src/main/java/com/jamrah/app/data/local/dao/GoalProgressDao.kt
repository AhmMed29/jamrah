package com.jamrah.app.data.local.dao

import androidx.room.*
import com.jamrah.app.data.local.entity.GoalProgressEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface GoalProgressDao {

    @Query("SELECT * FROM goal_progress WHERE goalId = :goalId ORDER BY date ASC")
    fun observeForGoal(goalId: String): Flow<List<GoalProgressEntity>>

    @Query("SELECT * FROM goal_progress WHERE goalId = :goalId ORDER BY date ASC")
    suspend fun getForGoal(goalId: String): List<GoalProgressEntity>

    @Upsert
    suspend fun upsert(entry: GoalProgressEntity)

    @Upsert
    suspend fun upsertAll(entries: List<GoalProgressEntity>)

    @Query("DELETE FROM goal_progress WHERE goalId = :goalId")
    suspend fun deleteForGoal(goalId: String)
}