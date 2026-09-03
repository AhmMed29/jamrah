using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Jamrah.Core.Entities;

namespace Jamrah.Core.Interfaces
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
        Task UpdateTaskAsync(AppTask task);
        Task ToggleTaskAsync(AppTask task);
        Task DeleteTaskAsync(string id);
        Task MoveTaskAsync(string taskId, string newColumnId);
        Task CarryForwardTaskAsync(AppTask task);
    }
}
