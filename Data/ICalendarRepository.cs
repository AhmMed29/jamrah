using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Jamrah.Models;

namespace Jamrah.Data
{
    public interface ICalendarRepository
    {
        /// <summary>
        /// Initializes the SQLite database tables and seeds default calendar metadata if the database is empty.
        /// </summary>
        Task InitAsync();

        /// <summary>
        /// Retrieves all visible calendar events falling within or overlapping the specified date-time range.
        /// </summary>
        /// <param name="start">Inclusive range start timestamp.</param>
        /// <param name="end">Inclusive range end timestamp.</param>
        /// <returns>List of matching CalendarEvent entities.</returns>
        Task<List<CalendarEvent>> GetEventsAsync(DateTime start, DateTime end);

        /// <summary>
        /// Retrieves a single calendar event by its unique string identifier.
        /// </summary>
        /// <param name="id">The unique identifier of the event.</param>
        /// <returns>The CalendarEvent entity if found; null otherwise.</returns>
        Task<CalendarEvent?> GetEventByIdAsync(string id);

        /// <summary>
        /// Saves (inserts or updates) a calendar event in the database.
        /// Automatically manages CreatedAt and UpdatedAt timestamps.
        /// </summary>
        /// <param name="evt">The CalendarEvent entity to save.</param>
        Task SaveEventAsync(CalendarEvent evt);

        /// <summary>
        /// Permanently deletes a calendar event from the database by its unique identifier.
        /// </summary>
        /// <param name="id">The unique identifier of the event to delete.</param>
        Task DeleteEventAsync(string id);

        /// <summary>
        /// Retrieves all calendar categories/infos stored in the database.
        /// </summary>
        /// <returns>List of CalendarInfo entities.</returns>
        Task<List<CalendarInfo>> GetCalendarsAsync();

        /// <summary>
        /// Retrieves a single calendar category by its ID.
        /// </summary>
        /// <param name="id">The unique identifier of the calendar category.</param>
        /// <returns>The CalendarInfo entity if found; null otherwise.</returns>
        Task<CalendarInfo?> GetCalendarByIdAsync(string id);

        /// <summary>
        /// Saves (inserts or updates) a calendar category in the database.
        /// </summary>
        /// <param name="calendar">The CalendarInfo entity to save.</param>
        Task SaveCalendarAsync(CalendarInfo calendar);

        /// <summary>
        /// Deletes a calendar category by its unique identifier.
        /// </summary>
        /// <param name="id">The unique identifier of the calendar category to delete.</param>
        Task DeleteCalendarAsync(string id);
    }
}
