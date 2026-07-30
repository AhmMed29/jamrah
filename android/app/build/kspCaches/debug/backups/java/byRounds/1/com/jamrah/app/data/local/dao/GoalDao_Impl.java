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
import com.jamrah.app.data.local.entity.GoalEntity;
import java.lang.Class;
import java.lang.Exception;
import java.lang.Integer;
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
public final class GoalDao_Impl implements GoalDao {
  private final RoomDatabase __db;

  private final SharedSQLiteStatement __preparedStmtOfUpdateSyncStatus;

  private final SharedSQLiteStatement __preparedStmtOfMarkDeleted;

  private final SharedSQLiteStatement __preparedStmtOfHardDelete;

  private final EntityUpsertionAdapter<GoalEntity> __upsertionAdapterOfGoalEntity;

  public GoalDao_Impl(@NonNull final RoomDatabase __db) {
    this.__db = __db;
    this.__preparedStmtOfUpdateSyncStatus = new SharedSQLiteStatement(__db) {
      @Override
      @NonNull
      public String createQuery() {
        final String _query = "UPDATE goals SET syncStatus = ?, updatedAt = ? WHERE id = ?";
        return _query;
      }
    };
    this.__preparedStmtOfMarkDeleted = new SharedSQLiteStatement(__db) {
      @Override
      @NonNull
      public String createQuery() {
        final String _query = "UPDATE goals SET syncStatus = 'pending_delete', updatedAt = ? WHERE id = ?";
        return _query;
      }
    };
    this.__preparedStmtOfHardDelete = new SharedSQLiteStatement(__db) {
      @Override
      @NonNull
      public String createQuery() {
        final String _query = "DELETE FROM goals WHERE id = ?";
        return _query;
      }
    };
    this.__upsertionAdapterOfGoalEntity = new EntityUpsertionAdapter<GoalEntity>(new EntityInsertionAdapter<GoalEntity>(__db) {
      @Override
      @NonNull
      protected String createQuery() {
        return "INSERT INTO `goals` (`id`,`name`,`description`,`color`,`tagId`,`startDate`,`endDate`,`duration`,`durationType`,`durationValue`,`createdAt`,`parentGoalId`,`status`,`updatedAt`,`syncStatus`) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)";
      }

      @Override
      protected void bind(@NonNull final SupportSQLiteStatement statement,
          @NonNull final GoalEntity entity) {
        statement.bindString(1, entity.getId());
        statement.bindString(2, entity.getName());
        statement.bindString(3, entity.getDescription());
        statement.bindString(4, entity.getColor());
        if (entity.getTagId() == null) {
          statement.bindNull(5);
        } else {
          statement.bindString(5, entity.getTagId());
        }
        statement.bindString(6, entity.getStartDate());
        statement.bindString(7, entity.getEndDate());
        statement.bindLong(8, entity.getDuration());
        if (entity.getDurationType() == null) {
          statement.bindNull(9);
        } else {
          statement.bindString(9, entity.getDurationType());
        }
        if (entity.getDurationValue() == null) {
          statement.bindNull(10);
        } else {
          statement.bindLong(10, entity.getDurationValue());
        }
        statement.bindString(11, entity.getCreatedAt());
        if (entity.getParentGoalId() == null) {
          statement.bindNull(12);
        } else {
          statement.bindString(12, entity.getParentGoalId());
        }
        statement.bindString(13, entity.getStatus());
        statement.bindLong(14, entity.getUpdatedAt());
        statement.bindString(15, entity.getSyncStatus());
      }
    }, new EntityDeletionOrUpdateAdapter<GoalEntity>(__db) {
      @Override
      @NonNull
      protected String createQuery() {
        return "UPDATE `goals` SET `id` = ?,`name` = ?,`description` = ?,`color` = ?,`tagId` = ?,`startDate` = ?,`endDate` = ?,`duration` = ?,`durationType` = ?,`durationValue` = ?,`createdAt` = ?,`parentGoalId` = ?,`status` = ?,`updatedAt` = ?,`syncStatus` = ? WHERE `id` = ?";
      }

      @Override
      protected void bind(@NonNull final SupportSQLiteStatement statement,
          @NonNull final GoalEntity entity) {
        statement.bindString(1, entity.getId());
        statement.bindString(2, entity.getName());
        statement.bindString(3, entity.getDescription());
        statement.bindString(4, entity.getColor());
        if (entity.getTagId() == null) {
          statement.bindNull(5);
        } else {
          statement.bindString(5, entity.getTagId());
        }
        statement.bindString(6, entity.getStartDate());
        statement.bindString(7, entity.getEndDate());
        statement.bindLong(8, entity.getDuration());
        if (entity.getDurationType() == null) {
          statement.bindNull(9);
        } else {
          statement.bindString(9, entity.getDurationType());
        }
        if (entity.getDurationValue() == null) {
          statement.bindNull(10);
        } else {
          statement.bindLong(10, entity.getDurationValue());
        }
        statement.bindString(11, entity.getCreatedAt());
        if (entity.getParentGoalId() == null) {
          statement.bindNull(12);
        } else {
          statement.bindString(12, entity.getParentGoalId());
        }
        statement.bindString(13, entity.getStatus());
        statement.bindLong(14, entity.getUpdatedAt());
        statement.bindString(15, entity.getSyncStatus());
        statement.bindString(16, entity.getId());
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
  public Object upsert(final GoalEntity goal, final Continuation<? super Unit> $completion) {
    return CoroutinesRoom.execute(__db, true, new Callable<Unit>() {
      @Override
      @NonNull
      public Unit call() throws Exception {
        __db.beginTransaction();
        try {
          __upsertionAdapterOfGoalEntity.upsert(goal);
          __db.setTransactionSuccessful();
          return Unit.INSTANCE;
        } finally {
          __db.endTransaction();
        }
      }
    }, $completion);
  }

  @Override
  public Object upsertAll(final List<GoalEntity> goals,
      final Continuation<? super Unit> $completion) {
    return CoroutinesRoom.execute(__db, true, new Callable<Unit>() {
      @Override
      @NonNull
      public Unit call() throws Exception {
        __db.beginTransaction();
        try {
          __upsertionAdapterOfGoalEntity.upsert(goals);
          __db.setTransactionSuccessful();
          return Unit.INSTANCE;
        } finally {
          __db.endTransaction();
        }
      }
    }, $completion);
  }

  @Override
  public Flow<List<GoalEntity>> observeAll() {
    final String _sql = "SELECT * FROM goals WHERE syncStatus != 'pending_delete' ORDER BY createdAt ASC";
    final RoomSQLiteQuery _statement = RoomSQLiteQuery.acquire(_sql, 0);
    return CoroutinesRoom.createFlow(__db, false, new String[] {"goals"}, new Callable<List<GoalEntity>>() {
      @Override
      @NonNull
      public List<GoalEntity> call() throws Exception {
        final Cursor _cursor = DBUtil.query(__db, _statement, false, null);
        try {
          final int _cursorIndexOfId = CursorUtil.getColumnIndexOrThrow(_cursor, "id");
          final int _cursorIndexOfName = CursorUtil.getColumnIndexOrThrow(_cursor, "name");
          final int _cursorIndexOfDescription = CursorUtil.getColumnIndexOrThrow(_cursor, "description");
          final int _cursorIndexOfColor = CursorUtil.getColumnIndexOrThrow(_cursor, "color");
          final int _cursorIndexOfTagId = CursorUtil.getColumnIndexOrThrow(_cursor, "tagId");
          final int _cursorIndexOfStartDate = CursorUtil.getColumnIndexOrThrow(_cursor, "startDate");
          final int _cursorIndexOfEndDate = CursorUtil.getColumnIndexOrThrow(_cursor, "endDate");
          final int _cursorIndexOfDuration = CursorUtil.getColumnIndexOrThrow(_cursor, "duration");
          final int _cursorIndexOfDurationType = CursorUtil.getColumnIndexOrThrow(_cursor, "durationType");
          final int _cursorIndexOfDurationValue = CursorUtil.getColumnIndexOrThrow(_cursor, "durationValue");
          final int _cursorIndexOfCreatedAt = CursorUtil.getColumnIndexOrThrow(_cursor, "createdAt");
          final int _cursorIndexOfParentGoalId = CursorUtil.getColumnIndexOrThrow(_cursor, "parentGoalId");
          final int _cursorIndexOfStatus = CursorUtil.getColumnIndexOrThrow(_cursor, "status");
          final int _cursorIndexOfUpdatedAt = CursorUtil.getColumnIndexOrThrow(_cursor, "updatedAt");
          final int _cursorIndexOfSyncStatus = CursorUtil.getColumnIndexOrThrow(_cursor, "syncStatus");
          final List<GoalEntity> _result = new ArrayList<GoalEntity>(_cursor.getCount());
          while (_cursor.moveToNext()) {
            final GoalEntity _item;
            final String _tmpId;
            _tmpId = _cursor.getString(_cursorIndexOfId);
            final String _tmpName;
            _tmpName = _cursor.getString(_cursorIndexOfName);
            final String _tmpDescription;
            _tmpDescription = _cursor.getString(_cursorIndexOfDescription);
            final String _tmpColor;
            _tmpColor = _cursor.getString(_cursorIndexOfColor);
            final String _tmpTagId;
            if (_cursor.isNull(_cursorIndexOfTagId)) {
              _tmpTagId = null;
            } else {
              _tmpTagId = _cursor.getString(_cursorIndexOfTagId);
            }
            final String _tmpStartDate;
            _tmpStartDate = _cursor.getString(_cursorIndexOfStartDate);
            final String _tmpEndDate;
            _tmpEndDate = _cursor.getString(_cursorIndexOfEndDate);
            final int _tmpDuration;
            _tmpDuration = _cursor.getInt(_cursorIndexOfDuration);
            final String _tmpDurationType;
            if (_cursor.isNull(_cursorIndexOfDurationType)) {
              _tmpDurationType = null;
            } else {
              _tmpDurationType = _cursor.getString(_cursorIndexOfDurationType);
            }
            final Integer _tmpDurationValue;
            if (_cursor.isNull(_cursorIndexOfDurationValue)) {
              _tmpDurationValue = null;
            } else {
              _tmpDurationValue = _cursor.getInt(_cursorIndexOfDurationValue);
            }
            final String _tmpCreatedAt;
            _tmpCreatedAt = _cursor.getString(_cursorIndexOfCreatedAt);
            final String _tmpParentGoalId;
            if (_cursor.isNull(_cursorIndexOfParentGoalId)) {
              _tmpParentGoalId = null;
            } else {
              _tmpParentGoalId = _cursor.getString(_cursorIndexOfParentGoalId);
            }
            final String _tmpStatus;
            _tmpStatus = _cursor.getString(_cursorIndexOfStatus);
            final long _tmpUpdatedAt;
            _tmpUpdatedAt = _cursor.getLong(_cursorIndexOfUpdatedAt);
            final String _tmpSyncStatus;
            _tmpSyncStatus = _cursor.getString(_cursorIndexOfSyncStatus);
            _item = new GoalEntity(_tmpId,_tmpName,_tmpDescription,_tmpColor,_tmpTagId,_tmpStartDate,_tmpEndDate,_tmpDuration,_tmpDurationType,_tmpDurationValue,_tmpCreatedAt,_tmpParentGoalId,_tmpStatus,_tmpUpdatedAt,_tmpSyncStatus);
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
  public Object getAll(final Continuation<? super List<GoalEntity>> $completion) {
    final String _sql = "SELECT * FROM goals WHERE syncStatus != 'pending_delete'";
    final RoomSQLiteQuery _statement = RoomSQLiteQuery.acquire(_sql, 0);
    final CancellationSignal _cancellationSignal = DBUtil.createCancellationSignal();
    return CoroutinesRoom.execute(__db, false, _cancellationSignal, new Callable<List<GoalEntity>>() {
      @Override
      @NonNull
      public List<GoalEntity> call() throws Exception {
        final Cursor _cursor = DBUtil.query(__db, _statement, false, null);
        try {
          final int _cursorIndexOfId = CursorUtil.getColumnIndexOrThrow(_cursor, "id");
          final int _cursorIndexOfName = CursorUtil.getColumnIndexOrThrow(_cursor, "name");
          final int _cursorIndexOfDescription = CursorUtil.getColumnIndexOrThrow(_cursor, "description");
          final int _cursorIndexOfColor = CursorUtil.getColumnIndexOrThrow(_cursor, "color");
          final int _cursorIndexOfTagId = CursorUtil.getColumnIndexOrThrow(_cursor, "tagId");
          final int _cursorIndexOfStartDate = CursorUtil.getColumnIndexOrThrow(_cursor, "startDate");
          final int _cursorIndexOfEndDate = CursorUtil.getColumnIndexOrThrow(_cursor, "endDate");
          final int _cursorIndexOfDuration = CursorUtil.getColumnIndexOrThrow(_cursor, "duration");
          final int _cursorIndexOfDurationType = CursorUtil.getColumnIndexOrThrow(_cursor, "durationType");
          final int _cursorIndexOfDurationValue = CursorUtil.getColumnIndexOrThrow(_cursor, "durationValue");
          final int _cursorIndexOfCreatedAt = CursorUtil.getColumnIndexOrThrow(_cursor, "createdAt");
          final int _cursorIndexOfParentGoalId = CursorUtil.getColumnIndexOrThrow(_cursor, "parentGoalId");
          final int _cursorIndexOfStatus = CursorUtil.getColumnIndexOrThrow(_cursor, "status");
          final int _cursorIndexOfUpdatedAt = CursorUtil.getColumnIndexOrThrow(_cursor, "updatedAt");
          final int _cursorIndexOfSyncStatus = CursorUtil.getColumnIndexOrThrow(_cursor, "syncStatus");
          final List<GoalEntity> _result = new ArrayList<GoalEntity>(_cursor.getCount());
          while (_cursor.moveToNext()) {
            final GoalEntity _item;
            final String _tmpId;
            _tmpId = _cursor.getString(_cursorIndexOfId);
            final String _tmpName;
            _tmpName = _cursor.getString(_cursorIndexOfName);
            final String _tmpDescription;
            _tmpDescription = _cursor.getString(_cursorIndexOfDescription);
            final String _tmpColor;
            _tmpColor = _cursor.getString(_cursorIndexOfColor);
            final String _tmpTagId;
            if (_cursor.isNull(_cursorIndexOfTagId)) {
              _tmpTagId = null;
            } else {
              _tmpTagId = _cursor.getString(_cursorIndexOfTagId);
            }
            final String _tmpStartDate;
            _tmpStartDate = _cursor.getString(_cursorIndexOfStartDate);
            final String _tmpEndDate;
            _tmpEndDate = _cursor.getString(_cursorIndexOfEndDate);
            final int _tmpDuration;
            _tmpDuration = _cursor.getInt(_cursorIndexOfDuration);
            final String _tmpDurationType;
            if (_cursor.isNull(_cursorIndexOfDurationType)) {
              _tmpDurationType = null;
            } else {
              _tmpDurationType = _cursor.getString(_cursorIndexOfDurationType);
            }
            final Integer _tmpDurationValue;
            if (_cursor.isNull(_cursorIndexOfDurationValue)) {
              _tmpDurationValue = null;
            } else {
              _tmpDurationValue = _cursor.getInt(_cursorIndexOfDurationValue);
            }
            final String _tmpCreatedAt;
            _tmpCreatedAt = _cursor.getString(_cursorIndexOfCreatedAt);
            final String _tmpParentGoalId;
            if (_cursor.isNull(_cursorIndexOfParentGoalId)) {
              _tmpParentGoalId = null;
            } else {
              _tmpParentGoalId = _cursor.getString(_cursorIndexOfParentGoalId);
            }
            final String _tmpStatus;
            _tmpStatus = _cursor.getString(_cursorIndexOfStatus);
            final long _tmpUpdatedAt;
            _tmpUpdatedAt = _cursor.getLong(_cursorIndexOfUpdatedAt);
            final String _tmpSyncStatus;
            _tmpSyncStatus = _cursor.getString(_cursorIndexOfSyncStatus);
            _item = new GoalEntity(_tmpId,_tmpName,_tmpDescription,_tmpColor,_tmpTagId,_tmpStartDate,_tmpEndDate,_tmpDuration,_tmpDurationType,_tmpDurationValue,_tmpCreatedAt,_tmpParentGoalId,_tmpStatus,_tmpUpdatedAt,_tmpSyncStatus);
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
  public Object getById(final String id, final Continuation<? super GoalEntity> $completion) {
    final String _sql = "SELECT * FROM goals WHERE id = ? LIMIT 1";
    final RoomSQLiteQuery _statement = RoomSQLiteQuery.acquire(_sql, 1);
    int _argIndex = 1;
    _statement.bindString(_argIndex, id);
    final CancellationSignal _cancellationSignal = DBUtil.createCancellationSignal();
    return CoroutinesRoom.execute(__db, false, _cancellationSignal, new Callable<GoalEntity>() {
      @Override
      @Nullable
      public GoalEntity call() throws Exception {
        final Cursor _cursor = DBUtil.query(__db, _statement, false, null);
        try {
          final int _cursorIndexOfId = CursorUtil.getColumnIndexOrThrow(_cursor, "id");
          final int _cursorIndexOfName = CursorUtil.getColumnIndexOrThrow(_cursor, "name");
          final int _cursorIndexOfDescription = CursorUtil.getColumnIndexOrThrow(_cursor, "description");
          final int _cursorIndexOfColor = CursorUtil.getColumnIndexOrThrow(_cursor, "color");
          final int _cursorIndexOfTagId = CursorUtil.getColumnIndexOrThrow(_cursor, "tagId");
          final int _cursorIndexOfStartDate = CursorUtil.getColumnIndexOrThrow(_cursor, "startDate");
          final int _cursorIndexOfEndDate = CursorUtil.getColumnIndexOrThrow(_cursor, "endDate");
          final int _cursorIndexOfDuration = CursorUtil.getColumnIndexOrThrow(_cursor, "duration");
          final int _cursorIndexOfDurationType = CursorUtil.getColumnIndexOrThrow(_cursor, "durationType");
          final int _cursorIndexOfDurationValue = CursorUtil.getColumnIndexOrThrow(_cursor, "durationValue");
          final int _cursorIndexOfCreatedAt = CursorUtil.getColumnIndexOrThrow(_cursor, "createdAt");
          final int _cursorIndexOfParentGoalId = CursorUtil.getColumnIndexOrThrow(_cursor, "parentGoalId");
          final int _cursorIndexOfStatus = CursorUtil.getColumnIndexOrThrow(_cursor, "status");
          final int _cursorIndexOfUpdatedAt = CursorUtil.getColumnIndexOrThrow(_cursor, "updatedAt");
          final int _cursorIndexOfSyncStatus = CursorUtil.getColumnIndexOrThrow(_cursor, "syncStatus");
          final GoalEntity _result;
          if (_cursor.moveToFirst()) {
            final String _tmpId;
            _tmpId = _cursor.getString(_cursorIndexOfId);
            final String _tmpName;
            _tmpName = _cursor.getString(_cursorIndexOfName);
            final String _tmpDescription;
            _tmpDescription = _cursor.getString(_cursorIndexOfDescription);
            final String _tmpColor;
            _tmpColor = _cursor.getString(_cursorIndexOfColor);
            final String _tmpTagId;
            if (_cursor.isNull(_cursorIndexOfTagId)) {
              _tmpTagId = null;
            } else {
              _tmpTagId = _cursor.getString(_cursorIndexOfTagId);
            }
            final String _tmpStartDate;
            _tmpStartDate = _cursor.getString(_cursorIndexOfStartDate);
            final String _tmpEndDate;
            _tmpEndDate = _cursor.getString(_cursorIndexOfEndDate);
            final int _tmpDuration;
            _tmpDuration = _cursor.getInt(_cursorIndexOfDuration);
            final String _tmpDurationType;
            if (_cursor.isNull(_cursorIndexOfDurationType)) {
              _tmpDurationType = null;
            } else {
              _tmpDurationType = _cursor.getString(_cursorIndexOfDurationType);
            }
            final Integer _tmpDurationValue;
            if (_cursor.isNull(_cursorIndexOfDurationValue)) {
              _tmpDurationValue = null;
            } else {
              _tmpDurationValue = _cursor.getInt(_cursorIndexOfDurationValue);
            }
            final String _tmpCreatedAt;
            _tmpCreatedAt = _cursor.getString(_cursorIndexOfCreatedAt);
            final String _tmpParentGoalId;
            if (_cursor.isNull(_cursorIndexOfParentGoalId)) {
              _tmpParentGoalId = null;
            } else {
              _tmpParentGoalId = _cursor.getString(_cursorIndexOfParentGoalId);
            }
            final String _tmpStatus;
            _tmpStatus = _cursor.getString(_cursorIndexOfStatus);
            final long _tmpUpdatedAt;
            _tmpUpdatedAt = _cursor.getLong(_cursorIndexOfUpdatedAt);
            final String _tmpSyncStatus;
            _tmpSyncStatus = _cursor.getString(_cursorIndexOfSyncStatus);
            _result = new GoalEntity(_tmpId,_tmpName,_tmpDescription,_tmpColor,_tmpTagId,_tmpStartDate,_tmpEndDate,_tmpDuration,_tmpDurationType,_tmpDurationValue,_tmpCreatedAt,_tmpParentGoalId,_tmpStatus,_tmpUpdatedAt,_tmpSyncStatus);
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
  public Object getPending(final Continuation<? super List<GoalEntity>> $completion) {
    final String _sql = "SELECT * FROM goals WHERE syncStatus != 'synced'";
    final RoomSQLiteQuery _statement = RoomSQLiteQuery.acquire(_sql, 0);
    final CancellationSignal _cancellationSignal = DBUtil.createCancellationSignal();
    return CoroutinesRoom.execute(__db, false, _cancellationSignal, new Callable<List<GoalEntity>>() {
      @Override
      @NonNull
      public List<GoalEntity> call() throws Exception {
        final Cursor _cursor = DBUtil.query(__db, _statement, false, null);
        try {
          final int _cursorIndexOfId = CursorUtil.getColumnIndexOrThrow(_cursor, "id");
          final int _cursorIndexOfName = CursorUtil.getColumnIndexOrThrow(_cursor, "name");
          final int _cursorIndexOfDescription = CursorUtil.getColumnIndexOrThrow(_cursor, "description");
          final int _cursorIndexOfColor = CursorUtil.getColumnIndexOrThrow(_cursor, "color");
          final int _cursorIndexOfTagId = CursorUtil.getColumnIndexOrThrow(_cursor, "tagId");
          final int _cursorIndexOfStartDate = CursorUtil.getColumnIndexOrThrow(_cursor, "startDate");
          final int _cursorIndexOfEndDate = CursorUtil.getColumnIndexOrThrow(_cursor, "endDate");
          final int _cursorIndexOfDuration = CursorUtil.getColumnIndexOrThrow(_cursor, "duration");
          final int _cursorIndexOfDurationType = CursorUtil.getColumnIndexOrThrow(_cursor, "durationType");
          final int _cursorIndexOfDurationValue = CursorUtil.getColumnIndexOrThrow(_cursor, "durationValue");
          final int _cursorIndexOfCreatedAt = CursorUtil.getColumnIndexOrThrow(_cursor, "createdAt");
          final int _cursorIndexOfParentGoalId = CursorUtil.getColumnIndexOrThrow(_cursor, "parentGoalId");
          final int _cursorIndexOfStatus = CursorUtil.getColumnIndexOrThrow(_cursor, "status");
          final int _cursorIndexOfUpdatedAt = CursorUtil.getColumnIndexOrThrow(_cursor, "updatedAt");
          final int _cursorIndexOfSyncStatus = CursorUtil.getColumnIndexOrThrow(_cursor, "syncStatus");
          final List<GoalEntity> _result = new ArrayList<GoalEntity>(_cursor.getCount());
          while (_cursor.moveToNext()) {
            final GoalEntity _item;
            final String _tmpId;
            _tmpId = _cursor.getString(_cursorIndexOfId);
            final String _tmpName;
            _tmpName = _cursor.getString(_cursorIndexOfName);
            final String _tmpDescription;
            _tmpDescription = _cursor.getString(_cursorIndexOfDescription);
            final String _tmpColor;
            _tmpColor = _cursor.getString(_cursorIndexOfColor);
            final String _tmpTagId;
            if (_cursor.isNull(_cursorIndexOfTagId)) {
              _tmpTagId = null;
            } else {
              _tmpTagId = _cursor.getString(_cursorIndexOfTagId);
            }
            final String _tmpStartDate;
            _tmpStartDate = _cursor.getString(_cursorIndexOfStartDate);
            final String _tmpEndDate;
            _tmpEndDate = _cursor.getString(_cursorIndexOfEndDate);
            final int _tmpDuration;
            _tmpDuration = _cursor.getInt(_cursorIndexOfDuration);
            final String _tmpDurationType;
            if (_cursor.isNull(_cursorIndexOfDurationType)) {
              _tmpDurationType = null;
            } else {
              _tmpDurationType = _cursor.getString(_cursorIndexOfDurationType);
            }
            final Integer _tmpDurationValue;
            if (_cursor.isNull(_cursorIndexOfDurationValue)) {
              _tmpDurationValue = null;
            } else {
              _tmpDurationValue = _cursor.getInt(_cursorIndexOfDurationValue);
            }
            final String _tmpCreatedAt;
            _tmpCreatedAt = _cursor.getString(_cursorIndexOfCreatedAt);
            final String _tmpParentGoalId;
            if (_cursor.isNull(_cursorIndexOfParentGoalId)) {
              _tmpParentGoalId = null;
            } else {
              _tmpParentGoalId = _cursor.getString(_cursorIndexOfParentGoalId);
            }
            final String _tmpStatus;
            _tmpStatus = _cursor.getString(_cursorIndexOfStatus);
            final long _tmpUpdatedAt;
            _tmpUpdatedAt = _cursor.getLong(_cursorIndexOfUpdatedAt);
            final String _tmpSyncStatus;
            _tmpSyncStatus = _cursor.getString(_cursorIndexOfSyncStatus);
            _item = new GoalEntity(_tmpId,_tmpName,_tmpDescription,_tmpColor,_tmpTagId,_tmpStartDate,_tmpEndDate,_tmpDuration,_tmpDurationType,_tmpDurationValue,_tmpCreatedAt,_tmpParentGoalId,_tmpStatus,_tmpUpdatedAt,_tmpSyncStatus);
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
