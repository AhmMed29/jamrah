using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Jamrah.Core.Entities;
using Jamrah.Core.Interfaces;

namespace Jamrah.Application.Services
{
    /// <summary>
    /// Pure C# state management service for calendar navigation, category filtering,
    /// modal popup management, and data synchronization with ICalendarRepository.
    /// </summary>
    public class CalendarStateService : ICalendarStateService
    {
        private readonly ICalendarRepository _repository;

        public CalendarStateService(ICalendarRepository repository)
        {
            _repository = repository ?? throw new ArgumentNullException(nameof(repository));
        }

        #region State Properties

        public DateTime SelectedDate { get; set; } = DateTime.Today;
        public ViewMode CurrentView { get; set; } = ViewMode.Month;
        public List<CalendarEvent> CurrentEvents { get; set; } = new();
        public List<CalendarInfo> Calendars { get; set; } = new();
        public CalendarEvent? SelectedEvent { get; set; }
        public bool IsEventFormOpen { get; set; }
        public bool IsEventDetailOpen { get; set; }
        public bool IsSeeMoreOpen { get; set; }
        public DateTime? SeeMoreDate { get; set; }

        #endregion

        #region Events & Notification

        public event Action? OnStateChanged;

        private void NotifyStateChanged() => OnStateChanged?.Invoke();

        #endregion

        #region Initialization

        public async Task InitAsync()
        {
            await _repository.InitAsync();
            await RefreshEventsAsync();
        }

        #endregion

        #region View Navigation

        public void SetView(ViewMode view)
        {
            CurrentView = view;
            _ = RefreshEventsAsync();
        }

        public async Task SetViewAsync(ViewMode view)
        {
            CurrentView = view;
            await RefreshEventsAsync();
        }

        public void Next()
        {
            SelectedDate = CurrentView switch
            {
                ViewMode.Month => SelectedDate.AddMonths(1),
                ViewMode.Week => SelectedDate.AddDays(7),
                ViewMode.Day => SelectedDate.AddDays(1),
                _ => SelectedDate.AddDays(1)
            };
            _ = RefreshEventsAsync();
        }

        public async Task NextAsync()
        {
            SelectedDate = CurrentView switch
            {
                ViewMode.Month => SelectedDate.AddMonths(1),
                ViewMode.Week => SelectedDate.AddDays(7),
                ViewMode.Day => SelectedDate.AddDays(1),
                _ => SelectedDate.AddDays(1)
            };
            await RefreshEventsAsync();
        }

        public void Previous()
        {
            SelectedDate = CurrentView switch
            {
                ViewMode.Month => SelectedDate.AddMonths(-1),
                ViewMode.Week => SelectedDate.AddDays(-7),
                ViewMode.Day => SelectedDate.AddDays(-1),
                _ => SelectedDate.AddDays(-1)
            };
            _ = RefreshEventsAsync();
        }

        public async Task PreviousAsync()
        {
            SelectedDate = CurrentView switch
            {
                ViewMode.Month => SelectedDate.AddMonths(-1),
                ViewMode.Week => SelectedDate.AddDays(-7),
                ViewMode.Day => SelectedDate.AddDays(-1),
                _ => SelectedDate.AddDays(-1)
            };
            await RefreshEventsAsync();
        }

        public void Today()
        {
            SelectedDate = DateTime.Today;
            _ = RefreshEventsAsync();
        }

        public async Task TodayAsync()
        {
            SelectedDate = DateTime.Today;
            await RefreshEventsAsync();
        }

        public void SelectDate(DateTime date)
        {
            SelectedDate = date.Date;
            _ = RefreshEventsAsync();
        }

        public async Task SelectDateAsync(DateTime date)
        {
            SelectedDate = date.Date;
            await RefreshEventsAsync();
        }

        #endregion

        #region Category Filtering

        public void ToggleCalendarCategory(string calendarId)
        {
            _ = ToggleCalendarCategoryAsync(calendarId);
        }

        public async Task ToggleCalendarCategoryAsync(string calendarId)
        {
            var calendar = Calendars.FirstOrDefault(c => c.Id == calendarId);
            if (calendar != null)
            {
                calendar.IsChecked = !calendar.IsChecked;
                await _repository.SaveCalendarAsync(calendar);
                await RefreshEventsAsync();
            }
        }

