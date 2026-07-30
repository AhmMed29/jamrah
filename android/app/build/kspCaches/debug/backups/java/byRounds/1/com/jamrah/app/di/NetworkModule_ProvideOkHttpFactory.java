package com.jamrah.app.di;

import com.jamrah.app.data.local.AppPreferences;
import dagger.internal.DaggerGenerated;
import dagger.internal.Factory;
import dagger.internal.Preconditions;
import dagger.internal.QualifierMetadata;
import dagger.internal.ScopeMetadata;
import javax.annotation.processing.Generated;
import javax.inject.Provider;
import okhttp3.OkHttpClient;

@ScopeMetadata("javax.inject.Singleton")
@QualifierMetadata
@DaggerGenerated
@Generated(
    value = "dagger.internal.codegen.ComponentProcessor",
    comments = "https://dagger.dev"
)
@SuppressWarnings({
    "unchecked",
    "rawtypes",
    "KotlinInternal",
    "KotlinInternalInJava",
    "cast"
})
public final class NetworkModule_ProvideOkHttpFactory implements Factory<OkHttpClient> {
  private final Provider<AppPreferences> appPreferencesProvider;

  public NetworkModule_ProvideOkHttpFactory(Provider<AppPreferences> appPreferencesProvider) {
    this.appPreferencesProvider = appPreferencesProvider;
  }

  @Override
  public OkHttpClient get() {
    return provideOkHttp(appPreferencesProvider.get());
  }

  public static NetworkModule_ProvideOkHttpFactory create(
      Provider<AppPreferences> appPreferencesProvider) {
    return new NetworkModule_ProvideOkHttpFactory(appPreferencesProvider);
  }

  public static OkHttpClient provideOkHttp(AppPreferences appPreferences) {
    return Preconditions.checkNotNullFromProvides(NetworkModule.INSTANCE.provideOkHttp(appPreferences));
  }
}
