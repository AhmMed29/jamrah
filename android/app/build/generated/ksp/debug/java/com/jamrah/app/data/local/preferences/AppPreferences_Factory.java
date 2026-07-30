package com.jamrah.app.data.local.preferences;

import android.content.Context;
import dagger.internal.DaggerGenerated;
import dagger.internal.Factory;
import dagger.internal.QualifierMetadata;
import dagger.internal.ScopeMetadata;
import javax.annotation.processing.Generated;
import javax.inject.Provider;

@ScopeMetadata("javax.inject.Singleton")
@QualifierMetadata("dagger.hilt.android.qualifiers.ApplicationContext")
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
public final class AppPreferences_Factory implements Factory<AppPreferences> {
  private final Provider<Context> contextProvider;

  public AppPreferences_Factory(Provider<Context> contextProvider) {
    this.contextProvider = contextProvider;
  }

  @Override
  public AppPreferences get() {
    return newInstance(contextProvider.get());
  }

  public static AppPreferences_Factory create(Provider<Context> contextProvider) {
    return new AppPreferences_Factory(contextProvider);
  }

  public static AppPreferences newInstance(Context context) {
    return new AppPreferences(context);
  }
}
