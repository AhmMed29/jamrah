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

        // --- New View State (Phase 4) ---
        public string CurrentView { get; private set; } = "today"; // today/upcoming/no-date/completed/archived/board/matrix
        public string CurrentLayout { get; private set; } = "list";
        public DateTime CurrentDate { get; private set; } = DateTime.Today;
        public string? SelectedTaskId { get; private set; }
        public bool SidebarCollapsed { get; private set; }

        public event Action? OnStateChanged;

        private void NotifyStateChanged() => OnStateChanged?.Invoke();

        public void SetView(string view) { CurrentView = view; CurrentLayout = "list"; NotifyStateChanged(); }
        public void SetLayout(string layout) { CurrentLayout = layout; NotifyStateChanged(); }
        public void SetSelectedTask(string? id) { SelectedTaskId = id; NotifyStateChanged(); }
        public void ToggleSidebar() { SidebarCollapsed = !SidebarCollapsed; NotifyStateChanged(); }
        public void NextDay() { CurrentDate = CurrentDate.AddDays(1); CurrentView = "today"; NotifyStateChanged(); }
        public void PrevDay() { CurrentDate = CurrentDate.AddDays(-1); CurrentView = "today"; NotifyStateChanged(); }
        public void GoToday() { CurrentDate = DateTime.Today; CurrentView = "today"; NotifyStateChanged(); }
        public void SetCurrentDate(DateTime d) { CurrentDate = d.Date; CurrentView = "today"; NotifyStateChanged(); }

        public async Task ArchiveTaskAsync(string id) { await _repository.ArchiveTaskAsync(id); await RefreshDataAsync(); }
        public async Task RestoreTaskAsync(string id) { await _repository.RestoreTaskAsync(id); await RefreshDataAsync(); }
        public async Task ToggleTaskByIdAsync(string id) { await _repository.ToggleTaskAsync(id); await RefreshDataAsync(); }

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
            var today = DateTime.Today;
            var todayDayIndex = (int)today.DayOfWeek;

            // --- Migration: ensure daily/weekly/monthly templates have TemplateId ---
            foreach (var t in Tasks.Where(x => !string.IsNullOrWhiteSpace(x.RecurrenceDays) && x.RecurrenceDays != "none" && string.IsNullOrWhiteSpace(x.TemplateId)).ToList())
            {
                t.TemplateId = t.Id;
                await _repository.SaveTaskAsync(t);
                changed = true;
            }
            if (changed)
            {
                Tasks = await _repository.GetTasksAsync();
                changed = false;
            }

            // --- Legacy recurring reset (numeric days like "0,1,2") - keep as is ---
            foreach (var t in Tasks)
            {
                if (!t.IsRecurring || !t.IsDone) continue;
                if (t.UpdatedAt.ToLocalTime().Date >= today) continue;
                var scheduledDays = t.RecurrenceDays?.Split(',', StringSplitOptions.RemoveEmptyEntries) ?? Array.Empty<string>();
                // Skip new string formats daily/weekly/monthly
                if (scheduledDays.Length==1 && (scheduledDays[0]=="daily"||scheduledDays[0]=="weekly"||scheduledDays[0]=="monthly")) continue;
                bool isScheduledToday = scheduledDays.Length == 0 || scheduledDays.Contains(todayDayIndex.ToString());
                if (!isScheduledToday) continue;
                t.IsDone = false;
                await _repository.SaveTaskAsync(t);
                changed = true;
            }

            // --- الطبيعي: توليد نسخة يومية تلقائياً حتى لو لم تُنجز أمس ---
            var dailyTemplates = Tasks
                .Where(t => t.ArchivedAt==null && t.RecurrenceDays=="daily" && !string.IsNullOrWhiteSpace(t.TemplateId) && t.Id==t.TemplateId)
                .ToList();

            foreach (var tpl in dailyTemplates)
            {
                bool hasToday = Tasks.Any(x => x.ArchivedAt==null && x.TemplateId==tpl.TemplateId && (x.DueDate?.Date==today || x.ScheduledDate?.Date==today));
                if (hasToday) continue;

                // أنشئ instance اليوم من القالب
                var inst = new AppTask {
                    Id = Guid.NewGuid().ToString(),
                    Title = tpl.Title,
                    Priority = tpl.Priority,
                    IsDone = false,
                    DueDate = today,
                    ScheduledDate = today,
                    ScheduledTime = tpl.ScheduledTime,
                    RecurrenceDays = "daily",
                    IsRecurring = true,
                    EisenhowerQuadrant = tpl.EisenhowerQuadrant,
                    Notes = tpl.Notes,
                    ColumnId = tpl.ColumnId,
                    FolderId = tpl.FolderId,
                    TemplateId = tpl.TemplateId,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow,
                    ArchivedAt = null,
                    CompletedAt = null
                };
                await _repository.SaveTaskAsync(inst);
                changed = true;
            }

            // --- weekly/monthly auto-generate (اختياري لكن يتبع نفس المبدأ) ---
            var weeklyTemplates = Tasks.Where(t => t.ArchivedAt==null && t.RecurrenceDays=="weekly" && !string.IsNullOrWhiteSpace(t.TemplateId) && t.Id==t.TemplateId).ToList();
            foreach(var tpl in weeklyTemplates)
            {
                // أنشئ فقط إذا اليوم هو نفس يوم الأسبوع للقالب و لا يوجد instance اليوم
                var tplDate = tpl.DueDate?.Date ?? tpl.CreatedAt.Date;
                bool isSameWeekDay = tplDate.DayOfWeek == today.DayOfWeek;
                if(!isSameWeekDay) continue;
                bool hasToday = Tasks.Any(x => x.ArchivedAt==null && x.TemplateId==tpl.TemplateId && (x.DueDate?.Date==today || x.ScheduledDate?.Date==today));
                if(hasToday) continue;
                // تأكد أن اليوم بعد تاريخ القالب
                if(today <= tplDate) continue;
                var inst = new AppTask {
                    Id = Guid.NewGuid().ToString(),
                    Title = tpl.Title,
                    Priority = tpl.Priority,
                    IsDone = false,
                    DueDate = today,
                    ScheduledDate = today,
                    ScheduledTime = tpl.ScheduledTime,
                    RecurrenceDays = "weekly",
                    IsRecurring = true,
                    EisenhowerQuadrant = tpl.EisenhowerQuadrant,
                    Notes = tpl.Notes,
                    ColumnId = tpl.ColumnId,
                    FolderId = tpl.FolderId,
                    TemplateId = tpl.TemplateId,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };
                await _repository.SaveTaskAsync(inst);
                changed = true;
            }

            var monthlyTemplates = Tasks.Where(t => t.ArchivedAt==null && t.RecurrenceDays=="monthly" && !string.IsNullOrWhiteSpace(t.TemplateId) && t.Id==t.TemplateId).ToList();
            foreach(var tpl in monthlyTemplates)
            {
                var tplDate = tpl.DueDate?.Date ?? tpl.CreatedAt.Date;
                bool isSameDay = tplDate.Day == today.Day;
                if(!isSameDay) continue;
                bool hasToday = Tasks.Any(x => x.ArchivedAt==null && x.TemplateId==tpl.TemplateId && (x.DueDate?.Date==today || x.ScheduledDate?.Date==today));
                if(hasToday) continue;
                if(today <= tplDate) continue;
                var inst = new AppTask {
                    Id = Guid.NewGuid().ToString(),
                    Title = tpl.Title,
                    Priority = tpl.Priority,
                    IsDone = false,
                    DueDate = today,
                    ScheduledDate = today,
                    ScheduledTime = tpl.ScheduledTime,
                    RecurrenceDays = "monthly",
                    IsRecurring = true,
                    EisenhowerQuadrant = tpl.EisenhowerQuadrant,
                    Notes = tpl.Notes,
                    ColumnId = tpl.ColumnId,
                    FolderId = tpl.FolderId,
                    TemplateId = tpl.TemplateId,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };
                await _repository.SaveTaskAsync(inst);
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
            task.CompletedAt = task.IsDone ? DateTime.UtcNow : null;
            task.UpdatedAt = DateTime.Now;
            await _repository.SaveTaskAsync(task);
            // Recurring logic handled in repository ToggleTaskAsync, but keep Save path for direct toggle
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
                await _repository.SaveTaskAsync(nextTask);
            }
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
