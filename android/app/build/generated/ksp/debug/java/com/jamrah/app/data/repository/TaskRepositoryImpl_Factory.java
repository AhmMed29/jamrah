package com.jamrah.app.data.repository;

import com.jamrah.app.data.local.dao.TaskDao;
import com.jamrah.app.data.remote.api.TasksApi;
import dagger.internal.DaggerGenerated;
import dagger.internal.Factory;
import dagger.internal.QualifierMetadata;
import dagger.internal.ScopeMetadata;
import javax.annotation.processing.Generated;
import javax.inject.Provider;

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
public final class TaskRepositoryImpl_Factory implements Factory<TaskRepositoryImpl> {
  private final Provider<TaskDao> daoProvider;

  private final Provider<TasksApi> apiProvider;

  public TaskRepositoryImpl_Factory(Provider<TaskDao> daoProvider, Provider<TasksApi> apiProvider) {
    this.daoProvider = daoProvider;
    this.apiProvider = apiProvider;
  }

  @Override
  public TaskRepositoryImpl get() {
    return newInstance(daoProvider.get(), apiProvider.get());
  }

  public static TaskRepositoryImpl_Factory create(Provider<TaskDao> daoProvider,
      Provider<TasksApi> apiProvider) {
    return new TaskRepositoryImpl_Factory(daoProvider, apiProvider);
  }

  public static TaskRepositoryImpl newInstance(TaskDao dao, TasksApi api) {
    return new TaskRepositoryImpl(dao, api);
  }
}
