using System;
using System.Collections.Generic;
using System.Linq;
using Jamrah.Models;

namespace Jamrah.Models
{
    public class TimeSlotUIModel
    {
        public CalendarEvent Event { get; set; } = null!;

        // Vertical percentage coordinates (0.0 to 100.0)
        public double TopPercent { get; set; }
        public double HeightPercent { get; set; }

        // Horizontal percentage coordinates (0.0 to 100.0)
        public double LeftPercent { get; set; }
        public double WidthPercent { get; set; }

        // Collision Matrix Metadata
        public int ColumnIndex { get; set; }
        public int MaxColumns { get; set; }

        // Travel Time Breakdown Percentages
        public double GoingDurationHeightPercent { get; set; }
        public double ModelDurationHeightPercent { get; set; }
        public double ComingDurationHeightPercent { get; set; }

        // Cropping flags (if event extends outside view start/end)
        public bool CroppedStart { get; set; }
        public bool CroppedEnd { get; set; }

        // Inline CSS Style Helper
        public string InlineStyle =>
            $"top: {TopPercent:F2}%; " +
            $"height: {HeightPercent:F2}%; " +
            $"left: {LeftPercent:F2}%; " +
            $"width: {WidthPercent:F2}%;";
    }

    public class MonthEventSpanUIModel
    {
        public CalendarEvent Event { get; set; } = null!;

        // Week row index (0 to 5)
        public int WeekIndex { get; set; }

        // Vertical slot index within the week row (0, 1, 2...)
        public int RowIndex { get; set; }

        // Column span info (0 to 6)
        public int StartColumn { get; set; }
        public int ColSpan { get; set; }

        // Percentage positioning for CSS
        public double LeftPercent => (StartColumn / 7.0) * 100.0;
        public double WidthPercent => (ColSpan / 7.0) * 100.0;

        public bool ExceedLeft { get; set; }
        public bool ExceedRight { get; set; }

        public string InlineStyle => $"left: {LeftPercent:F2}%; width: {WidthPercent:F2}%;";
    }

    public class MonthCellInfo
    {
        public DateTime Date { get; set; }
        public bool IsCurrentMonth { get; set; }
        public bool IsToday { get; set; }

        // Rendered event span bars / items active on this date
        public List<CalendarEvent> Events { get; set; } = new();

        // Overflow events exceeding max visible limit (e.g. > 3)
        public List<CalendarEvent> OverflowEvents { get; set; } = new();

        public int OverflowCount => OverflowEvents.Count;
        public bool HasOverflow => OverflowCount > 0;
    }

    public class MonthGridMatrix
    {
        public int Year { get; set; }
        public int Month { get; set; }

        // 5 or 6 weeks array of 7 day cells
        public List<MonthCellInfo[]> Weeks { get; set; } = new();

        // Rendered horizontal multi-day event spans grouped per week
        public List<List<MonthEventSpanUIModel>> WeekEventSpans { get; set; } = new();

        public int TotalWeeks => Weeks.Count;
    }
}

namespace Jamrah.Services
{
    public class CalendarLayoutEngine
    {
        private const double MIN_HEIGHT_PERCENT = 1.0; // Min event block height (approx 15 mins)

        #region Week & Day Time Grid Collision Engine

        /// <summary>
        /// Computes percentage layout coordinates for events in a single time column (e.g., 24-hour day column).
        /// Replicates tui.calendar setRenderInfoOfUIModels & getCollisionGroup algorithms.
        /// </summary>
        public List<TimeSlotUIModel> ComputeTimeSlotPositions(
            List<CalendarEvent> events,
            DateTime columnStart,
            DateTime columnEnd,
            bool usingTravelTime = true)
        {
            if (events == null || events.Count == 0)
                return new List<TimeSlotUIModel>();

            // Filter events overlapping with columnStart -> columnEnd and ignore all-day events
            var timeEvents = events
                .Where(e => !e.IsAllday && e.Category == "time")
                .Where(e => IsBetween(e, columnStart, columnEnd, usingTravelTime))
                .OrderBy(e => usingTravelTime ? e.EffectiveStart : e.Start)
                .ThenByDescending(e => e.Duration)
                .ToList();

            if (timeEvents.Count == 0)
                return new List<TimeSlotUIModel>();

            // 1. Group into collision clusters
            var collisionGroups = GetCollisionGroups(timeEvents, usingTravelTime);

            var result = new List<TimeSlotUIModel>();

            // 2. Compute 2D placement matrix for each collision cluster
            foreach (var group in collisionGroups)
            {
                var uiModels = GroupToMatrixPlacement(group, columnStart, columnEnd, usingTravelTime);
                result.AddRange(uiModels);
            }

            return result;
        }

