using System;
using System.Collections.Generic;
using System.IO;
using System.Threading;
using System.Threading.Tasks;
using SQLite;
using Jamrah.Models;
using Microsoft.Maui.Storage;

namespace Jamrah.Data
{
    public class TaskRepository : ITaskRepository
    {
        private SQLiteAsyncConnection? _database;
        private readonly string _dbPath;
        private readonly SemaphoreSlim _initLock = new SemaphoreSlim(1, 1);
        private bool _isInitialized = false;

        public TaskRepository(string? customDbPath = null)
        {
            _dbPath = customDbPath ?? Path.Combine(FileSystem.AppDataDirectory, "jamrah_tasks.db3");
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
                await _database.CreateTableAsync<AppTask>().ConfigureAwait(false);
                await _database.CreateTableAsync<KanbanColumn>().ConfigureAwait(false);

                // Seed default columns if none exist
                var colCount = await _database.Table<KanbanColumn>().CountAsync();
                if (colCount == 0)
                {
                    await _database.InsertAsync(new KanbanColumn { Title = "To Do", Order = 0 });
                    await _database.InsertAsync(new KanbanColumn { Title = "In Progress", Order = 1 });
                    await _database.InsertAsync(new KanbanColumn { Title = "Done", Order = 2 });
                }

                _isInitialized = true;
            }
            finally
            {
                _initLock.Release();
            }
        }

        public async Task<List<KanbanColumn>> GetColumnsAsync()
        {
            await InitAsync().ConfigureAwait(false);
            return await _database!.Table<KanbanColumn>()
                .OrderBy(c => c.Order)
                .ToListAsync()
                .ConfigureAwait(false);
        }

        public async Task SaveColumnAsync(KanbanColumn column)
        {
            await InitAsync().ConfigureAwait(false);
            if (string.IsNullOrWhiteSpace(column.Id))
                column.Id = Guid.NewGuid().ToString();
            
            await _database!.InsertOrReplaceAsync(column).ConfigureAwait(false);
        }

        public async Task DeleteColumnAsync(string id)
        {
            if (string.IsNullOrWhiteSpace(id)) return;
            await InitAsync().ConfigureAwait(false);
            await _database!.DeleteAsync<KanbanColumn>(id).ConfigureAwait(false);
        }

        public async Task<List<AppTask>> GetTasksAsync()
        {
            await InitAsync().ConfigureAwait(false);
            return await _database!.Table<AppTask>()
                .OrderByDescending(t => t.CreatedAt)
                .ToListAsync()
                .ConfigureAwait(false);
        }

        public async Task SaveTaskAsync(AppTask task)
        {
            if (task == null)
                throw new ArgumentNullException(nameof(task));

            await InitAsync().ConfigureAwait(false);

            if (string.IsNullOrWhiteSpace(task.Id))
                task.Id = Guid.NewGuid().ToString();

            if (task.CreatedAt == default)
                task.CreatedAt = DateTime.UtcNow;

            task.UpdatedAt = DateTime.UtcNow;

            await _database!.InsertOrReplaceAsync(task).ConfigureAwait(false);
        }

        public async Task DeleteTaskAsync(string id)
        {
            if (string.IsNullOrWhiteSpace(id))
                return;

            await InitAsync().ConfigureAwait(false);
            await _database!.DeleteAsync<AppTask>(id).ConfigureAwait(false);
        }
    }
}
