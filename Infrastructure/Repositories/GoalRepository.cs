using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using SQLite;
using Jamrah.Core.Entities;
using Jamrah.Core.Interfaces;
using Microsoft.Maui.Storage;

namespace Jamrah.Infrastructure.Repositories
{
    // Separate DB file: zero risk to existing databases.
    public class GoalRepository : IGoalRepository
    {
        private SQLiteAsyncConnection? _database;
        private readonly string _dbPath;
        private readonly SemaphoreSlim _initLock = new SemaphoreSlim(1, 1);
        private bool _isInitialized = false;

        public GoalRepository(string? customDbPath = null)
        {
            _dbPath = customDbPath ?? Path.Combine(FileSystem.AppDataDirectory, "jamrah_goals.db3");
        }

        public async Task InitAsync()
        {
            if (_isInitialized && _database is not null)
                return;

            await _initLock.WaitAsync();
            try
            {
                if (_isInitialized && _database is not null)
                    return;

                var directory = Path.GetDirectoryName(_dbPath);
                if (!string.IsNullOrEmpty(directory) && !Directory.Exists(directory))
                    Directory.CreateDirectory(directory);

                _database = new SQLiteAsyncConnection(_dbPath);
                await _database.CreateTableAsync<GoalItem>().ConfigureAwait(false);
                await _database.CreateTableAsync<GoalLog>().ConfigureAwait(false);
                // Existing test rows predate the Kind column.
                await EnsureColumnAsync("GoalItems", "Kind", "TEXT NOT NULL DEFAULT 'amount'").ConfigureAwait(false);
                await EnsureColumnAsync("GoalItems", "CompletionRule", "TEXT").ConfigureAwait(false);

                _isInitialized = true;
            }
            finally
            {
                _initLock.Release();
            }
        }

        public async Task<List<GoalItem>> GetGoalsAsync()
        {
            await InitAsync().ConfigureAwait(false);
            return await _database!.Table<GoalItem>()
                .OrderBy(g => g.CreatedAt)
                .ToListAsync()
                .ConfigureAwait(false);
        }

        public async Task SaveGoalAsync(GoalItem goal)
        {
            if (goal == null)
                throw new ArgumentNullException(nameof(goal));

            await InitAsync().ConfigureAwait(false);

            if (string.IsNullOrWhiteSpace(goal.Id))
                goal.Id = Guid.NewGuid().ToString();

            if (goal.CreatedAt == default)
                goal.CreatedAt = DateTime.UtcNow;

            goal.StartDate = goal.StartDate.Date;
            goal.EndDate = goal.EndDate.Date;
            if (goal.EndDate < goal.StartDate)
                goal.EndDate = goal.StartDate;

            goal.UpdatedAt = DateTime.UtcNow;

            await _database!.InsertOrReplaceAsync(goal).ConfigureAwait(false);
        }

        public async Task DeleteGoalAsync(string id)
        {
            if (string.IsNullOrWhiteSpace(id))
                return;

            await InitAsync().ConfigureAwait(false);
            await _database!.DeleteAsync<GoalItem>(id).ConfigureAwait(false);
            var logs = await _database.Table<GoalLog>().Where(l => l.GoalId == id).ToListAsync().ConfigureAwait(false);
            foreach (var l in logs)
                await _database.DeleteAsync(l).ConfigureAwait(false);
        }

        public async Task<List<GoalLog>> GetLogsAsync(DateTime from, DateTime to)
        {
            await InitAsync().ConfigureAwait(false);
            var f = from.Date;
            var t = to.Date;
            return await _database!.Table<GoalLog>()
                .Where(l => l.Date >= f && l.Date <= t)
                .ToListAsync()
                .ConfigureAwait(false);
        }

        public async Task<GoalLog?> GetLogAsync(string goalId, DateTime day)
        {
            await InitAsync().ConfigureAwait(false);
            var d = day.Date;
            return await _database!.Table<GoalLog>()
                .Where(l => l.GoalId == goalId && l.Date == d)
                .FirstOrDefaultAsync()
                .ConfigureAwait(false);
        }

        public async Task SaveLogAsync(GoalLog log)
        {
            if (log == null)
                throw new ArgumentNullException(nameof(log));

            await InitAsync().ConfigureAwait(false);

            if (string.IsNullOrWhiteSpace(log.Id))
                log.Id = Guid.NewGuid().ToString();

            log.Date = log.Date.Date;
            log.UpdatedAt = DateTime.UtcNow;

            await _database!.InsertOrReplaceAsync(log).ConfigureAwait(false);
        }

        private sealed class PragmaColumn
        {
            [Column("name")]
            public string Name { get; set; } = string.Empty;
        }

        private async Task EnsureColumnAsync(string table, string column, string definition)
        {
            var cols = await _database!.QueryAsync<PragmaColumn>($"PRAGMA table_info([{table}])").ConfigureAwait(false);
            if (!cols.Any(c => c.Name == column))
                await _database.ExecuteAsync($"ALTER TABLE [{table}] ADD COLUMN [{column}] {definition}").ConfigureAwait(false);
        }
    }
}
