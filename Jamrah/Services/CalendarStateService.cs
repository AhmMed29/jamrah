using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Jamrah.Data;
using Jamrah.Models;

namespace Jamrah.Services
{
    /// <summary>
    /// Supported calendar view modes.
    /// </summary>
    public enum ViewMode
    {
        Month,
        Week,
        Day
    }

    /// <summary>
    /// Contract for Calendar State Management Service.
    /// </summary>
    public interface ICalendarStateService
    {
        DateTime SelectedDate { get; set; }
        ViewMode CurrentView { get; set; }
        List<CalendarEvent> CurrentEvents { get; set; }
        List<CalendarInfo> Calendars { get; set; }
        CalendarEvent? SelectedEvent { get; set; }
        bool IsEventFormOpen { get; set; }
        bool IsEventDetailOpen { get; set; }
        bool IsSeeMoreOpen { get; set; }
        DateTime? SeeMoreDate { get; set; }

        event Action? OnStateChanged;

        Task InitAsync();
        void SetView(ViewMode view);
        Task SetViewAsync(ViewMode view);
        void Next();
        Task NextAsync();
        void Previous();
        Task PreviousAsync();
        void Today();
        Task TodayAsync();
        void SelectDate(DateTime date);
        Task SelectDateAsync(DateTime date);
        void ToggleCalendarCategory(string calendarId);
        Task ToggleCalendarCategoryAsync(string calendarId);
        void OpenCreateEvent(DateTime? date = null);
        void OpenEditEvent(CalendarEvent evt);
        void OpenEventDetail(CalendarEvent evt);
        void OpenSeeMore(DateTime date);
        void CloseModals();
        Task RefreshEventsAsync();
        Task SaveEventAsync(CalendarEvent evt);
        Task DeleteEventAsync(string id);
    }

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

            var activeCalendarIds = Calendars.Where(c => c.IsChecked).Select(c => c.Id).ToHashSet();
            CurrentEvents = rawEvents.Where(e => activeCalendarIds.Contains(e.CalendarId)).ToList();

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
