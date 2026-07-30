package com.jamrah.app.data.remote.dto

import com.google.gson.annotations.SerializedName

data class GoalDto(
    @SerializedName("id")            val id: String,
    @SerializedName("name")          val name: String,
    @SerializedName("description")   val description: String?,
    @SerializedName("color")         val color: String?,
    @SerializedName("tagId")         val tagId: String?,
    @SerializedName("startDate")     val startDate: String?,
    @SerializedName("endDate")       val endDate: String?,
    @SerializedName("duration")      val duration: Int?,
    @SerializedName("durationType")  val durationType: String?,
    @SerializedName("durationValue") val durationValue: Int?,
    @SerializedName("createdAt")     val createdAt: String?,
    @SerializedName("parentGoalId")  val parentGoalId: String?
)

data class CreateGoalDto(
    @SerializedName("id")            val id: String,
    @SerializedName("name")          val name: String,
    @SerializedName("description")   val description: String = "",
    @SerializedName("color")         val color: String = "#3b82f6",
    @SerializedName("startDate")     val startDate: String = "",
    @SerializedName("endDate")       val endDate: String = "",
    @SerializedName("duration")      val duration: Int = 0,
    @SerializedName("durationType")  val durationType: String? = null,
    @SerializedName("durationValue") val durationValue: Int? = null,
    @SerializedName("parentGoalId")  val parentGoalId: String? = null
)

data class UpdateGoalDto(
    @SerializedName("name")          val name: String,
    @SerializedName("description")   val description: String = "",
    @SerializedName("color")         val color: String = "#3b82f6",
    @SerializedName("tagId")         val tagId: String? = null,
    @SerializedName("startDate")     val startDate: String = "",
    @SerializedName("endDate")       val endDate: String = "",
    @SerializedName("duration")      val duration: Int = 0,
    @SerializedName("durationType")  val durationType: String? = null,
    @SerializedName("durationValue") val durationValue: Int? = null,
    @SerializedName("parentGoalId")  val parentGoalId: String? = null
)

data class GoalProgressDto(
    @SerializedName("goalId")        val goalId: String,
    @SerializedName("date")          val date: String,
    @SerializedName("progressValue") val progressValue: Double,
    @SerializedName("focusMinutes")  val focusMinutes: Double
)

data class SaveGoalProgressDto(
    @SerializedName("goalId")        val goalId: String,
    @SerializedName("date")          val date: String,
    @SerializedName("progressValue") val progressValue: Double = 0.0,
    @SerializedName("focusMinutes")  val focusMinutes: Double = 0.0
)