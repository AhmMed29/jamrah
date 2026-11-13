using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Linq;
using Jamrah.Core.Entities;
using Microsoft.Maui.Storage;
using SQLite;

namespace Jamrah.Infrastructure
{
    /// <summary>
    /// One-time recovery of data written by Jamrah 4.x. Windows unpackaged apps store
    /// their data under the application identity, so the 5.0 identity change left the
    /// old databases in the previous com.companyname.jamrah folder. This class copies
    /// missing rows into the current databases and keeps a backup of every destination
    /// database before it is touched.
    /// </summary>
    internal static class LegacyDataMigration
    {
#if WINDOWS
        private const string LegacyPackageName = "com.companyname.jamrah";
        private const string MarkerFileName = "legacy-import-5.0.3.done";

        private static readonly string[] LegacyDatabaseFiles =
        {
            "jamrah_tasks.db3",
            "jamrah_pomodoro.db3",
            "jamrah_calendar.db3",
            "jamrah_goals.db3",
            "prayer_times.db3"
        };

        public static void RunOnce()
        {
            string currentDir;
            try { currentDir = FileSystem.AppDataDirectory; }
            catch { return; }

            var marker = Path.Combine(currentDir, MarkerFileName);
            if (File.Exists(marker)) return;

            try
            {
                var legacyDir = FindLegacyDataDirectory();
                if (legacyDir is null)
                {
                    File.WriteAllText(marker, "No legacy data found at " + DateTime.Now.ToString("O"));
                    return;
                }

                var backupDir = Path.Combine(currentDir, "Backups",
                    "legacy-import-" + DateTime.Now.ToString("yyyyMMdd-HHmmss"));
                Directory.CreateDirectory(backupDir);

                ImportTasks(legacyDir, currentDir, backupDir);
                ImportPomodoro(legacyDir, currentDir, backupDir);
                ImportCalendar(legacyDir, currentDir, backupDir);
                ImportGoals(legacyDir, currentDir, backupDir);
                ImportPrayerTimes(legacyDir, currentDir, backupDir);
                ImportPlanningNote(legacyDir, currentDir);

                File.WriteAllText(marker,
                    "Imported legacy data from " + legacyDir + Environment.NewLine +
                    "Completed: " + DateTime.Now.ToString("O") + Environment.NewLine);
                Log(currentDir, "Legacy import complete -> " + legacyDir);
            }
            catch (Exception ex)
            {
                Log(currentDir, "Legacy import failed: " + ex);
            }
        }

        private static string? FindLegacyDataDirectory()
        {
            var localAppData = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
            if (string.IsNullOrWhiteSpace(localAppData)) return null;

            var candidates = new List<string>
            {
                Path.Combine(localAppData, LegacyPackageName, "Data")
            };

            try
            {
                foreach (var directory in Directory.EnumerateDirectories(localAppData))
                    candidates.Add(Path.Combine(directory, LegacyPackageName, "Data"));
            }
            catch
            {
                // Some LocalAppData entries can be inaccessible; the direct path is still checked.
            }

            foreach (var candidate in candidates)
            {
                if (!Directory.Exists(candidate)) continue;
                if (LegacyDatabaseFiles.Any(name => File.Exists(Path.Combine(candidate, name))))
                    return candidate;
            }

            return null;
        }

