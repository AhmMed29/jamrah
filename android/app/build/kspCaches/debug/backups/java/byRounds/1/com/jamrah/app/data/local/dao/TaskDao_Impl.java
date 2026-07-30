package com.jamrah.app.data.local.dao;

import android.database.Cursor;
import android.os.CancellationSignal;
import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
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
import com.jamrah.app.data.local.entity.TaskEntity;
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
public final class TaskDao_Impl implements TaskDao {
  private final RoomDatabase __db;

  private final SharedSQLiteStatement __preparedStmtOfUpdateSyncStatus;

  private final SharedSQLiteStatement __preparedStmtOfToggleCompleted;

  private final SharedSQLiteStatement __preparedStmtOfMarkDeleted;

  private final SharedSQLiteStatement __preparedStmtOfHardDelete;

  private final EntityUpsertionAdapter<TaskEntity> __upsertionAdapterOfTaskEntity;

  public TaskDao_Impl(@NonNull final RoomDatabase __db) {
    this.__db = __db;
    this.__preparedStmtOfUpdateSyncStatus = new SharedSQLiteStatement(__db) {
      @Override
      @NonNull
      public String createQuery() {
        final String _query = "UPDATE tasks SET syncStatus = ?, updatedAt = ? WHERE id = ?";
        return _query;
      }
    };
    this.__preparedStmtOfToggleCompleted = new SharedSQLiteStatement(__db) {
      @Override
      @NonNull
      public String createQuery() {
        final String _query = "UPDATE tasks SET completed = ?, completedAt = ?, syncStatus = 'pending_update', updatedAt = ? WHERE id = ?";
        return _query;
      }
    };
    this.__preparedStmtOfMarkDeleted = new SharedSQLiteStatement(__db) {
      @Override
      @NonNull
      public String createQuery() {
        final String _query = "UPDATE tasks SET syncStatus = 'pending_delete', updatedAt = ? WHERE id = ?";
        return _query;
      }
    };
    this.__preparedStmtOfHardDelete = new SharedSQLiteStatement(__db) {
      @Override
      @NonNull
      public String createQuery() {
        final String _query = "DELETE FROM tasks WHERE id = ?";
        return _query;
      }
    };
    this.__upsertionAdapterOfTaskEntity = new EntityUpsertionAdapter<TaskEntity>(new EntityInsertionAdapter<TaskEntity>(__db) {
      @Override
      @NonNull
      protected String createQuery() {
        return "INSERT INTO `tasks` (`id`,`name`,`goalId`,`completed`,`createdAt`,`parentTaskId`,`priority`,`completedAt`,`scheduledTime`,`recurrence`,`customDays`,`durationStart`,`durationEnd`,`notes`,`updatedAt`,`syncStatus`) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)";
      }

      @Override
      protected void bind(@NonNull final SupportSQLiteStatement statement,
          @NonNull final TaskEntity entity) {
        statement.bindString(1, entity.getId());
        statement.bindString(2, entity.getName());
        if (entity.getGoalId() == null) {
          statement.bindNull(3);
        } else {
          statement.bindString(3, entity.getGoalId());
        }
        statement.bindLong(4, entity.getCompleted());
        statement.bindString(5, entity.getCreatedAt());
        if (entity.getParentTaskId() == null) {
          statement.bindNull(6);
        } else {
          statement.bindString(6, entity.getParentTaskId());
        }
        statement.bindString(7, entity.getPriority());
        if (entity.getCompletedAt() == null) {
          statement.bindNull(8);
        } else {
          statement.bindString(8, entity.getCompletedAt());
        }
        if (entity.getScheduledTime() == null) {
          statement.bindNull(9);
        } else {
          statement.bindString(9, entity.getScheduledTime());
        }
        if (entity.getRecurrence() == null) {
          statement.bindNull(10);
        } else {
          statement.bindString(10, entity.getRecurrence());
        }
        if (entity.getCustomDays() == null) {
          statement.bindNull(11);
        } else {
          statement.bindString(11, entity.getCustomDays());
        }
        if (entity.getDurationStart() == null) {
          statement.bindNull(12);
        } else {
          statement.bindString(12, entity.getDurationStart());
        }
        if (entity.getDurationEnd() == null) {
          statement.bindNull(13);
        } else {
          statement.bindString(13, entity.getDurationEnd());
        }
        if (entity.getNotes() == null) {
          statement.bindNull(14);
        } else {
          statement.bindString(14, entity.getNotes());
        }
        statement.bindLong(15, entity.getUpdatedAt());
        statement.bindString(16, entity.getSyncStatus());
      }
    }, new EntityDeletionOrUpdateAdapter<TaskEntity>(__db) {
      @Override
      @NonNull
      protected String createQuery() {
        return "UPDATE `tasks` SET `id` = ?,`name` = ?,`goalId` = ?,`completed` = ?,`createdAt` = ?,`parentTaskId` = ?,`priority` = ?,`completedAt` = ?,`scheduledTime` = ?,`recurrence` = ?,`customDays` = ?,`durationStart` = ?,`durationEnd` = ?,`notes` = ?,`updatedAt` = ?,`syncStatus` = ? WHERE `id` = ?";
      }

      @Override
      protected void bind(@NonNull final SupportSQLiteStatement statement,
          @NonNull final TaskEntity entity) {
        statement.bindString(1, entity.getId());
        statement.bindString(2, entity.getName());
        if (entity.getGoalId() == null) {
          statement.bindNull(3);
        } else {
          statement.bindString(3, entity.getGoalId());
        }
        statement.bindLong(4, entity.getCompleted());
        statement.bindString(5, entity.getCreatedAt());
        if (entity.getParentTaskId() == null) {
          statement.bindNull(6);
        } else {
          statement.bindString(6, entity.getParentTaskId());
        }
        statement.bindString(7, entity.getPriority());
        if (entity.getCompletedAt() == null) {
          statement.bindNull(8);
        } else {
          statement.bindString(8, entity.getCompletedAt());
        }
        if (entity.getScheduledTime() == null) {
          statement.bindNull(9);
        } else {
          statement.bindString(9, entity.getScheduledTime());
        }
        if (entity.getRecurrence() == null) {
          statement.bindNull(10);
        } else {
          statement.bindString(10, entity.getRecurrence());
        }
        if (entity.getCustomDays() == null) {
          statement.bindNull(11);
        } else {
          statement.bindString(11, entity.getCustomDays());
        }
        if (entity.getDurationStart() == null) {
          statement.bindNull(12);
        } else {
          statement.bindString(12, entity.getDurationStart());
        }
        if (entity.getDurationEnd() == null) {
          statement.bindNull(13);
        } else {
          statement.bindString(13, entity.getDurationEnd());
        }
        if (entity.getNotes() == null) {
          statement.bindNull(14);
        } else {
          statement.bindString(14, entity.getNotes());
        }
        statement.bindLong(15, entity.getUpdatedAt());
        statement.bindString(16, entity.getSyncStatus());
        statement.bindString(17, entity.getId());
      }
    });
  }

