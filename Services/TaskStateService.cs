using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Jamrah.Data;
using Jamrah.Models;

namespace Jamrah.Services
{
    public interface ITaskStateService
    {
        List<AppTask> Tasks { get; set; }
        event Action? OnStateChanged;
        Task InitAsync();
        Task RefreshTasksAsync();
        Task AddTaskAsync(string title, DateTime? dueDate);
        Task ToggleTaskAsync(AppTask task);
        Task DeleteTaskAsync(string id);
    }

    public class TaskStateService : ITaskStateService
    {
        private readonly ITaskRepository _repository;

        public TaskStateService(ITaskRepository repository)
        {
            _repository = repository ?? throw new ArgumentNullException(nameof(repository));
        }

        public List<AppTask> Tasks { get; set; } = new();

        public event Action? OnStateChanged;

        private void NotifyStateChanged() => OnStateChanged?.Invoke();

        public async Task InitAsync()
        {
            await _repository.InitAsync();
            await RefreshTasksAsync();
        }

        public async Task RefreshTasksAsync()
        {
            Tasks = await _repository.GetTasksAsync();
            NotifyStateChanged();
        }

        public async Task AddTaskAsync(string title, DateTime? dueDate)
        {
            var task = new AppTask
            {
                Id = Guid.NewGuid().ToString(),
                Title = title,
                DueDate = dueDate,
                IsDone = false
            };
            await _repository.SaveTaskAsync(task);
            await RefreshTasksAsync();
        }

        public async Task ToggleTaskAsync(AppTask task)
        {
            task.IsDone = !task.IsDone;
            await _repository.SaveTaskAsync(task);
            await RefreshTasksAsync();
        }

        public async Task DeleteTaskAsync(string id)
        {
            await _repository.DeleteTaskAsync(id);
            await RefreshTasksAsync();
        }
    }
}
