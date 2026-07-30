package com.jamrah.app.data.local.preferences

import android.content.Context
import android.content.SharedPreferences
import dagger.hilt.android.qualifiers.ApplicationContext
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class AppPreferences @Inject constructor(
    @ApplicationContext context: Context
) {
    private val prefs: SharedPreferences = context.getSharedPreferences("jamrah_prefs", Context.MODE_PRIVATE)

    var serverIpAddress: String
        get() = prefs.getString("server_ip", "10.0.2.2") ?: "10.0.2.2"
        set(value) = prefs.edit().putString("server_ip", value).apply()

    fun getBaseUrl(): String {
        val ip = serverIpAddress
        return "http://$ip:5200/api/"
    }
}
