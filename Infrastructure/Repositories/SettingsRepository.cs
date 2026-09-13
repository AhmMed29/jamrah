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
