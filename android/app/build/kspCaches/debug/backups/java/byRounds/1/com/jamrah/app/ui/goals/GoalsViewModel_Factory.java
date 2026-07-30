package com.jamrah.app.ui.goals;

import com.jamrah.app.data.repository.GoalRepository;
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
public final class GoalsViewModel_Factory implements Factory<GoalsViewModel> {
  private final Provider<GoalRepository> goalRepoProvider;

  private final Provider<TaskRepository> taskRepoProvider;

  public GoalsViewModel_Factory(Provider<GoalRepository> goalRepoProvider,
      Provider<TaskRepository> taskRepoProvider) {
    this.goalRepoProvider = goalRepoProvider;
    this.taskRepoProvider = taskRepoProvider;
  }

  @Override
  public GoalsViewModel get() {
    return newInstance(goalRepoProvider.get(), taskRepoProvider.get());
  }

  public static GoalsViewModel_Factory create(Provider<GoalRepository> goalRepoProvider,
      Provider<TaskRepository> taskRepoProvider) {
    return new GoalsViewModel_Factory(goalRepoProvider, taskRepoProvider);
  }

  public static GoalsViewModel newInstance(GoalRepository goalRepo, TaskRepository taskRepo) {
    return new GoalsViewModel(goalRepo, taskRepo);
  }
}
