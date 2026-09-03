using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Jamrah.Core.Entities;
using Jamrah.Core.Interfaces;

namespace Jamrah.Application.Services
{
    public class TaskStateService : ITaskStateService
    {
        private readonly ITaskRepository _repository;

        public TaskStateService(ITaskRepository repository)
        {
            _repository = repository ?? throw new ArgumentNullException(nameof(repository));
        }

        public List<TaskFolder> Folders { get; set; } = new();
        public List<KanbanColumn> Columns { get; set; } = new();
        public List<AppTask> Tasks { get; set; } = new();

        public event Action? OnStateChanged;

        private void NotifyStateChanged() => OnStateChanged?.Invoke();

        public async Task InitAsync()
        {
            await _repository.InitAsync();
            await RefreshDataAsync();
        }

        public async Task RefreshDataAsync()
        {
            Folders = await _repository.GetFoldersAsync();
            Columns = await _repository.GetColumnsAsync();
            Tasks = await _repository.GetTasksAsync();

            bool changed = false;
            var today = DateTime.Now.Date;
            var todayDayIndex = (int)today.DayOfWeek; // 0=Sunday ... 6=Saturday

            foreach (var t in Tasks)
            {
                if (!t.IsRecurring || !t.IsDone) continue;

                // Only reset if the task was last updated before today
                if (t.UpdatedAt.ToLocalTime().Date >= today) continue;

                // If RecurrenceDays is specified, only reset on the scheduled days
                var scheduledDays = t.RecurrenceDays?.Split(',', StringSplitOptions.RemoveEmptyEntries) ?? Array.Empty<string>();
                bool isScheduledToday = scheduledDays.Length == 0
                    || scheduledDays.Contains(todayDayIndex.ToString());

                if (!isScheduledToday) continue;

                t.IsDone = false;
                await _repository.SaveTaskAsync(t);
                changed = true;
            }

            if (changed)
            {
                Tasks = await _repository.GetTasksAsync();
            }

            NotifyStateChanged();
        }

        public async Task AddFolderAsync(string name, string color)
        {
            var folder = new TaskFolder { Name = name, Color = color };
            await _repository.SaveFolderAsync(folder);
            await RefreshDataAsync();
        }

        public async Task RenameFolderAsync(string id, string newName)
        {
            var folder = Folders.FirstOrDefault(f => f.Id == id);
            if (folder != null)
            {
                folder.Name = newName;
                await _repository.SaveFolderAsync(folder);
                await RefreshDataAsync();
            }
        }

        public async Task DeleteFolderAsync(string id)
        {
            await _repository.DeleteFolderAsync(id);
            // Re-assign tasks in this folder to the default "عام" folder
            var tasksInFolder = Tasks.Where(t => t.FolderId == id).ToList();
            foreach(var t in tasksInFolder)
            {
                t.FolderId = "default-general";
                await _repository.SaveTaskAsync(t);
            }
            await RefreshDataAsync();
        }

        public async Task AddColumnAsync(string title)
        {
            var maxOrder = Columns.Count > 0 ? Columns.Max(c => c.Order) : -1;
            var col = new KanbanColumn { Title = title, Order = maxOrder + 1 };
            await _repository.SaveColumnAsync(col);
            await RefreshDataAsync();
        }

        public async Task RenameColumnAsync(string id, string newTitle)
        {
            var col = Columns.FirstOrDefault(c => c.Id == id);
            if (col != null)
            {
                col.Title = newTitle;
                await _repository.SaveColumnAsync(col);
                await RefreshDataAsync();
            }
        }

        public async Task DeleteColumnAsync(string id)
        {
            // Optional: delete or move tasks in this column
            var tasksInCol = Tasks.Where(t => t.ColumnId == id).ToList();
            foreach (var t in tasksInCol)
            {
                await _repository.DeleteTaskAsync(t.Id);
            }

            await _repository.DeleteColumnAsync(id);
            await RefreshDataAsync();
        }

        public async Task AddTaskAsync(AppTask task)
        {
            if (string.IsNullOrEmpty(task.Id)) task.Id = Guid.NewGuid().ToString();
            task.UpdatedAt = DateTime.Now;
            await _repository.SaveTaskAsync(task);
            await RefreshDataAsync();
        }

        public async Task ToggleTaskAsync(AppTask task)
        {
            task.IsDone = !task.IsDone;
            task.UpdatedAt = DateTime.Now;
            await _repository.SaveTaskAsync(task);
            await RefreshDataAsync();
        }

        public async Task DeleteTaskAsync(string id)
        {
            await _repository.DeleteTaskAsync(id);
            await RefreshDataAsync();
        }

        public async Task MoveTaskAsync(string taskId, string newColumnId)
        {
            var task = Tasks.FirstOrDefault(t => t.Id == taskId);
            if (task != null && task.ColumnId != newColumnId)
            {
                task.ColumnId = newColumnId;
                await _repository.SaveTaskAsync(task);
                await RefreshDataAsync();
            }
        }

        public async Task UpdateTaskAsync(AppTask task)
        {
            if (string.IsNullOrEmpty(task.Id)) return;
            await _repository.SaveTaskAsync(task);
            await RefreshDataAsync();
        }

        public async Task CarryForwardTaskAsync(AppTask task)
        {
            task.ScheduledDate = DateTime.Today;
            await _repository.SaveTaskAsync(task);
            await RefreshDataAsync();
        }
    }
}
