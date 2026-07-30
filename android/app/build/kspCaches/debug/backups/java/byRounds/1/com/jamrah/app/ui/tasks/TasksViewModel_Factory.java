package com.jamrah.app.ui.tasks;

import com.jamrah.app.data.local.preferences.AppPreferences;
import com.jamrah.app.data.repository.TaskRepository;
import dagger.internal.DaggerGenerated;
import dagger.internal.Factory;
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
public final class TasksViewModel_Factory implements Factory<TasksViewModel> {
  private final Provider<TaskRepository> repoProvider;

  private final Provider<AppPreferences> appPreferencesProvider;

  public TasksViewModel_Factory(Provider<TaskRepository> repoProvider,
      Provider<AppPreferences> appPreferencesProvider) {
    this.repoProvider = repoProvider;
    this.appPreferencesProvider = appPreferencesProvider;
  }

  @Override
  public TasksViewModel get() {
    return newInstance(repoProvider.get(), appPreferencesProvider.get());
  }

  public static TasksViewModel_Factory create(Provider<TaskRepository> repoProvider,
      Provider<AppPreferences> appPreferencesProvider) {
    return new TasksViewModel_Factory(repoProvider, appPreferencesProvider);
  }

  public static TasksViewModel newInstance(TaskRepository repo, AppPreferences appPreferences) {
    return new TasksViewModel(repo, appPreferences);
  }
}
