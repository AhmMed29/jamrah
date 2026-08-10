using System;
using System.Collections.Generic;
using System.Text.Json;
using SQLite;

namespace Jamrah.Models
{
    /// <summary>
    /// Represents a calendar event entity, fully compatible with tui.calendar EventObject
    /// and persisted via SQLite-net ORM.
    /// </summary>
    [Table("CalendarEvents")]
    public class CalendarEvent
    {
        private List<string>? _attendees;
        private string _attendeesJson = "[]";

        private Dictionary<string, string>? _customStyle;
        private string _customStyleJson = "{}";

        /// <summary>
        /// Unique event identifier (Primary Key).
        /// </summary>
        [PrimaryKey]
        public string Id { get; set; } = Guid.NewGuid().ToString();

        /// <summary>
        /// Identifier of the associated calendar category.
        /// </summary>
        [Indexed]
        public string CalendarId { get; set; } = "1";

        /// <summary>
        /// Event title.
        /// </summary>
        public string Title { get; set; } = string.Empty;

        /// <summary>
        /// Event description / body text.
        /// </summary>
        public string Body { get; set; } = string.Empty;

        /// <summary>
        /// Flag indicating whether the event is an all-day event.
        /// </summary>
        [Indexed]
        public bool IsAllday { get; set; } = false;

        /// <summary>
        /// Event start timestamp.
        /// </summary>
        [Indexed]
        public DateTime Start { get; set; } = DateTime.UtcNow;

        /// <summary>
        /// Event end timestamp.
        /// </summary>
        [Indexed]
        public DateTime End { get; set; } = DateTime.UtcNow.AddMinutes(30);

        /// <summary>
        /// Travel time before the event in minutes.
        /// </summary>
        public int GoingDuration { get; set; } = 0;

        /// <summary>
        /// Travel time after the event in minutes.
        /// </summary>
        public int ComingDuration { get; set; } = 0;

        /// <summary>
        /// Physical location or meeting link.
        /// </summary>
        public string Location { get; set; } = string.Empty;

        /// <summary>
        /// Serialized JSON string of attendees list for SQLite storage.
        /// </summary>
        public string AttendeesJson
        {
            get
            {
                if (_attendees != null)
                {
                    _attendeesJson = JsonSerializer.Serialize(_attendees);
                }
                return _attendeesJson;
            }
            set
            {
                _attendeesJson = value ?? "[]";
                _attendees = null;
            }
        }

        /// <summary>
        /// In-memory attendees list (ignored by SQLite, serialized to/from AttendeesJson).
        /// </summary>
        [Ignore]
        public List<string> Attendees
        {
            get
            {
                if (_attendees == null)
                {
                    if (!string.IsNullOrWhiteSpace(_attendeesJson))
                    {
                        try
                        {
                            _attendees = JsonSerializer.Deserialize<List<string>>(_attendeesJson);
                        }
                        catch
                        {
                            _attendees = null;
                        }
                    }
                    _attendees ??= new List<string>();
                }
                return _attendees;
            }
            set
            {
                _attendees = value ?? new List<string>();
                _attendeesJson = JsonSerializer.Serialize(_attendees);
            }
        }

        /// <summary>
        /// Category discriminator ('time', 'allday', 'milestone', 'task').
        /// </summary>
        [Indexed]
        public string Category { get; set; } = "time";

        /// <summary>
        /// Classification tag for work events.
        /// </summary>
        public string DueDateClass { get; set; } = string.Empty;

        /// <summary>
        /// Recurrence rule string (iCalendar RRULE format).
        /// </summary>
        public string RecurrenceRule { get; set; } = string.Empty;

        /// <summary>
        /// Availability state ('Busy' or 'Free').
        /// </summary>
        public string State { get; set; } = "Busy";

        /// <summary>
        /// Visibility toggle flag.
        /// </summary>
        [Indexed]
        public bool IsVisible { get; set; } = true;

        /// <summary>
        /// Pending approval / sync state flag.
        /// </summary>
        public bool IsPending { get; set; } = false;

        /// <summary>
        /// UI focused state flag.
        /// </summary>
        public bool IsFocused { get; set; } = false;

        /// <summary>
        /// Read-only permissions flag.
        /// </summary>
        public bool IsReadOnly { get; set; } = false;

        /// <summary>
        /// Private event flag.
        /// </summary>
        public bool IsPrivate { get; set; } = false;

        /// <summary>
        /// Custom text color override (HEX/CSS).
        /// </summary>
        public string Color { get; set; } = string.Empty;

        /// <summary>
        /// Custom background color override (HEX/CSS).
        /// </summary>
        public string BackgroundColor { get; set; } = string.Empty;

        /// <summary>
        /// Custom drag handle background color override.
        /// </summary>
        public string DragBackgroundColor { get; set; } = string.Empty;

        /// <summary>
        /// Custom border color override.
        /// </summary>
        public string BorderColor { get; set; } = string.Empty;

        /// <summary>
        /// Serialized JSON string of custom CSS style key-value pairs for SQLite storage.
        /// </summary>
        public string CustomStyleJson
        {
            get
            {
                if (_customStyle != null)
                {
                    _customStyleJson = JsonSerializer.Serialize(_customStyle);
                }
                return _customStyleJson;
            }
            set
            {
                _customStyleJson = value ?? "{}";
                _customStyle = null;
            }
        }

        /// <summary>
        /// In-memory dictionary of custom styles (ignored by SQLite, serialized to/from CustomStyleJson).
        /// </summary>
        [Ignore]
        public Dictionary<string, string> CustomStyle
        {
            get
            {
                if (_customStyle == null)
                {
                    if (!string.IsNullOrWhiteSpace(_customStyleJson))
                    {
                        try
                        {
                            _customStyle = JsonSerializer.Deserialize<Dictionary<string, string>>(_customStyleJson);
                        }
                        catch
                        {
                            _customStyle = null;
                        }
                    }
                    _customStyle ??= new Dictionary<string, string>();
                }
                return _customStyle;
            }
            set
            {
                _customStyle = value ?? new Dictionary<string, string>();
                _customStyleJson = JsonSerializer.Serialize(_customStyle);
            }
        }

        /// <summary>
        /// Synchronizes in-memory collection states with JSON string backing properties.
        /// </summary>
        public void SyncJson()
        {
            if (_attendees != null)
            {
                _attendeesJson = JsonSerializer.Serialize(_attendees);
            }
            if (_customStyle != null)
            {
                _customStyleJson = JsonSerializer.Serialize(_customStyle);
            }
        }

        /// <summary>
        /// Raw data string / custom JSON payload.
        /// </summary>
        public string Raw { get; set; } = string.Empty;

        /// <summary>
        /// Audit creation timestamp (UTC).
        /// </summary>
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        /// <summary>
        /// Audit modification timestamp (UTC).
        /// </summary>
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        #region Computed Helper Properties (Ignored by SQLite)

        /// <summary>
        /// Computed property checking if event spans across midnight or multiple days.
        /// </summary>
        [Ignore]
        public bool HasMultiDates => (End.Date - Start.Date).Days > 0;

        /// <summary>
        /// Total duration of the event (excluding travel time).
        /// </summary>
        [Ignore]
        public TimeSpan Duration => End - Start;

        /// <summary>
        /// Total effective start time including travel going duration.
        /// </summary>
        [Ignore]
        public DateTime EffectiveStart => Start.AddMinutes(-GoingDuration);

        /// <summary>
        /// Total effective end time including travel coming duration.
        /// </summary>
        [Ignore]
        public DateTime EffectiveEnd => End.AddMinutes(ComingDuration);

        #endregion
    }
}
