package com.jamrah.app.ui.theme

import androidx.compose.material3.Typography
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp
import com.jamrah.app.R

val PatrickHand = FontFamily(
    Font(R.font.patrick_hand_regular, FontWeight.Normal)
)

val JamrahTypography = Typography(
    // Title in header: "Tasks"
    headlineLarge = TextStyle(
        fontFamily = PatrickHand,
        fontWeight = FontWeight.Normal,
        fontSize = 30.sp
    ),
    // Day name: "Mon"
    headlineMedium = TextStyle(
        fontFamily = PatrickHand,
        fontWeight = FontWeight.Normal,
        fontSize = 24.sp
    ),
    // Date display: "Jul 25, 2026"
    bodySmall = TextStyle(
        fontFamily = PatrickHand,
        fontWeight = FontWeight.Normal,
        fontSize = 14.sp
    ),
    // Task title in list
    bodyLarge = TextStyle(
        fontFamily = PatrickHand,
        fontWeight = FontWeight.Normal,
        fontSize = 18.sp
    ),
    // Task meta (time, recurrence)
    bodyMedium = TextStyle(
        fontFamily = PatrickHand,
        fontWeight = FontWeight.Normal,
        fontSize = 14.sp
    ),
    // Detail panel title
    displaySmall = TextStyle(
        fontFamily = PatrickHand,
        fontWeight = FontWeight.Normal,
        fontSize = 30.sp
    ),
    // Field labels
    labelMedium = TextStyle(
        fontFamily = PatrickHand,
        fontWeight = FontWeight.Normal,
        fontSize = 14.sp
    ),
    // Buttons
    labelLarge = TextStyle(
        fontFamily = PatrickHand,
        fontWeight = FontWeight.Normal,
        fontSize = 18.sp
    )
)