        #endregion

        #region Modal Popups

        public void OpenCreateEvent(DateTime? date = null)
        {
            var eventStart = date ?? SelectedDate;
            if (date == null)
            {
                eventStart = new DateTime(SelectedDate.Year, SelectedDate.Month, SelectedDate.Day, DateTime.Now.Hour, 0, 0);
            }

            SelectedEvent = new CalendarEvent
            {
                Id = Guid.NewGuid().ToString(),
                Title = string.Empty,
                Start = eventStart,
                End = eventStart.AddHours(1),
                CalendarId = Calendars.FirstOrDefault(c => c.IsChecked)?.Id ?? "1",
                IsAllday = false,
                Category = "time"
            };

            IsEventFormOpen = true;
            IsEventDetailOpen = false;
            IsSeeMoreOpen = false;

            NotifyStateChanged();
        }

        public void OpenEditEvent(CalendarEvent evt)
        {
            SelectedEvent = evt;
            IsEventFormOpen = true;
            IsEventDetailOpen = false;
            IsSeeMoreOpen = false;

            NotifyStateChanged();
        }

        public void OpenEventDetail(CalendarEvent evt)
        {
            SelectedEvent = evt;
            IsEventDetailOpen = true;
            IsEventFormOpen = false;

            NotifyStateChanged();
        }

        public void OpenSeeMore(DateTime date)
        {
            SeeMoreDate = date.Date;
            IsSeeMoreOpen = true;
            IsEventFormOpen = false;

            NotifyStateChanged();
        }

        public void CloseModals()
        {
            IsEventFormOpen = false;
            IsEventDetailOpen = false;
            IsSeeMoreOpen = false;
            SeeMoreDate = null;
            SelectedEvent = null;

            NotifyStateChanged();
        }

        #endregion

        #region Data Refresh & CRUD Operations

        public async Task RefreshEventsAsync()
        {
            Calendars = await _repository.GetCalendarsAsync();

            var (rangeStart, rangeEnd) = GetViewDateRange(SelectedDate, CurrentView);

            var rawEvents = await _repository.GetEventsAsync(rangeStart, rangeEnd);

            var masters = rawEvents.Where(e => !string.IsNullOrEmpty(e.RecurrenceRule) && string.IsNullOrEmpty(e.RecurrenceId)).ToList();
            var overrides = rawEvents.Where(e => !string.IsNullOrEmpty(e.RecurrenceId)).ToList();
            var singles = rawEvents.Where(e => string.IsNullOrEmpty(e.RecurrenceRule) && string.IsNullOrEmpty(e.RecurrenceId)).ToList();

            var expanded = new List<CalendarEvent>();
            foreach (var master in masters)
            {
                try
                {
                    expanded.AddRange(RecurrenceExpander.ExpandEvents(master, rangeStart, rangeEnd, new HashSet<string>(), overrides));
                }
                catch
                {
                    expanded.Add(master);
                }
            }

            var overridesInRange = overrides.Where(e => e.End >= rangeStart && e.Start <= rangeEnd).ToList();

            var activeCalendarIds = Calendars.Where(c => c.IsChecked).Select(c => c.Id).ToHashSet();
            if (activeCalendarIds.Count == 0) activeCalendarIds = Calendars.Select(c => c.Id).ToHashSet();
            CurrentEvents = singles.Concat(expanded).Concat(overridesInRange)
                .Where(e => activeCalendarIds.Contains(e.CalendarId)).ToList();

            NotifyStateChanged();
        }

        public async Task SaveEventAsync(CalendarEvent evt)
        {
            await _repository.SaveEventAsync(evt);
            CloseModals();
            await RefreshEventsAsync();
        }

        public async Task DeleteEventAsync(string id)
        {
            await _repository.DeleteEventAsync(id);
            CloseModals();
            await RefreshEventsAsync();
        }