  @Override
  public Object updateSyncStatus(final String id, final String status, final long updatedAt,
      final Continuation<? super Unit> $completion) {
    return CoroutinesRoom.execute(__db, true, new Callable<Unit>() {
      @Override
      @NonNull
      public Unit call() throws Exception {
        final SupportSQLiteStatement _stmt = __preparedStmtOfUpdateSyncStatus.acquire();
        int _argIndex = 1;
        _stmt.bindString(_argIndex, status);
        _argIndex = 2;
        _stmt.bindLong(_argIndex, updatedAt);
        _argIndex = 3;
        _stmt.bindString(_argIndex, id);
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
          __preparedStmtOfUpdateSyncStatus.release(_stmt);
        }
      }
    }, $completion);
  }

  @Override
  public Object toggleCompleted(final String id, final int completed, final String completedAt,
      final long updatedAt, final Continuation<? super Unit> $completion) {
    return CoroutinesRoom.execute(__db, true, new Callable<Unit>() {
      @Override
      @NonNull
      public Unit call() throws Exception {
        final SupportSQLiteStatement _stmt = __preparedStmtOfToggleCompleted.acquire();
        int _argIndex = 1;
        _stmt.bindLong(_argIndex, completed);
        _argIndex = 2;
        if (completedAt == null) {
          _stmt.bindNull(_argIndex);
        } else {
          _stmt.bindString(_argIndex, completedAt);
        }
        _argIndex = 3;
        _stmt.bindLong(_argIndex, updatedAt);
        _argIndex = 4;
        _stmt.bindString(_argIndex, id);
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
          __preparedStmtOfToggleCompleted.release(_stmt);
        }
      }
    }, $completion);
  }

  @Override
  public Object markDeleted(final String id, final long updatedAt,
      final Continuation<? super Unit> $completion) {
    return CoroutinesRoom.execute(__db, true, new Callable<Unit>() {
      @Override
      @NonNull
      public Unit call() throws Exception {
        final SupportSQLiteStatement _stmt = __preparedStmtOfMarkDeleted.acquire();
        int _argIndex = 1;
        _stmt.bindLong(_argIndex, updatedAt);
        _argIndex = 2;
        _stmt.bindString(_argIndex, id);
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
          __preparedStmtOfMarkDeleted.release(_stmt);
        }
      }
    }, $completion);
  }

  @Override
  public Object hardDelete(final String id, final Continuation<? super Unit> $completion) {
    return CoroutinesRoom.execute(__db, true, new Callable<Unit>() {
      @Override
      @NonNull
      public Unit call() throws Exception {
        final SupportSQLiteStatement _stmt = __preparedStmtOfHardDelete.acquire();
        int _argIndex = 1;
        _stmt.bindString(_argIndex, id);
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
          __preparedStmtOfHardDelete.release(_stmt);
        }
      }
    }, $completion);
  }

  @Override
  public Object upsert(final TaskEntity task, final Continuation<? super Unit> $completion) {
    return CoroutinesRoom.execute(__db, true, new Callable<Unit>() {
      @Override
      @NonNull
      public Unit call() throws Exception {
        __db.beginTransaction();
        try {
          __upsertionAdapterOfTaskEntity.upsert(task);
          __db.setTransactionSuccessful();
          return Unit.INSTANCE;
        } finally {
          __db.endTransaction();
        }
      }
    }, $completion);
  }

  @Override
  public Object upsertAll(final List<TaskEntity> tasks,
      final Continuation<? super Unit> $completion) {
    return CoroutinesRoom.execute(__db, true, new Callable<Unit>() {
      @Override
      @NonNull
      public Unit call() throws Exception {
        __db.beginTransaction();
        try {
          __upsertionAdapterOfTaskEntity.upsert(tasks);
          __db.setTransactionSuccessful();
          return Unit.INSTANCE;
        } finally {
          __db.endTransaction();
        }
      }
    }, $completion);
  }

  @Override
  public Flow<List<TaskEntity>> observeAll() {
    final String _sql = "SELECT * FROM tasks WHERE syncStatus != 'pending_delete' ORDER BY createdAt DESC";
    final RoomSQLiteQuery _statement = RoomSQLiteQuery.acquire(_sql, 0);
    return CoroutinesRoom.createFlow(__db, false, new String[] {"tasks"}, new Callable<List<TaskEntity>>() {
      @Override
      @NonNull
      public List<TaskEntity> call() throws Exception {
        final Cursor _cursor = DBUtil.query(__db, _statement, false, null);
        try {
          final int _cursorIndexOfId = CursorUtil.getColumnIndexOrThrow(_cursor, "id");
          final int _cursorIndexOfName = CursorUtil.getColumnIndexOrThrow(_cursor, "name");
          final int _cursorIndexOfGoalId = CursorUtil.getColumnIndexOrThrow(_cursor, "goalId");
          final int _cursorIndexOfCompleted = CursorUtil.getColumnIndexOrThrow(_cursor, "completed");
          final int _cursorIndexOfCreatedAt = CursorUtil.getColumnIndexOrThrow(_cursor, "createdAt");
          final int _cursorIndexOfParentTaskId = CursorUtil.getColumnIndexOrThrow(_cursor, "parentTaskId");
          final int _cursorIndexOfPriority = CursorUtil.getColumnIndexOrThrow(_cursor, "priority");
          final int _cursorIndexOfCompletedAt = CursorUtil.getColumnIndexOrThrow(_cursor, "completedAt");
          final int _cursorIndexOfScheduledTime = CursorUtil.getColumnIndexOrThrow(_cursor, "scheduledTime");
          final int _cursorIndexOfRecurrence = CursorUtil.getColumnIndexOrThrow(_cursor, "recurrence");
          final int _cursorIndexOfCustomDays = CursorUtil.getColumnIndexOrThrow(_cursor, "customDays");
          final int _cursorIndexOfDurationStart = CursorUtil.getColumnIndexOrThrow(_cursor, "durationStart");
          final int _cursorIndexOfDurationEnd = CursorUtil.getColumnIndexOrThrow(_cursor, "durationEnd");
          final int _cursorIndexOfNotes = CursorUtil.getColumnIndexOrThrow(_cursor, "notes");
          final int _cursorIndexOfUpdatedAt = CursorUtil.getColumnIndexOrThrow(_cursor, "updatedAt");
          final int _cursorIndexOfSyncStatus = CursorUtil.getColumnIndexOrThrow(_cursor, "syncStatus");
          final List<TaskEntity> _result = new ArrayList<TaskEntity>(_cursor.getCount());
          while (_cursor.moveToNext()) {
            final TaskEntity _item;
            final String _tmpId;
            _tmpId = _cursor.getString(_cursorIndexOfId);
            final String _tmpName;
            _tmpName = _cursor.getString(_cursorIndexOfName);
            final String _tmpGoalId;
            if (_cursor.isNull(_cursorIndexOfGoalId)) {
              _tmpGoalId = null;
            } else {
              _tmpGoalId = _cursor.getString(_cursorIndexOfGoalId);
            }
            final int _tmpCompleted;
            _tmpCompleted = _cursor.getInt(_cursorIndexOfCompleted);
            final String _tmpCreatedAt;
            _tmpCreatedAt = _cursor.getString(_cursorIndexOfCreatedAt);
            final String _tmpParentTaskId;
            if (_cursor.isNull(_cursorIndexOfParentTaskId)) {
              _tmpParentTaskId = null;
            } else {
              _tmpParentTaskId = _cursor.getString(_cursorIndexOfParentTaskId);
            }
            final String _tmpPriority;
            _tmpPriority = _cursor.getString(_cursorIndexOfPriority);
            final String _tmpCompletedAt;
            if (_cursor.isNull(_cursorIndexOfCompletedAt)) {
              _tmpCompletedAt = null;
            } else {
              _tmpCompletedAt = _cursor.getString(_cursorIndexOfCompletedAt);
            }
            final String _tmpScheduledTime;
            if (_cursor.isNull(_cursorIndexOfScheduledTime)) {
              _tmpScheduledTime = null;
            } else {
              _tmpScheduledTime = _cursor.getString(_cursorIndexOfScheduledTime);
            }
            final String _tmpRecurrence;
            if (_cursor.isNull(_cursorIndexOfRecurrence)) {
              _tmpRecurrence = null;
            } else {
              _tmpRecurrence = _cursor.getString(_cursorIndexOfRecurrence);
            }
            final String _tmpCustomDays;
            if (_cursor.isNull(_cursorIndexOfCustomDays)) {
              _tmpCustomDays = null;
            } else {
              _tmpCustomDays = _cursor.getString(_cursorIndexOfCustomDays);
            }
            final String _tmpDurationStart;
            if (_cursor.isNull(_cursorIndexOfDurationStart)) {
              _tmpDurationStart = null;
            } else {
              _tmpDurationStart = _cursor.getString(_cursorIndexOfDurationStart);
            }
            final String _tmpDurationEnd;
            if (_cursor.isNull(_cursorIndexOfDurationEnd)) {
              _tmpDurationEnd = null;
            } else {
              _tmpDurationEnd = _cursor.getString(_cursorIndexOfDurationEnd);
            }
            final String _tmpNotes;
            if (_cursor.isNull(_cursorIndexOfNotes)) {
              _tmpNotes = null;
            } else {
              _tmpNotes = _cursor.getString(_cursorIndexOfNotes);
            }
            final long _tmpUpdatedAt;
            _tmpUpdatedAt = _cursor.getLong(_cursorIndexOfUpdatedAt);
            final String _tmpSyncStatus;
            _tmpSyncStatus = _cursor.getString(_cursorIndexOfSyncStatus);
            _item = new TaskEntity(_tmpId,_tmpName,_tmpGoalId,_tmpCompleted,_tmpCreatedAt,_tmpParentTaskId,_tmpPriority,_tmpCompletedAt,_tmpScheduledTime,_tmpRecurrence,_tmpCustomDays,_tmpDurationStart,_tmpDurationEnd,_tmpNotes,_tmpUpdatedAt,_tmpSyncStatus);
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
  public Object getAll(final Continuation<? super List<TaskEntity>> $completion) {
    final String _sql = "SELECT * FROM tasks";
    final RoomSQLiteQuery _statement = RoomSQLiteQuery.acquire(_sql, 0);
    final CancellationSignal _cancellationSignal = DBUtil.createCancellationSignal();
    return CoroutinesRoom.execute(__db, false, _cancellationSignal, new Callable<List<TaskEntity>>() {
      @Override
      @NonNull
      public List<TaskEntity> call() throws Exception {
        final Cursor _cursor = DBUtil.query(__db, _statement, false, null);
        try {
          final int _cursorIndexOfId = CursorUtil.getColumnIndexOrThrow(_cursor, "id");
          final int _cursorIndexOfName = CursorUtil.getColumnIndexOrThrow(_cursor, "name");
          final int _cursorIndexOfGoalId = CursorUtil.getColumnIndexOrThrow(_cursor, "goalId");
          final int _cursorIndexOfCompleted = CursorUtil.getColumnIndexOrThrow(_cursor, "completed");
          final int _cursorIndexOfCreatedAt = CursorUtil.getColumnIndexOrThrow(_cursor, "createdAt");
          final int _cursorIndexOfParentTaskId = CursorUtil.getColumnIndexOrThrow(_cursor, "parentTaskId");
          final int _cursorIndexOfPriority = CursorUtil.getColumnIndexOrThrow(_cursor, "priority");
          final int _cursorIndexOfCompletedAt = CursorUtil.getColumnIndexOrThrow(_cursor, "completedAt");
          final int _cursorIndexOfScheduledTime = CursorUtil.getColumnIndexOrThrow(_cursor, "scheduledTime");
          final int _cursorIndexOfRecurrence = CursorUtil.getColumnIndexOrThrow(_cursor, "recurrence");
          final int _cursorIndexOfCustomDays = CursorUtil.getColumnIndexOrThrow(_cursor, "customDays");
          final int _cursorIndexOfDurationStart = CursorUtil.getColumnIndexOrThrow(_cursor, "durationStart");
          final int _cursorIndexOfDurationEnd = CursorUtil.getColumnIndexOrThrow(_cursor, "durationEnd");
          final int _cursorIndexOfNotes = CursorUtil.getColumnIndexOrThrow(_cursor, "notes");
          final int _cursorIndexOfUpdatedAt = CursorUtil.getColumnIndexOrThrow(_cursor, "updatedAt");
          final int _cursorIndexOfSyncStatus = CursorUtil.getColumnIndexOrThrow(_cursor, "syncStatus");
          final List<TaskEntity> _result = new ArrayList<TaskEntity>(_cursor.getCount());
          while (_cursor.moveToNext()) {
            final TaskEntity _item;
            final String _tmpId;
            _tmpId = _cursor.getString(_cursorIndexOfId);
            final String _tmpName;
            _tmpName = _cursor.getString(_cursorIndexOfName);
            final String _tmpGoalId;
            if (_cursor.isNull(_cursorIndexOfGoalId)) {
              _tmpGoalId = null;
            } else {
              _tmpGoalId = _cursor.getString(_cursorIndexOfGoalId);
            }
            final int _tmpCompleted;
            _tmpCompleted = _cursor.getInt(_cursorIndexOfCompleted);
            final String _tmpCreatedAt;
            _tmpCreatedAt = _cursor.getString(_cursorIndexOfCreatedAt);
            final String _tmpParentTaskId;
            if (_cursor.isNull(_cursorIndexOfParentTaskId)) {
              _tmpParentTaskId = null;
            } else {
              _tmpParentTaskId = _cursor.getString(_cursorIndexOfParentTaskId);
            }
            final String _tmpPriority;
            _tmpPriority = _cursor.getString(_cursorIndexOfPriority);
            final String _tmpCompletedAt;
            if (_cursor.isNull(_cursorIndexOfCompletedAt)) {
              _tmpCompletedAt = null;
            } else {
              _tmpCompletedAt = _cursor.getString(_cursorIndexOfCompletedAt);
            }
            final String _tmpScheduledTime;
            if (_cursor.isNull(_cursorIndexOfScheduledTime)) {
              _tmpScheduledTime = null;
            } else {
              _tmpScheduledTime = _cursor.getString(_cursorIndexOfScheduledTime);
            }
            final String _tmpRecurrence;
            if (_cursor.isNull(_cursorIndexOfRecurrence)) {
              _tmpRecurrence = null;
            } else {
              _tmpRecurrence = _cursor.getString(_cursorIndexOfRecurrence);
            }
            final String _tmpCustomDays;
            if (_cursor.isNull(_cursorIndexOfCustomDays)) {
              _tmpCustomDays = null;
            } else {
              _tmpCustomDays = _cursor.getString(_cursorIndexOfCustomDays);
            }
            final String _tmpDurationStart;
            if (_cursor.isNull(_cursorIndexOfDurationStart)) {
              _tmpDurationStart = null;
            } else {
              _tmpDurationStart = _cursor.getString(_cursorIndexOfDurationStart);
            }
            final String _tmpDurationEnd;
            if (_cursor.isNull(_cursorIndexOfDurationEnd)) {
              _tmpDurationEnd = null;
            } else {
              _tmpDurationEnd = _cursor.getString(_cursorIndexOfDurationEnd);
            }
            final String _tmpNotes;
            if (_cursor.isNull(_cursorIndexOfNotes)) {
              _tmpNotes = null;
            } else {
              _tmpNotes = _cursor.getString(_cursorIndexOfNotes);
            }
            final long _tmpUpdatedAt;
            _tmpUpdatedAt = _cursor.getLong(_cursorIndexOfUpdatedAt);
            final String _tmpSyncStatus;
            _tmpSyncStatus = _cursor.getString(_cursorIndexOfSyncStatus);
            _item = new TaskEntity(_tmpId,_tmpName,_tmpGoalId,_tmpCompleted,_tmpCreatedAt,_tmpParentTaskId,_tmpPriority,_tmpCompletedAt,_tmpScheduledTime,_tmpRecurrence,_tmpCustomDays,_tmpDurationStart,_tmpDurationEnd,_tmpNotes,_tmpUpdatedAt,_tmpSyncStatus);
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

  @Override
  public Object getById(final String id, final Continuation<? super TaskEntity> $completion) {
    final String _sql = "SELECT * FROM tasks WHERE id = ? LIMIT 1";
    final RoomSQLiteQuery _statement = RoomSQLiteQuery.acquire(_sql, 1);
    int _argIndex = 1;
    _statement.bindString(_argIndex, id);
    final CancellationSignal _cancellationSignal = DBUtil.createCancellationSignal();
    return CoroutinesRoom.execute(__db, false, _cancellationSignal, new Callable<TaskEntity>() {
      @Override
      @Nullable
      public TaskEntity call() throws Exception {
        final Cursor _cursor = DBUtil.query(__db, _statement, false, null);
        try {
          final int _cursorIndexOfId = CursorUtil.getColumnIndexOrThrow(_cursor, "id");
          final int _cursorIndexOfName = CursorUtil.getColumnIndexOrThrow(_cursor, "name");
          final int _cursorIndexOfGoalId = CursorUtil.getColumnIndexOrThrow(_cursor, "goalId");
          final int _cursorIndexOfCompleted = CursorUtil.getColumnIndexOrThrow(_cursor, "completed");
          final int _cursorIndexOfCreatedAt = CursorUtil.getColumnIndexOrThrow(_cursor, "createdAt");
          final int _cursorIndexOfParentTaskId = CursorUtil.getColumnIndexOrThrow(_cursor, "parentTaskId");
          final int _cursorIndexOfPriority = CursorUtil.getColumnIndexOrThrow(_cursor, "priority");
          final int _cursorIndexOfCompletedAt = CursorUtil.getColumnIndexOrThrow(_cursor, "completedAt");
          final int _cursorIndexOfScheduledTime = CursorUtil.getColumnIndexOrThrow(_cursor, "scheduledTime");
          final int _cursorIndexOfRecurrence = CursorUtil.getColumnIndexOrThrow(_cursor, "recurrence");
          final int _cursorIndexOfCustomDays = CursorUtil.getColumnIndexOrThrow(_cursor, "customDays");
          final int _cursorIndexOfDurationStart = CursorUtil.getColumnIndexOrThrow(_cursor, "durationStart");
          final int _cursorIndexOfDurationEnd = CursorUtil.getColumnIndexOrThrow(_cursor, "durationEnd");
          final int _cursorIndexOfNotes = CursorUtil.getColumnIndexOrThrow(_cursor, "notes");
          final int _cursorIndexOfUpdatedAt = CursorUtil.getColumnIndexOrThrow(_cursor, "updatedAt");
          final int _cursorIndexOfSyncStatus = CursorUtil.getColumnIndexOrThrow(_cursor, "syncStatus");
          final TaskEntity _result;
          if (_cursor.moveToFirst()) {
            final String _tmpId;
            _tmpId = _cursor.getString(_cursorIndexOfId);
            final String _tmpName;
            _tmpName = _cursor.getString(_cursorIndexOfName);
            final String _tmpGoalId;
            if (_cursor.isNull(_cursorIndexOfGoalId)) {
              _tmpGoalId = null;
            } else {
              _tmpGoalId = _cursor.getString(_cursorIndexOfGoalId);
            }
            final int _tmpCompleted;
            _tmpCompleted = _cursor.getInt(_cursorIndexOfCompleted);
            final String _tmpCreatedAt;
            _tmpCreatedAt = _cursor.getString(_cursorIndexOfCreatedAt);
            final String _tmpParentTaskId;
            if (_cursor.isNull(_cursorIndexOfParentTaskId)) {
              _tmpParentTaskId = null;
            } else {
              _tmpParentTaskId = _cursor.getString(_cursorIndexOfParentTaskId);
            }
            final String _tmpPriority;
            _tmpPriority = _cursor.getString(_cursorIndexOfPriority);
            final String _tmpCompletedAt;
            if (_cursor.isNull(_cursorIndexOfCompletedAt)) {
              _tmpCompletedAt = null;
            } else {
              _tmpCompletedAt = _cursor.getString(_cursorIndexOfCompletedAt);
            }
            final String _tmpScheduledTime;
            if (_cursor.isNull(_cursorIndexOfScheduledTime)) {
              _tmpScheduledTime = null;
            } else {
              _tmpScheduledTime = _cursor.getString(_cursorIndexOfScheduledTime);
            }
            final String _tmpRecurrence;
            if (_cursor.isNull(_cursorIndexOfRecurrence)) {
              _tmpRecurrence = null;
            } else {
              _tmpRecurrence = _cursor.getString(_cursorIndexOfRecurrence);
            }
            final String _tmpCustomDays;
            if (_cursor.isNull(_cursorIndexOfCustomDays)) {
              _tmpCustomDays = null;
            } else {
              _tmpCustomDays = _cursor.getString(_cursorIndexOfCustomDays);
            }
            final String _tmpDurationStart;
            if (_cursor.isNull(_cursorIndexOfDurationStart)) {
              _tmpDurationStart = null;
            } else {
              _tmpDurationStart = _cursor.getString(_cursorIndexOfDurationStart);
            }
            final String _tmpDurationEnd;
            if (_cursor.isNull(_cursorIndexOfDurationEnd)) {
              _tmpDurationEnd = null;
            } else {
              _tmpDurationEnd = _cursor.getString(_cursorIndexOfDurationEnd);
            }
            final String _tmpNotes;
            if (_cursor.isNull(_cursorIndexOfNotes)) {
              _tmpNotes = null;
            } else {
              _tmpNotes = _cursor.getString(_cursorIndexOfNotes);
            }
            final long _tmpUpdatedAt;
            _tmpUpdatedAt = _cursor.getLong(_cursorIndexOfUpdatedAt);
            final String _tmpSyncStatus;
            _tmpSyncStatus = _cursor.getString(_cursorIndexOfSyncStatus);
            _result = new TaskEntity(_tmpId,_tmpName,_tmpGoalId,_tmpCompleted,_tmpCreatedAt,_tmpParentTaskId,_tmpPriority,_tmpCompletedAt,_tmpScheduledTime,_tmpRecurrence,_tmpCustomDays,_tmpDurationStart,_tmpDurationEnd,_tmpNotes,_tmpUpdatedAt,_tmpSyncStatus);
          } else {
            _result = null;
          }
          return _result;
        } finally {
          _cursor.close();
          _statement.release();
        }
      }
    }, $completion);
  }

  @Override
  public Object getPending(final Continuation<? super List<TaskEntity>> $completion) {
    final String _sql = "SELECT * FROM tasks WHERE syncStatus != 'synced'";
    final RoomSQLiteQuery _statement = RoomSQLiteQuery.acquire(_sql, 0);
    final CancellationSignal _cancellationSignal = DBUtil.createCancellationSignal();
    return CoroutinesRoom.execute(__db, false, _cancellationSignal, new Callable<List<TaskEntity>>() {
      @Override
      @NonNull
      public List<TaskEntity> call() throws Exception {
        final Cursor _cursor = DBUtil.query(__db, _statement, false, null);
        try {
          final int _cursorIndexOfId = CursorUtil.getColumnIndexOrThrow(_cursor, "id");
          final int _cursorIndexOfName = CursorUtil.getColumnIndexOrThrow(_cursor, "name");
          final int _cursorIndexOfGoalId = CursorUtil.getColumnIndexOrThrow(_cursor, "goalId");
          final int _cursorIndexOfCompleted = CursorUtil.getColumnIndexOrThrow(_cursor, "completed");
          final int _cursorIndexOfCreatedAt = CursorUtil.getColumnIndexOrThrow(_cursor, "createdAt");
          final int _cursorIndexOfParentTaskId = CursorUtil.getColumnIndexOrThrow(_cursor, "parentTaskId");
          final int _cursorIndexOfPriority = CursorUtil.getColumnIndexOrThrow(_cursor, "priority");
          final int _cursorIndexOfCompletedAt = CursorUtil.getColumnIndexOrThrow(_cursor, "completedAt");
          final int _cursorIndexOfScheduledTime = CursorUtil.getColumnIndexOrThrow(_cursor, "scheduledTime");
          final int _cursorIndexOfRecurrence = CursorUtil.getColumnIndexOrThrow(_cursor, "recurrence");
          final int _cursorIndexOfCustomDays = CursorUtil.getColumnIndexOrThrow(_cursor, "customDays");
          final int _cursorIndexOfDurationStart = CursorUtil.getColumnIndexOrThrow(_cursor, "durationStart");
          final int _cursorIndexOfDurationEnd = CursorUtil.getColumnIndexOrThrow(_cursor, "durationEnd");
          final int _cursorIndexOfNotes = CursorUtil.getColumnIndexOrThrow(_cursor, "notes");
          final int _cursorIndexOfUpdatedAt = CursorUtil.getColumnIndexOrThrow(_cursor, "updatedAt");
          final int _cursorIndexOfSyncStatus = CursorUtil.getColumnIndexOrThrow(_cursor, "syncStatus");
          final List<TaskEntity> _result = new ArrayList<TaskEntity>(_cursor.getCount());
          while (_cursor.moveToNext()) {
            final TaskEntity _item;
            final String _tmpId;
            _tmpId = _cursor.getString(_cursorIndexOfId);
            final String _tmpName;
            _tmpName = _cursor.getString(_cursorIndexOfName);
            final String _tmpGoalId;
            if (_cursor.isNull(_cursorIndexOfGoalId)) {
              _tmpGoalId = null;
            } else {
              _tmpGoalId = _cursor.getString(_cursorIndexOfGoalId);
            }
            final int _tmpCompleted;
            _tmpCompleted = _cursor.getInt(_cursorIndexOfCompleted);
            final String _tmpCreatedAt;
            _tmpCreatedAt = _cursor.getString(_cursorIndexOfCreatedAt);
            final String _tmpParentTaskId;
            if (_cursor.isNull(_cursorIndexOfParentTaskId)) {
              _tmpParentTaskId = null;
            } else {
              _tmpParentTaskId = _cursor.getString(_cursorIndexOfParentTaskId);
            }
            final String _tmpPriority;
            _tmpPriority = _cursor.getString(_cursorIndexOfPriority);
            final String _tmpCompletedAt;
            if (_cursor.isNull(_cursorIndexOfCompletedAt)) {
              _tmpCompletedAt = null;
            } else {
              _tmpCompletedAt = _cursor.getString(_cursorIndexOfCompletedAt);
            }
            final String _tmpScheduledTime;
            if (_cursor.isNull(_cursorIndexOfScheduledTime)) {
              _tmpScheduledTime = null;
            } else {
              _tmpScheduledTime = _cursor.getString(_cursorIndexOfScheduledTime);
            }
            final String _tmpRecurrence;
            if (_cursor.isNull(_cursorIndexOfRecurrence)) {
              _tmpRecurrence = null;
            } else {
              _tmpRecurrence = _cursor.getString(_cursorIndexOfRecurrence);
            }
            final String _tmpCustomDays;
            if (_cursor.isNull(_cursorIndexOfCustomDays)) {
              _tmpCustomDays = null;
            } else {
              _tmpCustomDays = _cursor.getString(_cursorIndexOfCustomDays);
            }
            final String _tmpDurationStart;
            if (_cursor.isNull(_cursorIndexOfDurationStart)) {
              _tmpDurationStart = null;
            } else {
              _tmpDurationStart = _cursor.getString(_cursorIndexOfDurationStart);
            }
            final String _tmpDurationEnd;
            if (_cursor.isNull(_cursorIndexOfDurationEnd)) {
              _tmpDurationEnd = null;
            } else {
              _tmpDurationEnd = _cursor.getString(_cursorIndexOfDurationEnd);
            }
            final String _tmpNotes;
            if (_cursor.isNull(_cursorIndexOfNotes)) {
              _tmpNotes = null;
            } else {
              _tmpNotes = _cursor.getString(_cursorIndexOfNotes);
            }
            final long _tmpUpdatedAt;
            _tmpUpdatedAt = _cursor.getLong(_cursorIndexOfUpdatedAt);
            final String _tmpSyncStatus;
            _tmpSyncStatus = _cursor.getString(_cursorIndexOfSyncStatus);
            _item = new TaskEntity(_tmpId,_tmpName,_tmpGoalId,_tmpCompleted,_tmpCreatedAt,_tmpParentTaskId,_tmpPriority,_tmpCompletedAt,_tmpScheduledTime,_tmpRecurrence,_tmpCustomDays,_tmpDurationStart,_tmpDurationEnd,_tmpNotes,_tmpUpdatedAt,_tmpSyncStatus);
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

  @Override
  public Object getSubtasks(final String parentId,
      final Continuation<? super List<TaskEntity>> $completion) {
    final String _sql = "SELECT * FROM tasks WHERE parentTaskId = ? AND syncStatus != 'pending_delete'";
    final RoomSQLiteQuery _statement = RoomSQLiteQuery.acquire(_sql, 1);
    int _argIndex = 1;
    _statement.bindString(_argIndex, parentId);
    final CancellationSignal _cancellationSignal = DBUtil.createCancellationSignal();
    return CoroutinesRoom.execute(__db, false, _cancellationSignal, new Callable<List<TaskEntity>>() {
      @Override
      @NonNull
      public List<TaskEntity> call() throws Exception {
        final Cursor _cursor = DBUtil.query(__db, _statement, false, null);
        try {
          final int _cursorIndexOfId = CursorUtil.getColumnIndexOrThrow(_cursor, "id");
          final int _cursorIndexOfName = CursorUtil.getColumnIndexOrThrow(_cursor, "name");
          final int _cursorIndexOfGoalId = CursorUtil.getColumnIndexOrThrow(_cursor, "goalId");
          final int _cursorIndexOfCompleted = CursorUtil.getColumnIndexOrThrow(_cursor, "completed");
          final int _cursorIndexOfCreatedAt = CursorUtil.getColumnIndexOrThrow(_cursor, "createdAt");
          final int _cursorIndexOfParentTaskId = CursorUtil.getColumnIndexOrThrow(_cursor, "parentTaskId");
          final int _cursorIndexOfPriority = CursorUtil.getColumnIndexOrThrow(_cursor, "priority");
          final int _cursorIndexOfCompletedAt = CursorUtil.getColumnIndexOrThrow(_cursor, "completedAt");
          final int _cursorIndexOfScheduledTime = CursorUtil.getColumnIndexOrThrow(_cursor, "scheduledTime");
          final int _cursorIndexOfRecurrence = CursorUtil.getColumnIndexOrThrow(_cursor, "recurrence");
          final int _cursorIndexOfCustomDays = CursorUtil.getColumnIndexOrThrow(_cursor, "customDays");
          final int _cursorIndexOfDurationStart = CursorUtil.getColumnIndexOrThrow(_cursor, "durationStart");
          final int _cursorIndexOfDurationEnd = CursorUtil.getColumnIndexOrThrow(_cursor, "durationEnd");
          final int _cursorIndexOfNotes = CursorUtil.getColumnIndexOrThrow(_cursor, "notes");
          final int _cursorIndexOfUpdatedAt = CursorUtil.getColumnIndexOrThrow(_cursor, "updatedAt");
          final int _cursorIndexOfSyncStatus = CursorUtil.getColumnIndexOrThrow(_cursor, "syncStatus");
          final List<TaskEntity> _result = new ArrayList<TaskEntity>(_cursor.getCount());
          while (_cursor.moveToNext()) {
            final TaskEntity _item;
            final String _tmpId;
            _tmpId = _cursor.getString(_cursorIndexOfId);
            final String _tmpName;
            _tmpName = _cursor.getString(_cursorIndexOfName);
            final String _tmpGoalId;
            if (_cursor.isNull(_cursorIndexOfGoalId)) {
              _tmpGoalId = null;
            } else {
              _tmpGoalId = _cursor.getString(_cursorIndexOfGoalId);
            }
            final int _tmpCompleted;
            _tmpCompleted = _cursor.getInt(_cursorIndexOfCompleted);
            final String _tmpCreatedAt;
            _tmpCreatedAt = _cursor.getString(_cursorIndexOfCreatedAt);
            final String _tmpParentTaskId;
            if (_cursor.isNull(_cursorIndexOfParentTaskId)) {
              _tmpParentTaskId = null;
            } else {
              _tmpParentTaskId = _cursor.getString(_cursorIndexOfParentTaskId);
            }
            final String _tmpPriority;
            _tmpPriority = _cursor.getString(_cursorIndexOfPriority);
            final String _tmpCompletedAt;
            if (_cursor.isNull(_cursorIndexOfCompletedAt)) {
              _tmpCompletedAt = null;
            } else {
              _tmpCompletedAt = _cursor.getString(_cursorIndexOfCompletedAt);
            }
            final String _tmpScheduledTime;
            if (_cursor.isNull(_cursorIndexOfScheduledTime)) {
              _tmpScheduledTime = null;
            } else {
              _tmpScheduledTime = _cursor.getString(_cursorIndexOfScheduledTime);
            }
            final String _tmpRecurrence;
            if (_cursor.isNull(_cursorIndexOfRecurrence)) {
              _tmpRecurrence = null;
            } else {
              _tmpRecurrence = _cursor.getString(_cursorIndexOfRecurrence);
            }
            final String _tmpCustomDays;
            if (_cursor.isNull(_cursorIndexOfCustomDays)) {
              _tmpCustomDays = null;
            } else {
              _tmpCustomDays = _cursor.getString(_cursorIndexOfCustomDays);
            }
            final String _tmpDurationStart;
            if (_cursor.isNull(_cursorIndexOfDurationStart)) {
              _tmpDurationStart = null;
            } else {
              _tmpDurationStart = _cursor.getString(_cursorIndexOfDurationStart);
            }
            final String _tmpDurationEnd;
            if (_cursor.isNull(_cursorIndexOfDurationEnd)) {
              _tmpDurationEnd = null;
            } else {
              _tmpDurationEnd = _cursor.getString(_cursorIndexOfDurationEnd);
            }
            final String _tmpNotes;
            if (_cursor.isNull(_cursorIndexOfNotes)) {
              _tmpNotes = null;
            } else {
              _tmpNotes = _cursor.getString(_cursorIndexOfNotes);
            }
            final long _tmpUpdatedAt;
            _tmpUpdatedAt = _cursor.getLong(_cursorIndexOfUpdatedAt);
            final String _tmpSyncStatus;
            _tmpSyncStatus = _cursor.getString(_cursorIndexOfSyncStatus);
            _item = new TaskEntity(_tmpId,_tmpName,_tmpGoalId,_tmpCompleted,_tmpCreatedAt,_tmpParentTaskId,_tmpPriority,_tmpCompletedAt,_tmpScheduledTime,_tmpRecurrence,_tmpCustomDays,_tmpDurationStart,_tmpDurationEnd,_tmpNotes,_tmpUpdatedAt,_tmpSyncStatus);
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