        /// <summary>
        /// Checks if an event falls within a column time window considering travel duration.
        /// </summary>
        public bool IsBetween(CalendarEvent evt, DateTime start, DateTime end, bool usingTravelTime)
        {
            DateTime ownStarts = usingTravelTime ? evt.EffectiveStart : evt.Start;
            DateTime ownEnds = usingTravelTime ? evt.EffectiveEnd : evt.End;

            return !(ownEnds <= start || ownStarts >= end);
        }

        /// <summary>
        /// Pure C# algorithm for overlapping time grid collision grouping.
        /// Replicates getCollisionGroup from tui.calendar core.ts.
        /// </summary>
        public List<List<CalendarEvent>> GetCollisionGroups(List<CalendarEvent> events, bool usingTravelTime)
        {
            var collisionGroups = new List<List<CalendarEvent>>();
            if (events == null || events.Count == 0) return collisionGroups;

            collisionGroups.Add(new List<CalendarEvent> { events[0] });

            for (int i = 1; i < events.Count; i++)
            {
                var currentEvent = events[i];
                var previousEvents = events.Take(i).Reverse().ToList();

                var foundPrevious = previousEvents.FirstOrDefault(prev =>
                    EventsCollide(currentEvent, prev, usingTravelTime));

                if (foundPrevious == null)
                {
                    // No collision with prior events -> spawn new collision group
                    collisionGroups.Add(new List<CalendarEvent> { currentEvent });
                }
                else
                {
                    // Find the group containing the colliding event (search backwards)
                    var targetGroup = collisionGroups.LastOrDefault(g => g.Contains(foundPrevious));
                    if (targetGroup != null)
                    {
                        targetGroup.Add(currentEvent);
                    }
                    else
                    {
                        collisionGroups.Add(new List<CalendarEvent> { currentEvent });
                    }
                }
            }

            return collisionGroups;
        }

        /// <summary>
        /// Checks collision between two calendar events based on effective start/end times.
        /// </summary>
        public bool EventsCollide(CalendarEvent a, CalendarEvent b, bool usingTravelTime)
        {
            DateTime startA = usingTravelTime ? a.EffectiveStart : a.Start;
            DateTime endA = usingTravelTime ? a.EffectiveEnd : a.End;
            DateTime startB = usingTravelTime ? b.EffectiveStart : b.Start;
            DateTime endB = usingTravelTime ? b.EffectiveEnd : b.End;

            return startA < endB && endA > startB;
        }