        public async Task SaveSingleOccurrenceAsync(CalendarEvent occurrence)
        {
            var masterId = !string.IsNullOrEmpty(occurrence.RecurrenceId)
                ? occurrence.RecurrenceId
                : occurrence.Id.Split('_')[0];
            var master = await _repository.GetEventByIdAsync(masterId);
            if (master == null)
            {
                await SaveEventAsync(occurrence);
                return;
            }
            var key = occurrence.Start.ToString("yyyy-MM-dd");
            if (!master.ExceptionDates.Contains(key))
            {
                master.ExceptionDates.Add(key);
                await _repository.SaveEventAsync(master);
            }
            var ov = new CalendarEvent
            {
                Id = Guid.NewGuid().ToString(),
                RecurrenceId = master.Id,
                OriginalOccurrenceDate = key,
                IsException = true,
                CalendarId = occurrence.CalendarId,
                Title = occurrence.Title,
                Body = occurrence.Body,
                Location = occurrence.Location,
                IsAllday = occurrence.IsAllday,
                Start = occurrence.Start,
                End = occurrence.End,
                Category = occurrence.Category,
                Color = occurrence.Color,
                BackgroundColor = occurrence.BackgroundColor,
                BorderColor = occurrence.BorderColor,
                IsVisible = true,
            };
            ov.SyncJson();
            await _repository.SaveEventAsync(ov);
            CloseModals();
            await RefreshEventsAsync();
        }

        public async Task DeleteSingleOccurrenceAsync(CalendarEvent occurrence)
        {
            var masterId = !string.IsNullOrEmpty(occurrence.RecurrenceId)
                ? occurrence.RecurrenceId
                : occurrence.Id.Split('_')[0];
            var master = await _repository.GetEventByIdAsync(masterId);
            if (master == null)
            {
                await DeleteEventAsync(occurrence.Id);
                return;
            }
            var key = occurrence.Start.ToString("yyyy-MM-dd");
            if (!master.ExceptionDates.Contains(key))
            {
                master.ExceptionDates.Add(key);
                await _repository.SaveEventAsync(master);
            }
            var raw = await _repository.GetEventsAsync(occurrence.Start.AddDays(-1), occurrence.End.AddDays(1));
            foreach (var o in raw.Where(e => e.RecurrenceId == master.Id && e.OriginalOccurrenceDate == key))
            {
                await _repository.DeleteEventAsync(o.Id);
            }
            CloseModals();
            await RefreshEventsAsync();
        }

        public async Task SaveSeriesEditAsync(CalendarEvent occurrenceEdited)
        {
            var masterId = !string.IsNullOrEmpty(occurrenceEdited.RecurrenceId)
                ? occurrenceEdited.RecurrenceId
                : occurrenceEdited.Id.Split('_')[0];
            var master = await _repository.GetEventByIdAsync(masterId);
            if (master == null)
            {
                await SaveEventAsync(occurrenceEdited);
                return;
            }
            master.Title = occurrenceEdited.Title;
            master.Body = occurrenceEdited.Body;
            master.Location = occurrenceEdited.Location;
            master.CalendarId = occurrenceEdited.CalendarId;
            master.IsAllday = occurrenceEdited.IsAllday;
            master.Category = occurrenceEdited.Category;
            master.Color = occurrenceEdited.Color;
            master.BackgroundColor = occurrenceEdited.BackgroundColor;
            master.BorderColor = occurrenceEdited.BorderColor;
            var duration = occurrenceEdited.End - occurrenceEdited.Start;
            master.Start = master.Start.Date.Add(occurrenceEdited.Start.TimeOfDay);
            master.End = master.Start.Add(duration);
            master.RecurrenceRule = occurrenceEdited.RecurrenceRule;
            foreach (var ex in occurrenceEdited.ExceptionDates)
            {
                if (!master.ExceptionDates.Contains(ex)) master.ExceptionDates.Add(ex);
            }
            master.SyncJson();
            await _repository.SaveEventAsync(master);
            CloseModals();
            await RefreshEventsAsync();
        }

