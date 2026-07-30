package com.jamrah.app.ui.theme

import android.os.Build
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable

private val LightColorScheme = lightColorScheme(
    background        = JamrahBackground,
    surface           = JamrahCard,
    onBackground      = JamrahText,
    onSurface         = JamrahText,
    outline           = JamrahBorder,
    primary           = JamrahText,
    onPrimary         = JamrahCard,
    error             = DestructiveRed,
)

@Composable
fun JamrahTheme(
    content: @Composable () -> Unit
) {
    MaterialTheme(
        colorScheme = LightColorScheme,
        typography  = JamrahTypography,
        content     = content
    )
}