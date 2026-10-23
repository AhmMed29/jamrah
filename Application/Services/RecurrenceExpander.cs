using System;
using System.Collections.Generic;
using System.Linq;
using Jamrah.Core.Entities;

namespace Jamrah.Application.Services
{
    public sealed class RecurrenceRule
    {
        public string Freq { get; set; } = "WEEKLY";
        public int Interval { get; set; } = 1;
        public List<DayOfWeek> ByDays { get; set; } = new();
        public int? Count { get; set; }
        public DateTime? Until { get; set; }
    }

    public static class RecurrenceExpander
    {
        public static readonly Dictionary<DayOfWeek, string> DayTokens = new()
        {
            [DayOfWeek.Saturday] = "SA",
            [DayOfWeek.Sunday] = "SU",
            [DayOfWeek.Monday] = "MO",
            [DayOfWeek.Tuesday] = "TU",
            [DayOfWeek.Wednesday] = "WE",
            [DayOfWeek.Thursday] = "TH",
            [DayOfWeek.Friday] = "FR",
        };

        public static DayOfWeek TokenToDay(string t) => DayTokens.First(kv => kv.Value == t).Key;

        public static RecurrenceRule? TryParse(string? rrule)
        {
            if (string.IsNullOrWhiteSpace(rrule)) return null;
            var rule = new RecurrenceRule();
            foreach (var part in rrule.Split(';', StringSplitOptions.RemoveEmptyEntries))
            {
                var kv = part.Split('=', 2);
                if (kv.Length != 2) continue;
                var k = kv[0].Trim().ToUpperInvariant();
                var v = kv[1].Trim().ToUpperInvariant();
                if (k == "FREQ") rule.Freq = v;
                else if (k == "INTERVAL" && int.TryParse(v, out var iv) && iv >= 1) rule.Interval = iv;
                else if (k == "BYDAY") rule.ByDays = v.Split(',', StringSplitOptions.RemoveEmptyEntries).Select(s => TokenToDay(s.Trim())).Distinct().ToList();
                else if (k == "COUNT" && int.TryParse(v, out var c) && c >= 1) rule.Count = c;
                else if (k == "UNTIL" && DateTime.TryParseExact(v, "yyyyMMdd", null, System.Globalization.DateTimeStyles.None, out var u)) rule.Until = u.Date;
            }
            if (rule.Freq is not ("DAILY" or "WEEKLY" or "MONTHLY" or "YEARLY")) return null;
            return rule;
        }

        public static string Build(string freq, int interval, IEnumerable<DayOfWeek>? byDays, int? count, DateTime? until)
        {
            var parts = new List<string> { $"FREQ={freq.ToUpperInvariant()}", $"INTERVAL={Math.Max(1, interval)}" };
            if (byDays != null && freq.ToUpperInvariant() == "WEEKLY")
            {
                var days = byDays.Distinct().Select(d => DayTokens[d]).ToList();
                if (days.Count > 0) parts.Add("BYDAY=" + string.Join(",", days));
            }
            if (count.HasValue && count.Value >= 1) parts.Add($"COUNT={count.Value}");
            else if (until.HasValue) parts.Add($"UNTIL={until.Value:yyyyMMdd}");
            return string.Join(";", parts);
        }