        public async Task DeleteFutureAsync(CalendarEvent occurrence)
        {
            var masterId = !string.IsNullOrEmpty(occurrence.RecurrenceId)
                ? occurrence.RecurrenceId
                : occurrence.Id.Split('_')[0];
            var master = await _repository.GetEventByIdAsync(masterId);
            if (master == null)
            {
                await DeleteEventAsync(occurrence.Id);
                return;
            }
            var cut = occurrence.Start.Date;
            var cutKey = cut.ToString("yyyy-MM-dd");
            var oldRule = RecurrenceExpander.TryParse(master.RecurrenceRule);
            var freq = oldRule?.Freq ?? "WEEKLY";
            master.RecurrenceRule = RecurrenceExpander.Build(freq, oldRule?.Interval ?? 1, oldRule?.ByDays, null, cut.AddDays(-1));
            await _repository.SaveEventAsync(master);
            var raw = await _repository.GetEventsAsync(cut, DateTime.MaxValue);
            foreach (var o in raw.Where(e => e.RecurrenceId == master.Id && string.Compare(e.OriginalOccurrenceDate, cutKey, StringComparison.Ordinal) >= 0))
            {
                await _repository.DeleteEventAsync(o.Id);
            }
            CloseModals();
            await RefreshEventsAsync();
        }

        public async Task DeleteSeriesAsync(string masterId)
        {
            var realId = masterId.Contains('_') ? masterId.Split('_')[0] : masterId;
            var raw = await _repository.GetEventsAsync(DateTime.MinValue, DateTime.MaxValue);
            foreach (var e in raw.Where(e => e.Id == realId || e.RecurrenceId == realId))
            {
                await _repository.DeleteEventAsync(e.Id);
            }
            CloseModals();
            await RefreshEventsAsync();
        }

        public async Task SplitFutureAsync(CalendarEvent occurrence)
        {
            var masterId = !string.IsNullOrEmpty(occurrence.RecurrenceId)
                ? occurrence.RecurrenceId
                : occurrence.Id.Split('_')[0];
            var master = await _repository.GetEventByIdAsync(masterId);
            if (master == null)
            {
                await SaveEventAsync(occurrence);
                return;
            }
            var cut = occurrence.Start.Date;
            var oldRule = RecurrenceExpander.TryParse(master.RecurrenceRule);
            var editedRule = RecurrenceExpander.TryParse(occurrence.RecurrenceRule) ?? oldRule;
            var freq = oldRule?.Freq ?? "WEEKLY";
            var by = oldRule?.ByDays;
            var interval = oldRule?.Interval ?? 1;
            master.RecurrenceRule = RecurrenceExpander.Build(freq, interval, by, null, cut.AddDays(-1));
            await _repository.SaveEventAsync(master);
            var next = new CalendarEvent
            {
                Id = Guid.NewGuid().ToString(),
                CalendarId = occurrence.CalendarId,
                Title = occurrence.Title,
                Body = occurrence.Body,
                Location = occurrence.Location,
                IsAllday = occurrence.IsAllday,
                Start = occurrence.Start,
                End = occurrence.End,
                Category = occurrence.Category,
                Color = occurrence.Color,
                BackgroundColor = occurrence.BackgroundColor,
                BorderColor = occurrence.BorderColor,
                RecurrenceRule = !string.IsNullOrEmpty(occurrence.RecurrenceRule)
                    ? occurrence.RecurrenceRule
                    : RecurrenceExpander.Build(freq, interval, by, oldRule?.Count, oldRule?.Until),
                IsVisible = true,
            };
            next.SyncJson();
            await _repository.SaveEventAsync(next);
            CloseModals();
            await RefreshEventsAsync();
        }

        #endregion

        #region Helper Date Range Math

        public static (DateTime RangeStart, DateTime RangeEnd) GetViewDateRange(DateTime date, ViewMode view)
        {
            switch (view)
            {
                case ViewMode.Month:
                    var firstOfMonth = new DateTime(date.Year, date.Month, 1);
                    var gridStart = firstOfMonth.AddDays(-(int)firstOfMonth.DayOfWeek);
                    var gridEnd = gridStart.AddDays(42).AddTicks(-1);
                    return (gridStart, gridEnd);

                case ViewMode.Week:
                    var weekStart = date.Date.AddDays(-(int)date.DayOfWeek);
                    var weekEnd = weekStart.AddDays(7).AddTicks(-1);
                    return (weekStart, weekEnd);

                case ViewMode.Day:
                default:
                    var dayStart = date.Date;
                    var dayEnd = dayStart.AddDays(1).AddTicks(-1);
                    return (dayStart, dayEnd);
            }
        }

        #endregion
    }
}
