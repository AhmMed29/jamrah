using System;
using System.Collections.Generic;
using System.IO;
using System.Threading;
using System.Threading.Tasks;
using SQLite;
using Jamrah.Core.Entities;
using Jamrah.Core.Interfaces;
using Microsoft.Maui.Storage;

namespace Jamrah.Infrastructure.Repositories
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
                await _database.CreateTableAsync<TaskFolder>().ConfigureAwait(false);
                await _database.CreateTableAsync<KanbanColumn>().ConfigureAwait(false);

                // Seed default folder
                var folderCount = await _database.Table<TaskFolder>().CountAsync();
                if (folderCount == 0)
                {
                    await _database.InsertAsync(new TaskFolder { Id = "default-general", Name = "عام", Color = "#888888" });
                }

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

        public async Task<List<TaskFolder>> GetFoldersAsync()
        {
            await InitAsync().ConfigureAwait(false);
            return await _database!.Table<TaskFolder>()
                .OrderBy(f => f.CreatedAt)
                .ToListAsync()
                .ConfigureAwait(false);
        }

        public async Task SaveFolderAsync(TaskFolder folder)
        {
            await InitAsync().ConfigureAwait(false);
            if (string.IsNullOrWhiteSpace(folder.Id))
                folder.Id = Guid.NewGuid().ToString();
            
            await _database!.InsertOrReplaceAsync(folder).ConfigureAwait(false);
        }

        public async Task DeleteFolderAsync(string id)
        {
            if (string.IsNullOrWhiteSpace(id)) return;
            await InitAsync().ConfigureAwait(false);
            await _database!.DeleteAsync<TaskFolder>(id).ConfigureAwait(false);
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

            // Auto-assign TemplateId for recurring templates
            if (!string.IsNullOrWhiteSpace(task.RecurrenceDays) && task.RecurrenceDays != "none" && string.IsNullOrWhiteSpace(task.TemplateId))
            {
                task.TemplateId = task.Id;
            }

            await _database!.InsertOrReplaceAsync(task).ConfigureAwait(false);
        }

        public async Task DeleteTaskAsync(string id)
        {
            if (string.IsNullOrWhiteSpace(id))
                return;

            await InitAsync().ConfigureAwait(false);
            await _database!.DeleteAsync<AppTask>(id).ConfigureAwait(false);
        }

        public async Task ArchiveTaskAsync(string id)
        {
            if (string.IsNullOrWhiteSpace(id)) return;
            await InitAsync().ConfigureAwait(false);
            var task = await _database!.FindAsync<AppTask>(id).ConfigureAwait(false);
            if (task == null) return;
            task.ArchivedAt = task.ArchivedAt.HasValue ? null : DateTime.UtcNow;
            task.UpdatedAt = DateTime.UtcNow;
            await _database.UpdateAsync(task).ConfigureAwait(false);
        }

        public async Task RestoreTaskAsync(string id)
        {
            if (string.IsNullOrWhiteSpace(id)) return;
            await InitAsync().ConfigureAwait(false);
            var task = await _database!.FindAsync<AppTask>(id).ConfigureAwait(false);
            if (task == null || !task.ArchivedAt.HasValue) return;
            task.ArchivedAt = null;
            task.UpdatedAt = DateTime.UtcNow;
            await _database.UpdateAsync(task).ConfigureAwait(false);
        }

        public async Task<List<AppTask>> GetArchivedTasksAsync()
        {
            await InitAsync().ConfigureAwait(false);
            return await _database!.Table<AppTask>().Where(t => t.ArchivedAt != null).OrderByDescending(t => t.ArchivedAt).ToListAsync().ConfigureAwait(false);
        }

        public async Task<List<AppTask>> GetCompletedTasksAsync()
        {
            await InitAsync().ConfigureAwait(false);
            return await _database!.Table<AppTask>().Where(t => t.IsDone && t.ArchivedAt == null).OrderByDescending(t => t.CompletedAt).ToListAsync().ConfigureAwait(false);
        }

        public async Task<List<AppTask>> GetUpcomingTasksAsync()
        {
            await InitAsync().ConfigureAwait(false);
            var today = DateTime.Today;
            return await _database!.Table<AppTask>().Where(t => t.ArchivedAt == null && !t.IsDone && t.DueDate != null && t.DueDate > today).OrderBy(t => t.DueDate).ToListAsync().ConfigureAwait(false);
        }

        public async Task<List<AppTask>> GetNoDateTasksAsync()
        {
            await InitAsync().ConfigureAwait(false);
            return await _database!.Table<AppTask>().Where(t => t.ArchivedAt == null && t.DueDate == null).OrderByDescending(t => t.CreatedAt).ToListAsync().ConfigureAwait(false);
        }

        public async Task ToggleTaskAsync(string id)
        {
            if (string.IsNullOrWhiteSpace(id)) return;
            await InitAsync().ConfigureAwait(false);
            var task = await _database!.FindAsync<AppTask>(id).ConfigureAwait(false);
            if (task == null) return;
            task.IsDone = !task.IsDone;
            task.CompletedAt = task.IsDone ? DateTime.UtcNow : null;
            task.UpdatedAt = DateTime.UtcNow;

            // Recurring: create next occurrence when completed
            if (task.IsDone && !string.IsNullOrWhiteSpace(task.RecurrenceDays) && task.RecurrenceDays != "none" && task.DueDate.HasValue)
            {
                var nextDate = task.DueDate.Value;
                if (task.RecurrenceDays == "daily") nextDate = nextDate.AddDays(1);
                else if (task.RecurrenceDays == "weekly") nextDate = nextDate.AddDays(7);
                else if (task.RecurrenceDays == "monthly") nextDate = nextDate.AddMonths(1);
                var nextTask = new AppTask
                {
                    Id = Guid.NewGuid().ToString(),
                    Title = task.Title,
                    Priority = task.Priority,
                    IsDone = false,
                    DueDate = nextDate,
                    ScheduledDate = nextDate,
                    ScheduledTime = task.ScheduledTime,
                    RecurrenceDays = task.RecurrenceDays,
                    IsRecurring = task.IsRecurring,
                    EisenhowerQuadrant = task.EisenhowerQuadrant,
                    Notes = task.Notes,
                    ColumnId = task.ColumnId,
                    FolderId = task.FolderId,
                    TemplateId = task.TemplateId ?? task.Id,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };
                await _database.InsertAsync(nextTask).ConfigureAwait(false);
            }

            await _database.UpdateAsync(task).ConfigureAwait(false);
        }
    }
}
