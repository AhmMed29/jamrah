package com.jamrah.app.data.local.dao;

import android.database.Cursor;
import android.os.CancellationSignal;
import androidx.annotation.NonNull;
import androidx.room.CoroutinesRoom;
import androidx.room.EntityDeletionOrUpdateAdapter;
import androidx.room.EntityInsertionAdapter;
import androidx.room.EntityUpsertionAdapter;
import androidx.room.RoomDatabase;
import androidx.room.RoomSQLiteQuery;
import androidx.room.SharedSQLiteStatement;
import androidx.room.util.CursorUtil;
import androidx.room.util.DBUtil;
import androidx.sqlite.db.SupportSQLiteStatement;
import com.jamrah.app.data.local.entity.GoalProgressEntity;
import java.lang.Class;
import java.lang.Exception;
import java.lang.Object;
import java.lang.Override;
import java.lang.String;
import java.lang.SuppressWarnings;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.concurrent.Callable;
import javax.annotation.processing.Generated;
import kotlin.Unit;
import kotlin.coroutines.Continuation;
import kotlinx.coroutines.flow.Flow;

@Generated("androidx.room.RoomProcessor")
@SuppressWarnings({"unchecked", "deprecation"})
public final class GoalProgressDao_Impl implements GoalProgressDao {
  private final RoomDatabase __db;

  private final SharedSQLiteStatement __preparedStmtOfDeleteForGoal;

  private final EntityUpsertionAdapter<GoalProgressEntity> __upsertionAdapterOfGoalProgressEntity;

  public GoalProgressDao_Impl(@NonNull final RoomDatabase __db) {
    this.__db = __db;
    this.__preparedStmtOfDeleteForGoal = new SharedSQLiteStatement(__db) {
      @Override
      @NonNull
      public String createQuery() {
        final String _query = "DELETE FROM goal_progress WHERE goalId = ?";
        return _query;
      }
    };
    this.__upsertionAdapterOfGoalProgressEntity = new EntityUpsertionAdapter<GoalProgressEntity>(new EntityInsertionAdapter<GoalProgressEntity>(__db) {
      @Override
      @NonNull
      protected String createQuery() {
        return "INSERT INTO `goal_progress` (`goalId`,`date`,`progressValue`,`focusMinutes`) VALUES (?,?,?,?)";
      }

      @Override
      protected void bind(@NonNull final SupportSQLiteStatement statement,
          @NonNull final GoalProgressEntity entity) {
        statement.bindString(1, entity.getGoalId());
        statement.bindString(2, entity.getDate());
        statement.bindDouble(3, entity.getProgressValue());
        statement.bindDouble(4, entity.getFocusMinutes());
      }
    }, new EntityDeletionOrUpdateAdapter<GoalProgressEntity>(__db) {
      @Override
      @NonNull
      protected String createQuery() {
        return "UPDATE `goal_progress` SET `goalId` = ?,`date` = ?,`progressValue` = ?,`focusMinutes` = ? WHERE `goalId` = ? AND `date` = ?";
      }

      @Override
      protected void bind(@NonNull final SupportSQLiteStatement statement,
          @NonNull final GoalProgressEntity entity) {
        statement.bindString(1, entity.getGoalId());
        statement.bindString(2, entity.getDate());
        statement.bindDouble(3, entity.getProgressValue());
        statement.bindDouble(4, entity.getFocusMinutes());
        statement.bindString(5, entity.getGoalId());
        statement.bindString(6, entity.getDate());
      }
    });
  }

  @Override
  public Object deleteForGoal(final String goalId, final Continuation<? super Unit> $completion) {
    return CoroutinesRoom.execute(__db, true, new Callable<Unit>() {
      @Override
      @NonNull
      public Unit call() throws Exception {
        final SupportSQLiteStatement _stmt = __preparedStmtOfDeleteForGoal.acquire();
        int _argIndex = 1;
        _stmt.bindString(_argIndex, goalId);
        try {
          __db.beginTransaction();
          try {
            _stmt.executeUpdateDelete();
            __db.setTransactionSuccessful();
            return Unit.INSTANCE;
          } finally {
            __db.endTransaction();
          }
        } finally {
          __preparedStmtOfDeleteForGoal.release(_stmt);
        }
      }
    }, $completion);
  }

  @Override
  public Object upsert(final GoalProgressEntity entry,
      final Continuation<? super Unit> $completion) {
    return CoroutinesRoom.execute(__db, true, new Callable<Unit>() {
      @Override
      @NonNull
      public Unit call() throws Exception {
        __db.beginTransaction();
        try {
          __upsertionAdapterOfGoalProgressEntity.upsert(entry);
          __db.setTransactionSuccessful();
          return Unit.INSTANCE;
        } finally {
          __db.endTransaction();
        }
      }
    }, $completion);
  }

