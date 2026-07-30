package com.jamrah.app;

import androidx.hilt.work.HiltWorkerFactory;
import dagger.MembersInjector;
import dagger.internal.DaggerGenerated;
import dagger.internal.InjectedFieldSignature;
import dagger.internal.QualifierMetadata;
import javax.annotation.processing.Generated;
import javax.inject.Provider;

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
public final class JamrahApplication_MembersInjector implements MembersInjector<JamrahApplication> {
  private final Provider<HiltWorkerFactory> workerFactoryProvider;

  public JamrahApplication_MembersInjector(Provider<HiltWorkerFactory> workerFactoryProvider) {
    this.workerFactoryProvider = workerFactoryProvider;
  }

  public static MembersInjector<JamrahApplication> create(
      Provider<HiltWorkerFactory> workerFactoryProvider) {
    return new JamrahApplication_MembersInjector(workerFactoryProvider);
  }

  @Override
  public void injectMembers(JamrahApplication instance) {
    injectWorkerFactory(instance, workerFactoryProvider.get());
  }

  @InjectedFieldSignature("com.jamrah.app.JamrahApplication.workerFactory")
  public static void injectWorkerFactory(JamrahApplication instance,
      HiltWorkerFactory workerFactory) {
    instance.workerFactory = workerFactory;
  }
}
