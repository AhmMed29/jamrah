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
    });

builder.Services.AddDbContext<AppDbContext>(opts =>
{
    opts.UseSqlite(dbPath);
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

    // Create tables that the old DB might be missing (habits, habit_logs)
    string[] createMissingTables = [
        "CREATE TABLE IF NOT EXISTS habits (id TEXT NOT NULL CONSTRAINT PK_habits PRIMARY KEY, name TEXT NOT NULL, color TEXT NOT NULL DEFAULT '#3b82f6', sortOrder INTEGER NOT NULL DEFAULT 0, createdAt TEXT NOT NULL DEFAULT (datetime('now')), durationType TEXT NOT NULL DEFAULT 'yearly', durationStart TEXT NULL, durationEnd TEXT NULL)",
        "CREATE TABLE IF NOT EXISTS habit_logs (id INTEGER NOT NULL CONSTRAINT PK_habit_logs PRIMARY KEY AUTOINCREMENT, habitId TEXT NOT NULL, date TEXT NOT NULL, value INTEGER NOT NULL DEFAULT 1, createdAt TEXT NOT NULL DEFAULT (datetime('now')))",
        "CREATE UNIQUE INDEX IF NOT EXISTS IX_habit_logs_habitId_date ON habit_logs(habitId, date)",
        "CREATE INDEX IF NOT EXISTS IX_habit_logs_habitId ON habit_logs(habitId)",
        "CREATE INDEX IF NOT EXISTS IX_habit_logs_date ON habit_logs(date)",
    ];

    foreach (var sql in createMissingTables)
    {
        try { ctx.Database.ExecuteSqlRaw(sql); }
        catch (SqliteException) { }
    }

    // Add columns that older schema versions might be missing
    string[] legacyColumns = [
        "ALTER TABLE sessions ADD COLUMN taskId TEXT",
        "ALTER TABLE sessions ADD COLUMN goalId TEXT",
        "ALTER TABLE goals ADD COLUMN parentGoalId TEXT",
        "ALTER TABLE tasks ADD COLUMN parentTaskId TEXT",
        "ALTER TABLE habits ADD COLUMN sortOrder INTEGER NOT NULL DEFAULT 0",
        "ALTER TABLE habits ADD COLUMN durationType TEXT NOT NULL DEFAULT 'yearly'",
        "ALTER TABLE habits ADD COLUMN durationStart TEXT",
        "ALTER TABLE habits ADD COLUMN durationEnd TEXT",
    ];

    foreach (var sql in legacyColumns)
    {
        try { ctx.Database.ExecuteSqlRaw(sql); }
        catch (SqliteException) { }
    }

    string[] legacyIndexes = [
        "CREATE INDEX IF NOT EXISTS IX_sessions_taskId ON sessions(taskId)",
        "CREATE INDEX IF NOT EXISTS IX_sessions_goalId ON sessions(goalId)",
        "CREATE INDEX IF NOT EXISTS IX_goals_parentGoalId ON goals(parentGoalId)",
        "CREATE INDEX IF NOT EXISTS IX_tasks_parentTaskId ON tasks(parentTaskId)",
    ];

    foreach (var sql in legacyIndexes)
    {
        try { ctx.Database.ExecuteSqlRaw(sql); }
        catch (SqliteException) { }
    }

    try
    {
        ctx.Database.Migrate();
    }
    catch (SqliteException ex) when (ex.SqliteErrorCode == 1)
    {
        ctx.Database.ExecuteSqlRaw(
            "INSERT OR IGNORE INTO __EFMigrationsHistory (MigrationId, ProductVersion) VALUES ('20260702143902_InitialCreate', '9.0.0')");
    }
}

app.UseCors();
app.MapControllers();

app.Run();
