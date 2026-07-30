package com.jamrah.app.di;

import com.jamrah.app.data.local.JamrahDatabase;
import com.jamrah.app.data.local.dao.GoalDao;
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
public final class DatabaseModule_ProvideGoalDaoFactory implements Factory<GoalDao> {
  private final Provider<JamrahDatabase> dbProvider;

  public DatabaseModule_ProvideGoalDaoFactory(Provider<JamrahDatabase> dbProvider) {
    this.dbProvider = dbProvider;
  }

  @Override
  public GoalDao get() {
    return provideGoalDao(dbProvider.get());
  }

  public static DatabaseModule_ProvideGoalDaoFactory create(Provider<JamrahDatabase> dbProvider) {
    return new DatabaseModule_ProvideGoalDaoFactory(dbProvider);
  }

  public static GoalDao provideGoalDao(JamrahDatabase db) {
    return Preconditions.checkNotNullFromProvides(DatabaseModule.INSTANCE.provideGoalDao(db));
  }
}
