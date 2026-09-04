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
            return 1.0;
        }

        public async Task SetZoomAsync(string pageKey, double zoom)
        {
            if (zoom < 0.25) zoom = 0.25;
            if (zoom > 5.0) zoom = 5.0;
            await SetAsync($"zoom_{pageKey}", zoom.ToString(System.Globalization.CultureInfo.InvariantCulture)).ConfigureAwait(false);
        }
    }
}