        private static void ImportTasks(string legacyDir, string currentDir, string backupDir)
        {
            var source = Path.Combine(legacyDir, "jamrah_tasks.db3");
            if (!File.Exists(source)) return;

            var target = Path.Combine(currentDir, "jamrah_tasks.db3");
            if (!File.Exists(target))
            {
                CopyDatabase(source, target);
                Log(currentDir, "tasks: copied legacy database");
                return;
            }

            BackupDatabase(target, backupDir);
            MergeDatabase(source, target, EnsureTaskSchema, db =>
            {
                db.Execute(@"INSERT OR IGNORE INTO TaskFolders (Id, Name, Color, CreatedAt)
                             SELECT Id, Name, Color, CreatedAt FROM legacy.TaskFolders;");

                db.Execute(@"INSERT OR IGNORE INTO KanbanColumns (Id, Title, ""Order"", CreatedAt)
                             SELECT l.Id, l.Title, l.""Order"", l.CreatedAt
                             FROM legacy.KanbanColumns l
                             WHERE EXISTS (
                                 SELECT 1 FROM legacy.TaskItems t WHERE t.ColumnId = l.Id);");

                db.Execute(@"INSERT OR IGNORE INTO TaskItems
                             (Id, Title, Priority, IsDone, DueDate, CreatedAt, UpdatedAt, ColumnId, FolderId,
                              IsRecurring, RecurrenceDays, ScheduledDate, ScheduledTime, EisenhowerQuadrant,
                              Notes, ArchivedAt, CompletedAt, TemplateId, ParentId, SortOrder, RowGroupId,
                              RecurrenceStartDate)
                             SELECT Id, Title, Priority, IsDone, DueDate, CreatedAt, UpdatedAt, ColumnId, FolderId,
                              IsRecurring, RecurrenceDays, ScheduledDate, ScheduledTime, EisenhowerQuadrant,
                              Notes, ArchivedAt, CompletedAt, TemplateId, ParentId, SortOrder, RowGroupId,
                              RecurrenceStartDate FROM legacy.TaskItems;");

                db.Execute(@"INSERT OR IGNORE INTO Settings (""Key"", Value, UpdatedAt)
                             SELECT ""Key"", Value, UpdatedAt FROM legacy.Settings;");
            });
            Log(currentDir, "tasks: merged legacy database");
        }

        private static void ImportPomodoro(string legacyDir, string currentDir, string backupDir)
        {
            var source = Path.Combine(legacyDir, "jamrah_pomodoro.db3");
            if (!File.Exists(source)) return;

            var target = Path.Combine(currentDir, "jamrah_pomodoro.db3");
            if (!File.Exists(target))
            {
                CopyDatabase(source, target);
                Log(currentDir, "pomodoro: copied legacy database");
                return;
            }

            BackupDatabase(target, backupDir);
            MergeDatabase(source, target, EnsurePomodoroSchema, db =>
            {
                db.Execute(@"INSERT INTO PomodoroTag (Name, Color, IsArchived, LastUsedTicks)
                             SELECT l.Name, l.Color, l.IsArchived, l.LastUsedTicks
                             FROM legacy.PomodoroTag l
                             WHERE NOT EXISTS (
                                 SELECT 1 FROM PomodoroTag t WHERE t.Name = l.Name);");

                db.Execute(@"INSERT OR IGNORE INTO PomodoroSession
                             (Id, Date, Time, Title, Note, PlannedMinutes, ElapsedSeconds, Completed,
                              TagId, TagName, TagColor, SoundFile, TaskId, TaskTitle, TaskDate)
                             SELECT l.Id, l.Date, l.Time, l.Title, l.Note, l.PlannedMinutes, l.ElapsedSeconds,
                              l.Completed,
                              (SELECT t.Id FROM PomodoroTag t WHERE t.Name = l.TagName ORDER BY t.Id LIMIT 1),
                              l.TagName, l.TagColor, l.SoundFile, l.TaskId, l.TaskTitle, l.TaskDate
                             FROM legacy.PomodoroSession l;");

                db.Execute(@"INSERT OR IGNORE INTO PomodoroTaskSegment
                             (Id, SessionId, TaskId, TaskTitle, TaskDate, Seconds)
                             SELECT Id, SessionId, TaskId, TaskTitle, TaskDate, Seconds
                             FROM legacy.PomodoroTaskSegment;");
            });
            Log(currentDir, "pomodoro: merged legacy database");
        }

        private static void ImportCalendar(string legacyDir, string currentDir, string backupDir)
        {
            var source = Path.Combine(legacyDir, "jamrah_calendar.db3");
            if (!File.Exists(source)) return;

            var target = Path.Combine(currentDir, "jamrah_calendar.db3");
            if (!File.Exists(target))
            {
                CopyDatabase(source, target);
                Log(currentDir, "calendar: copied legacy database");
                return;
            }

            BackupDatabase(target, backupDir);
            MergeDatabase(source, target, EnsureCalendarSchema, db =>
            {
                db.Execute(@"INSERT OR IGNORE INTO CalendarInfos
                             (Id, Name, Color, BackgroundColor, DragBackgroundColor, BorderColor, IsChecked)
                             SELECT Id, Name, Color, BackgroundColor, DragBackgroundColor, BorderColor, IsChecked
                             FROM legacy.CalendarInfos;");

                db.Execute(@"INSERT OR IGNORE INTO CalendarEvents
                             (Id, CalendarId, Title, Body, IsAllday, Start, ""End"", GoingDuration, ComingDuration,
                              Location, AttendeesJson, Category, DueDateClass, RecurrenceRule, State, IsVisible,
                              IsPending, IsFocused, IsReadOnly, IsPrivate, Color, BackgroundColor,
                              DragBackgroundColor, BorderColor, CustomStyleJson, Raw, CreatedAt, UpdatedAt,
                              RecurrenceId, OriginalOccurrenceDate, IsException, ExceptionDatesJson)
                             SELECT Id, CalendarId, Title, Body, IsAllday, Start, ""End"", GoingDuration,
                              ComingDuration, Location, AttendeesJson, Category, DueDateClass, RecurrenceRule,
                              State, IsVisible, IsPending, IsFocused, IsReadOnly, IsPrivate, Color,
                              BackgroundColor, DragBackgroundColor, BorderColor, CustomStyleJson, Raw, CreatedAt,
                              UpdatedAt, RecurrenceId, OriginalOccurrenceDate, IsException, ExceptionDatesJson
                             FROM legacy.CalendarEvents;");
            });
            Log(currentDir, "calendar: merged legacy database");
        }

        private static void ImportGoals(string legacyDir, string currentDir, string backupDir)
        {
            var source = Path.Combine(legacyDir, "jamrah_goals.db3");
            if (!File.Exists(source)) return;

            var target = Path.Combine(currentDir, "jamrah_goals.db3");
            if (!File.Exists(target))
            {
                CopyDatabase(source, target);
                Log(currentDir, "goals: copied legacy database");
                return;
            }

            BackupDatabase(target, backupDir);
            MergeDatabase(source, target, EnsureGoalSchema, db =>
            {
                db.Execute(@"INSERT OR IGNORE INTO GoalItems
                             (Id, Title, PomodoroTagId, TagName, TagColor, ExpectedValue, Unit, Recurrence,
                              StartDate, EndDate, CreatedAt, UpdatedAt, Kind, CompletionRule)
                             SELECT Id, Title, PomodoroTagId, TagName, TagColor, ExpectedValue, Unit, Recurrence,
                              StartDate, EndDate, CreatedAt, UpdatedAt, Kind, CompletionRule
                             FROM legacy.GoalItems;");

                db.Execute(@"INSERT OR IGNORE INTO GoalLogs
                             (Id, GoalId, ""Date"", ExpectedValue, AchievedValue, UpdatedAt)
                             SELECT Id, GoalId, ""Date"", ExpectedValue, AchievedValue, UpdatedAt
                             FROM legacy.GoalLogs;");
            });
            Log(currentDir, "goals: merged legacy database");
        }

        private static void ImportPrayerTimes(string legacyDir, string currentDir, string backupDir)
        {
            var source = Path.Combine(legacyDir, "prayer_times.db3");
            if (!File.Exists(source)) return;

            var target = Path.Combine(currentDir, "prayer_times.db3");
            if (!File.Exists(target))
            {
                CopyDatabase(source, target);
                Log(currentDir, "prayer times: copied legacy database");
                return;
            }

            BackupDatabase(target, backupDir);
            MergeDatabase(source, target,
                db => db.CreateTable<PrayerTimeEntry>(),
                db => db.Execute(@"INSERT OR IGNORE INTO PrayerTimes
                                   (DateKey, Fajr, Sunrise, Dhuhr, Asr, Maghrib, Isha, Latitude, Longitude, Method)
                                   SELECT DateKey, Fajr, Sunrise, Dhuhr, Asr, Maghrib, Isha, Latitude,
                                    Longitude, Method
                                   FROM legacy.PrayerTimes;"));
            Log(currentDir, "prayer times: merged legacy database");
        }

        private static void ImportPlanningNote(string legacyDir, string currentDir)
        {
            var source = Path.Combine(legacyDir, "Planning", "note.md");
            if (!File.Exists(source)) return;

            var target = Path.Combine(currentDir, "Planning", "note.md");
            if (File.Exists(target) && new FileInfo(target).Length > 0) return;

            Directory.CreateDirectory(Path.GetDirectoryName(target)!);
            File.Copy(source, target, true);
            Log(currentDir, "planning: copied legacy note");
        }

        private static void EnsureTaskSchema(SQLiteConnection db)
        {
            db.CreateTable<AppTask>();
            db.CreateTable<TaskFolder>();
            db.CreateTable<KanbanColumn>();
            db.CreateTable<Setting>();
            EnsureColumn(db, "TaskItems", "ParentId", "TEXT NOT NULL DEFAULT ''");
            EnsureColumn(db, "TaskItems", "SortOrder", "INTEGER NOT NULL DEFAULT 0");
            EnsureColumn(db, "TaskItems", "RowGroupId", "TEXT NOT NULL DEFAULT ''");
            EnsureColumn(db, "TaskItems", "RecurrenceStartDate", "INTEGER");
        }

        private static void EnsurePomodoroSchema(SQLiteConnection db)
        {
            db.CreateTable<Session>();
            db.CreateTable<Tag>();
            db.CreateTable<PomodoroTaskSegment>();
            EnsureColumn(db, "PomodoroTag", "IsArchived", "INTEGER NOT NULL DEFAULT 0");
            EnsureColumn(db, "PomodoroTag", "LastUsedTicks", "INTEGER NOT NULL DEFAULT 0");
            EnsureColumn(db, "PomodoroSession", "TaskId", "TEXT NOT NULL DEFAULT ''");
            EnsureColumn(db, "PomodoroSession", "TaskTitle", "TEXT NOT NULL DEFAULT ''");
            EnsureColumn(db, "PomodoroSession", "TaskDate", "TEXT NOT NULL DEFAULT ''");
        }

        private static void EnsureCalendarSchema(SQLiteConnection db)
        {
            db.CreateTable<CalendarEvent>();
            db.CreateTable<CalendarInfo>();
            EnsureColumn(db, "CalendarEvents", "RecurrenceId", "TEXT DEFAULT ''");
            EnsureColumn(db, "CalendarEvents", "OriginalOccurrenceDate", "TEXT DEFAULT ''");
            EnsureColumn(db, "CalendarEvents", "IsException", "INTEGER DEFAULT 0");
            EnsureColumn(db, "CalendarEvents", "ExceptionDatesJson", "TEXT DEFAULT '[]'");
        }

        private static void EnsureGoalSchema(SQLiteConnection db)
        {
            db.CreateTable<GoalItem>();
            db.CreateTable<GoalLog>();
            EnsureColumn(db, "GoalItems", "Kind", "TEXT NOT NULL DEFAULT 'amount'");
            EnsureColumn(db, "GoalItems", "CompletionRule", "TEXT");
        }

        private static void EnsureColumn(SQLiteConnection db, string table, string column, string definition)
        {
            var columns = db.Query<PragmaColumn>($"PRAGMA table_info([{table}])");
            if (columns.Count == 0) return;
            if (!columns.Any(c => string.Equals(c.Name, column, StringComparison.OrdinalIgnoreCase)))
                db.Execute($"ALTER TABLE [{table}] ADD COLUMN [{column}] {definition}");
        }

        private static void MergeDatabase(
            string sourcePath,
            string targetPath,
            Action<SQLiteConnection> ensureSchema,
            Action<SQLiteConnection> import)
        {
            var stagingDir = Path.Combine(Path.GetTempPath(), "jamrah-legacy-" + Guid.NewGuid().ToString("N"));
            Directory.CreateDirectory(stagingDir);
            try
            {
                var stagedSource = Path.Combine(stagingDir, Path.GetFileName(sourcePath));
                CopyDatabase(sourcePath, stagedSource);

                using (var sourceDb = new SQLiteConnection(stagedSource))
                {
                    sourceDb.ExecuteScalar<int>("PRAGMA busy_timeout = 5000");
                    ensureSchema(sourceDb);
                }

                using var targetDb = new SQLiteConnection(targetPath);
                targetDb.ExecuteScalar<int>("PRAGMA busy_timeout = 5000");
                ensureSchema(targetDb);

                targetDb.Execute($"ATTACH DATABASE '{EscapeSql(stagedSource)}' AS legacy");
                try
                {
                    import(targetDb);
                }
                finally
                {
                    targetDb.Execute("DETACH DATABASE legacy");
                }
            }
            finally
            {
                try { Directory.Delete(stagingDir, true); } catch { }
            }
        }

        private static void CopyDatabase(string source, string destination)
        {
            Directory.CreateDirectory(Path.GetDirectoryName(destination)!);
            File.Copy(source, destination, true);
            foreach (var suffix in new[] { "-wal", "-shm" })
            {
                var sidecar = source + suffix;
                if (File.Exists(sidecar))
                    File.Copy(sidecar, destination + suffix, true);
            }
        }

        private static void BackupDatabase(string databasePath, string backupDir)
        {
            if (!File.Exists(databasePath)) return;
            Directory.CreateDirectory(backupDir);
            CopyDatabase(databasePath, Path.Combine(backupDir, Path.GetFileName(databasePath)));
        }

        private static string EscapeSql(string value) => value.Replace("'", "''");

        private static void Log(string currentDir, string message)
        {
            Debug.WriteLine("[LegacyDataMigration] " + message);
            try
            {
                var directory = Path.Combine(currentDir, "Backups");
                Directory.CreateDirectory(directory);
                File.AppendAllText(Path.Combine(directory, "legacy-import.log"),
                    DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss") + " " + message + Environment.NewLine);
            }
            catch
            {
            }
        }

        private sealed class PragmaColumn
        {
            [Column("name")]
            public string Name { get; set; } = string.Empty;
        }
#else
        public static void RunOnce()
        {
        }
#endif
    }
}