        /// <summary>
        /// Places a collision group into a 2D matrix and assigns percentage column positions.
        /// Replicates getMatrices & setRenderInfo from core.ts & column.ts.
        /// </summary>
        private List<TimeSlotUIModel> GroupToMatrixPlacement(
            List<CalendarEvent> group,
            DateTime columnStart,
            DateTime columnEnd,
            bool usingTravelTime)
        {
            var matrix = new List<List<CalendarEvent>> { new List<CalendarEvent>() };

            foreach (var evt in group)
            {
                int col = 0;
                bool placed = false;

                while (!placed)
                {
                    int lastRow = GetLastRowInColumn(matrix, col);

                    if (lastRow == -1)
                    {
                        // Column is completely empty at row 0
                        EnsureMatrixCapacity(matrix, 0, col);
                        matrix[0][col] = evt;
                        placed = true;
                    }
                    else if (!EventsCollide(evt, matrix[lastRow][col], usingTravelTime))
                    {
                        // Can stack under last event in this column
                        int nextRow = lastRow + 1;
                        EnsureMatrixCapacity(matrix, nextRow, col);
                        matrix[nextRow][col] = evt;
                        placed = true;
                    }
                    else
                    {
                        // Column blocked, try next column index
                        col++;
                    }
                }
            }

            // Calculate max columns in this matrix
            int maxColumns = matrix.Max(row => row.Count);
            double baseWidth = 100.0 / maxColumns;

            var uiModels = new List<TimeSlotUIModel>();
            double totalColumnMinutes = (columnEnd - columnStart).TotalMinutes;
            if (totalColumnMinutes <= 0) totalColumnMinutes = 1440;

            for (int r = 0; r < matrix.Count; r++)
            {
                for (int c = 0; c < matrix[r].Count; c++)
                {
                    var evt = matrix[r][c];
                    if (evt == null) continue;

                    DateTime effStart = usingTravelTime ? evt.EffectiveStart : evt.Start;
                    DateTime effEnd = usingTravelTime ? evt.EffectiveEnd : evt.End;

                    DateTime renderStart = effStart < columnStart ? columnStart : effStart;
                    DateTime renderEnd = effEnd > columnEnd ? columnEnd : effEnd;

                    double topMinutes = (renderStart - columnStart).TotalMinutes;
                    double durationMinutes = (renderEnd - renderStart).TotalMinutes;

                    double topPercent = (topMinutes / totalColumnMinutes) * 100.0;
                    double heightPercent = Math.Max(MIN_HEIGHT_PERCENT, (durationMinutes / totalColumnMinutes) * 100.0);

                    double leftPercent = c * baseWidth;
                    double widthPercent = baseWidth;

                    var model = new TimeSlotUIModel
                    {
                        Event = evt,
                        TopPercent = topPercent,
                        HeightPercent = heightPercent,
                        LeftPercent = leftPercent,
                        WidthPercent = widthPercent,
                        ColumnIndex = c,
                        MaxColumns = maxColumns,
                        CroppedStart = effStart < columnStart,
                        CroppedEnd = effEnd > columnEnd
                    };

                    // Compute travel breakdown
                    if (usingTravelTime && (evt.GoingDuration > 0 || evt.ComingDuration > 0))
                    {
                        double totalDur = (effEnd - effStart).TotalMinutes;
                        if (totalDur > 0)
                        {
                            model.GoingDurationHeightPercent = (evt.GoingDuration / totalDur) * 100.0;
                            model.ComingDurationHeightPercent = (evt.ComingDuration / totalDur) * 100.0;
                            model.ModelDurationHeightPercent = 100.0 - model.GoingDurationHeightPercent - model.ComingDurationHeightPercent;
                        }
                    }
                    else
                    {
                        model.ModelDurationHeightPercent = 100.0;
                    }

                    uiModels.Add(model);
                }
            }

            return uiModels;
        }

        private int GetLastRowInColumn(List<List<CalendarEvent>> matrix, int col)
        {
            for (int r = matrix.Count - 1; r >= 0; r--)
            {
                if (col < matrix[r].Count && matrix[r][col] != null)
                {
                    return r;
                }
            }
            return -1;
        }

        private void EnsureMatrixCapacity(List<List<CalendarEvent>> matrix, int row, int col)
        {
            while (matrix.Count <= row)
            {
                matrix.Add(new List<CalendarEvent>());
            }
            while (matrix[row].Count <= col)
            {
                matrix[row].Add(null!);
            }
        }

        #endregion

        #region Month Grid Matrix & Horizontal Event Span Engine

