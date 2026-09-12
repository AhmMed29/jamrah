using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using SQLite;
using Jamrah.Core.Entities;
using Jamrah.Core.Interfaces;
using Microsoft.Maui.Storage;

namespace Jamrah.Infrastructure.Repositories
{
    public class BookmarkRepository : IBookmarkRepository
    {
        private SQLiteAsyncConnection? _database;
        private readonly string _dbPath;
        private readonly SemaphoreSlim _initLock = new(1, 1);
        private bool _isInitialized;

        public BookmarkRepository(string? customDbPath = null)
        {
            _dbPath = customDbPath ?? Path.Combine(FileSystem.AppDataDirectory, "jamrah_bookmarks.db3");
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
                try { await _database.ExecuteAsync("PRAGMA journal_mode=WAL;").ConfigureAwait(false); } catch { }
                try { await _database.ExecuteAsync("PRAGMA busy_timeout=5000;").ConfigureAwait(false); } catch { }
                await _database.CreateTableAsync<BookmarkItem>().ConfigureAwait(false);
                await _database.CreateTableAsync<BookmarkFolder>().ConfigureAwait(false);
                await _database.CreateTableAsync<BookmarkCollection>().ConfigureAwait(false);
                // ADDITIVE: new pages table (fresh DBs get full schema automatically).
                await _database.CreateTableAsync<LibraryPage>().ConfigureAwait(false);
                await _database.CreateTableAsync<BookmarkTag>().ConfigureAwait(false);
                await _database.CreateTableAsync<BookmarkCustomType>().ConfigureAwait(false);
                await _database.CreateTableAsync<BookmarkTemplate>().ConfigureAwait(false);
                await _database.CreateTableAsync<BookmarkQuranKhatm>().ConfigureAwait(false);
                await _database.CreateTableAsync<BookmarkQuranLog>().ConfigureAwait(false);
                await _database.CreateTableAsync<BookmarkClip>().ConfigureAwait(false);
                await _database.CreateTableAsync<BookmarkViewState>().ConfigureAwait(false);

                // ADDITIVE: migrate pre-existing DBs (CreateTableAsync never adds
                // columns to existing tables, so add the new ones explicitly).
                await EnsureColumnAsync("BookmarkFolders", "IsArchived", "INTEGER NOT NULL DEFAULT 0").ConfigureAwait(false);
                await EnsureColumnAsync("BookmarkCollections", "IsArchived", "INTEGER NOT NULL DEFAULT 0").ConfigureAwait(false);
                await EnsureColumnAsync("BookmarkItems", "PageIdsJson", "TEXT NOT NULL DEFAULT '[]'").ConfigureAwait(false);

                var itemCount = await _database.Table<BookmarkItem>().CountAsync().ConfigureAwait(false);
                var folderCount = await _database.Table<BookmarkFolder>().CountAsync().ConfigureAwait(false);
                if (itemCount == 0 && folderCount == 0)
                    await SeedAsync().ConfigureAwait(false);

                _isInitialized = true;
            }
            finally { _initLock.Release(); }
        }

        private async Task<List<T>> AllAsync<T>() where T : new()
        {
            await InitAsync().ConfigureAwait(false);
            return await _database!.Table<T>().ToListAsync().ConfigureAwait(false);
        }

        private async Task SaveAsync<T>(T entity)
        {
            await InitAsync().ConfigureAwait(false);
            await _database!.InsertOrReplaceAsync(entity).ConfigureAwait(false);
        }

        // ADDITIVE: minimal column migration for existing user databases.
        private sealed class PragmaColumn
        {
            [Column("name")]
            public string Name { get; set; } = string.Empty;
        }

        private async Task EnsureColumnAsync(string table, string column, string definition)
        {
            // NOTE: only called from InitAsync after _database is assigned (no InitAsync() here — would deadlock _initLock).
            var cols = await _database!.QueryAsync<PragmaColumn>($"PRAGMA table_info([{table}])").ConfigureAwait(false);
            if (!cols.Any(c => c.Name == column))
                await _database.ExecuteAsync($"ALTER TABLE [{table}] ADD COLUMN [{column}] {definition}").ConfigureAwait(false);
        }

