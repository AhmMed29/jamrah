package com.jamrah.app.data.remote.api

import com.jamrah.app.data.remote.dto.*
import retrofit2.Response
import retrofit2.http.*

interface GoalsApi {

    @GET("api/goals")
    suspend fun getAll(): Response<List<GoalDto>>

    @GET("api/goals/{id}")
    suspend fun getById(@Path("id") id: String): Response<GoalDto>

    @POST("api/goals")
    suspend fun create(@Body dto: CreateGoalDto): Response<Boolean>

    @PUT("api/goals/{id}")
    suspend fun update(@Path("id") id: String, @Body dto: UpdateGoalDto): Response<Boolean>

    @DELETE("api/goals/{id}")
    suspend fun delete(@Path("id") id: String): Response<Boolean>

    @GET("api/goals/{goalId}/progress")
    suspend fun getProgress(@Path("goalId") goalId: String): Response<List<GoalProgressDto>>

    @POST("api/goals/progress")
    suspend fun saveProgress(@Body dto: SaveGoalProgressDto): Response<Boolean>
}