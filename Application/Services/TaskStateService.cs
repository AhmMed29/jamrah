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

        // --- Hidden template helpers (template = definition only, never shown as a day task) ---
        private static bool IsTemplate(AppTask t)
            => t.Id == t.TemplateId
            && !string.IsNullOrWhiteSpace(t.RecurrenceDays)
            && t.RecurrenceDays != "none";

        private static bool IsSeriesInstance(AppTask t)
            => !string.IsNullOrWhiteSpace(t.TemplateId)
            && t.Id != t.TemplateId;

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
        public async Task ToggleTaskByIdAsync(string id)
        {
            var task = Tasks.FirstOrDefault(t => t.Id == id);
            if (task == null) return;
            await ToggleTaskAsync(task);
        }

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

            // --- أي مهمة منجزة → تفضل مكانها (لا أرشفة تلقائية) ---
            // ترجيع منجز اليوم من الأرشيف لمرة واحدة (مقيد بتاريخ اليوم، بلا مسح)
            foreach (var t in Tasks.Where(x => x.IsDone && x.ArchivedAt != null && x.CompletedAt != null && x.CompletedAt.Value.Date == DateTime.Today).ToList())
            {
                t.ArchivedAt = null;
                await _repository.SaveTaskAsync(t);
                changed = true;
            }
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

            // --- Revive archived templates (series that died when the template day was archived) ---
            // Note: keep IsDone/CompletedAt here — the hide step below clones the old day state into an instance first
            foreach (var t in Tasks.Where(x => IsTemplate(x) && x.ArchivedAt != null).ToList())
            {
                t.ArchivedAt = null;
                t.UpdatedAt = DateTime.UtcNow;
                await _repository.SaveTaskAsync(t);
                changed = true;
            }

            // --- Hide visible templates: template becomes date-less definition, old date becomes an instance ---
            foreach (var tpl in Tasks.Where(x => IsTemplate(x) && (x.DueDate.HasValue || x.ScheduledDate.HasValue)).ToList())
            {
                var day = tpl.DueDate?.Date ?? tpl.ScheduledDate?.Date;
                if (day.HasValue)
                {
                    bool hasInstance = Tasks.Any(x => x.TemplateId == tpl.Id && x.Id != tpl.Id
                        && (x.DueDate?.Date == day.Value.Date || x.ScheduledDate?.Date == day.Value.Date));
                    if (!hasInstance)
                    {
                        var inst = new AppTask
                        {
                            Id = Guid.NewGuid().ToString(),
                            Title = tpl.Title,
                            Priority = tpl.Priority,
                            IsDone = tpl.IsDone,
                            DueDate = day.Value,
                            ScheduledDate = day.Value,
                            ScheduledTime = tpl.ScheduledTime,
                            RecurrenceDays = tpl.RecurrenceDays,
                            IsRecurring = true,
                            EisenhowerQuadrant = tpl.EisenhowerQuadrant,
                            Notes = tpl.Notes,
                            ColumnId = tpl.ColumnId,
                            FolderId = tpl.FolderId,
                            TemplateId = tpl.TemplateId,
                            CreatedAt = tpl.CreatedAt,
                            UpdatedAt = DateTime.UtcNow,
                            ArchivedAt = tpl.ArchivedAt,
                            CompletedAt = tpl.CompletedAt
                        };
                        await _repository.SaveTaskAsync(inst);
                        Tasks.Add(inst);
                    }
                }
                tpl.DueDate = null;
                tpl.ScheduledDate = null;
                tpl.IsDone = false;
                tpl.ArchivedAt = null;
                tpl.CompletedAt = null;
                tpl.UpdatedAt = DateTime.UtcNow;
                await _repository.SaveTaskAsync(tpl);
                changed = true;
            }
            if (changed)
            {
                Tasks = await _repository.GetTasksAsync();
                changed = false;
            }

            // --- إزالة التكرارات (Hotfix للـ 3 مهام) ---
            var dupGroups = Tasks
                .Where(t => !string.IsNullOrWhiteSpace(t.TemplateId) && t.DueDate.HasValue && t.ArchivedAt==null)
                .GroupBy(t => new { t.TemplateId, Date = t.DueDate!.Value.Date })
                .Where(g => g.Count() > 1)
                .ToList();
            foreach (var g in dupGroups)
            {
                var keep = g.OrderBy(t => t.CreatedAt).First();
                foreach (var dup in g.Where(t => t.Id != keep.Id).ToList())
                {
                    await _repository.DeleteTaskAsync(dup.Id);
                    changed = true;
                }
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
                if (scheduledDays.Length==1 && (scheduledDays[0]=="daily"||scheduledDays[0]=="weekly"||scheduledDays[0]=="monthly")) continue;
                bool isScheduledToday = scheduledDays.Length == 0 || scheduledDays.Contains(todayDayIndex.ToString());
                if (!isScheduledToday) continue;
                t.IsDone = false;
                await _repository.SaveTaskAsync(t);
                changed = true;
            }

            // --- Phase 2 شهري: توليد لكل يوم في الشهر الحالي ---
            var now = today;
            var monthStart = new DateTime(now.Year, now.Month, 1);
            var monthEnd = new DateTime(now.Year, now.Month, DateTime.DaysInMonth(now.Year, now.Month));

            // daily: كل يوم من أول الشهر لآخره
            var dailyTemplates = Tasks.Where(t => t.ArchivedAt==null && t.RecurrenceDays=="daily" && !string.IsNullOrWhiteSpace(t.TemplateId) && t.Id==t.TemplateId).ToList();
            foreach (var tpl in dailyTemplates)
            {
                var tplStart = tpl.DueDate?.Date ?? tpl.ScheduledDate?.Date ?? tpl.CreatedAt.Date;
                // لا نولد قبل تاريخ إنشاء القالب
                var start = tplStart > monthStart ? tplStart : monthStart;
                for (var d = start; d <= monthEnd; d = d.AddDays(1))
                {
                    // يتضمن المؤرشف/المنجز لنفس اليوم حتى لا يعيد توليد نسخة بعد الإنجاز أو الحذف
                    bool has = Tasks.Any(x => x.TemplateId==tpl.TemplateId && x.DueDate?.Date==d);
                    if (has) continue;
                    var inst = new AppTask {
                        Id = Guid.NewGuid().ToString(),
                        Title = tpl.Title,
                        Priority = tpl.Priority,
                        IsDone = false,
                        DueDate = d,
                        ScheduledDate = d,
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
                    Tasks.Add(inst);
                    changed = true;
                }
            }

            // weekly: كل أسبوع نفس يوم القالب
            var weeklyTemplates = Tasks.Where(t => t.ArchivedAt==null && t.RecurrenceDays=="weekly" && !string.IsNullOrWhiteSpace(t.TemplateId) && t.Id==t.TemplateId).ToList();
            foreach(var tpl in weeklyTemplates)
            {
                var tplDate = tpl.DueDate?.Date ?? tpl.ScheduledDate?.Date ?? tpl.CreatedAt.Date;
                for (var d = monthStart; d <= monthEnd; d = d.AddDays(1))
                {
                    if (d.DayOfWeek != tplDate.DayOfWeek) continue;
                    if (d < tplDate) continue;
                    bool has = Tasks.Any(x => x.TemplateId==tpl.TemplateId && x.DueDate?.Date==d);
                    if (has) continue;
                    var inst = new AppTask {
                        Id = Guid.NewGuid().ToString(),
                        Title = tpl.Title,
                        Priority = tpl.Priority,
                        IsDone = false,
                        DueDate = d,
                        ScheduledDate = d,
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
                    Tasks.Add(inst);
                    changed = true;
                }
            }

            // monthly: نفس يوم الشهر
            var monthlyTemplates = Tasks.Where(t => t.ArchivedAt==null && t.RecurrenceDays=="monthly" && !string.IsNullOrWhiteSpace(t.TemplateId) && t.Id==t.TemplateId).ToList();
            foreach(var tpl in monthlyTemplates)
            {
                // Hidden template never represents a month itself — always generate the current month
                var tplDate = tpl.DueDate?.Date ?? tpl.ScheduledDate?.Date ?? tpl.CreatedAt.Date;
                var targetDay = Math.Min(tplDate.Day, DateTime.DaysInMonth(now.Year, now.Month));
                var d = new DateTime(now.Year, now.Month, targetDay);
                if (d < tplDate) continue;
                bool has = Tasks.Any(x => x.TemplateId==tpl.TemplateId && x.DueDate?.Date==d);
                if (has) continue;
                var inst = new AppTask {
                    Id = Guid.NewGuid().ToString(),
                    Title = tpl.Title,
                    Priority = tpl.Priority,
                    IsDone = false,
                    DueDate = d,
                    ScheduledDate = d,
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
                Tasks.Add(inst);
                changed = true;
            }

            // --- تنظيف بقايا مهام الصلوات (اتشالت من المهام نهائياً) ---
            foreach (var t in Tasks.Where(x => x.TemplateId != null && x.TemplateId.StartsWith("prayer:")).ToList())
            {
                await _repository.DeleteTaskAsync(t.Id);
                changed = true;
            }

            if (changed)
            {
                Tasks = await _repository.GetTasksAsync();
            }

            // New recurring instances inherit their template's layout pattern
            await ApplyTemplateLayoutsAsync();

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
            // حذف عمود → مهامه تروح الأرشيف (بدل الحذف النهائي)
            var tasksInCol = Tasks.Where(t => t.ColumnId == id).ToList();
            foreach (var t in tasksInCol)
            {
                if (t.ArchivedAt == null)
                {
                    t.ArchivedAt = DateTime.UtcNow;
                    t.UpdatedAt = DateTime.Now;
                    await _repository.SaveTaskAsync(t);
                }
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
            if (IsTemplate(task)) return; // hidden definition can never be completed
            task.IsDone = !task.IsDone;
            if (task.IsDone)
            {
                // إنجاز → تفضل مكانها (وقت الإتمام فقط، بلا أرشفة)
                task.CompletedAt = DateTime.UtcNow;
            }
            else
            {
                // إلغاء الإنجاز → ترجع نشطة
                task.CompletedAt = null;
                task.ArchivedAt = null;
            }
            task.UpdatedAt = DateTime.Now;
            await _repository.SaveTaskAsync(task);
            await RefreshDataAsync();
        }

        public async Task DeleteTaskAsync(string id)
        {
            var task = Tasks.FirstOrDefault(t => t.Id == id);
            if (task != null && IsTemplate(task))
            {
                // Deleting a hidden template = delete the whole series
                await DeleteSeriesAsync(id);
                return;
            }
            if (task != null && task.ArchivedAt == null)
            {
                // حذف مهمة نشطة → أرشيف (سلة) بدل الحذف النهائي
                task.ArchivedAt = DateTime.UtcNow;
                task.UpdatedAt = DateTime.Now;
                await _repository.SaveTaskAsync(task);
            }
            else
            {
                // حذف من داخل الأرشيف → حذف نهائي
                await _repository.DeleteTaskAsync(id);
            }
            // فرعيات المهمة ترجع لمستوى أعلى بدل ما تتيتم
            foreach (var child in Tasks.Where(t => t.ParentId == id).ToList())
            {
                child.ParentId = task?.ParentId ?? string.Empty;
                child.RowGroupId = string.Empty;
                await _repository.SaveTaskAsync(child);
            }
            await RefreshDataAsync();
        }

        public async Task DeleteSeriesAsync(string id)
        {
            var task = Tasks.FirstOrDefault(t => t.Id == id);
            if (task == null) return;
            // سلسلة = نفس TemplateId (أو نفس Id لو هو القالب نفسه)
            var templateId = !string.IsNullOrWhiteSpace(task.TemplateId) ? task.TemplateId : task.Id;
            var activeSeries = Tasks
                .Where(t => t.ArchivedAt == null && (t.TemplateId == templateId || t.Id == templateId))
                .ToList();
            // حذف نهائي للنشط فقط — المنجز/المؤرشف القديم يفضل كما هو
            foreach (var s in activeSeries)
            {
                await _repository.DeleteTaskAsync(s.Id);
            }
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
            // Detach a series instance turned to "no repeat" — it becomes a normal one-day task
            if (IsSeriesInstance(task) && string.IsNullOrWhiteSpace(task.RecurrenceDays) == false
                && task.RecurrenceDays == "none")
            {
                task.TemplateId = null;
                task.IsRecurring = false;
                await _repository.SaveTaskAsync(task);
                await RefreshDataAsync();
                return;
            }
            await _repository.SaveTaskAsync(task);
            if (IsTemplate(task))
            {
                await PropagateTemplateToUpcomingAsync(task, excludeId: string.Empty);
            }
            else if (IsSeriesInstance(task))
            {
                // Editing any instance edits the habit: update the hidden definition + upcoming days
                var tpl = Tasks.FirstOrDefault(x => x.Id == task.TemplateId);
                if (tpl != null)
                {
                    tpl.Title = task.Title;
                    tpl.Priority = task.Priority;
                    tpl.ScheduledTime = task.ScheduledTime;
                    tpl.EisenhowerQuadrant = task.EisenhowerQuadrant;
                    tpl.Notes = task.Notes;
                    tpl.ColumnId = task.ColumnId;
                    tpl.FolderId = task.FolderId;
                    tpl.RecurrenceDays = task.RecurrenceDays;
                    tpl.IsRecurring = task.IsRecurring;
                    tpl.UpdatedAt = DateTime.UtcNow;
                    await _repository.SaveTaskAsync(tpl);
                    await PropagateTemplateToUpcomingAsync(tpl, excludeId: task.Id);
                }
            }
            await RefreshDataAsync();
        }

        // Template edit applies to current month onward: active upcoming instances inherit the definition
        private async Task PropagateTemplateToUpcomingAsync(AppTask template, string excludeId)
        {
            var today = DateTime.Today;
            var upcoming = Tasks.Where(x => x.TemplateId == template.Id && x.Id != template.Id
                && x.Id != excludeId && x.ArchivedAt == null && !x.IsDone
                && (TaskDay(x) ?? DateTime.MaxValue).Date >= today).ToList();
            foreach (var s in upcoming)
            {
                s.Title = template.Title;
                s.Priority = template.Priority;
                s.ScheduledTime = template.ScheduledTime;
                s.EisenhowerQuadrant = template.EisenhowerQuadrant;
                s.Notes = template.Notes;
                s.ColumnId = template.ColumnId;
                s.FolderId = template.FolderId;
                s.RecurrenceDays = template.RecurrenceDays;
                s.IsRecurring = template.IsRecurring;
                s.UpdatedAt = DateTime.Now;
                await _repository.SaveTaskAsync(s);
            }
        }

        public async Task CarryForwardTaskAsync(AppTask task)
        {
            task.ScheduledDate = DateTime.Today;
            await _repository.SaveTaskAsync(task);
            await RefreshDataAsync();
        }

        public async Task SaveTodayGroupAsync(List<AppTask> tasks)
        {
            foreach (var t in tasks)
            {
                if (t.IsDone || t.ArchivedAt != null) continue;
                t.UpdatedAt = DateTime.Now;
                await _repository.SaveTaskAsync(t);
            }
            // Recurring pattern: layout arranged on one instance applies to the template + siblings
            await PropagateLayoutToSeriesAsync(tasks);
            await RefreshDataAsync();
        }

        private static DateTime? TaskDay(AppTask t) => (t.DueDate ?? t.ScheduledDate)?.Date;

        private static string TemplateRef(AppTask t) => !string.IsNullOrWhiteSpace(t.TemplateId) ? t.TemplateId : t.Id;

        private AppTask? SameDateInstance(string templateRef, DateTime? day, string excludeId = "")
        {
            if (string.IsNullOrEmpty(templateRef) || day == null) return null;
            return Tasks.FirstOrDefault(x => x.ArchivedAt == null && x.Id != excludeId
                && (x.Id == templateRef || x.TemplateId == templateRef)
                && TaskDay(x) == day);
        }

        private async Task PropagateLayoutToSeriesAsync(List<AppTask> tasks)
        {
            foreach (var t in tasks)
            {
                if (t.IsDone || t.ArchivedAt != null) continue;
                if (string.IsNullOrWhiteSpace(t.TemplateId) || t.Id == t.TemplateId) continue;
                // parent reference at template level (so every date resolves its own instance)
                string parentTemplateRef = "";
                var parent = Tasks.FirstOrDefault(x => x.Id == t.ParentId);
                if (parent != null) parentTemplateRef = TemplateRef(parent);
                // existing siblings follow the same pattern
                var siblings = Tasks.Where(x => x.TemplateId == t.TemplateId && x.Id != t.Id && x.ArchivedAt == null).ToList();
                foreach (var s in siblings)
                {
                    s.RowGroupId = t.RowGroupId;
                    s.SortOrder = t.SortOrder;
                    if (!string.IsNullOrEmpty(parentTemplateRef))
                    {
                        var sp = SameDateInstance(parentTemplateRef, TaskDay(s), s.Id);
                        s.ParentId = sp?.Id ?? string.Empty;
                        if (sp == null) s.RowGroupId = string.Empty;
                    }
                    else s.ParentId = string.Empty;
                    s.UpdatedAt = DateTime.Now;
                    await _repository.SaveTaskAsync(s);
                }
                // template itself stores the pattern for future instances
                var template = Tasks.FirstOrDefault(x => x.Id == t.TemplateId);
                if (template != null)
                {
                    template.RowGroupId = t.RowGroupId;
                    template.SortOrder = t.SortOrder;
                    template.ParentId = parentTemplateRef;
                    template.UpdatedAt = DateTime.Now;
                    await _repository.SaveTaskAsync(template);
                }
            }
        }

        // Newly generated recurring instances inherit the template's layout pattern
        private async Task ApplyTemplateLayoutsAsync()
        {
            bool changed = false;
            var templates = Tasks.Where(t => t.Id == t.TemplateId && !string.IsNullOrWhiteSpace(t.TemplateId)).ToList();
            foreach (var tpl in templates)
            {
                if (string.IsNullOrEmpty(tpl.RowGroupId) && tpl.SortOrder == 0 && string.IsNullOrEmpty(tpl.ParentId)) continue;
                var instances = Tasks.Where(x => x.TemplateId == tpl.Id && x.Id != tpl.Id && x.ArchivedAt == null).ToList();
                foreach (var inst in instances)
                {
                    bool instChanged = false;
                    if (inst.RowGroupId != tpl.RowGroupId) { inst.RowGroupId = tpl.RowGroupId; instChanged = true; }
                    if (inst.SortOrder != tpl.SortOrder) { inst.SortOrder = tpl.SortOrder; instChanged = true; }
                    var wantParent = string.IsNullOrEmpty(tpl.ParentId) ? null : SameDateInstance(tpl.ParentId, TaskDay(inst), inst.Id);
                    var wantParentId = wantParent?.Id ?? string.Empty;
                    if (inst.ParentId != wantParentId) { inst.ParentId = wantParentId; instChanged = true; }
                    if (instChanged)
                    {
                        inst.UpdatedAt = DateTime.Now;
                        await _repository.SaveTaskAsync(inst);
                        changed = true;
                    }
                }
            }
            if (changed) Tasks = await _repository.GetTasksAsync();
        }
    }
}