        public async Task<List<BookmarkItem>> GetItemsAsync() => await AllAsync<BookmarkItem>();
        public async Task<BookmarkItem?> GetItemAsync(string id)
        {
            await InitAsync().ConfigureAwait(false);
            return await _database!.FindAsync<BookmarkItem>(id).ConfigureAwait(false);
        }
        public async Task SaveItemAsync(BookmarkItem item)
        {
            if (string.IsNullOrWhiteSpace(item.Id)) item.Id = Guid.NewGuid().ToString();
            item.UpdatedAt = DateTime.UtcNow;
            await SaveAsync(item);
        }
        public async Task DeleteItemAsync(string id)
        {
            await InitAsync().ConfigureAwait(false);
            await _database!.DeleteAsync<BookmarkItem>(id).ConfigureAwait(false);
        }

        public async Task<List<BookmarkFolder>> GetFoldersAsync() => await AllAsync<BookmarkFolder>();
        public async Task SaveFolderAsync(BookmarkFolder folder) => await SaveAsync(folder);
        public async Task DeleteFolderAsync(string id)
        {
            await InitAsync().ConfigureAwait(false);
            await _database!.DeleteAsync<BookmarkFolder>(id).ConfigureAwait(false);
        }

        public async Task<List<BookmarkCollection>> GetCollectionsAsync() => await AllAsync<BookmarkCollection>();
        public async Task SaveCollectionAsync(BookmarkCollection c) => await SaveAsync(c);
        public async Task DeleteCollectionAsync(string id)
        {
            await InitAsync().ConfigureAwait(false);
            await _database!.DeleteAsync<BookmarkCollection>(id).ConfigureAwait(false);
        }

        // ADDITIVE: pages CRUD (permanent delete only; archive is a soft flag via Save).
        public async Task<List<LibraryPage>> GetPagesAsync() => await AllAsync<LibraryPage>();
        public async Task SavePageAsync(LibraryPage page) => await SaveAsync(page);
        public async Task DeletePageAsync(string id)
        {
            await InitAsync().ConfigureAwait(false);
            await _database!.DeleteAsync<LibraryPage>(id).ConfigureAwait(false);
        }

        public async Task<List<BookmarkTag>> GetTagsAsync() => await AllAsync<BookmarkTag>();
        public async Task SaveTagAsync(BookmarkTag tag) => await SaveAsync(tag);
        public async Task DeleteTagAsync(string name)
        {
            await InitAsync().ConfigureAwait(false);
            await _database!.DeleteAsync<BookmarkTag>(name).ConfigureAwait(false);
        }

        public async Task<List<BookmarkCustomType>> GetCustomTypesAsync() => await AllAsync<BookmarkCustomType>();
        public async Task SaveCustomTypeAsync(BookmarkCustomType t) => await SaveAsync(t);
        public async Task DeleteCustomTypeAsync(string id)
        {
            await InitAsync().ConfigureAwait(false);
            await _database!.DeleteAsync<BookmarkCustomType>(id).ConfigureAwait(false);
        }

        public async Task<List<BookmarkTemplate>> GetTemplatesAsync() => await AllAsync<BookmarkTemplate>();
        public async Task SaveTemplateAsync(BookmarkTemplate t) => await SaveAsync(t);
        public async Task DeleteTemplateAsync(string id)
        {
            await InitAsync().ConfigureAwait(false);
            await _database!.DeleteAsync<BookmarkTemplate>(id).ConfigureAwait(false);
        }

        public async Task<List<BookmarkQuranKhatm>> GetKhatmsAsync() => await AllAsync<BookmarkQuranKhatm>();
        public async Task SaveKhatmAsync(BookmarkQuranKhatm k) => await SaveAsync(k);
        public async Task<List<BookmarkQuranLog>> GetQuranLogsAsync() => await AllAsync<BookmarkQuranLog>();
        public async Task SaveQuranLogAsync(BookmarkQuranLog l) => await SaveAsync(l);
        public async Task DeleteQuranLogAsync(string id)
        {
            await InitAsync().ConfigureAwait(false);
            await _database!.DeleteAsync<BookmarkQuranLog>(id).ConfigureAwait(false);
        }

