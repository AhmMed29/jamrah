using Jamrah.Backend.Data;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

var dbPath = Environment.GetEnvironmentVariable("DATABASE_PATH")
    ?? builder.Configuration.GetConnectionString("DefaultConnection")
    ?? "Data Source=jamrah.db";

if (!dbPath.StartsWith("Data Source="))
    dbPath = "Data Source=" + dbPath;

// SQLite cannot create missing parent directories itself; without this a
// first run on a clean machine dies with SQLITE_CANTOPEN before migrations.
var dataSource = new SqliteConnectionStringBuilder(dbPath).DataSource;
if (dataSource != ":memory:")
{
    var dbDir = Path.GetDirectoryName(Path.GetFullPath(dataSource));
    if (!string.IsNullOrEmpty(dbDir))
        Directory.CreateDirectory(dbDir);
}

builder.Services.AddControllers()
    .AddJsonOptions(opts =>
    {
        opts.JsonSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
        opts.JsonSerializerOptions.DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull;
        // safety net alongside [JsonIgnore]d navs: EF relationship fixup can
        // otherwise turn any list response into an object cycle -> 500
        opts.JsonSerializerOptions.ReferenceHandler = System.Text.Json.Serialization.ReferenceHandler.IgnoreCycles;
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

    var conn = ctx.Database.GetDbConnection();
    conn.Open();

    long userTables;
    using (var cmd = conn.CreateCommand())
    {
        cmd.CommandText = "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name <> '__EFMigrationsHistory'";
        userTables = (long)cmd.ExecuteScalar()!;
    }

    if (userTables > 0)
    {
        // Pre-existing DB: either a legacy Node-era file (has the core tables
        // but no migration history) or one bootstrapped by an older version of
        // this startup code that baselined InitialCreate without ever creating
        // all of its tables. CREATE IF NOT EXISTS fills every gap, then the
        // baseline row makes Migrate() treat InitialCreate as applied so it
        // never collides with tables that already exist.
        string[] repairSql = [
            """
            CREATE TABLE IF NOT EXISTS "settings" (
                "key" TEXT NOT NULL CONSTRAINT "PK_settings" PRIMARY KEY,
                "value" TEXT NOT NULL)
            """,
            """
            CREATE TABLE IF NOT EXISTS "tags" (
                "id" TEXT NOT NULL CONSTRAINT "PK_tags" PRIMARY KEY,
                "name" TEXT NOT NULL,
                "color" TEXT NOT NULL,
                "createdAt" INTEGER NOT NULL)
            """,
            """
            CREATE TABLE IF NOT EXISTS "habits" (
                "id" TEXT NOT NULL CONSTRAINT "PK_habits" PRIMARY KEY,
                "name" TEXT NOT NULL,
                "color" TEXT NOT NULL DEFAULT '#3b82f6',
                "sortOrder" INTEGER NOT NULL DEFAULT 0,
                "createdAt" TEXT NOT NULL DEFAULT (datetime('now')),
                "durationType" TEXT NOT NULL DEFAULT 'yearly',
                "durationStart" TEXT NULL,
                "durationEnd" TEXT NULL)
            """,
            """
            CREATE TABLE IF NOT EXISTS "habit_logs" (
                "id" INTEGER NOT NULL CONSTRAINT "PK_habit_logs" PRIMARY KEY AUTOINCREMENT,
                "habitId" TEXT NOT NULL,
                "date" TEXT NOT NULL,
                "value" INTEGER NOT NULL DEFAULT 1,
                "createdAt" TEXT NOT NULL DEFAULT (datetime('now')),
                CONSTRAINT "FK_habit_logs_habits_habitId" FOREIGN KEY ("habitId") REFERENCES "habits" ("id") ON DELETE CASCADE)
            """,
            """
            CREATE TABLE IF NOT EXISTS "goals" (
                "id" TEXT NOT NULL CONSTRAINT "PK_goals" PRIMARY KEY,
                "name" TEXT NOT NULL,
                "description" TEXT NOT NULL DEFAULT '',
                "color" TEXT NOT NULL,
                "tagId" TEXT NULL,
                "startDate" TEXT NOT NULL,
                "endDate" TEXT NOT NULL,
                "duration" INTEGER NOT NULL,
                "createdAt" TEXT NOT NULL DEFAULT (datetime('now')),
                "parentGoalId" TEXT NULL,
                CONSTRAINT "FK_goals_goals_parentGoalId" FOREIGN KEY ("parentGoalId") REFERENCES "goals" ("id") ON DELETE SET NULL,
                CONSTRAINT "FK_goals_tags_tagId" FOREIGN KEY ("tagId") REFERENCES "tags" ("id") ON DELETE SET NULL)
            """,
            """
            CREATE TABLE IF NOT EXISTS "goal_progress" (
                "id" INTEGER NOT NULL CONSTRAINT "PK_goal_progress" PRIMARY KEY AUTOINCREMENT,
                "goalId" TEXT NOT NULL,
                "date" TEXT NOT NULL,
                "progressValue" REAL NOT NULL DEFAULT 0.0,
                "focusMinutes" REAL NOT NULL DEFAULT 0.0,
                CONSTRAINT "FK_goal_progress_goals_goalId" FOREIGN KEY ("goalId") REFERENCES "goals" ("id") ON DELETE CASCADE)
            """,
            """
            CREATE TABLE IF NOT EXISTS "sessions" (
                "id" TEXT NOT NULL CONSTRAINT "PK_sessions" PRIMARY KEY,
                "startTime" INTEGER NOT NULL,
                "endTime" INTEGER NOT NULL,
                "plannedMinutes" REAL NOT NULL,
                "focusMinutes" REAL NOT NULL,
                "taskName" TEXT NOT NULL DEFAULT '',
                "note" TEXT NOT NULL DEFAULT '',
                "tagId" TEXT NULL,
                "createdAt" INTEGER NOT NULL,
                "taskId" TEXT NULL,
                "goalId" TEXT NULL,
                CONSTRAINT "FK_sessions_goals_goalId" FOREIGN KEY ("goalId") REFERENCES "goals" ("id") ON DELETE SET NULL,
                CONSTRAINT "FK_sessions_tags_tagId" FOREIGN KEY ("tagId") REFERENCES "tags" ("id") ON DELETE SET NULL)
            """,
            """
            CREATE TABLE IF NOT EXISTS "tasks" (
                "id" TEXT NOT NULL CONSTRAINT "PK_tasks" PRIMARY KEY,
                "name" TEXT NOT NULL,
                "goalId" TEXT NULL,
                "completed" INTEGER NOT NULL DEFAULT 0,
                "createdAt" TEXT NOT NULL DEFAULT (datetime('now')),
                "parentTaskId" TEXT NULL,
                CONSTRAINT "FK_tasks_goals_goalId" FOREIGN KEY ("goalId") REFERENCES "goals" ("id") ON DELETE SET NULL,
                CONSTRAINT "FK_tasks_tasks_parentTaskId" FOREIGN KEY ("parentTaskId") REFERENCES "tasks" ("id") ON DELETE SET NULL)
            """,
        ];

        foreach (var sql in repairSql)
            ctx.Database.ExecuteSqlRaw(sql);

        // Columns that pre-migration schema versions lack; each throws
        // "duplicate column name" (harmless) when it is already there.
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

        string[] repairIndexes = [
            "CREATE INDEX IF NOT EXISTS IX_habit_logs_date ON habit_logs(date)",
            "CREATE INDEX IF NOT EXISTS IX_habit_logs_habitId ON habit_logs(habitId)",
            "CREATE UNIQUE INDEX IF NOT EXISTS IX_habit_logs_habitId_date ON habit_logs(habitId, date)",
            "CREATE INDEX IF NOT EXISTS IX_goals_parentGoalId ON goals(parentGoalId)",
            "CREATE INDEX IF NOT EXISTS IX_goals_tagId ON goals(tagId)",
            "CREATE INDEX IF NOT EXISTS IX_goal_progress_date ON goal_progress(date)",
            "CREATE INDEX IF NOT EXISTS IX_goal_progress_goalId ON goal_progress(goalId)",
            "CREATE INDEX IF NOT EXISTS IX_sessions_goalId ON sessions(goalId)",
            "CREATE INDEX IF NOT EXISTS IX_sessions_tagId ON sessions(tagId)",
            "CREATE INDEX IF NOT EXISTS IX_sessions_taskId ON sessions(taskId)",
            "CREATE INDEX IF NOT EXISTS IX_tasks_goalId ON tasks(goalId)",
            "CREATE INDEX IF NOT EXISTS IX_tasks_parentTaskId ON tasks(parentTaskId)",
        ];

        foreach (var sql in repairIndexes)
            ctx.Database.ExecuteSqlRaw(sql);

        ctx.Database.ExecuteSqlRaw(
            """
            CREATE TABLE IF NOT EXISTS "__EFMigrationsHistory" (
                "MigrationId" TEXT NOT NULL CONSTRAINT "PK___EFMigrationsHistory" PRIMARY KEY,
                "ProductVersion" TEXT NOT NULL)
            """);
        ctx.Database.ExecuteSqlRaw(
            "INSERT OR IGNORE INTO __EFMigrationsHistory (MigrationId, ProductVersion) VALUES ('20260702143902_InitialCreate', '9.0.0')");
    }

    // Fresh DB: applies InitialCreate and creates everything in one go.
    // Repaired DB: InitialCreate is baselined above, so only newer migrations run.
    ctx.Database.Migrate();
}

app.UseCors();
app.MapControllers();

app.Run();
