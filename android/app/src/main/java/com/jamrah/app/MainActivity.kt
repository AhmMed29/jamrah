package com.jamrah.app

import android.content.Context
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.Text
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.jamrah.app.ui.JamrahApp
import com.jamrah.app.ui.theme.JamrahTheme
import dagger.hilt.android.AndroidEntryPoint

@AndroidEntryPoint
class MainActivity : ComponentActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        val prefs = getSharedPreferences("crash_prefs", Context.MODE_PRIVATE)
        val lastCrash = prefs.getString("last_crash", null)
        
        // Install crash handler
        val defaultHandler = Thread.getDefaultUncaughtExceptionHandler()
        Thread.setDefaultUncaughtExceptionHandler { thread, throwable ->
            val stackTrace = throwable.stackTraceToString()
            prefs.edit().putString("last_crash", stackTrace).commit()
            defaultHandler?.uncaughtException(thread, throwable)
        }

        enableEdgeToEdge()
        setContent {
            JamrahTheme {
                if (lastCrash != null) {
                    val showDialog = remember { mutableStateOf(true) }
                    if (showDialog.value) {
                        AlertDialog(
                            onDismissRequest = { },
                            title = { Text("App Crashed Last Time") },
                            text = { 
                                Text(
                                    text = lastCrash, 
                                    modifier = Modifier.verticalScroll(rememberScrollState())
                                ) 
                            },
                            confirmButton = {
                                Button(onClick = {
                                    prefs.edit().remove("last_crash").apply()
                                    showDialog.value = false
                                }) {
                                    Text("Clear & Continue")
                                }
                            }
                        )
                    } else {
                        JamrahApp()
                    }
                } else {
                    JamrahApp()
                }
            }
        }
    }
}