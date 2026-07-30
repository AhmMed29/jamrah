package com.jamrah.app.sync;

import android.content.Context;
import androidx.work.WorkerParameters;
import dagger.internal.DaggerGenerated;
import dagger.internal.InstanceFactory;
import javax.annotation.processing.Generated;
import javax.inject.Provider;

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
public final class SyncWorker_AssistedFactory_Impl implements SyncWorker_AssistedFactory {
  private final SyncWorker_Factory delegateFactory;

  SyncWorker_AssistedFactory_Impl(SyncWorker_Factory delegateFactory) {
    this.delegateFactory = delegateFactory;
  }

  @Override
  public SyncWorker create(Context p0, WorkerParameters p1) {
    return delegateFactory.get(p0, p1);
  }

  public static Provider<SyncWorker_AssistedFactory> create(SyncWorker_Factory delegateFactory) {
    return InstanceFactory.create(new SyncWorker_AssistedFactory_Impl(delegateFactory));
  }

  public static dagger.internal.Provider<SyncWorker_AssistedFactory> createFactoryProvider(
      SyncWorker_Factory delegateFactory) {
    return InstanceFactory.create(new SyncWorker_AssistedFactory_Impl(delegateFactory));
  }
}
