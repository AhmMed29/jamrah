package com.jamrah.app.data.repository;

import com.jamrah.app.data.local.dao.GoalDao;
import com.jamrah.app.data.local.dao.GoalProgressDao;
import com.jamrah.app.data.remote.api.GoalsApi;
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
public final class GoalRepositoryImpl_Factory implements Factory<GoalRepositoryImpl> {
  private final Provider<GoalDao> daoProvider;

  private final Provider<GoalProgressDao> progressDaoProvider;

  private final Provider<GoalsApi> apiProvider;

  public GoalRepositoryImpl_Factory(Provider<GoalDao> daoProvider,
      Provider<GoalProgressDao> progressDaoProvider, Provider<GoalsApi> apiProvider) {
    this.daoProvider = daoProvider;
    this.progressDaoProvider = progressDaoProvider;
    this.apiProvider = apiProvider;
  }

  @Override
  public GoalRepositoryImpl get() {
    return newInstance(daoProvider.get(), progressDaoProvider.get(), apiProvider.get());
  }

  public static GoalRepositoryImpl_Factory create(Provider<GoalDao> daoProvider,
      Provider<GoalProgressDao> progressDaoProvider, Provider<GoalsApi> apiProvider) {
    return new GoalRepositoryImpl_Factory(daoProvider, progressDaoProvider, apiProvider);
  }

  public static GoalRepositoryImpl newInstance(GoalDao dao, GoalProgressDao progressDao,
      GoalsApi api) {
    return new GoalRepositoryImpl(dao, progressDao, api);
  }
}
