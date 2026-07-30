package com.jamrah.app.di

import com.google.gson.Gson
import com.google.gson.GsonBuilder
import com.jamrah.app.data.local.preferences.AppPreferences
import com.jamrah.app.data.remote.api.TasksApi
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.runBlocking
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import okhttp3.HttpUrl.Companion.toHttpUrlOrNull
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.util.concurrent.TimeUnit
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object NetworkModule {

    @Provides
    @Singleton
    fun provideGson(): Gson = GsonBuilder().setLenient().create()

    @Provides
    @Singleton
    fun provideOkHttp(appPreferences: AppPreferences): OkHttpClient = OkHttpClient.Builder()
        .connectTimeout(10, TimeUnit.SECONDS)
        .readTimeout(15, TimeUnit.SECONDS)
        .writeTimeout(15, TimeUnit.SECONDS)
        .addInterceptor { chain ->
            val request = chain.request()
            var ip = appPreferences.serverIpAddress.trim()
            if (ip.startsWith("http://")) ip = ip.removePrefix("http://")
            if (ip.startsWith("https://")) ip = ip.removePrefix("https://")
            if (ip.contains(":")) ip = ip.substringBefore(":")
            if (ip.endsWith("/")) ip = ip.removeSuffix("/")
            
            val newUrlString = "http://$ip:5200/"
            val newBaseUrl = newUrlString.toHttpUrlOrNull()
            
            if (newBaseUrl != null) {
                val newUrl = request.url.newBuilder()
                    .scheme(newBaseUrl.scheme)
                    .host(newBaseUrl.host)
                    .port(newBaseUrl.port)
                    .build()
                chain.proceed(request.newBuilder().url(newUrl).build())
            } else {
                chain.proceed(request)
            }
        }
        .addInterceptor(HttpLoggingInterceptor().apply {
            level = HttpLoggingInterceptor.Level.BODY
        })
        .build()

    /**
     * Retrofit is provided with a dynamic base URL.
     * The base URL is read from DataStore at startup.
     * Future improvement: make Retrofit URL change at runtime without restart.
     */
    @Provides
    @Singleton
    fun provideRetrofit(
        okHttp: OkHttpClient,
        gson: Gson
    ): Retrofit {
        val baseUrl = "http://10.0.2.2:5200/"
        return Retrofit.Builder()
            .baseUrl(baseUrl.trimEnd('/') + "/")
            .client(okHttp)
            .addConverterFactory(GsonConverterFactory.create(gson))
            .build()
    }

    @Provides
    @Singleton
    fun provideTasksApi(retrofit: Retrofit): TasksApi =
        retrofit.create(TasksApi::class.java)

    @Provides
    @Singleton
    fun provideGoalsApi(retrofit: Retrofit): com.jamrah.app.data.remote.api.GoalsApi =
        retrofit.create(com.jamrah.app.data.remote.api.GoalsApi::class.java)
}