        public async Task<List<BookmarkClip>> GetClipsAsync() => await AllAsync<BookmarkClip>();
        public async Task SaveClipAsync(BookmarkClip c) => await SaveAsync(c);
        public async Task DeleteClipAsync(string id)
        {
            await InitAsync().ConfigureAwait(false);
            await _database!.DeleteAsync<BookmarkClip>(id).ConfigureAwait(false);
        }

        public async Task<BookmarkViewState?> GetViewStateAsync(string key)
        {
            await InitAsync().ConfigureAwait(false);
            return await _database!.FindAsync<BookmarkViewState>(key).ConfigureAwait(false);
        }
        public async Task SaveViewStateAsync(BookmarkViewState state) => await SaveAsync(state);

        public async Task<string> ExportJsonAsync()
        {
            await InitAsync().ConfigureAwait(false);
            var backup = new BookmarkBackup
            {
                Items = await _database!.Table<BookmarkItem>().ToListAsync(),
                Folders = await _database!.Table<BookmarkFolder>().ToListAsync(),
                Collections = await _database!.Table<BookmarkCollection>().ToListAsync(),
                // ADDITIVE: include pages in backup.
                Pages = await _database!.Table<LibraryPage>().ToListAsync(),
                Tags = await _database!.Table<BookmarkTag>().ToListAsync(),
                CustomTypes = await _database!.Table<BookmarkCustomType>().ToListAsync(),
                CustomTemplates = await _database!.Table<BookmarkTemplate>().ToListAsync(),
                ViewStates = await _database!.Table<BookmarkViewState>().ToListAsync(),
                Khatms = await _database!.Table<BookmarkQuranKhatm>().ToListAsync(),
                Logs = await _database!.Table<BookmarkQuranLog>().ToListAsync(),
                Clipboard = await _database!.Table<BookmarkClip>().ToListAsync(),
            };
            return JsonSerializer.Serialize(backup);
        }

        public async Task ImportJsonAsync(string json)
        {
            var backup = JsonSerializer.Deserialize<BookmarkBackup>(json)
                ?? throw new InvalidDataException("Invalid bookmark backup file.");
            await InitAsync().ConfigureAwait(false);
            await _database!.DeleteAllAsync<BookmarkItem>();
            await _database!.DeleteAllAsync<BookmarkFolder>();
            await _database!.DeleteAllAsync<BookmarkCollection>();
            // ADDITIVE: clear pages on import.
            await _database!.DeleteAllAsync<LibraryPage>();
            await _database!.DeleteAllAsync<BookmarkTag>();
            await _database!.DeleteAllAsync<BookmarkCustomType>();
            await _database!.DeleteAllAsync<BookmarkTemplate>();
            await _database!.DeleteAllAsync<BookmarkViewState>();
            await _database!.DeleteAllAsync<BookmarkQuranKhatm>();
            await _database!.DeleteAllAsync<BookmarkQuranLog>();
            await _database!.DeleteAllAsync<BookmarkClip>();
            if (backup.Items.Count > 0) await _database.InsertAllAsync(backup.Items);
            if (backup.Folders.Count > 0) await _database.InsertAllAsync(backup.Folders);
            if (backup.Collections.Count > 0) await _database.InsertAllAsync(backup.Collections);
            // ADDITIVE: restore pages (old backups without Pages import as empty).
            if (backup.Pages.Count > 0) await _database.InsertAllAsync(backup.Pages);
            if (backup.Tags.Count > 0) await _database.InsertAllAsync(backup.Tags);
            if (backup.CustomTypes.Count > 0) await _database.InsertAllAsync(backup.CustomTypes);
            if (backup.CustomTemplates.Count > 0) await _database.InsertAllAsync(backup.CustomTemplates);
            if (backup.ViewStates.Count > 0) await _database.InsertAllAsync(backup.ViewStates);
            if (backup.Khatms.Count > 0) await _database.InsertAllAsync(backup.Khatms);
            if (backup.Logs.Count > 0) await _database.InsertAllAsync(backup.Logs);
            if (backup.Clipboard.Count > 0) await _database.InsertAllAsync(backup.Clipboard);
        }

