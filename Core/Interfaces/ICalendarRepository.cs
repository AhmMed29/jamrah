using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Jamrah.Core.Entities;

namespace Jamrah.Core.Interfaces
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
        Task<List<CalendarEvent>> GetEventsAsync(DateTime start, DateTime end);

        /// <summary>
        /// Retrieves a single calendar event by its unique string identifier.
        /// </summary>
        Task<CalendarEvent?> GetEventByIdAsync(string id);

        /// <summary>
        /// Saves (inserts or updates) a calendar event in the database.
        /// Automatically manages CreatedAt and UpdatedAt timestamps.
        /// </summary>
        Task SaveEventAsync(CalendarEvent evt);

        /// <summary>
        /// Permanently deletes a calendar event from the database by its unique identifier.
        /// </summary>
        Task DeleteEventAsync(string id);

        /// <summary>
        /// Retrieves all calendar categories/infos stored in the database.
        /// </summary>
        Task<List<CalendarInfo>> GetCalendarsAsync();

        /// <summary>
        /// Retrieves a single calendar category by its ID.
        /// </summary>
        Task<CalendarInfo?> GetCalendarByIdAsync(string id);

        /// <summary>
        /// Saves (inserts or updates) a calendar category in the database.
        /// </summary>
        Task SaveCalendarAsync(CalendarInfo calendar);

        /// <summary>
        /// Deletes a calendar category by its unique identifier.
        /// </summary>
        Task DeleteCalendarAsync(string id);
    }
}
