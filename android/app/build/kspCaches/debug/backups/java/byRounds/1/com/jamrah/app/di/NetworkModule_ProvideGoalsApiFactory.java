package com.jamrah.app.di;

import com.jamrah.app.data.remote.api.GoalsApi;
import dagger.internal.DaggerGenerated;
import dagger.internal.Factory;
import dagger.internal.Preconditions;
import dagger.internal.QualifierMetadata;
import dagger.internal.ScopeMetadata;
import javax.annotation.processing.Generated;
import javax.inject.Provider;
import retrofit2.Retrofit;

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
public final class NetworkModule_ProvideGoalsApiFactory implements Factory<GoalsApi> {
  private final Provider<Retrofit> retrofitProvider;

  public NetworkModule_ProvideGoalsApiFactory(Provider<Retrofit> retrofitProvider) {
    this.retrofitProvider = retrofitProvider;
  }

  @Override
  public GoalsApi get() {
    return provideGoalsApi(retrofitProvider.get());
  }

  public static NetworkModule_ProvideGoalsApiFactory create(Provider<Retrofit> retrofitProvider) {
    return new NetworkModule_ProvideGoalsApiFactory(retrofitProvider);
  }

  public static GoalsApi provideGoalsApi(Retrofit retrofit) {
    return Preconditions.checkNotNullFromProvides(NetworkModule.INSTANCE.provideGoalsApi(retrofit));
  }
}