        public static List<CalendarEvent> ExpandEvents(CalendarEvent master, DateTime rangeStart, DateTime rangeEnd, HashSet<string> extraSkips, List<CalendarEvent> overrides)
        {
            var result = new List<CalendarEvent>();
            var rule = TryParse(master.RecurrenceRule);
            if (rule == null) return result;
            var skips = new HashSet<string>(master.ExceptionDates);
            foreach (var s in extraSkips) skips.Add(s);
            var byOccDate = overrides
                .Where(o => o.RecurrenceId == master.Id && !string.IsNullOrEmpty(o.OriginalOccurrenceDate))
                .ToDictionary(o => o.OriginalOccurrenceDate);
            var duration = master.End - master.Start;
            int produced = 0;
            foreach (var day in ExpandDates(master.Start.Date, rule, rangeStart.Date.AddDays(-1), rangeEnd.Date.AddDays(1)))
            {
                if (produced >= 500) break;
                var key = day.ToString("yyyy-MM-dd");
                if (day < master.Start.Date) continue;
                if (skips.Contains(key)) continue;
                if (byOccDate.TryGetValue(key, out var ov)) { result.Add(ov); produced++; continue; }
                if (day < rangeStart.Date || day > rangeEnd.Date)
                {
                    produced++;
                    if (rule.Count.HasValue && produced >= rule.Count.Value) break;
                    continue;
                }
                var occ = new CalendarEvent
                {
                    Id = $"{master.Id}_{key}",
                    RecurrenceId = master.Id,
                    CalendarId = master.CalendarId,
                    Title = master.Title,
                    Body = master.Body,
                    Location = master.Location,
                    IsAllday = master.IsAllday,
                    Start = day.Add(master.Start.TimeOfDay),
                    End = day.Add(master.Start.TimeOfDay).Add(duration),
                    Category = master.Category,
                    Color = master.Color,
                    BackgroundColor = master.BackgroundColor,
                    BorderColor = master.BorderColor,
                    IsVisible = master.IsVisible,
                };
                result.Add(occ);
                produced++;
                if (rule.Count.HasValue && produced >= rule.Count.Value) break;
            }
            return result;
        }

        public static IEnumerable<DateTime> ExpandDates(DateTime seriesStart, RecurrenceRule rule, DateTime from, DateTime to)
        {
            int emitted = 0;
            if (rule.Freq == "DAILY")
            {
                for (var d = seriesStart.Date; d <= to && emitted < 500; d = d.AddDays(rule.Interval))
                {
                    if (d >= from) { yield return d; emitted++; if (rule.Count.HasValue && emitted >= rule.Count.Value) yield break; }
                    if (rule.Until.HasValue && d >= rule.Until.Value) yield break;
                }
            }
            else if (rule.Freq == "WEEKLY")
            {
                var days = (rule.ByDays.Count > 0 ? rule.ByDays : new List<DayOfWeek> { seriesStart.DayOfWeek }).Distinct().OrderBy(d => d).ToList();
                var weekAnchor = seriesStart.Date.AddDays(-(((int)seriesStart.DayOfWeek + 7) % 7));
                for (int w = 0; w < 520 && emitted < 500; w += rule.Interval)
                {
                    foreach (var dw in days)
                    {
                        var d = weekAnchor.AddDays(w * 7 + (int)dw);
                        if (d < seriesStart.Date) continue;
                        if (d > to) yield break;
                        if (rule.Until.HasValue && d > rule.Until.Value) yield break;
                        if (d >= from) { yield return d; emitted++; if (rule.Count.HasValue && emitted >= rule.Count.Value) yield break; }
                    }
                    if (rule.Until.HasValue && weekAnchor.AddDays((w + rule.Interval) * 7) > rule.Until.Value) yield break;
                }
            }
            else if (rule.Freq == "MONTHLY")
            {
                for (int m = 0; m < 240 && emitted < 500; m += rule.Interval)
                {
                    var b = seriesStart.AddMonths(m);
                    int day = Math.Min(seriesStart.Day, DateTime.DaysInMonth(b.Year, b.Month));
                    var d = new DateTime(b.Year, b.Month, day);
                    if (d < seriesStart.Date) continue;
                    if (d > to) yield break;
                    if (rule.Until.HasValue && d > rule.Until.Value) yield break;
                    if (d >= from) { yield return d; emitted++; if (rule.Count.HasValue && emitted >= rule.Count.Value) yield break; }
                }
            }
            else
            {
                for (int y = 0; y < 50 && emitted < 500; y += rule.Interval)
                {
                    int day = seriesStart.Day;
                    if (seriesStart.Month == 2 && day == 29 && !DateTime.IsLeapYear(seriesStart.Year + y)) day = 28;
                    else day = Math.Min(day, DateTime.DaysInMonth(seriesStart.Year + y, seriesStart.Month));
                    var d = new DateTime(seriesStart.Year + y, seriesStart.Month, day);
                    if (d < seriesStart.Date) continue;
                    if (d > to) yield break;
                    if (rule.Until.HasValue && d > rule.Until.Value) yield break;
                    if (d >= from) { yield return d; emitted++; if (rule.Count.HasValue && emitted >= rule.Count.Value) yield break; }
                }
            }
        }
    }
}
