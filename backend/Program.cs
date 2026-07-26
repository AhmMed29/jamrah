using Jamrah.Backend.Data;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

var dbPath = Environment.GetEnvironmentVariable("DATABASE_PATH")
    ?? builder.Configuration.GetConnectionString("DefaultConnection")
    ?? "Data Source=jamrah.db";

if (!dbPath.StartsWith("Data Source="))
    dbPath = "Data Source=" + dbPath;

builder.Services.AddControllers()
    .AddJsonOptions(opts =>
    {
        opts.JsonSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
        opts.JsonSerializerOptions.DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull;
        opts.JsonSerializerOptions.ReferenceHandler = System.Text.Json.Serialization.ReferenceHandler.IgnoreCycles;
    });

builder.Services.AddDbContext<AppDbContext>(opts =>
{
    opts.UseSqlite(dbPath);
    opts.ConfigureWarnings(warnings => warnings.Ignore(Microsoft.EntityFrameworkCore.Diagnostics.RelationalEventId.PendingModelChangesWarning));
});

builder.Services.AddCors(opts =>
{
    opts.AddDefaultPolicy(policy =>
    {
        policy.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod();
    });
});

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var ctx = scope.ServiceProvider.GetRequiredService<AppDbContext>();

    // Checkpoint WAL into main db before migrations
    try { ctx.Database.ExecuteSqlRaw("PRAGMA wal_checkpoint(TRUNCATE)"); }
    catch { }

    // 1. Migrate FIRST — creates all EF Core model tables (settings, sessions, tags, goals, etc.)
    try
    {
        ctx.Database.Migrate();
    }
    catch (Exception ex)
    {
        Console.Error.WriteLine("[Migration] " + ex.Message);
        try {
            ctx.Database.ExecuteSqlRaw(
                "INSERT OR IGNORE INTO __EFMigrationsHistory (MigrationId, ProductVersion) VALUES ('20260702143902_InitialCreate', '9.0.0')");
        } catch (Exception) { }
    }

    // 2. Then create tables that older schema versions might be missing (habits, habit_logs)
    string[] createMissingTables = [
        "CREATE TABLE IF NOT EXISTS habits (id TEXT NOT NULL CONSTRAINT PK_habits PRIMARY KEY, name TEXT NOT NULL, color TEXT NOT NULL DEFAULT '#3b82f6', sortOrder INTEGER NOT NULL DEFAULT 0, createdAt TEXT NOT NULL DEFAULT (datetime('now')), durationType TEXT NOT NULL DEFAULT 'yearly', durationStart TEXT NULL, durationEnd TEXT NULL)",
        "CREATE TABLE IF NOT EXISTS habit_logs (id INTEGER NOT NULL CONSTRAINT PK_habit_logs PRIMARY KEY AUTOINCREMENT, habitId TEXT NOT NULL, date TEXT NOT NULL, value INTEGER NOT NULL DEFAULT 1, createdAt TEXT NOT NULL DEFAULT (datetime('now')))",
        "CREATE UNIQUE INDEX IF NOT EXISTS IX_habit_logs_habitId_date ON habit_logs(habitId, date)",
        "CREATE INDEX IF NOT EXISTS IX_habit_logs_habitId ON habit_logs(habitId)",
        "CREATE INDEX IF NOT EXISTS IX_habit_logs_date ON habit_logs(date)",
        "CREATE TABLE IF NOT EXISTS settings (key TEXT NOT NULL CONSTRAINT PK_settings PRIMARY KEY, value TEXT NOT NULL)",
        "CREATE TABLE IF NOT EXISTS tags (id TEXT NOT NULL CONSTRAINT PK_tags PRIMARY KEY, name TEXT NOT NULL, color TEXT NOT NULL, createdAt INTEGER NOT NULL)",
        "CREATE TABLE IF NOT EXISTS goals (id TEXT NOT NULL CONSTRAINT PK_goals PRIMARY KEY, name TEXT NOT NULL, description TEXT NOT NULL DEFAULT '', color TEXT NOT NULL, tagId TEXT, startDate TEXT NOT NULL, endDate TEXT NOT NULL, duration INTEGER NOT NULL, createdAt TEXT NOT NULL DEFAULT (datetime('now')), parentGoalId TEXT)",
        "CREATE TABLE IF NOT EXISTS goal_progress (id INTEGER NOT NULL CONSTRAINT PK_goal_progress PRIMARY KEY AUTOINCREMENT, goalId TEXT NOT NULL, date TEXT NOT NULL, progressValue REAL NOT NULL DEFAULT 0.0, focusMinutes REAL NOT NULL DEFAULT 0.0)",
        "CREATE TABLE IF NOT EXISTS sessions (id TEXT NOT NULL CONSTRAINT PK_sessions PRIMARY KEY, startTime INTEGER NOT NULL, endTime INTEGER NOT NULL, plannedMinutes REAL NOT NULL, focusMinutes REAL NOT NULL, taskName TEXT NOT NULL DEFAULT '', note TEXT NOT NULL DEFAULT '', tagId TEXT, createdAt INTEGER NOT NULL, taskId TEXT, goalId TEXT)",
        "CREATE TABLE IF NOT EXISTS tasks (id TEXT NOT NULL CONSTRAINT PK_tasks PRIMARY KEY, name TEXT NOT NULL, goalId TEXT, completed INTEGER NOT NULL DEFAULT 0, createdAt TEXT NOT NULL DEFAULT (datetime('now')), parentTaskId TEXT, priority TEXT NOT NULL DEFAULT 'none', recurrence TEXT, customDays TEXT, durationStart TEXT, durationEnd TEXT, notes TEXT)",
    ];

    foreach (var sql in createMissingTables)
    {
        try { ctx.Database.ExecuteSqlRaw(sql); }
        catch (Exception) { }
    }

    // 3. Add columns that older schema versions might be missing
    string[] legacyColumns = [
        "ALTER TABLE sessions ADD COLUMN taskId TEXT",
        "ALTER TABLE sessions ADD COLUMN goalId TEXT",
        "ALTER TABLE goals ADD COLUMN parentGoalId TEXT",
        "ALTER TABLE tasks ADD COLUMN parentTaskId TEXT",
        "ALTER TABLE habits ADD COLUMN sortOrder INTEGER NOT NULL DEFAULT 0",
        "ALTER TABLE habits ADD COLUMN durationType TEXT NOT NULL DEFAULT 'yearly'",
        "ALTER TABLE habits ADD COLUMN durationStart TEXT",
        "ALTER TABLE habits ADD COLUMN durationEnd TEXT",
        "ALTER TABLE tasks ADD COLUMN completedAt TEXT",
        "ALTER TABLE tasks ADD COLUMN scheduledTime TEXT",
        "ALTER TABLE tasks ADD COLUMN recurrence TEXT",
        "ALTER TABLE tasks ADD COLUMN customDays TEXT",
        "ALTER TABLE tasks ADD COLUMN durationStart TEXT",
        "ALTER TABLE tasks ADD COLUMN durationEnd TEXT",
        "ALTER TABLE tasks ADD COLUMN notes TEXT",
        "ALTER TABLE tasks ADD COLUMN updatedAt TEXT",
        "ALTER TABLE goals ADD COLUMN durationType TEXT",
        "ALTER TABLE goals ADD COLUMN durationValue INTEGER",
    ];

    foreach (var sql in legacyColumns)
    {
        try { ctx.Database.ExecuteSqlRaw(sql); }
        catch (Exception) { }
    }

    // 4. Add indexes that older schema versions might be missing
    string[] legacyIndexes = [
        "CREATE INDEX IF NOT EXISTS IX_sessions_taskId ON sessions(taskId)",
        "CREATE INDEX IF NOT EXISTS IX_sessions_goalId ON sessions(goalId)",
        "CREATE INDEX IF NOT EXISTS IX_goals_parentGoalId ON goals(parentGoalId)",
        "CREATE INDEX IF NOT EXISTS IX_tasks_parentTaskId ON tasks(parentTaskId)",
        "CREATE INDEX IF NOT EXISTS IX_goal_progress_date ON goal_progress(date)",
        "CREATE INDEX IF NOT EXISTS IX_goal_progress_goalId ON goal_progress(goalId)",
        "CREATE INDEX IF NOT EXISTS IX_goals_tagId ON goals(tagId)",
        "CREATE INDEX IF NOT EXISTS IX_sessions_tagId ON sessions(tagId)",
        "CREATE INDEX IF NOT EXISTS IX_tasks_goalId ON tasks(goalId)",
    ];

    foreach (var sql in legacyIndexes)
    {
        try { ctx.Database.ExecuteSqlRaw(sql); }
        catch (Exception) { }
    }
}

app.UseCors();
app.MapControllers();

app.Run();

public partial class Program { }