  @Override
  public Object upsertAll(final List<GoalProgressEntity> entries,
      final Continuation<? super Unit> $completion) {
    return CoroutinesRoom.execute(__db, true, new Callable<Unit>() {
      @Override
      @NonNull
      public Unit call() throws Exception {
        __db.beginTransaction();
        try {
          __upsertionAdapterOfGoalProgressEntity.upsert(entries);
          __db.setTransactionSuccessful();
          return Unit.INSTANCE;
        } finally {
          __db.endTransaction();
        }
      }
    }, $completion);
  }

  @Override
  public Flow<List<GoalProgressEntity>> observeForGoal(final String goalId) {
    final String _sql = "SELECT * FROM goal_progress WHERE goalId = ? ORDER BY date ASC";
    final RoomSQLiteQuery _statement = RoomSQLiteQuery.acquire(_sql, 1);
    int _argIndex = 1;
    _statement.bindString(_argIndex, goalId);
    return CoroutinesRoom.createFlow(__db, false, new String[] {"goal_progress"}, new Callable<List<GoalProgressEntity>>() {
      @Override
      @NonNull
      public List<GoalProgressEntity> call() throws Exception {
        final Cursor _cursor = DBUtil.query(__db, _statement, false, null);
        try {
          final int _cursorIndexOfGoalId = CursorUtil.getColumnIndexOrThrow(_cursor, "goalId");
          final int _cursorIndexOfDate = CursorUtil.getColumnIndexOrThrow(_cursor, "date");
          final int _cursorIndexOfProgressValue = CursorUtil.getColumnIndexOrThrow(_cursor, "progressValue");
          final int _cursorIndexOfFocusMinutes = CursorUtil.getColumnIndexOrThrow(_cursor, "focusMinutes");
          final List<GoalProgressEntity> _result = new ArrayList<GoalProgressEntity>(_cursor.getCount());
          while (_cursor.moveToNext()) {
            final GoalProgressEntity _item;
            final String _tmpGoalId;
            _tmpGoalId = _cursor.getString(_cursorIndexOfGoalId);
            final String _tmpDate;
            _tmpDate = _cursor.getString(_cursorIndexOfDate);
            final double _tmpProgressValue;
            _tmpProgressValue = _cursor.getDouble(_cursorIndexOfProgressValue);
            final double _tmpFocusMinutes;
            _tmpFocusMinutes = _cursor.getDouble(_cursorIndexOfFocusMinutes);
            _item = new GoalProgressEntity(_tmpGoalId,_tmpDate,_tmpProgressValue,_tmpFocusMinutes);
            _result.add(_item);
          }
          return _result;
        } finally {
          _cursor.close();
        }
      }

      @Override
      protected void finalize() {
        _statement.release();
      }
    });
  }

  @Override
  public Object getForGoal(final String goalId,
      final Continuation<? super List<GoalProgressEntity>> $completion) {
    final String _sql = "SELECT * FROM goal_progress WHERE goalId = ? ORDER BY date ASC";
    final RoomSQLiteQuery _statement = RoomSQLiteQuery.acquire(_sql, 1);
    int _argIndex = 1;
    _statement.bindString(_argIndex, goalId);
    final CancellationSignal _cancellationSignal = DBUtil.createCancellationSignal();
    return CoroutinesRoom.execute(__db, false, _cancellationSignal, new Callable<List<GoalProgressEntity>>() {
      @Override
      @NonNull
      public List<GoalProgressEntity> call() throws Exception {
        final Cursor _cursor = DBUtil.query(__db, _statement, false, null);
        try {
          final int _cursorIndexOfGoalId = CursorUtil.getColumnIndexOrThrow(_cursor, "goalId");
          final int _cursorIndexOfDate = CursorUtil.getColumnIndexOrThrow(_cursor, "date");
          final int _cursorIndexOfProgressValue = CursorUtil.getColumnIndexOrThrow(_cursor, "progressValue");
          final int _cursorIndexOfFocusMinutes = CursorUtil.getColumnIndexOrThrow(_cursor, "focusMinutes");
          final List<GoalProgressEntity> _result = new ArrayList<GoalProgressEntity>(_cursor.getCount());
          while (_cursor.moveToNext()) {
            final GoalProgressEntity _item;
            final String _tmpGoalId;
            _tmpGoalId = _cursor.getString(_cursorIndexOfGoalId);
            final String _tmpDate;
            _tmpDate = _cursor.getString(_cursorIndexOfDate);
            final double _tmpProgressValue;
            _tmpProgressValue = _cursor.getDouble(_cursorIndexOfProgressValue);
            final double _tmpFocusMinutes;
            _tmpFocusMinutes = _cursor.getDouble(_cursorIndexOfFocusMinutes);
            _item = new GoalProgressEntity(_tmpGoalId,_tmpDate,_tmpProgressValue,_tmpFocusMinutes);
            _result.add(_item);
          }
          return _result;
        } finally {
          _cursor.close();
          _statement.release();
        }
      }
    }, $completion);
  }

  @NonNull
  public static List<Class<?>> getRequiredConverters() {
    return Collections.emptyList();
  }
}