        /// <summary>
        /// Generates the complete 5/6-week Month Grid Matrix and computes day cell events,
        /// horizontal multi-day span bars, and day overflow events.
        /// Replicates tui.calendar findByDateRange & positionUIModels logic.
        /// </summary>
        public MonthGridMatrix GenerateMonthGridMatrix(
            int year,
            int month,
            List<CalendarEvent> events,
            int maxVisibleEventsPerDay = 3,
            DayOfWeek startOfWeek = DayOfWeek.Sunday)
        {
            var firstOfMonth = new DateTime(year, month, 1);
            int daysOffset = ((int)firstOfMonth.DayOfWeek - (int)startOfWeek + 7) % 7;
            var gridStart = firstOfMonth.AddDays(-daysOffset);

            // Determine if 5 or 6 weeks are required
            int daysInMonth = DateTime.DaysInMonth(year, month);
            int totalDaysNeeded = daysOffset + daysInMonth;
            int totalWeeks = (int)Math.Ceiling(totalDaysNeeded / 7.0);
            if (totalWeeks < 5) totalWeeks = 5;

            var monthMatrix = new MonthGridMatrix
            {
                Year = year,
                Month = month
            };

            var currentDate = gridStart;
            var today = DateTime.Today;

            // 1. Build weeks and day cells
            for (int w = 0; w < totalWeeks; w++)
            {
                var weekRow = new MonthCellInfo[7];
                for (int d = 0; d < 7; d++)
                {
                    weekRow[d] = new MonthCellInfo
                    {
                        Date = currentDate.Date,
                        IsCurrentMonth = currentDate.Month == month,
                        IsToday = currentDate.Date == today
                    };
                    currentDate = currentDate.AddDays(1);
                }
                monthMatrix.Weeks.Add(weekRow);
            }

            // 2. Populate events and overflow per day cell
            var activeEvents = events ?? new List<CalendarEvent>();

            foreach (var week in monthMatrix.Weeks)
            {
                foreach (var cell in week)
                {
                    var dayEvents = activeEvents
                        .Where(e => e.IsVisible && IsEventActiveOnDate(e, cell.Date))
                        .OrderByDescending(e => e.IsAllday || e.HasMultiDates)
                        .ThenBy(e => e.Start)
                        .ThenByDescending(e => (e.End - e.Start).TotalDays)
                        .ToList();

                    cell.Events = dayEvents.Take(maxVisibleEventsPerDay).ToList();
                    cell.OverflowEvents = dayEvents.Skip(maxVisibleEventsPerDay).ToList();
                }
            }

            // 3. Compute horizontal multi-day event spans per week row
            for (int w = 0; w < totalWeeks; w++)
            {
                var weekStart = monthMatrix.Weeks[w][0].Date;
                var weekEnd = monthMatrix.Weeks[w][6].Date.AddDays(1).AddTicks(-1);

                var weekSpans = ComputeWeekEventSpans(activeEvents, weekStart, weekEnd, w);
                monthMatrix.WeekEventSpans.Add(weekSpans);
            }

            return monthMatrix;
        }

        /// <summary>
        /// Calculates horizontal event span bars for a 7-day week row in Month View.
        /// </summary>
        public List<MonthEventSpanUIModel> ComputeWeekEventSpans(
            List<CalendarEvent> events,
            DateTime weekStart,
            DateTime weekEnd,
            int weekIndex)
        {
            var weekEvents = (events ?? new List<CalendarEvent>())
                .Where(e => e.IsVisible)
                .Where(e => !(e.End < weekStart || e.Start > weekEnd))
                .OrderByDescending(e => e.IsAllday || e.HasMultiDates)
                .ThenBy(e => e.Start)
                .ThenByDescending(e => (e.End - e.Start).TotalDays)
                .ToList();

            var spanModels = new List<MonthEventSpanUIModel>();
            var rowSlotMap = new List<HashSet<int>>(); // Slot indices for overlap prevention

            foreach (var evt in weekEvents)
            {
                int startCol = Math.Max(0, (evt.Start.Date - weekStart.Date).Days);
                int endCol = Math.Min(6, (evt.End.Date - weekStart.Date).Days);
                int colSpan = Math.Max(1, endCol - startCol + 1);

                // Find first available vertical slot index (row) in this week row
                int rowIndex = 0;
                while (true)
                {
                    if (rowSlotMap.Count <= rowIndex)
                    {
                        rowSlotMap.Add(new HashSet<int>());
                    }

                    bool slotAvailable = true;
                    for (int c = startCol; c <= endCol; c++)
                    {
                        if (rowSlotMap[rowIndex].Contains(c))
                        {
                            slotAvailable = false;
                            break;
                        }
                    }

                    if (slotAvailable)
                    {
                        for (int c = startCol; c <= endCol; c++)
                        {
                            rowSlotMap[rowIndex].Add(c);
                        }
                        break;
                    }
                    rowIndex++;
                }

                spanModels.Add(new MonthEventSpanUIModel
                {
                    Event = evt,
                    WeekIndex = weekIndex,
                    RowIndex = rowIndex,
                    StartColumn = startCol,
                    ColSpan = colSpan,
                    ExceedLeft = evt.Start.Date < weekStart.Date,
                    ExceedRight = evt.End.Date > weekEnd.Date
                });
            }

            return spanModels;
        }

        private bool IsEventActiveOnDate(CalendarEvent evt, DateTime date)
        {
            var dayStart = date.Date;
            var dayEnd = dayStart.AddDays(1).AddTicks(-1);
            return !(evt.End < dayStart || evt.Start > dayEnd);
        }

        #endregion
    }
}
