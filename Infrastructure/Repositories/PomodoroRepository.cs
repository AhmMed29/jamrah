using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using SQLite;
using Jamrah.Core.Entities;
using Microsoft.Maui.Storage;

namespace Jamrah.Infrastructure.Repositories
{
    public sealed class PomodoroRepository
    {
        private SQLiteAsyncConnection? _database;
        private readonly string _dbPath;
        private readonly SemaphoreSlim _initLock = new(1, 1);
        private bool _isInitialized;

        public PomodoroRepository(string? customDbPath = null)
        {
            _dbPath = customDbPath ?? Path.Combine(FileSystem.AppDataDirectory, "jamrah_pomodoro.db3");
        }

        public async Task InitAsync()
        {
            if (_isInitialized && _database is not null)
                return;

            await _initLock.WaitAsync();
            try
            {
                if (_isInitialized && _database is not null)
                    return;

                var directory = Path.GetDirectoryName(_dbPath);
                if (!string.IsNullOrEmpty(directory) && !Directory.Exists(directory))
                    Directory.CreateDirectory(directory);

                _database = new SQLiteAsyncConnection(_dbPath);
                await _database.CreateTableAsync<Session>().ConfigureAwait(false);
                await _database.CreateTableAsync<Tag>().ConfigureAwait(false);
                await EnsureTagColumnsAsync().ConfigureAwait(false);

                _isInitialized = true;
            }
            finally
            {
                _initLock.Release();
            }
        }

        public async Task<List<Session>> GetSessionsAsync()
        {
            await InitAsync().ConfigureAwait(false);
            // ملاحظة: الترتيب الزمني يتم في الميموري بعد الـ parse (PomodoroPage.RebuildToggles)
            // لأن ترتيب string على صيغة yyyy-M-d غير المبطنة كان يكسر ترتيب الأيام 10+.
            return await _database!.Table<Session>()
                .ToListAsync()
                .ConfigureAwait(false);
        }

        public async Task SaveSessionAsync(Session session)
        {
            if (session == null)
                throw new ArgumentNullException(nameof(session));

            await InitAsync().ConfigureAwait(false);
            if (string.IsNullOrWhiteSpace(session.Id))
                session.Id = Guid.NewGuid().ToString();

            await _database!.InsertOrReplaceAsync(session).ConfigureAwait(false);
        }

        public async Task DeleteSessionAsync(string id)
        {
            if (string.IsNullOrWhiteSpace(id))
                return;

            await InitAsync().ConfigureAwait(false);
            await _database!.DeleteAsync<Session>(id).ConfigureAwait(false);
        }

        public async Task<List<Tag>> GetTagsAsync()
        {
            await InitAsync().ConfigureAwait(false);
            return await _database!.Table<Tag>().ToListAsync().ConfigureAwait(false);
        }

        public async Task SaveTagAsync(Tag tag)
        {
            if (tag == null)
                throw new ArgumentNullException(nameof(tag));

            await InitAsync().ConfigureAwait(false);
            await _database!.InsertOrReplaceAsync(tag).ConfigureAwait(false);
        }

        public async Task DeleteTagAsync(Tag tag)
        {
            if (tag == null)
                return;

            await InitAsync().ConfigureAwait(false);
            await _database!.DeleteAsync(tag).ConfigureAwait(false);
        }

        private async Task EnsureTagColumnsAsync()
        {
            try
            {
                var cols = await _database!.GetTableInfoAsync("PomodoroTag").ConfigureAwait(false);
                var names = new HashSet<string>(cols.Select(c => c.Name), StringComparer.OrdinalIgnoreCase);
                if (!names.Contains(nameof(Tag.IsArchived)))
                    await _database.ExecuteAsync("ALTER TABLE PomodoroTag ADD COLUMN IsArchived INTEGER NOT NULL DEFAULT 0").ConfigureAwait(false);
                if (!names.Contains(nameof(Tag.LastUsedTicks)))
                    await _database.ExecuteAsync("ALTER TABLE PomodoroTag ADD COLUMN LastUsedTicks INTEGER NOT NULL DEFAULT 0").ConfigureAwait(false);
            }
            catch
            {
                // تجاهل بصمت: الأعمدة قد تكون موجودة بالفعل في DBs الجديدة
            }
        }
    }
}
