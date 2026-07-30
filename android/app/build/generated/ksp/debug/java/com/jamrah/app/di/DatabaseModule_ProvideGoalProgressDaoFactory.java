package com.jamrah.app.di;

import com.jamrah.app.data.local.JamrahDatabase;
import com.jamrah.app.data.local.dao.GoalProgressDao;
import dagger.internal.DaggerGenerated;
import dagger.internal.Factory;
import dagger.internal.Preconditions;
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
public final class DatabaseModule_ProvideGoalProgressDaoFactory implements Factory<GoalProgressDao> {
  private final Provider<JamrahDatabase> dbProvider;

  public DatabaseModule_ProvideGoalProgressDaoFactory(Provider<JamrahDatabase> dbProvider) {
    this.dbProvider = dbProvider;
  }

  @Override
  public GoalProgressDao get() {
    return provideGoalProgressDao(dbProvider.get());
  }

  public static DatabaseModule_ProvideGoalProgressDaoFactory create(
      Provider<JamrahDatabase> dbProvider) {
    return new DatabaseModule_ProvideGoalProgressDaoFactory(dbProvider);
  }

  public static GoalProgressDao provideGoalProgressDao(JamrahDatabase db) {
    return Preconditions.checkNotNullFromProvides(DatabaseModule.INSTANCE.provideGoalProgressDao(db));
  }
}
