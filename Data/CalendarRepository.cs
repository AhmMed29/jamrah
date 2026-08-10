using System;
using System.Collections.Generic;
using System.IO;
using System.Threading;
using System.Threading.Tasks;
using SQLite;
using Jamrah.Models;
using Microsoft.Maui.Storage;

namespace Jamrah.Data
{
    /// <summary>
    /// Asynchronous SQLite repository implementation using sqlite-net-pcl for local persistence.
    /// Provides platform-independent DB path resolution, thread-safe lazy initialization, and seeded default data.
    /// </summary>
    public class CalendarRepository : ICalendarRepository
    {
        private SQLiteAsyncConnection? _database;
        private readonly string _dbPath;
        private readonly SemaphoreSlim _initLock = new SemaphoreSlim(1, 1);
        private bool _isInitialized = false;

        /// <summary>
        /// Initializes a new instance of CalendarRepository with custom database path or platform default AppDataDirectory.
        /// </summary>
        /// <param name="customDbPath">Optional custom path for testing/overrides. If null, uses AppDataDirectory/jamrah_calendar.db3.</param>
        public CalendarRepository(string? customDbPath = null)
        {
            _dbPath = customDbPath ?? Path.Combine(FileSystem.AppDataDirectory, "jamrah_calendar.db3");
        }

        /// <summary>
        /// Ensures the SQLite database connection, tables, and default seed data are initialized safely once.
        /// </summary>
        public async Task InitAsync()
        {
            if (_isInitialized && _database is not null)
            {
                return;
            }

            await _initLock.WaitAsync();
            try
            {
                if (_isInitialized && _database is not null)
                {
                    return;
                }

                // Ensure parent directory exists
                var directory = Path.GetDirectoryName(_dbPath);
                if (!string.IsNullOrEmpty(directory) && !Directory.Exists(directory))
                {
                    Directory.CreateDirectory(directory);
                }

                _database = new SQLiteAsyncConnection(_dbPath);

                // Create tables if they do not exist
                await _database.CreateTableAsync<CalendarEvent>().ConfigureAwait(false);
                await _database.CreateTableAsync<CalendarInfo>().ConfigureAwait(false);

                // Seed default calendar categories if empty
                var calendarCount = await _database.Table<CalendarInfo>().CountAsync().ConfigureAwait(false);
                if (calendarCount == 0)
                {
                    var defaultCalendars = new List<CalendarInfo>
                    {
                        new CalendarInfo
                        {
                            Id = "1",
                            Name = "General",
                            Color = "#FFFFFF",
                            BackgroundColor = "#2196F3",
                            DragBackgroundColor = "#1976D2",
                            BorderColor = "#0D47A1",
                            IsChecked = true
                        },
                        new CalendarInfo
                        {
                            Id = "2",
                            Name = "Work",
                            Color = "#FFFFFF",
                            BackgroundColor = "#9C27B0",
                            DragBackgroundColor = "#7B1FA2",
                            BorderColor = "#4A148C",
                            IsChecked = true
                        },
                        new CalendarInfo
                        {
                            Id = "3",
                            Name = "Personal",
                            Color = "#FFFFFF",
                            BackgroundColor = "#4CAF50",
                            DragBackgroundColor = "#388E3C",
                            BorderColor = "#1B5E20",
                            IsChecked = true
                        }
                    };

                    await _database.InsertAllAsync(defaultCalendars).ConfigureAwait(false);
                }

                _isInitialized = true;
            }
            finally
            {
                _initLock.Release();
            }
        }

        /// <inheritdoc />
        public async Task<List<CalendarEvent>> GetEventsAsync(DateTime start, DateTime end)
        {
            await InitAsync().ConfigureAwait(false);
            
            // Query events where End >= range start AND Start <= range end (captures overlapping multi-day & single-day events)
            return await _database!.Table<CalendarEvent>()
                .Where(e => e.IsVisible && e.End >= start && e.Start <= end)
                .ToListAsync()
                .ConfigureAwait(false);
        }

        /// <inheritdoc />
        public async Task<CalendarEvent?> GetEventByIdAsync(string id)
        {
            await InitAsync().ConfigureAwait(false);

            if (string.IsNullOrWhiteSpace(id))
            {
                return null;
            }

            return await _database!.Table<CalendarEvent>()
                .Where(e => e.Id == id)
                .FirstOrDefaultAsync()
                .ConfigureAwait(false);
        }

        /// <inheritdoc />
        public async Task SaveEventAsync(CalendarEvent evt)
        {
            if (evt == null)
            {
                throw new ArgumentNullException(nameof(evt));
            }

            await InitAsync().ConfigureAwait(false);

            if (string.IsNullOrWhiteSpace(evt.Id))
            {
                evt.Id = Guid.NewGuid().ToString();
            }

            if (evt.CreatedAt == default)
            {
                evt.CreatedAt = DateTime.UtcNow;
            }

            evt.UpdatedAt = DateTime.UtcNow;

            evt.SyncJson();

            await _database!.InsertOrReplaceAsync(evt).ConfigureAwait(false);
        }

        /// <inheritdoc />
        public async Task DeleteEventAsync(string id)
        {
            if (string.IsNullOrWhiteSpace(id))
            {
                return;
            }

            await InitAsync().ConfigureAwait(false);
            await _database!.DeleteAsync<CalendarEvent>(id).ConfigureAwait(false);
        }

        /// <inheritdoc />
        public async Task<List<CalendarInfo>> GetCalendarsAsync()
        {
            await InitAsync().ConfigureAwait(false);
            return await _database!.Table<CalendarInfo>()
                .ToListAsync()
                .ConfigureAwait(false);
        }

        /// <inheritdoc />
        public async Task<CalendarInfo?> GetCalendarByIdAsync(string id)
        {
            await InitAsync().ConfigureAwait(false);

            if (string.IsNullOrWhiteSpace(id))
            {
                return null;
            }

            return await _database!.Table<CalendarInfo>()
                .Where(c => c.Id == id)
                .FirstOrDefaultAsync()
                .ConfigureAwait(false);
        }

        /// <inheritdoc />
        public async Task SaveCalendarAsync(CalendarInfo calendar)
        {
            if (calendar == null)
            {
                throw new ArgumentNullException(nameof(calendar));
            }

            await InitAsync().ConfigureAwait(false);

            await _database!.InsertOrReplaceAsync(calendar).ConfigureAwait(false);
        }

        /// <inheritdoc />
        public async Task DeleteCalendarAsync(string id)
        {
            if (string.IsNullOrWhiteSpace(id))
            {
                return;
            }

            await InitAsync().ConfigureAwait(false);
            await _database!.DeleteAsync<CalendarInfo>(id).ConfigureAwait(false);
        }
    }
}
