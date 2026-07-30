package com.jamrah.app.sync;

import android.content.Context;
import androidx.work.WorkerParameters;
import com.jamrah.app.data.repository.GoalRepository;
import com.jamrah.app.data.repository.TaskRepository;
import dagger.internal.DaggerGenerated;
import dagger.internal.QualifierMetadata;
import dagger.internal.ScopeMetadata;
import javax.annotation.processing.Generated;
import javax.inject.Provider;

@ScopeMetadata
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
public final class SyncWorker_Factory {
  private final Provider<TaskRepository> taskRepositoryProvider;

  private final Provider<GoalRepository> goalRepositoryProvider;

  public SyncWorker_Factory(Provider<TaskRepository> taskRepositoryProvider,
      Provider<GoalRepository> goalRepositoryProvider) {
    this.taskRepositoryProvider = taskRepositoryProvider;
    this.goalRepositoryProvider = goalRepositoryProvider;
  }

  public SyncWorker get(Context context, WorkerParameters workerParams) {
    return newInstance(context, workerParams, taskRepositoryProvider.get(), goalRepositoryProvider.get());
  }

  public static SyncWorker_Factory create(Provider<TaskRepository> taskRepositoryProvider,
      Provider<GoalRepository> goalRepositoryProvider) {
    return new SyncWorker_Factory(taskRepositoryProvider, goalRepositoryProvider);
  }

  public static SyncWorker newInstance(Context context, WorkerParameters workerParams,
      TaskRepository taskRepository, GoalRepository goalRepository) {
    return new SyncWorker(context, workerParams, taskRepository, goalRepository);
  }
}
