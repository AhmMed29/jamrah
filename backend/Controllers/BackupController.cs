using Jamrah.Backend.Data;
using Jamrah.Backend.Entities;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;

namespace Jamrah.Backend.Controllers;

[ApiController]
[Route("api/backup")]
public class BackupController : ControllerBase
{
    private readonly AppDbContext _db;

    public BackupController(AppDbContext db) => _db = db;

    [HttpPost("restore")]
    public async Task<IActionResult> Restore([FromBody] RestoreBackupRequest request)
    {
        var log = new List<BackupLogEntry>();
        int totalAdded = 0, totalSkipped = 0;

        foreach (var filePath in request.Files)
        {
            if (!System.IO.File.Exists(filePath)) continue;

            log.Add(new BackupLogEntry { Type = "info", Message = $"Processing backup file: {filePath}" });

            var backupConn = new SqliteConnection($"Data Source={filePath}");
            await backupConn.OpenAsync();

            try
            {
                bool hasPriority = false;
                var pragma = backupConn.CreateCommand();
                pragma.CommandText = "PRAGMA table_info(tasks)";
                using (var r = await pragma.ExecuteReaderAsync())
                {
                    while (await r.ReadAsync())
                        if ((string)r["name"] == "priority") { hasPriority = true; break; }
                }

                // Restore goals
                var readGoals = backupConn.CreateCommand();
                readGoals.CommandText = "SELECT id, name, description, color, tagId, startDate, endDate, duration, createdAt, parentGoalId FROM goals";
                var goalCount = 0;
                using (var r = await readGoals.ExecuteReaderAsync())
                {
                    while (await r.ReadAsync())
                    {
                        var id = (string)r["id"];
                        if (await _db.Goals.AnyAsync(g => g.Id == id))
                        {
                            log.Add(new BackupLogEntry { Type = "goal", Id = id, Name = (string)r["name"], Status = "exists" });
                            totalSkipped++;
                            continue;
                        }
                        _db.Goals.Add(new Goal
                        {
                            Id = id,
                            Name = (string)r["name"],
                            Description = r["description"] as string ?? "",
                            Color = r["color"] as string ?? "",
                            TagId = r["tagId"] as string,
                            StartDate = r["startDate"] as string ?? "",
                            EndDate = r["endDate"] as string ?? "",
                            Duration = Convert.ToInt32(r["duration"]),
                            CreatedAt = r["createdAt"] as string ?? "",
                            ParentGoalId = r["parentGoalId"] as string
                        });
                        log.Add(new BackupLogEntry { Type = "goal", Id = id, Name = (string)r["name"], Status = "added" });
                        goalCount++;
                    }
                }
                if (goalCount > 0) await _db.SaveChangesAsync();
                totalAdded += goalCount;

                // Restore tasks
                var taskSql = hasPriority
                    ? "SELECT id, name, goalId, completed, createdAt, parentTaskId, priority FROM tasks"
                    : "SELECT id, name, goalId, completed, createdAt, parentTaskId, 'none' AS priority FROM tasks";
                var readTasks = backupConn.CreateCommand();
                readTasks.CommandText = taskSql;
                var taskCount = 0;
                using (var r = await readTasks.ExecuteReaderAsync())
                {
                    while (await r.ReadAsync())
                    {
                        var id = (string)r["id"];
                        if (await _db.TaskItems.AnyAsync(t => t.Id == id))
                        {
                            log.Add(new BackupLogEntry { Type = "task", Id = id, Name = (string)r["name"], Status = "exists" });
                            totalSkipped++;
                            continue;
                        }
                        _db.TaskItems.Add(new TaskItem
                        {
                            Id = id,
                            Name = (string)r["name"],
                            GoalId = r["goalId"] as string,
                            Completed = Convert.ToInt32(r["completed"]),
                            CreatedAt = r["createdAt"] as string ?? "",
                            ParentTaskId = r["parentTaskId"] as string,
                            Priority = r["priority"] as string ?? "none"
                        });
                        log.Add(new BackupLogEntry { Type = "task", Id = id, Name = (string)r["name"], Status = "added" });
                        taskCount++;
                    }
                }
                if (taskCount > 0) await _db.SaveChangesAsync();
                totalAdded += taskCount;

                // Restore habits
                var readHabits = backupConn.CreateCommand();
                readHabits.CommandText = "SELECT id, name, color, sortOrder, createdAt, durationType, durationStart, durationEnd FROM habits";
                var habitCount = 0;
                using (var r = await readHabits.ExecuteReaderAsync())
                {
                    while (await r.ReadAsync())
                    {
                        var id = (string)r["id"];
                        if (await _db.Habits.AnyAsync(h => h.Id == id))
                        {
                            log.Add(new BackupLogEntry { Type = "habit", Id = id, Name = (string)r["name"], Status = "exists" });
                            totalSkipped++;
                            continue;
                        }
                        _db.Habits.Add(new Habit
                        {
                            Id = id,
                            Name = (string)r["name"],
                            Color = r["color"] as string ?? "#3b82f6",
                            SortOrder = Convert.ToInt32(r["sortOrder"]),
                            CreatedAt = r["createdAt"] as string ?? "",
                            DurationType = r["durationType"] as string ?? "yearly",
                            DurationStart = r["durationStart"] as string,
                            DurationEnd = r["durationEnd"] as string
                        });
                        log.Add(new BackupLogEntry { Type = "habit", Id = id, Name = (string)r["name"], Status = "added" });
                        habitCount++;
                    }
                }
                if (habitCount > 0) await _db.SaveChangesAsync();
                totalAdded += habitCount;

                // Restore settings
                var readSettings = backupConn.CreateCommand();
                readSettings.CommandText = "SELECT key, value FROM settings";
                var settingCount = 0;
                using (var r = await readSettings.ExecuteReaderAsync())
                {
                    while (await r.ReadAsync())
                    {
                        var key = (string)r["key"];
                        if (await _db.Settings.AnyAsync(s => s.Key == key))
                        {
                            log.Add(new BackupLogEntry { Type = "setting", Id = key, Status = "exists" });
                            totalSkipped++;
                            continue;
                        }
                        _db.Settings.Add(new Setting { Key = key, Value = (string)r["value"] });
                        log.Add(new BackupLogEntry { Type = "setting", Id = key, Status = "added" });
                        settingCount++;
                    }
                }
                if (settingCount > 0) await _db.SaveChangesAsync();
                totalAdded += settingCount;
            }
            finally
            {
                await backupConn.CloseAsync();
            }
        }

        log.Add(new BackupLogEntry
        {
            Type = "summary",
            Message = $"Restore complete. {totalAdded} items restored, {totalSkipped} skipped (already exist).",
            Added = totalAdded,
            Skipped = totalSkipped
        });

        return Ok(new { Log = log });
    }
}

public class RestoreBackupRequest
{
    public List<string> Files { get; set; } = new();
}

public class BackupLogEntry
{
    public string Type { get; set; } = string.Empty;
    public string? Id { get; set; }
    public string? Name { get; set; }
    public string? Message { get; set; }
    public string? Status { get; set; }
    public int Added { get; set; }
    public int Skipped { get; set; }
}
