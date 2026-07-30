package com.jamrah.app.data.remote.dto

import com.google.gson.annotations.SerializedName

/** Mirrors the backend's TaskItem JSON response */
data class TaskDto(
    @SerializedName("id")            val id: String,
    @SerializedName("name")          val name: String,
    @SerializedName("goalId")        val goalId: String?,
    @SerializedName("completed")     val completed: Int,
    @SerializedName("createdAt")     val createdAt: String,
    @SerializedName("parentTaskId")  val parentTaskId: String?,
    @SerializedName("priority")      val priority: String,
    @SerializedName("completedAt")   val completedAt: String?,
    @SerializedName("scheduledTime") val scheduledTime: String?,
    @SerializedName("recurrence")    val recurrence: String?,
    @SerializedName("customDays")    val customDays: String?,
    @SerializedName("durationStart") val durationStart: String?,
    @SerializedName("durationEnd")   val durationEnd: String?,
    @SerializedName("notes")         val notes: String?
)

/** Mirrors CreateTaskItemDto */
data class CreateTaskDto(
    @SerializedName("id")            val id: String,
    @SerializedName("name")          val name: String,
    @SerializedName("goalId")        val goalId: String? = null,
    @SerializedName("parentTaskId")  val parentTaskId: String? = null,
    @SerializedName("priority")      val priority: String = "none",
    @SerializedName("scheduledTime") val scheduledTime: String? = null,
    @SerializedName("recurrence")    val recurrence: String? = null,
    @SerializedName("customDays")    val customDays: String? = null,
    @SerializedName("durationStart") val durationStart: String? = null,
    @SerializedName("durationEnd")   val durationEnd: String? = null,
    @SerializedName("notes")         val notes: String? = null
)

/** Mirrors UpdateTaskItemDto */
data class UpdateTaskDto(
    @SerializedName("name")          val name: String? = null,
    @SerializedName("priority")      val priority: String? = null,
    @SerializedName("scheduledTime") val scheduledTime: String? = null,
    @SerializedName("recurrence")    val recurrence: String? = null,
    @SerializedName("customDays")    val customDays: String? = null,
    @SerializedName("durationStart") val durationStart: String? = null,
    @SerializedName("durationEnd")   val durationEnd: String? = null,
    @SerializedName("notes")         val notes: String? = null
)