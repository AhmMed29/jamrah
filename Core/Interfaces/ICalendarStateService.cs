using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Jamrah.Core.Entities;

namespace Jamrah.Core.Interfaces
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
}