        // ─── Seed (mirrors seedDB() in bookmark-design.html) ────────────────

        private static string Pic(string seed, int w, int h) => $"https://picsum.photos/seed/{seed}/{w}/{h}.jpg";

        private async Task SeedAsync()
        {
            var now = DateTime.UtcNow;
            DateTime N(int daysAgo, int extraHours = 0) => now.AddDays(-daysAgo).AddHours(extraHours);

            BookmarkItem It(string title, string type, int daysAgo, string folders = "[]",
                string tags = "[]", string metadata = "{}", string description = "", string url = "",
                string thumb = "", string notes = "", string collections = "[]",
                bool favorite = false, bool pinned = false, bool archived = false, bool deleted = false,
                int updatedDaysAgo = -1, int openedDaysAgo = -1, string sessions = "[]", string? tpl = null)
            {
                return new BookmarkItem
                {
                    Id = Guid.NewGuid().ToString(),
                    Title = title, Type = type, Description = description, Url = url,
                    Thumb = thumb, Notes = notes, TagsJson = tags, FolderIdsJson = folders,
                    CollectionIdsJson = collections, RelationsJson = "[]", SessionsJson = sessions,
                    MetadataJson = metadata, Tpl = tpl,
                    Favorite = favorite, Pinned = pinned, Archived = archived, Deleted = deleted,
                    CreatedAt = N(daysAgo), UpdatedAt = N(updatedDaysAgo < 0 ? daysAgo : updatedDaysAgo),
                    LastOpenedAt = openedDaysAgo < 0 ? DateTime.MinValue : N(openedDaysAgo),
                };
            }

            var items = new List<BookmarkItem>
            {
                It("Dune: Part Two", "movie", 1, "[\"f-sf\"]", "[\"scifi\"]",
                    "{\"year\":2024,\"genres\":\"Sci-Fi, Adventure\",\"director\":\"Denis Villeneuve\",\"duration\":166,\"rating\":8.5,\"poster\":\"" + Pic("dune2", 300, 450) + "\"}",
                    "Paul Atreides unites with the Fremen while on a warpath of revenge against the conspirators who destroyed his family.",
                    collections: "[\"c-best\"]", favorite: true, pinned: true, updatedDaysAgo: 1, openedDaysAgo: 0),
                It("Blade Runner 2049", "movie", 3, "[\"f-sf\"]", "[\"scifi\"]",
                    "{\"year\":2017,\"genres\":\"Sci-Fi, Drama\",\"director\":\"Denis Villeneuve\",\"duration\":164,\"rating\":8.0,\"poster\":\"" + Pic("br2049", 300, 450) + "\"}", favorite: true),
                It("Stalker", "movie", 9, "[\"f-sf\"]", "[\"scifi\"]",
                    "{\"year\":1979,\"genres\":\"Sci-Fi, Drama\",\"director\":\"Andrei Tarkovsky\",\"duration\":162,\"rating\":8.1,\"poster\":\"" + Pic("stalker79", 300, 450) + "\"}"),
                It("Perfect Days", "movie", 14, "[\"f-mv\"]", "[]",
                    "{\"year\":2023,\"genres\":\"Drama\",\"director\":\"Wim Wenders\",\"duration\":124,\"rating\":7.7,\"poster\":\"" + Pic("perfectdays", 300, 450) + "\"}"),
                It("Severance", "tvshow", 5, "[\"f-mv\"]", "[\"watch-later\"]",
                    "{\"year\":2022,\"seasons\":2,\"creator\":\"Dan Erickson\",\"status\":\"Airing\",\"rating\":8.7,\"poster\":\"" + Pic("severance1", 300, 450) + "\"}", favorite: true),
                It("Chernobyl", "tvshow", 30, "[\"f-mv\"]", "[\"watch-later\"]",
                    "{\"year\":2019,\"seasons\":1,\"creator\":\"Craig Mazin\",\"status\":\"Ended\",\"rating\":9.4,\"poster\":\"" + Pic("chernobyl5", 300, 450) + "\"}"),
                It("Clean Code", "book", 2, "[\"f-bt\"]", "[\"backend\",\"dotnet\",\"reference\"]",
                    "{\"author\":\"Robert C. Martin\",\"publisher\":\"Prentice Hall\",\"year\":2008,\"isbn\":\"978-0132350884\",\"pages\":464,\"status\":\"Reading\",\"progress\":78,\"rating\":8.4,\"cover\":\"" + Pic("cleancode1", 300, 450) + "\"}",
                    notes: "Key ideas:\n- Meaningful names beat comments\n- Functions should do one thing\n\nReview later:\n- Chapter 7 error handling",
                    favorite: true, pinned: true, updatedDaysAgo: 0, openedDaysAgo: 0,
                    sessions: "[{\"at\":\"" + N(2).ToString("o") + "\",\"from\":330,\"to\":361},{\"at\":\"" + N(1).ToString("o") + "\",\"from\":362,\"to\":364}]"),
                It("The Pragmatic Programmer", "book", 21, "[\"f-bt\"]", "[\"backend\"]",
                    "{\"author\":\"Andrew Hunt & David Thomas\",\"publisher\":\"Addison-Wesley\",\"year\":1999,\"pages\":352,\"status\":\"Finished\",\"progress\":100,\"rating\":9.0,\"cover\":\"" + Pic("pragmatic4", 300, 450) + "\"}"),
                It("Designing Data-Intensive Applications", "book", 6, "[\"f-db\"]", "[\"backend\",\"reference\"]",
                    "{\"author\":\"Martin Kleppmann\",\"publisher\":\"O'Reilly\",\"year\":2017,\"pages\":616,\"status\":\"Reading\",\"progress\":12,\"rating\":9.2,\"cover\":\"" + Pic("ddia2", 300, 450) + "\"}",
                    updatedDaysAgo: 0,
                    sessions: "[{\"at\":\"" + N(1).ToString("o") + "\",\"from\":60,\"to\":74}]"),
                It("The Mythical Man-Month", "book", 40, "[\"f-bt\"]", "[]",
                    "{\"author\":\"Frederick Brooks\",\"publisher\":\"Addison-Wesley\",\"year\":1975,\"pages\":322,\"status\":\"Unread\",\"cover\":\"" + Pic("manmonth", 300, 450) + "\"}"),
                It("Invisible Cities", "book", 50, "[\"f-bf\"]", "[\"fiction\"]",
                    "{\"author\":\"Italo Calvino\",\"publisher\":\"Harcourt\",\"year\":1972,\"pages\":165,\"status\":\"Unread\",\"rating\":8.8,\"cover\":\"" + Pic("invcities", 300, 450) + "\"}"),
                It("MDN — JavaScript reference", "link", 4, "[\"f-web\"]", "[\"reference\",\"frontend\"]",
                    "{\"site\":\"MDN\"}", "The definitive JavaScript language reference.",
                    "https://developer.mozilla.org/en-US/docs/Web/JavaScript", favorite: true, pinned: true, openedDaysAgo: 0),
                It("Can I use", "tool", 12, "[\"f-web\"]", "[\"frontend\",\"reference\"]",
                    "{\"platform\":\"Web\"}", "", "https://caniuse.com"),
                It("Hacker News", "website", 25, "[\"f-web\"]", "[]",
                    "{\"site\":\"Y Combinator\"}", "", "https://news.ycombinator.com"),
                It("Excalidraw", "tool", 16, "[\"f-web\"]", "[\"frontend\"]",
                    "{\"platform\":\"Web\"}", "Virtual whiteboard for sketching hand-drawn diagrams.", "https://excalidraw.com"),
                It("SQLite Documentation", "documentation", 11, "[\"f-db\"]", "[\"reference\",\"backend\"]",
                    "{\"source\":\"sqlite.org\"}", "", "https://sqlite.org/docs.html"),
                It("PostgreSQL Manual", "documentation", 13, "[\"f-db\"]", "[\"reference\",\"backend\"]",
                    "{\"source\":\"postgresql.org\"}", "", "https://postgresql.org/docs/"),
                It("The Absolute Minimum Every Software Developer Must Know About Unicode", "article", 7, "[\"f-web\"]", "[\"reference\"]",
                    "{\"author\":\"Joel Spolsky\",\"source\":\"Joel on Software\",\"date\":\"2003-10-08\"}",
                    "It does not make sense to have a string without knowing what encoding it uses.",
                    "https://www.joelonsoftware.com/2003/10/08/the-absolute-minimum-every-software-developer-must-know-about-unicode-and-character-sets-no-excuses/"),
                It("facebook / react", "repo", 8, "[\"f-prog\"]", "[\"frontend\"]",
                    "{\"owner\":\"facebook\",\"language\":\"JavaScript\",\"stars\":228000,\"status\":\"Active\"}",
                    "The library for web and native user interfaces.", "https://github.com/facebook/react"),
                It("meilisearch / meilisearch", "repo", 18, "[\"f-db\"]", "[\"backend\",\"reference\"]",
                    "{\"owner\":\"meilisearch\",\"language\":\"Rust\",\"stars\":47000,\"status\":\"Active\"}",
                    "A lightning-fast search engine API.", "https://github.com/meilisearch/meilisearch"),
                It("pola-rs / polars", "repo", 22, "[\"f-db\"]", "[\"backend\"]",
                    "{\"owner\":\"pola-rs\",\"language\":\"Rust\",\"stars\":30000,\"status\":\"Active\"}",
                    "Multi-threaded DataFrame library in Rust and Python.", "https://github.com/pola-rs/polars"),
                It("Coding a Perlin Noise Field", "video", 9, "[\"f-web\"]", "[\"watch-later\"]",
                    "{\"channel\":\"The Coding Train\",\"duration\":25}",
                    "Generative art with Perlin noise — click the card to see it embed live.",
                    "https://www.youtube.com/watch?v=yj82jpWyKMI", Pic("codingtrain", 480, 270)),
                It("Inventing on Principle", "video", 35, "[]", "[\"watch-later\"]",
                    "{\"channel\":\"Bret Victor\",\"duration\":54}", "", "https://vimeo.com/36579366", Pic("bretvictor", 480, 270)),
                It("CS50 — Introduction to Computer Science", "course", 20, "[\"f-prog\"]", "[\"reference\"]",
                    "{\"platform\":\"edX / Harvard\",\"instructor\":\"David Malan\",\"duration\":600,\"progress\":45,\"status\":\"In progress\"}",
                    "", "https://cs50.harvard.edu/x/", favorite: true, updatedDaysAgo: 1, openedDaysAgo: 1),
                It("Attention Is All You Need", "research", 27, "[]", "[\"reference\"]",
                    "{\"authors\":\"Vaswani et al.\",\"year\":2017,\"venue\":\"NeurIPS\"}",
                    "We propose a new simple network architecture, the Transformer, based solely on attention mechanisms.",
                    "https://arxiv.org/abs/1706.03762"),
                It("EF Core — performance notes", "note", 1, "[\"f-cs\"]", "[\"dotnet\",\"backend\"]",
                    "{\"content\":\"Important concepts:\\n- Tracking vs No-Tracking\\n- Include vs split queries\\n- AsNoTracking for read paths\\n\\nReview later:\\n- Owned entities\\n- Compiled models\"}",
                    updatedDaysAgo: 0),
                It("Radiohead — OK Computer", "music", 32, "[]", "[]",
                    "{\"artist\":\"Radiohead\",\"year\":1997,\"rating\":9.3}", favorite: true),
                It("Outer Wilds", "game", 15, "[\"f-mv\"]", "[]",
                    "{\"platform\":\"PC\",\"year\":2019,\"genre\":\"Adventure, Mystery\",\"status\":\"Playing\",\"rating\":9.5,\"poster\":\"" + Pic("outerwilds", 300, 450) + "\"}", favorite: true),
                It("Darknet Diaries", "podcast", 17, "[]", "[\"watch-later\"]",
                    "{\"host\":\"Jack Rhysider\",\"episodes\":150,\"status\":\"Airing\"}", "", "https://darknetdiaries.com"),
                It("Google Keep", "link", 90, "[]", "[]",
                    "{\"site\":\"Google\"}", "", "https://keep.google.com", archived: true),
                It("Notion", "link", 120, "[]", "[]",
                    "{\"site\":\"Notion\"}", "", "https://notion.so", deleted: true),
            };

            var notes = items.First(i => i.Title.StartsWith("EF Core"));
            var sqliteDoc = items.First(i => i.Title == "SQLite Documentation");
            notes.RelationsJson = "[\"" + sqliteDoc.Id + "\"]";

            var folders = new List<BookmarkFolder>
            {
                new() { Id = "f-prog", Name = "Programming", Icon = "code", IsOpen = true, CollectionId = "c-prog" },
                new() { Id = "f-db", Name = "Databases", Icon = "layers", IsOpen = true, CollectionId = "c-prog" },
                new() { Id = "f-cs", Name = "C# & .NET", Icon = "", IsOpen = true, CollectionId = "c-prog" },
                new() { Id = "f-mv", Name = "Movies", Icon = "🎬", IsOpen = true },
                new() { Id = "f-sf", Name = "Sci-Fi", Icon = "🚀", IsOpen = true },
                new() { Id = "f-bt", Name = "Tech & Craft", Icon = "📚", IsOpen = true },
                new() { Id = "f-bf", Name = "Fiction", Icon = "📖", IsOpen = true },
                new() { Id = "f-web", Name = "Web", Icon = "globe", IsOpen = true },
                new() { Id = "f-fb", Name = "Facebook posts", Icon = "📘", IsOpen = true, CollectionId = "c-pers" },
            };

            var collections = new List<BookmarkCollection>
            {
                new() { Id = "c-prog", Name = "Programming", Icon = "💻" },
                new() { Id = "c-pers", Name = "Personal", Icon = "👤" },
                new() { Id = "c-best", Name = "Best of 2024", Icon = "star" },
                new() { Id = "c-rabbit", Name = "Weekend rabbit holes", Icon = "spark" },
                new() { Id = "c-smart", Name = "Backend essentials", Icon = "",
                    SmartJson = "{\"types\":[\"link\",\"book\",\"repo\"],\"tags\":[\"backend\"],\"favorite\":true}" },
            };

            var tags = new List<BookmarkTag>
            {
                new() { Name = "backend", Color = "#2563eb" },
                new() { Name = "frontend", Color = "#7c3aed" },
                new() { Name = "scifi", Color = "#b45309" },
                new() { Name = "reference", Color = "#0f766e" },
                new() { Name = "dotnet", Color = "#0e7490" },
                new() { Name = "watch-later", Color = "#9333ea" },
                new() { Name = "fiction", Color = "#be185d" },
            };

            var clips = new List<BookmarkClip>
            {
                new() { Id = Guid.NewGuid().ToString(), Text = "AsNoTracking() improves read performance — only use tracking when you intend to update entities.", At = now.AddHours(-2), Pinned = true },
                new() { Id = Guid.NewGuid().ToString(), Text = "https://github.com/golang-standards/project-layout", At = now.AddHours(-9), Pinned = false },
            };

            var khatm = new BookmarkQuranKhatm { Id = "k1", StartedAt = N(40), Page = 128 };
            var logs = new List<BookmarkQuranLog>
            {
                new() { Id = Guid.NewGuid().ToString(), KhatmId = "k1", At = N(3, 9), FromPage = 115, ToPage = 121 },
                new() { Id = Guid.NewGuid().ToString(), KhatmId = "k1", At = N(2, 9), FromPage = 122, ToPage = 126 },
                new() { Id = Guid.NewGuid().ToString(), KhatmId = "k1", At = N(1, 9), FromPage = 127, ToPage = 128 },
            };

            await _database!.InsertAllAsync(items);
            await _database!.InsertAllAsync(folders);
            await _database!.InsertAllAsync(collections);
            await _database!.InsertAllAsync(tags);
            await _database!.InsertAllAsync(clips);
            await _database!.InsertAsync(khatm);
            await _database!.InsertAllAsync(logs);
        }
    }
}
