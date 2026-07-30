package com.jamrah.app.data.local

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import javax.inject.Inject
import javax.inject.Singleton

private val Context.dataStore: DataStore<Preferences> by preferencesDataStore(name = "jamrah_prefs")

@Singleton
class AppPreferences @Inject constructor(
    @ApplicationContext private val context: Context
) {
    companion object {
        val BACKEND_URL = stringPreferencesKey("backend_url")
        const val DEFAULT_URL = "http://10.0.2.2:5200/"  // 10.0.2.2 = localhost for emulator
    }

    val backendUrl: Flow<String> = context.dataStore.data.map { prefs ->
        prefs[BACKEND_URL] ?: DEFAULT_URL
    }

    suspend fun setBackendUrl(url: String) {
        context.dataStore.edit { it[BACKEND_URL] = url }
    }
}