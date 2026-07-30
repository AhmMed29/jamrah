package com.jamrah.app.data.remote.api

import com.jamrah.app.data.remote.dto.CreateTaskDto
import com.jamrah.app.data.remote.dto.TaskDto
import com.jamrah.app.data.remote.dto.UpdateTaskDto
import retrofit2.Response
import retrofit2.http.*

interface TasksApi {

    @GET("api/tasks")
    suspend fun getAll(): Response<List<TaskDto>>

    @POST("api/tasks")
    suspend fun create(@Body dto: CreateTaskDto): Response<Boolean>

    @PUT("api/tasks/{id}")
    suspend fun update(@Path("id") id: String, @Body dto: UpdateTaskDto): Response<Boolean>

    @PUT("api/tasks/{id}/toggle")
    suspend fun toggle(@Path("id") id: String): Response<Boolean>

    @DELETE("api/tasks/{id}")
    suspend fun delete(@Path("id") id: String): Response<Boolean>
}