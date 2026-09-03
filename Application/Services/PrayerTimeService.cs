using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Text.Json;
using System.Threading.Tasks;
using Jamrah.Core.Entities;
using SQLite;

namespace Jamrah.Application.Services
{
    public class PrayerLocation
    {
        public double Latitude  { get; set; } = 30.0444; 
        public double Longitude { get; set; } = 31.2357;
        public int    Method    { get; set; } = 5;        
    }

    public class PrayerTimesService
    {
        private SQLiteAsyncConnection? _db;
        private readonly HttpClient _http = new();

        public PrayerLocation Location { get; private set; } = new();

        // ── Init ────────────────────────────────────────────────────────────
        public async Task InitAsync()
        {
            var dbPath = Path.Combine(
                FileSystem.AppDataDirectory, "prayer_times.db3");
            _db = new SQLiteAsyncConnection(dbPath);
            await _db.CreateTableAsync<PrayerTimeEntry>();
            await LoadLocationAsync();
        }

        // ── Get today's prayer times ─────────────────────────────────────────
        public async Task<PrayerTimeEntry?> GetTodayAsync()
        {
            var today = DateTime.Today;
            var key   = $"{today.Year}-{today.Month}-{today.Day}";
            var entry = await _db!.FindAsync<PrayerTimeEntry>(key);

            if (entry != null &&
                Math.Abs(entry.Latitude  - Location.Latitude)  < 0.001 &&
                Math.Abs(entry.Longitude - Location.Longitude) < 0.001)
                return entry;  

            // مش موجود → جيب الشهر كله
            await FetchMonthAsync(today.Year, today.Month);
            return await _db!.FindAsync<PrayerTimeEntry>(key);
        }

        // ── Fetch full month from API and cache ──────────────────────────────
        public async Task FetchMonthAsync(int year, int month)
        {
            var url = $"https://api.aladhan.com/v1/calendar/{year}/{month}" +
                      $"?latitude={Location.Latitude}&longitude={Location.Longitude}" +
                      $"&method={Location.Method}";
            try
            {
                var json = await _http.GetStringAsync(url);
                using var doc = JsonDocument.Parse(json);
                var data = doc.RootElement.GetProperty("data");

                foreach (var day in data.EnumerateArray())
                {
                    var timings = day.GetProperty("timings");
                    var dateEl  = day.GetProperty("date")
                                     .GetProperty("gregorian");

                    int d = int.Parse(dateEl.GetProperty("day").GetString()!);
                    int m = dateEl.GetProperty("month")
                                  .GetProperty("number").GetInt32();
                    int y = int.Parse(dateEl.GetProperty("year").GetString()!);

                    var entry = new PrayerTimeEntry
                    {
                        DateKey   = $"{y}-{m}-{d}",
                        Fajr      = CleanTime(timings.GetProperty("Fajr").GetString()),
                        Sunrise   = CleanTime(timings.GetProperty("Sunrise").GetString()),
                        Dhuhr     = CleanTime(timings.GetProperty("Dhuhr").GetString()),
                        Asr       = CleanTime(timings.GetProperty("Asr").GetString()),
                        Maghrib   = CleanTime(timings.GetProperty("Maghrib").GetString()),
                        Isha      = CleanTime(timings.GetProperty("Isha").GetString()),
                        Latitude  = Location.Latitude,
                        Longitude = Location.Longitude,
                        Method    = Location.Method,
                    };
                    await _db!.InsertOrReplaceAsync(entry);
                }
            }
            catch { }
        }

        // ── Change location ──────────────────────────────────────────────────
        public async Task SetLocationAsync(double lat, double lon, int method = 5)
        {
            Location = new PrayerLocation { Latitude = lat, Longitude = lon, Method = method };
            await SaveLocationAsync();

            var now = DateTime.Today;
            var prefix = $"{now.Year}-{now.Month}-";
            var old = await _db!.QueryAsync<PrayerTimeEntry>(
                "SELECT * FROM PrayerTimes WHERE DateKey LIKE ?", prefix + "%");
            foreach (var e in old)
                await _db.DeleteAsync(e);
        }

        // ── Helper: remove " (EEST)" from time string ───────────────────────
        private static string CleanTime(string? raw)
        {
            if (string.IsNullOrEmpty(raw)) return "";
            var idx = raw.IndexOf(' ');
            return idx > 0 ? raw[..idx] : raw;   // "04:47 (EEST)" → "04:47"
        }

        // ── Persist location in Preferences ─────────────────────────────────
        private Task SaveLocationAsync()
        {
            Preferences.Set("prayer_lat", Location.Latitude);
            Preferences.Set("prayer_lon", Location.Longitude);
            Preferences.Set("prayer_method", Location.Method);
            return Task.CompletedTask;
        }

        private Task LoadLocationAsync()
        {
            Location = new PrayerLocation
            {
                Latitude  = Preferences.Get("prayer_lat",    30.0444),
                Longitude = Preferences.Get("prayer_lon",    31.2357),
                Method    = Preferences.Get("prayer_method", 5),
            };
            return Task.CompletedTask;
        }
    }
}
