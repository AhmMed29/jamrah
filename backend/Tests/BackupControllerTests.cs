using System.Net.Http.Json;
using System.Text.Json;
using Jamrah.Backend.Data;
using Jamrah.Backend.Entities;
using Jamrah.Backend.Tests.Setup;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace Jamrah.Backend.Tests;

public class BackupControllerTests : IDisposable
{
    private readonly TestWebFactory _factory;
    private readonly HttpClient _client;
    private readonly List<string> _tempFiles = new();
    private static readonly JsonSerializerOptions JsonOpts = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
    };

    public BackupControllerTests()
    {
        _factory = new TestWebFactory();
        _client = _factory.CreateClient();
    }

    public void Dispose()
    {
        foreach (var f in _tempFiles)
        {
            try { if (File.Exists(f)) File.Delete(f); } catch { }
        }
        _client.Dispose();
        _factory.Dispose();
    }

    private const string AllTables = @"
        CREATE TABLE IF NOT EXISTS goals (
            id TEXT PRIMARY KEY, name TEXT, description TEXT, color TEXT,
            tagId TEXT, startDate TEXT, endDate TEXT, duration INTEGER,
            createdAt TEXT, parentGoalId TEXT
        );
        CREATE TABLE IF NOT EXISTS tasks (
            id TEXT PRIMARY KEY, name TEXT, goalId TEXT, completed INTEGER,
            createdAt TEXT, parentTaskId TEXT, priority TEXT DEFAULT 'none'
        );
        CREATE TABLE IF NOT EXISTS habits (
            id TEXT PRIMARY KEY, name TEXT, color TEXT, sortOrder INTEGER,
            createdAt TEXT, durationType TEXT, durationStart TEXT, durationEnd TEXT
        );
        CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY, value TEXT
        );
    ";

    private string CreateBackupFile(string insertSql)
    {
        var path = Path.Combine(Path.GetTempPath(), $"backup_{Guid.NewGuid():N}.db");
        using var conn = new SqliteConnection($"Data Source={path}");
        conn.Open();
        var c = conn.CreateCommand();
        c.CommandText = AllTables + insertSql;
        c.ExecuteNonQuery();
        conn.Close();
        _tempFiles.Add(path);
        return path;
    }

    [Fact]
    public async Task Restore_NewGoals_AddsToDb()
    {
        var backup = CreateBackupFile(@"
            INSERT INTO goals VALUES ('bg1','Goal One','desc','#f00',NULL,'2026-01-01','2026-12-31',365,'now',NULL);
            INSERT INTO goals VALUES ('bg2','Goal Two','','#0f0',NULL,'2026-01-01','2026-12-31',365,'now',NULL);
        ");

        var request = new { files = new[] { backup } };
        var response = await _client.PostAsJsonAsync("/api/backup/restore", request);
        response.EnsureSuccessStatusCode();

        using var db = _factory.CreateDbContext();
        var goals = await db.Goals.ToListAsync();
        Assert.Equal(2, goals.Count);
        Assert.Contains(goals, g => g.Id == "bg1");
        Assert.Contains(goals, g => g.Id == "bg2");
    }

    [Fact]
    public async Task Restore_ExistingGoals_SkipsDuplicates()
    {
        using (var seedDb = _factory.CreateDbContext())
        {
            seedDb.Goals.Add(new Goal
            {
                Id = "existing1", Name = "Existing", Color = "#fff",
                StartDate = "2026-01-01", EndDate = "2026-12-31", Duration = 365,
                CreatedAt = "2026-01-01", Description = ""
            });
            await seedDb.SaveChangesAsync();
        }

        var backup = CreateBackupFile(@"
            INSERT INTO goals VALUES ('existing1','Existing','desc','#fff',NULL,'2026-01-01','2026-12-31',365,'now',NULL);
            INSERT INTO goals VALUES ('new1','New Goal','','#00f',NULL,'2026-01-01','2026-12-31',365,'now',NULL);
        ");

        var request = new { files = new[] { backup } };
        var response = await _client.PostAsJsonAsync("/api/backup/restore", request);
        response.EnsureSuccessStatusCode();

        using var db = _factory.CreateDbContext();
        var goals = await db.Goals.ToListAsync();
        Assert.Equal(2, goals.Count);
        Assert.Contains(goals, g => g.Id == "new1");
    }

    [Fact]
    public async Task Restore_NewTasks_AddsToDb()
    {
        var backup = CreateBackupFile(@"
            INSERT INTO tasks VALUES ('t1','Task A',NULL,0,'now',NULL,'high');
            INSERT INTO tasks VALUES ('t2','Task B',NULL,0,'now',NULL,'low');
        ");

        var request = new { files = new[] { backup } };
        var response = await _client.PostAsJsonAsync("/api/backup/restore", request);
        response.EnsureSuccessStatusCode();

        using var db = _factory.CreateDbContext();
        var tasks = await db.TaskItems.ToListAsync();
        Assert.Equal(2, tasks.Count);
        Assert.Contains(tasks, t => t.Name == "Task A");
        Assert.Contains(tasks, t => t.Name == "Task B");
    }

    [Fact]
    public async Task Restore_NewHabits_AddsToDb()
    {
        var backup = CreateBackupFile(@"
            INSERT INTO habits VALUES ('h1','Exercise','#ff6600',0,'now','daily',NULL,NULL);
            INSERT INTO habits VALUES ('h2','Read','#3366ff',1,'now','daily',NULL,NULL);
        ");

        var request = new { files = new[] { backup } };
        var response = await _client.PostAsJsonAsync("/api/backup/restore", request);
        response.EnsureSuccessStatusCode();

        using var db = _factory.CreateDbContext();
        var habits = await db.Habits.ToListAsync();
        Assert.Equal(2, habits.Count);
        Assert.Contains(habits, h => h.Name == "Exercise");
        Assert.Contains(habits, h => h.Name == "Read");
    }

    [Fact]
    public async Task Restore_NewSettings_AddsToDb()
    {
        var backup = CreateBackupFile(@"
            INSERT INTO settings VALUES ('theme','dark');
            INSERT INTO settings VALUES ('volume','0.8');
        ");

        var request = new { files = new[] { backup } };
        var response = await _client.PostAsJsonAsync("/api/backup/restore", request);
        response.EnsureSuccessStatusCode();

        using var db = _factory.CreateDbContext();
        var settings = await db.Settings.ToListAsync();
        Assert.Equal(2, settings.Count);
        Assert.Contains(settings, s => s.Key == "theme" && s.Value == "dark");
        Assert.Contains(settings, s => s.Key == "volume" && s.Value == "0.8");
    }

    [Fact]
    public async Task Restore_MixedData_AddsAndSkips()
    {
        using (var seedDb = _factory.CreateDbContext())
        {
            seedDb.Goals.Add(new Goal
            {
                Id = "g_existing", Name = "Existing Goal", Color = "#ccc",
                StartDate = "2026-01-01", EndDate = "2026-12-31", Duration = 365,
                CreatedAt = "2026-01-01", Description = ""
            });
            await seedDb.SaveChangesAsync();
        }

        var backup = CreateBackupFile(@"
            INSERT INTO goals VALUES ('g_existing','Existing Goal','','#ccc',NULL,'2026-01-01','2026-12-31',365,'now',NULL);
            INSERT INTO goals VALUES ('g_new','New Goal','','#fff',NULL,'2026-01-01','2026-12-31',365,'now',NULL);
            INSERT INTO tasks VALUES ('t_new','New Task',NULL,0,'now',NULL,'medium');
            INSERT INTO habits VALUES ('h_new','New Habit','#ff0000',0,'now','daily',NULL,NULL);
            INSERT INTO settings VALUES ('lang','en');
        ");

        var request = new { files = new[] { backup } };
        var response = await _client.PostAsJsonAsync("/api/backup/restore", request);
        response.EnsureSuccessStatusCode();

        using var db = _factory.CreateDbContext();
        Assert.Single(await db.Goals.Where(g => g.Id == "g_new").ToListAsync());
        Assert.Single(await db.TaskItems.Where(t => t.Id == "t_new").ToListAsync());
        Assert.Single(await db.Habits.Where(h => h.Id == "h_new").ToListAsync());
        Assert.Single(await db.Settings.Where(s => s.Key == "lang").ToListAsync());

        var responseData = await response.Content.ReadFromJsonAsync<JsonElement>(JsonOpts);
        var log = responseData.GetProperty("log").EnumerateArray().ToList();
        var summary = log.Last();
        var added = summary.GetProperty("added").GetInt32();
        var skipped = summary.GetProperty("skipped").GetInt32();
        Assert.Equal(4, added);
        Assert.Equal(1, skipped);
    }

    [Fact]
    public async Task Restore_InvalidFile_Skips()
    {
        var request = new { files = new[] { @"C:\nonexistent\backup.db" } };
        var response = await _client.PostAsJsonAsync("/api/backup/restore", request);
        response.EnsureSuccessStatusCode();

        var responseData = await response.Content.ReadFromJsonAsync<JsonElement>(JsonOpts);
        var log = responseData.GetProperty("log").EnumerateArray().ToList();
        var summary = log.Last();
        Assert.Equal(0, summary.GetProperty("added").GetInt32());
        Assert.Equal(0, summary.GetProperty("skipped").GetInt32());
    }

    [Fact]
    public async Task Restore_MultipleFiles_ProcessesBoth()
    {
        var backup1 = CreateBackupFile(@"
            INSERT INTO goals VALUES ('mf1','From File 1','','#f00',NULL,'2026-01-01','2026-12-31',365,'now',NULL);
        ");

        var backup2 = CreateBackupFile(@"
            INSERT INTO goals VALUES ('mf2','From File 2','','#0f0',NULL,'2026-01-01','2026-12-31',365,'now',NULL);
        ");

        var request = new { files = new[] { backup1, backup2 } };
        var response = await _client.PostAsJsonAsync("/api/backup/restore", request);
        response.EnsureSuccessStatusCode();

        using var db = _factory.CreateDbContext();
        var goals = await db.Goals.ToListAsync();
        Assert.Contains(goals, g => g.Id == "mf1");
        Assert.Contains(goals, g => g.Id == "mf2");

        var responseData = await response.Content.ReadFromJsonAsync<JsonElement>(JsonOpts);
        var log = responseData.GetProperty("log").EnumerateArray().ToList();
        var summary = log.Last();
        Assert.Equal(2, summary.GetProperty("added").GetInt32());
        Assert.Equal(0, summary.GetProperty("skipped").GetInt32());
    }
}
