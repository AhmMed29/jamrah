using System;
using System.IO;
using System.Threading;
using System.Threading.Tasks;
using SQLite;
using Jamrah.Core.Entities;
using Jamrah.Core.Interfaces;
using Microsoft.Maui.Storage;

namespace Jamrah.Infrastructure.Repositories
{
    public class SettingsRepository : ISettingsRepository
    {
        private SQLiteAsyncConnection? _database;
        private readonly string _dbPath;
        private readonly SemaphoreSlim _initLock = new(1, 1);
        private bool _isInitialized;

        public SettingsRepository(string? customDbPath = null)
        {
            _dbPath = customDbPath ?? Path.Combine(FileSystem.AppDataDirectory, "jamrah_tasks.db3");
        }

        public async Task InitAsync()
        {
            if (_isInitialized && _database is not null) return;
            await _initLock.WaitAsync();
            try
            {
                if (_isInitialized && _database is not null) return;
                var dir = Path.GetDirectoryName(_dbPath);
                if (!string.IsNullOrEmpty(dir) && !Directory.Exists(dir))
                    Directory.CreateDirectory(dir);
                _database = new SQLiteAsyncConnection(_dbPath);
                await _database.CreateTableAsync<Setting>().ConfigureAwait(false);
                await ApplyZoomDefaultsMigrationAsync().ConfigureAwait(false);
                await ApplyUnifiedZoomSeedAsync().ConfigureAwait(false);
                _isInitialized = true;
            }
            finally { _initLock.Release(); }
        }

        public async Task<string?> GetAsync(string key)
        {
            if (string.IsNullOrWhiteSpace(key)) return null;
            await InitAsync().ConfigureAwait(false);
            var s = await _database!.FindAsync<Setting>(key).ConfigureAwait(false);
            return s?.Value;
        }

        public async Task SetAsync(string key, string value)
        {
            if (string.IsNullOrWhiteSpace(key)) return;
            await InitAsync().ConfigureAwait(false);
            var s = new Setting { Key = key, Value = value, UpdatedAt = DateTime.UtcNow };
            await _database!.InsertOrReplaceAsync(s).ConfigureAwait(false);
        }

        public static double DefaultZoomForPage(string? pageKey) => pageKey switch
        {
            "tasks" => 1.25,
            "pomodoro" => 1.25,
            _ => 1.0,
        };

        public async Task<double> GetZoomAsync(string pageKey)
        {
            var v = await GetAsync($"zoom_{pageKey}").ConfigureAwait(false);
            if (double.TryParse(v, System.Globalization.NumberStyles.Float, System.Globalization.CultureInfo.InvariantCulture, out var d))
            {
                // clamp to WebView2 sensible range 0.25 - 5.0
                if (d < 0.25) d = 0.25;
                if (d > 5.0) d = 5.0;
                return d;
            }
            return DefaultZoomForPage(pageKey);
        }

        public async Task SetZoomAsync(string pageKey, double zoom)
        {
            if (zoom < 0.25) zoom = 0.25;
            if (zoom > 5.0) zoom = 5.0;
            await SetAsync($"zoom_{pageKey}", zoom.ToString(System.Globalization.CultureInfo.InvariantCulture)).ConfigureAwait(false);
        }

        // UNIFIED: single zoom for the fixed-sidebar layout.
        // First run after migration: reuse the last-used per-page value (by UpdatedAt),
        // so the user keeps feeling ("آخر قيمة كنت مستخدمها أياً كانت").
        // Old per-page keys are kept untouched in DB (no data loss).
        public async Task<double> GetUnifiedZoomAsync()
        {
            await InitAsync().ConfigureAwait(false);
            var direct = await _database!.FindAsync<Setting>("zoom_unified").ConfigureAwait(false);
            if (direct != null
                && double.TryParse(direct.Value, System.Globalization.NumberStyles.Float, System.Globalization.CultureInfo.InvariantCulture, out var du))
            {
                if (du < 0.25) du = 0.25;
                if (du > 5.0) du = 5.0;
                return du;
            }
            try
            {
                var keys = new[] { "zoom_tasks", "zoom_pomodoro", "zoom_calendar", "zoom_planning", "zoom_bookmarks" };
                Setting? best = null;
                foreach (var k in keys)
                {
                    var s = await _database!.FindAsync<Setting>(k).ConfigureAwait(false);
                    if (s == null) continue;
                    if (!double.TryParse(s.Value, System.Globalization.NumberStyles.Float, System.Globalization.CultureInfo.InvariantCulture, out _)) continue;
                    if (best == null || s.UpdatedAt > best.UpdatedAt) best = s;
                }
                if (best != null
                    && double.TryParse(best.Value, System.Globalization.NumberStyles.Float, System.Globalization.CultureInfo.InvariantCulture, out var db))
                {
                    if (db < 0.25) db = 0.25;
                    if (db > 5.0) db = 5.0;
                    return db;
                }
            }
            catch { }
            // Fresh install with no history: unified default is 1.7.
            return 1.7;
        }

        public async Task SetUnifiedZoomAsync(double zoom)
        {
            if (zoom < 0.25) zoom = 0.25;
            if (zoom > 5.0) zoom = 5.0;
            await SetAsync("zoom_unified", zoom.ToString(System.Globalization.CultureInfo.InvariantCulture)).ConfigureAwait(false);
        }

        // One-time seed: pin the unified zoom to 1.7 (user request), applied once
        // over any previous value, then never overwrite again so Ctrl +/- changes persist.
        private async Task ApplyUnifiedZoomSeedAsync()
        {
            var marker = await _database!.FindAsync<Setting>("zoom_unified_seed_170").ConfigureAwait(false);
            if (marker?.Value == "done") return;
            // NOTE: direct DB write (not SetAsync) — we already hold _initLock here.
            await _database.InsertOrReplaceAsync(new Setting { Key = "zoom_unified", Value = 1.7.ToString(System.Globalization.CultureInfo.InvariantCulture), UpdatedAt = DateTime.UtcNow }).ConfigureAwait(false);
            await _database.InsertOrReplaceAsync(new Setting { Key = "zoom_unified_seed_170", Value = "done", UpdatedAt = DateTime.UtcNow }).ConfigureAwait(false);
        }

        // One-time migration: apply the comfortable default zoom (tasks 1.25 / pomodoro 1.25)
        // for a clean start, then never wipe user preferences again.
        private async Task ApplyZoomDefaultsMigrationAsync()
        {
            var marker = await _database!.FindAsync<Setting>("zoom_defaults_v3").ConfigureAwait(false);
            if (marker?.Value == "done") return;
            await _database.ExecuteAsync("DELETE FROM Settings WHERE Key=?", "zoom_tasks").ConfigureAwait(false);
            await _database.ExecuteAsync("DELETE FROM Settings WHERE Key=?", "zoom_pomodoro").ConfigureAwait(false);
            await _database.InsertOrReplaceAsync(new Setting { Key = "zoom_defaults_v3", Value = "done", UpdatedAt = DateTime.UtcNow }).ConfigureAwait(false);
        }
    }
}
