using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Jamrah.Data;
using Jamrah.Models;

namespace Jamrah.Services
{
    public interface ITaskStateService
    {
        List<TaskFolder> Folders { get; set; }
        List<KanbanColumn> Columns { get; set; }
        List<AppTask> Tasks { get; set; }
        event Action? OnStateChanged;
        Task InitAsync();
        Task RefreshDataAsync();

        // Folder operations
        Task AddFolderAsync(string name, string color);
        Task RenameFolderAsync(string id, string newName);
        Task DeleteFolderAsync(string id);

        // Column operations
        Task AddColumnAsync(string title);
        Task RenameColumnAsync(string id, string newTitle);
        Task DeleteColumnAsync(string id);

        // Task operations
        Task AddTaskAsync(AppTask task);
        Task ToggleTaskAsync(AppTask task);
        Task DeleteTaskAsync(string id);
        Task MoveTaskAsync(string taskId, string newColumnId);
    }

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
            // Re-assign tasks in this folder to the default "عام" folder? Let's just do it
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
            await _repository.SaveTaskAsync(task);
            await RefreshDataAsync();
        }

        public async Task ToggleTaskAsync(AppTask task)
        {
            task.IsDone = !task.IsDone;
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
    }
}
