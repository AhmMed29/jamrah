using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Jamrah.Core.Entities;
using Jamrah.Core.Interfaces;
using Jamrah.Files.Core;

namespace Jamrah.Application.Services
{
    public class BookmarkRoute
    {
        public string Ctx { get; set; } = "home";
        public string? Id { get; set; }
        public string? Tag { get; set; }
        public string ViewKey => Ctx + (Id ?? "") + (Tag ?? "");
    }

    public class BookmarkFilters
    {
        public List<string> Types { get; set; } = new();
        public List<string> Tags { get; set; } = new();
        public bool Fav { get; set; }
        public bool Pin { get; set; }
        public double Rating { get; set; }
        public string Status { get; set; } = string.Empty;
        public bool HasActive => Types.Count > 0 || Tags.Count > 0 || Fav || Pin || Rating > 0 || !string.IsNullOrEmpty(Status);
        public int ActiveCount => Types.Count + Tags.Count + (Fav ? 1 : 0) + (Pin ? 1 : 0) + (Rating > 0 ? 1 : 0) + (!string.IsNullOrEmpty(Status) ? 1 : 0);
        public void Clear() { Types.Clear(); Tags.Clear(); Fav = false; Pin = false; Rating = 0; Status = string.Empty; }
    }

    public class BookmarkStateService
    {
        private readonly IBookmarkRepository _repository;
        private readonly Dictionary<string, BookmarkViewState> _viewStates = new();

        public BookmarkStateService(IBookmarkRepository repository)
        {
            _repository = repository ?? throw new ArgumentNullException(nameof(repository));
        }

        // ADDITIVE: physical-file side effects for library folders. Optional (tests/design-time).
        public LocalFileService? LocalFiles { get; set; }

        public List<BookmarkItem> Items { get; private set; } = new();
        public List<BookmarkFolder> Folders { get; private set; } = new();
        public List<BookmarkCollection> Collections { get; private set; } = new();
        // ADDITIVE: pages list.
        public List<LibraryPage> Pages { get; private set; } = new();
        public List<BookmarkTag> Tags { get; private set; } = new();
        public List<BookmarkCustomType> CustomTypes { get; private set; } = new();
        public List<BookmarkTemplate> CustomTemplates { get; private set; } = new();
        public List<BookmarkQuranKhatm> Khatms { get; private set; } = new();
        public List<BookmarkQuranLog> QuranLogs { get; private set; } = new();
        /// <summary>Clips currently loaded for the clipboard view (paged, not the whole history).</summary>
        public List<BookmarkClip> Clips { get; private set; } = new();
        /// <summary>Total number of clips in the database (for the header count + "more to load").</summary>
        public int ClipsTotal { get; private set; }
        public const int ClipPageSize = 20;

        // --- Session UI state (mirrors S in bookmark-design.html) ---
        public BookmarkRoute Route { get; private set; } = new();
        public string Search { get; private set; } = string.Empty;
        public BookmarkFilters Filters { get; } = new();
        public string? DetailId { get; private set; }
        // Transient sidebar drag source (not persisted).
        public string? DragFolderId { get; set; }
        // Transient card drag source for collections (not persisted).
        public string? DragItemId { get; set; }
        // Transient inline-rename target in the sidebar tree (not persisted).
        private string? _renameFolderId;
        public string? RenameFolderId
        {
            get => _renameFolderId;
            set
            {
                if (_renameFolderId == value) return;
                _renameFolderId = value;
                NotifyStateChanged();
            }
        }

        public event Action? OnStateChanged;
        private void NotifyStateChanged() => OnStateChanged?.Invoke();

        private Task? _initTask;

        /// <summary>Single-flight init: concurrent callers share one load (multiple WebViews/components init together).</summary>
        public Task InitAsync()
        {
            if (_initTask == null || _initTask.IsFaulted)
                _initTask = InitCoreAsync();
            return _initTask;
        }

        private async Task InitCoreAsync()
        {
            await _repository.InitAsync();
            await RefreshDataAsync();
            BackfillFileCoversInBackground();
            StartLibraryWatcher();
        }

        // LIVE SYNC: one watcher per session; it reconciles Explorer-side changes.
        private LibraryWatcherService? _libraryWatcher;

        /// <summary>
        /// Starts watching the library folder and runs one catch-up pass, so changes made
        /// while the app was closed (or missed events) are picked up at startup too.
        /// </summary>
        private void StartLibraryWatcher()
        {
            if (LocalFiles == null) return;
            if (_libraryWatcher == null)
            {
                _libraryWatcher = new LibraryWatcherService(this);
                _libraryWatcher.Start();
            }

            _ = Task.Run(async () =>
            {
                try { await SyncLibraryFromDiskAsync(); } catch { }
            });
        }

        /// <summary>
        /// Files imported before covers existed (videos especially) get their Windows
        /// thumbnail once, off the startup path, then the cards refresh themselves.
        /// </summary>
        private void BackfillFileCoversInBackground()
        {
            var files = LocalFiles;
            if (files == null) return;
            _ = Task.Run(async () =>
            {
                try
                {
                    if (await files.BackfillFileIconsAsync() <= 0) return;
                    Items = await _repository.GetItemsAsync();
                    NotifyStateChanged();
                }
                catch { }
            });
        }

        public async Task RefreshDataAsync()
        {
            Items = await _repository.GetItemsAsync();
            await NormalizeNoteTextAsync();
            Folders = await _repository.GetFoldersAsync();
            Collections = await _repository.GetCollectionsAsync();
            // ADDITIVE: load pages alongside the rest.
            Pages = await _repository.GetPagesAsync();
            Tags = await _repository.GetTagsAsync();
            CustomTypes = await _repository.GetCustomTypesAsync();
            CustomTemplates = await _repository.GetTemplatesAsync();
            Khatms = await _repository.GetKhatmsAsync();
            QuranLogs = await _repository.GetQuranLogsAsync();
            // Paged: keep whatever depth the clipboard view already loaded, never the
            // whole history (that made opening the page slow).
            var clipTake = Math.Max(Clips.Count, ClipPageSize);
            Clips = await _repository.GetClipsPageAsync(0, clipTake);
            ClipsTotal = await _repository.CountClipsAsync();
            await BackfillFolderColorsAsync();
            NotifyStateChanged();
        }

        /// <summary>
        /// LIVE SYNC: compares the real library folder with the database and applies whatever
        /// Explorer (or any other program) changed — new files become cards, files deleted on
        /// disk are flagged "missing" and leave the grid (they come back when restored), and
        /// renamed files keep their card instead of showing up twice. Never deletes rows and
        /// never touches items that are not managed local files.
        /// Returns how many rows changed.
        /// </summary>
        public async Task<int> SyncLibraryFromDiskAsync(
            IReadOnlyList<(string OldRel, string NewRel)>? renames = null,
            IReadOnlyList<string>? deletedDirs = null,
            System.Threading.CancellationToken ct = default)
        {
            var files = LocalFiles;
            if (files == null) return 0;
            var library = Infrastructure.AppPaths.Layout.LibraryDir;
            if (!System.IO.Directory.Exists(library)) return 0;

            var items = await _repository.GetItemsAsync();
            var folders = await _repository.GetFoldersAsync();

            var byRel = new Dictionary<string, BookmarkItem>(StringComparer.OrdinalIgnoreCase);
            foreach (var it in items)
            {
                var rel = NormRel(ItemMeta.Get(it.MetadataJson, "localFile"));
                if (string.IsNullOrEmpty(rel) || byRel.ContainsKey(rel)) continue;
                byRel[rel] = it;
            }

            var folderByChain = new Dictionary<string, BookmarkFolder>(StringComparer.OrdinalIgnoreCase);
            foreach (var f in folders)
            {
                if (f.IsArchived) continue;
                string chain;
                try { chain = NormRel(files.FolderChainFor(f.Id, folders)); } catch { continue; }
                if (!string.IsNullOrEmpty(chain)) folderByChain[chain] = f;
            }

            var diskFiles = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            var diskDirs = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            WalkLibrary(library, string.Empty, diskDirs, diskFiles, ct);

            var changed = 0;

            // 1) Renames keep the existing card (title + cover + folder stay as they were).
            foreach (var (oldRaw, newRaw) in renames ?? Array.Empty<(string, string)>())
            {
                var oldRel = NormRel(oldRaw);
                var newRel = NormRel(newRaw);
                if (string.IsNullOrEmpty(oldRel) || string.IsNullOrEmpty(newRel) || oldRel == newRel) continue;
                if (!byRel.TryGetValue(oldRel, out var it) || byRel.ContainsKey(newRel)) continue;

                var oldTitle = System.IO.Path.GetFileNameWithoutExtension(oldRel);
                it.MetadataJson = ItemMeta.Set(it.MetadataJson, "localFile", "Library/" + newRel);
                it.MetadataJson = ItemMeta.Set(it.MetadataJson, "fileStatus", "ok");
                if (string.IsNullOrWhiteSpace(it.Title) || it.Title == oldTitle)
                    it.Title = System.IO.Path.GetFileNameWithoutExtension(newRel);
                it.UpdatedAt = DateTime.UtcNow;
                await _repository.SaveItemAsync(it);
                byRel.Remove(oldRel);
                byRel[newRel] = it;
                changed++;
            }

            // 2) Files gone from disk are flagged, not deleted; restoring the file restores the card.
            foreach (var kv in byRel)
            {
                var missing = !diskFiles.Contains(kv.Key);
                var flagged = string.Equals(ItemMeta.Get(kv.Value.MetadataJson, "fileStatus"), "missing",
                    StringComparison.OrdinalIgnoreCase);
                if (missing == flagged) continue;
                kv.Value.MetadataJson = ItemMeta.Set(kv.Value.MetadataJson, "fileStatus", missing ? "missing" : "ok");
                await _repository.SaveItemAsync(kv.Value);
                changed++;
            }

            // 3) Directories created in Explorer become folders in the tree (before the files
            //    inside them, so those cards land in the right folder straight away).
            foreach (var dirRel in diskDirs.OrderBy(d => d.Count(c => c == '/')).ThenBy(d => d, StringComparer.OrdinalIgnoreCase))
            {
                if (folderByChain.ContainsKey(dirRel)) continue;
                var parentRel = ParentRel(dirRel);
                string? parentId = null;
                if (!string.IsNullOrEmpty(parentRel) && folderByChain.TryGetValue(parentRel, out var p)) parentId = p.Id;

                var folder = new BookmarkFolder
                {
                    Id = Guid.NewGuid().ToString(),
                    Name = dirRel[(dirRel.LastIndexOf('/') + 1)..],
                    ParentId = parentId,
                    IsOpen = true,
                };
                folder.Color = FolderColorFor(folder.Id);
                await _repository.SaveFolderAsync(folder);
                folderByChain[dirRel] = folder;
                changed++;
            }

            // 4) Files that appeared in the library get a real card (kind, cover, folder).
            foreach (var rel in diskFiles)
            {
                ct.ThrowIfCancellationRequested();
                if (byRel.ContainsKey(rel)) continue;

                string? folderId = null;
                var dirRel = ParentRel(rel);
                if (!string.IsNullOrEmpty(dirRel) && folderByChain.TryGetValue(dirRel, out var parent)) folderId = parent.Id;
                try
                {
                    var created = await files.IndexExistingFileAsync(rel, folderId, ct);
                    if (created == null) continue;
                    byRel[rel] = created;
                    changed++;
                }
                catch (OperationCanceledException) { throw; }
                catch (Exception ex)
                {
                    System.Diagnostics.Debug.WriteLine("[BookmarkStateService] live index failed: " + ex.Message);
                }
            }

            // 5) Directories deleted in Explorer archive their folder (recoverable from Archive).
            foreach (var raw in deletedDirs ?? Array.Empty<string>())
            {
                var rel = NormRel(raw);
                if (string.IsNullOrEmpty(rel) || diskDirs.Contains(rel)) continue;
                if (!folderByChain.TryGetValue(rel, out var root)) continue;

                var seen = new HashSet<string>(StringComparer.Ordinal) { root.Id };
                var queue = new Queue<BookmarkFolder>();
                queue.Enqueue(root);
                while (queue.Count > 0)
                {
                    var current = queue.Dequeue();
                    if (!current.IsArchived)
                    {
                        current.IsArchived = true;
                        await _repository.SaveFolderAsync(current);
                        changed++;
                    }
                    foreach (var child in folders.Where(x => (x.ParentId ?? string.Empty) == current.Id))
                        if (seen.Add(child.Id)) queue.Enqueue(child);
                }
            }

            if (changed == 0) return 0;
            Items = await _repository.GetItemsAsync();
            Folders = await _repository.GetFoldersAsync();
            NotifyStateChanged();
            return changed;
        }

        /// <summary>"Library/a/b.jpg" / "a\\b.jpg" / "a/b.jpg" all become "a/b.jpg".</summary>
        private static string NormRel(string? rel)
        {
            var r = (rel ?? string.Empty).Replace('\\', '/').Trim();
            if (r.StartsWith("Library/", StringComparison.OrdinalIgnoreCase)) r = r.Substring("Library/".Length);
            return r.Trim('/');
        }

        private static string ParentRel(string rel)
        {
            var slash = rel.LastIndexOf('/');
            return slash < 0 ? string.Empty : rel[..slash];
        }

        private static void WalkLibrary(
            string root, string prefix, HashSet<string> dirs, HashSet<string> files,
            System.Threading.CancellationToken ct)
        {
            ct.ThrowIfCancellationRequested();
            try
            {
                foreach (var dir in System.IO.Directory.EnumerateDirectories(root))
                {
                    var name = System.IO.Path.GetFileName(dir);
                    if (name.StartsWith(".", StringComparison.Ordinal) || name.StartsWith("$", StringComparison.Ordinal)) continue;
                    var rel = prefix + name;
                    dirs.Add(rel);
                    WalkLibrary(dir, rel + "/", dirs, files, ct);
                }
                foreach (var file in System.IO.Directory.EnumerateFiles(root))
                {
                    var name = System.IO.Path.GetFileName(file);
                    if (name.StartsWith(".part-", StringComparison.OrdinalIgnoreCase)) continue;
                    files.Add(prefix + name);
                }
            }
            catch (UnauthorizedAccessException) { }
            catch (System.IO.IOException) { }
        }

        /// <summary>
        /// One-time-per-load repair for legacy notes: the body belongs in Notes, while
        /// Description is only a short card summary. Exact duplicates are dropped.
        /// </summary>
        private async Task NormalizeNoteTextAsync()
        {
            foreach (var it in Items.Where(i => string.Equals(i.Type, "note", StringComparison.OrdinalIgnoreCase)))
            {
                var (description, notes) = NoteText.Normalize(it.Description, it.Notes);
                if (description == it.Description && notes == it.Notes) continue;
                it.Description = description;
                it.Notes = notes;
                await _repository.UpdateItemTextAsync(it.Id, description, notes);
            }
        }

        // v2 normDB: folders without color get a deterministic palette color (by id hash).
        public static string FolderColorFor(string id)
        {
            if (string.IsNullOrEmpty(id)) return FolderPalette[0];
            var h = 0;
            foreach (var c in id) h += c;
            return FolderPalette[Math.Abs(h) % FolderPalette.Length];
        }

        public static readonly string[] FolderPalette = new[]
        {
            "#8a8580", "#2563eb", "#0f766e", "#4d7c0f",
            "#b45309", "#b91c1c", "#9333ea", "#be185d",
        };

        private async Task BackfillFolderColorsAsync()
        {
            var missing = Folders.Where(f => string.IsNullOrEmpty(f.Color)).ToList();
            if (missing.Count == 0) return;
            foreach (var f in missing) f.Color = FolderColorFor(f.Id);
            foreach (var f in missing) await _repository.SaveFolderAsync(f);
            Folders = await _repository.GetFoldersAsync();
        }

        public void SetRoute(string ctx, string? id = null, string? tag = null)
        {
            Route = new BookmarkRoute { Ctx = ctx, Id = id, Tag = tag };
            DetailId = null;
            NotifyStateChanged();
        }

        public void SetSearch(string search) { Search = search ?? string.Empty; NotifyStateChanged(); }
        public void SetDetail(string? id) { DetailId = id; NotifyStateChanged(); }

        public async Task<(string View, string? Sort)> GetViewStateAsync(string key)
        {
            if (!_viewStates.TryGetValue(key, out var vs))
            {
                vs = await _repository.GetViewStateAsync(key) ?? new BookmarkViewState { Key = key };
                _viewStates[key] = vs;
            }
            return (vs.View, vs.Sort);
        }

        public async Task SetViewStateAsync(string key, string view, string? sort)
        {
            var vs = new BookmarkViewState { Key = key, View = view, Sort = sort };
            _viewStates[key] = vs;
            await _repository.SaveViewStateAsync(vs);
            NotifyStateChanged();
        }

        public async Task SaveItemAsync(BookmarkItem item)
        {
            await _repository.SaveItemAsync(item);
            await RefreshDataAsync();
        }

        public async Task DeleteItemAsync(string id, bool permanent)
        {
            if (permanent)
            {
                await _repository.DeleteItemAsync(id);
            }
            else
            {
                var item = Items.FirstOrDefault(i => i.Id == id);
                if (item != null) { item.Deleted = true; await _repository.SaveItemAsync(item); }
            }
            await RefreshDataAsync();
        }

        public async Task RestoreItemAsync(string id)
        {
            var item = Items.FirstOrDefault(i => i.Id == id);
            if (item != null)
            {
                item.Deleted = false;
                item.Archived = false;
                await _repository.SaveItemAsync(item);
                await RefreshDataAsync();
            }
        }

        public async Task ToggleFavoriteAsync(string id)
        {
            var item = Items.FirstOrDefault(i => i.Id == id);
            if (item != null) { item.Favorite = !item.Favorite; await _repository.SaveItemAsync(item); await RefreshDataAsync(); }
        }

        public async Task TogglePinAsync(string id)
        {
            var item = Items.FirstOrDefault(i => i.Id == id);
            if (item != null) { item.Pinned = !item.Pinned; await _repository.SaveItemAsync(item); await RefreshDataAsync(); }
        }

        public async Task TouchOpenedAsync(string id)
        {
            var item = Items.FirstOrDefault(i => i.Id == id);
            if (item != null) { item.LastOpenedAt = DateTime.UtcNow; await _repository.SaveItemAsync(item); }
        }

        public async Task SaveFolderAsync(BookmarkFolder folder)
        {
            if (string.IsNullOrEmpty(folder.Color))
                folder.Color = FolderColorFor(folder.Id);

            // ADDITIVE: keep the physical library directory in sync when name/parent changed.
            var old = Folders.FirstOrDefault(f => f.Id == folder.Id);
            if (old != null && (old.Name != folder.Name || old.ParentId != folder.ParentId) && LocalFiles != null)
            {
                var oldRel = LocalFiles.FolderChainFor(folder.Id, Folders);
                try
                {
                    old.Name = folder.Name;
                    old.ParentId = folder.ParentId;
                    var newRel = LocalFiles.FolderChainFor(folder.Id, Folders);
                    await LocalFiles.OnFolderPathChangedAsync(oldRel, newRel);
                }
                catch { } // disk sync must never break bookmark saving
            }

            await _repository.SaveFolderAsync(folder);
            await RefreshDataAsync();

            // Brand-new folders are real directories immediately (empty until something is added).
            if (old == null && LocalFiles != null)
            {
                try { LocalFiles.EnsureFolderDirectory(folder.Id, Folders); }
                catch (Exception ex) { System.Diagnostics.Debug.WriteLine("[BookmarkStateService] folder dir create failed: " + ex.Message); }
            }
        }

        /// <summary>Pins/unpins a folder for the sidebar's quick-access block.</summary>
        public async Task ToggleFolderPinAsync(string id)
        {
            var folder = Folders.FirstOrDefault(f => f.Id == id);
            if (folder == null) return;
            folder.Pinned = !folder.Pinned;
            await _repository.SaveFolderAsync(folder);
            Folders = await _repository.GetFoldersAsync();
            NotifyStateChanged();
        }

        /// <summary>Creates an empty folder (physical dir included) and returns its id.</summary>
        public async Task<string?> CreateFolderAsync(string? parentId, string baseName = "untitled")
        {
            if (!string.IsNullOrEmpty(parentId) && !Folders.Any(f => f.Id == parentId)) parentId = null;
            var parent = Folders.FirstOrDefault(f => f.Id == parentId);
            var name = UniqueFolderName(baseName, parentId);
            var folder = new BookmarkFolder
            {
                Id = Guid.NewGuid().ToString(),
                Name = name,
                ParentId = string.IsNullOrEmpty(parentId) ? null : parentId,
                CollectionId = parent?.CollectionId,
                Color = FolderColorFor(name),
                IsOpen = true,
            };
            await SaveFolderAsync(folder);

            if (parent != null && !parent.IsOpen)
            {
                parent.IsOpen = true;
                try { await _repository.SaveFolderAsync(parent); } catch { }
                await RefreshDataAsync();
            }
            return folder.Id;
        }

        /// <summary>Renames a folder from the sidebar inline editor (unique sibling name).</summary>
        public async Task<bool> RenameFolderAsync(string id, string name)
        {
            var existing = Folders.FirstOrDefault(f => f.Id == id);
            if (existing == null) return false;
            var desired = FileNaming.Sanitize(string.IsNullOrWhiteSpace(name) ? existing.Name : name);
            var unique = UniqueFolderName(desired, existing.ParentId, id);
            if (unique == existing.Name) return true;

            // Detached copy: SaveFolderAsync compares against the tracked instance to
            // detect the rename and move the physical directory.
            var target = CloneFolder(existing);
            target.Name = unique;
            await SaveFolderAsync(target);
            return true;
        }

        private static BookmarkFolder CloneFolder(BookmarkFolder source) => new BookmarkFolder
        {
            Id = source.Id,
            Name = source.Name,
            Icon = source.Icon,
            Color = source.Color,
            IsOpen = source.IsOpen,
            IsArchived = source.IsArchived,
            CollectionId = source.CollectionId,
            ParentId = source.ParentId,
            SourcePath = source.SourcePath,
        };

        private async Task CascadeFolderCollectionAsync(string rootId, string? collectionId)
        {
            var queue = new Queue<string>();
            var seen = new HashSet<string>(StringComparer.Ordinal) { rootId };
            queue.Enqueue(rootId);
            while (queue.Count > 0)
            {
                var current = queue.Dequeue();
                foreach (var child in Folders.Where(f => (f.ParentId ?? string.Empty) == current).ToList())
                {
                    if (!seen.Add(child.Id)) continue;
                    if (!string.Equals(child.CollectionId, collectionId))
                    {
                        child.CollectionId = collectionId;
                        await _repository.SaveFolderAsync(child);
                    }
                    queue.Enqueue(child.Id);
                }
            }
        }

        /// <summary>Unique name among DB siblings and existing physical directories at that level.</summary>
        private string UniqueFolderName(string desired, string? parentId, string? excludeId = null)
        {
            var clean = FileNaming.Sanitize(desired);
            var taken = new HashSet<string>(
                Folders.Where(f => f.Id != excludeId && (f.ParentId ?? string.Empty) == (parentId ?? string.Empty))
                    .Select(f => f.Name),
                StringComparer.OrdinalIgnoreCase);
            if (LocalFiles != null)
            {
                try
                {
                    var parentDir = string.IsNullOrEmpty(parentId)
                        ? Infrastructure.AppPaths.Layout.LibraryDir
                        : LocalFiles.FolderAbsolutePath(parentId, Folders);
                    if (!string.IsNullOrEmpty(parentDir) && System.IO.Directory.Exists(parentDir))
                        foreach (var d in System.IO.Directory.EnumerateDirectories(parentDir))
                            taken.Add(System.IO.Path.GetFileName(d));
                }
                catch { }
            }
            return FileNaming.EnsureUnique(clean, taken);
        }

        /// <summary>
        /// Recursively copies a folder: DB subtree + real directory + duplicate item cards.
        /// Rolls the whole copy back when anything fails, so no half-copied tree is left.
        /// </summary>
        public async Task<string?> CopyFolderAsync(string folderId)
        {
            var src = Folders.FirstOrDefault(f => f.Id == folderId);
            if (src == null) return null;

            var newRootId = Guid.NewGuid().ToString();
            var tree = Folders.Select(f => (f.Id, f.Name, f.ParentId)).ToList();
            var taken = new HashSet<string>(
                Folders.Where(f => (f.ParentId ?? string.Empty) == (src.ParentId ?? string.Empty)).Select(f => f.Name),
                StringComparer.OrdinalIgnoreCase);
            if (LocalFiles != null)
            {
                try
                {
                    var parentDir = string.IsNullOrEmpty(src.ParentId)
                        ? Infrastructure.AppPaths.Layout.LibraryDir
                        : LocalFiles.FolderAbsolutePath(src.ParentId, Folders);
                    if (!string.IsNullOrEmpty(parentDir) && System.IO.Directory.Exists(parentDir))
                        foreach (var d in System.IO.Directory.EnumerateDirectories(parentDir))
                            taken.Add(System.IO.Path.GetFileName(d));
                }
                catch { }
            }
            var clones = FolderCloner.Plan(folderId, tree, newRootId, src.Name + " copy", taken, () => Guid.NewGuid().ToString());
            if (clones.Count == 0) return null;

            var createdFolders = new List<string>();
            var createdItems = new List<string>();
            var physicalCopied = false;
            string oldRel = string.Empty, newRel = string.Empty;
            try
            {
                if (LocalFiles != null)
                {
                    try { oldRel = LocalFiles.FolderChainFor(folderId, Folders); } catch { }
                }

                var byOldId = Folders.ToDictionary(f => f.Id, StringComparer.Ordinal);
                foreach (var c in clones)
                {
                    var origin = byOldId[c.OldId];
                    var clone = new BookmarkFolder
                    {
                        Id = c.NewId,
                        Name = c.Name,
                        ParentId = c.ParentId,
                        CollectionId = origin.CollectionId,
                        Icon = origin.Icon,
                        Color = origin.Color,
                        IsOpen = true,
                        SourcePath = origin.SourcePath,
                    };
                    await _repository.SaveFolderAsync(clone);
                    createdFolders.Add(clone.Id);
                }
                await RefreshDataAsync();

                if (LocalFiles != null && !string.IsNullOrEmpty(oldRel))
                {
                    newRel = LocalFiles.FolderChainFor(newRootId, Folders);
                    LocalFiles.CopyFolderDirectory(oldRel, newRel);
                    physicalCopied = System.IO.Directory.Exists(
                        System.IO.Path.Combine(Infrastructure.AppPaths.Layout.LibraryDir,
                            newRel.Replace('/', System.IO.Path.DirectorySeparatorChar)));
                }

                var map = clones.ToDictionary(c => c.OldId, c => c.NewId, StringComparer.Ordinal);
                var oldPrefix = string.IsNullOrEmpty(oldRel) ? null : "Library/" + oldRel.TrimEnd('/') + "/";
                var newPrefix = string.IsNullOrEmpty(newRel) ? null : "Library/" + newRel.TrimEnd('/') + "/";
                foreach (var it in Items.ToList())
                {
                    if (it.Deleted || it.Archived) continue;
                    var fids = FolderIdsOf(it);
                    if (!fids.Any(map.ContainsKey)) continue;

                    var newFids = fids.Select(id => map.TryGetValue(id, out var nid) ? nid : id).ToList();
                    var newMeta = it.MetadataJson;
                    var local = ItemMeta.Get(it.MetadataJson, "localFile");
                    if (!string.IsNullOrEmpty(local) && oldPrefix != null && newPrefix != null
                        && local.StartsWith(oldPrefix, StringComparison.OrdinalIgnoreCase))
                        newMeta = ItemMeta.Set(newMeta, "localFile", newPrefix + local.Substring(oldPrefix.Length));

                    var copy = new BookmarkItem
                    {
                        Id = Guid.NewGuid().ToString(),
                        Type = it.Type,
                        Title = it.Title,
                        Description = it.Description,
                        Url = it.Url,
                        Thumb = it.Thumb,
                        Notes = it.Notes,
                        TagsJson = it.TagsJson,
                        FolderIdsJson = System.Text.Json.JsonSerializer.Serialize(newFids),
                        CollectionIdsJson = it.CollectionIdsJson,
                        PageIdsJson = it.PageIdsJson,
                        RelationsJson = it.RelationsJson,
                        SessionsJson = it.SessionsJson,
                        MetadataJson = newMeta,
                        Tpl = it.Tpl,
                        Favorite = it.Favorite,
                        Pinned = it.Pinned,
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow,
                    };
                    await _repository.SaveItemAsync(copy);
                    createdItems.Add(copy.Id);
                }

                await RefreshDataAsync();
                return newRootId;
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine("[BookmarkStateService] folder copy failed, rolling back: " + ex.Message);
                foreach (var id in createdItems)
                    try { await _repository.DeleteItemAsync(id); } catch { }
                foreach (var id in Enumerable.Reverse(createdFolders))
                    try { await _repository.DeleteFolderAsync(id); } catch { }
                if (physicalCopied && !string.IsNullOrEmpty(newRel))
                {
                    try
                    {
                        var abs = Jamrah.Files.Core.SafePath.ResolveUnderRoot(
                            Infrastructure.AppPaths.Layout.LibraryDir, newRel);
                        if (abs != null && System.IO.Directory.Exists(abs)) System.IO.Directory.Delete(abs, true);
                    }
                    catch { }
                }
                await RefreshDataAsync();
                return null;
            }
        }

        public async Task<bool> MoveFolderAsync(string folderId, string? newParentId)
        {
            var folder = Folders.FirstOrDefault(f => f.Id == folderId);
            if (folder == null || folderId == newParentId) return false;
            if (!string.IsNullOrEmpty(newParentId) && !Folders.Any(f => f.Id == newParentId)) return false;

            // Reject cycles: the new parent cannot be the folder itself or one of its descendants.
            var cursor = newParentId;
            var guard = 0;
            while (!string.IsNullOrEmpty(cursor) && guard++ < 100)
            {
                if (cursor == folderId) return false;
                cursor = Folders.FirstOrDefault(f => f.Id == cursor)?.ParentId;
            }

            // ADDITIVE: drag-moved folders must also move their REAL directory; otherwise
            // localFile paths of the files inside would point at a stale chain.
            var oldRel = string.Empty;
            if (LocalFiles != null)
            {
                try { oldRel = LocalFiles.FolderChainFor(folderId, Folders); } catch { }
            }

            var parent = Folders.FirstOrDefault(f => f.Id == newParentId);
            folder.ParentId = string.IsNullOrEmpty(newParentId) ? null : newParentId;
            if (parent != null) folder.CollectionId = parent.CollectionId;
            folder.Name = UniqueFolderName(folder.Name, folder.ParentId, folderId);
            if (parent != null) await CascadeFolderCollectionAsync(folder.Id, folder.CollectionId);

            if (LocalFiles != null && !string.IsNullOrEmpty(oldRel))
            {
                try
                {
                    var newRel = LocalFiles.FolderChainFor(folderId, Folders);
                    await LocalFiles.OnFolderPathChangedAsync(oldRel, newRel);
                }
                catch { } // disk sync must never break bookmark saving
            }

            await _repository.SaveFolderAsync(folder);
            await RefreshDataAsync();
            return true;
        }

        // ADDITIVE (collections): drag a local-file card onto another one to group both
        // files inside a real library folder named "untitled".
        public async Task<bool> GroupItemsIntoFolderAsync(string sourceId, string targetId, string folderName = "untitled")
        {
            if (LocalFiles == null) return false;
            if (string.IsNullOrEmpty(sourceId) || string.IsNullOrEmpty(targetId) || sourceId == targetId) return false;
            var src = Items.FirstOrDefault(i => i.Id == sourceId);
            var tgt = Items.FirstOrDefault(i => i.Id == targetId);
            if (src == null || tgt == null) return false;

            try
            {
                var parentId = FolderIdsOf(tgt).FirstOrDefault();
                var taken = new HashSet<string>(
                    Folders.Where(f => (f.ParentId ?? string.Empty) == (parentId ?? string.Empty)).Select(f => f.Name),
                    StringComparer.OrdinalIgnoreCase);
                var parentChain = string.IsNullOrEmpty(parentId) ? string.Empty : LocalFiles.FolderChainFor(parentId, Folders);
                var parentDir = System.IO.Path.Combine(Infrastructure.AppPaths.Layout.LibraryDir,
                    parentChain.Replace('/', System.IO.Path.DirectorySeparatorChar));
                if (System.IO.Directory.Exists(parentDir))
                    foreach (var d in System.IO.Directory.EnumerateDirectories(parentDir))
                        taken.Add(System.IO.Path.GetFileName(d));
                var name = FileNaming.EnsureUnique(FileNaming.Sanitize(folderName), taken);

                var folder = new BookmarkFolder
                {
                    Id = Guid.NewGuid().ToString(),
                    Name = name,
                    ParentId = string.IsNullOrEmpty(parentId) ? null : parentId,
                    Color = FolderColorFor(name),
                    IsOpen = true,
                };
                await _repository.SaveFolderAsync(folder);
                await RefreshDataAsync();

                var srcNow = Items.FirstOrDefault(i => i.Id == sourceId);
                var tgtNow = Items.FirstOrDefault(i => i.Id == targetId);
                var ok = srcNow != null && tgtNow != null
                    && await LocalFiles.MoveFilesIntoFolderAsync(new[] { srcNow, tgtNow }, folder.Id, Folders);
                if (!ok)
                {
                    try { await _repository.DeleteFolderAsync(folder.Id); } catch { }
                }
                await RefreshDataAsync();
                return ok;
            }
            catch { return false; }
        }

        /// <summary>Moves an item into a real folder, or back to the Inbox when folderId is null.</summary>
        public async Task<bool> MoveItemToFolderAsync(string itemId, string? folderId)
        {
            var it = Items.FirstOrDefault(i => i.Id == itemId);
            if (it == null) return false;
            if (folderId != null && Folders.FirstOrDefault(f => f.Id == folderId) == null) return false;

            var current = FolderIdsOf(it);
            if (folderId == null)
            {
                if (current.Count == 0) return false;
            }
            else if (current.Count == 1 && current[0] == folderId)
            {
                return false;
            }

            var rel = ItemMeta.Get(it.MetadataJson, "localFile");
            if (!string.IsNullOrEmpty(rel) && !System.IO.Path.IsPathRooted(rel))
            {
                if (LocalFiles == null) return false;
                var moved = await LocalFiles.MoveFilesIntoFolderAsync(new[] { it }, folderId, Folders);
                if (!moved) return false;
            }
            else
            {
                it.FolderIdsJson = folderId == null
                    ? "[]"
                    : System.Text.Json.JsonSerializer.Serialize(new[] { folderId });
                it.UpdatedAt = DateTime.UtcNow;
                await _repository.SaveItemAsync(it);
            }

            await RefreshDataAsync();
            return true;
        }

        /// <summary>Renames a card. Managed local files are renamed on disk as well.</summary>
        public async Task<bool> RenameItemAsync(string itemId, string newTitle)
        {
            if (string.IsNullOrWhiteSpace(newTitle)) return false;
            var it = Items.FirstOrDefault(i => i.Id == itemId);
            if (it == null) return false;

            try
            {
                var rel = ItemMeta.Get(it.MetadataJson, "localFile");
                if (!string.IsNullOrEmpty(rel) && !System.IO.Path.IsPathRooted(rel))
                {
                    if (LocalFiles == null) return false;
                    var renamed = await LocalFiles.RenameLocalFileAsync(it, newTitle);
                    if (renamed == null) return false;
                }
                else
                {
                    it.Title = newTitle.Trim();
                    it.UpdatedAt = DateTime.UtcNow;
                    await _repository.SaveItemAsync(it);
                }
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine("[BookmarkStateService] rename failed: " + ex.Message);
                return false;
            }

            await RefreshDataAsync();
            return true;
        }

        private static List<string> FolderIdsOf(BookmarkItem it)
        {
            try
            {
                return System.Text.Json.JsonSerializer.Deserialize<List<string>>(
                    string.IsNullOrWhiteSpace(it.FolderIdsJson) ? "[]" : it.FolderIdsJson) ?? new List<string>();
            }
            catch { return new List<string>(); }
        }

        public async Task DeleteFolderAsync(string id)
        {
            // ADDITIVE: capture the physical path before the DB delete, recycle the directory after.
            string rel = string.Empty;
            if (LocalFiles != null)
            {
                try { rel = LocalFiles.FolderChainFor(id, Folders); } catch { }
            }

            await _repository.DeleteFolderAsync(id);

            if (LocalFiles != null && !string.IsNullOrEmpty(rel))
            {
                // Never recycle a directory that items still reference: trashed items keep
                // their files on disk and their localFile metadata points here, so recycling
                // would break restorable cards (permanently on Android).
                var prefix = "Library/" + rel.TrimEnd('/') + "/";
                var referenced = Items.Any(it =>
                {
                    var lf = ItemMeta.Get(it.MetadataJson, "localFile");
                    return !string.IsNullOrEmpty(lf) && lf.StartsWith(prefix, StringComparison.OrdinalIgnoreCase);
                });
                if (referenced)
                {
                    System.Diagnostics.Debug.WriteLine("[BookmarkStateService] folder recycle skipped (still referenced by items): " + rel);
                }
                else
                {
                    try
                    {
                        var abs = System.IO.Path.Combine(Infrastructure.AppPaths.Layout.LibraryDir,
                            rel.Replace('/', System.IO.Path.DirectorySeparatorChar));
                        if (System.IO.Directory.Exists(abs)) await LocalFiles.DeleteLocalFileAsync(abs);
                    }
                    catch (Exception ex) { System.Diagnostics.Debug.WriteLine("[BookmarkStateService] folder recycle failed: " + ex.Message); }
                }
            }
            await RefreshDataAsync();
        }

        public async Task SaveCollectionAsync(BookmarkCollection collection)
        {
            await _repository.SaveCollectionAsync(collection);
            await RefreshDataAsync();
        }

        public async Task DeleteCollectionAsync(string id)
        {
            await _repository.DeleteCollectionAsync(id);
            await RefreshDataAsync();
        }

        // ADDITIVE: pages CRUD. Archive = soft flag (shows in Archive page),
        // Delete = permanent removal (used from the Archive page).
        public async Task SavePageAsync(LibraryPage page)
        {
            await _repository.SavePageAsync(page);
            await RefreshDataAsync();
        }

        public async Task ArchivePageAsync(string id)
        {
            var page = Pages.FirstOrDefault(p => p.Id == id);
            if (page != null) { page.IsArchived = true; await _repository.SavePageAsync(page); await RefreshDataAsync(); }
        }

        public async Task RestorePageAsync(string id)
        {
            var page = Pages.FirstOrDefault(p => p.Id == id);
            if (page != null) { page.IsArchived = false; await _repository.SavePageAsync(page); await RefreshDataAsync(); }
        }

        public async Task DeletePageAsync(string id)
        {
            await _repository.DeletePageAsync(id);
            await RefreshDataAsync();
        }

        // ADDITIVE: soft-archive + restore for collections/folders
        // (old hard-delete methods above stay untouched for permanent removal).
        public async Task ArchiveCollectionAsync(string id)
        {
            var c = Collections.FirstOrDefault(x => x.Id == id);
            if (c != null) { c.IsArchived = true; await _repository.SaveCollectionAsync(c); await RefreshDataAsync(); }
        }

        public async Task RestoreCollectionAsync(string id)
        {
            var c = Collections.FirstOrDefault(x => x.Id == id);
            if (c != null) { c.IsArchived = false; await _repository.SaveCollectionAsync(c); await RefreshDataAsync(); }
        }

        public async Task ArchiveFolderAsync(string id)
        {
            var f = Folders.FirstOrDefault(x => x.Id == id);
            if (f != null) { f.IsArchived = true; await _repository.SaveFolderAsync(f); await RefreshDataAsync(); }
        }

        public async Task RestoreFolderAsync(string id)
        {
            var f = Folders.FirstOrDefault(x => x.Id == id);
            if (f != null) { f.IsArchived = false; await _repository.SaveFolderAsync(f); await RefreshDataAsync(); }
        }

        public async Task SaveKhatmAsync(BookmarkQuranKhatm khatm)
        {
            await _repository.SaveKhatmAsync(khatm);
            await RefreshDataAsync();
        }

        public async Task SaveQuranLogAsync(BookmarkQuranLog log)
        {
            await _repository.SaveQuranLogAsync(log);
            await RefreshDataAsync();
        }

        public async Task DeleteQuranLogAsync(string id)
        {
            await _repository.DeleteQuranLogAsync(id);
            await RefreshDataAsync();
        }

        public async Task SaveClipAsync(BookmarkClip clip)
        {
            await _repository.SaveClipAsync(clip);
            await RefreshDataAsync();
        }

        public async Task DeleteClipAsync(string id)
        {
            await _repository.DeleteClipAsync(id);
            await RefreshDataAsync();
        }

        /// <summary>Loads (or reloads) the first page of clips. Used when the clipboard view opens.</summary>
        public async Task LoadClipsAsync(int limit = ClipPageSize)
        {
            Clips = await _repository.GetClipsPageAsync(0, Math.Max(1, limit));
            ClipsTotal = await _repository.CountClipsAsync();
            NotifyStateChanged();
        }

        /// <summary>Appends the next page of clips. False when everything is already loaded.</summary>
        public async Task<bool> LoadMoreClipsAsync(int limit = ClipPageSize)
        {
            if (Clips.Count >= ClipsTotal) return false;
            var page = await _repository.GetClipsPageAsync(Clips.Count, Math.Max(1, limit));
            if (page.Count == 0) return false;
            Clips.AddRange(page);
            NotifyStateChanged();
            return true;
        }

        /// <summary>
        /// Re-reads the loaded pages and only notifies when something actually changed, so the
        /// clipboard timer stops re-rendering the whole page every tick.
        /// </summary>
        public async Task<bool> RefreshClipsAsync()
        {
            var total = await _repository.CountClipsAsync();
            var take = Math.Max(Clips.Count, ClipPageSize);
            var page = await _repository.GetClipsPageAsync(0, take);
            if (total == ClipsTotal && SameClips(page, Clips)) return false;
            Clips = page;
            ClipsTotal = total;
            NotifyStateChanged();
            return true;
        }

        private static bool SameClips(List<BookmarkClip> a, List<BookmarkClip> b)
        {
            if (a.Count != b.Count) return false;
            for (var i = 0; i < a.Count; i++)
            {
                if (a[i].Id != b[i].Id) return false;
                if (a[i].Pinned != b[i].Pinned) return false;
                if (!string.Equals(a[i].Text, b[i].Text, StringComparison.Ordinal)) return false;
            }
            return true;
        }

        public async Task SaveTagAsync(BookmarkTag tag)
        {
            await _repository.SaveTagAsync(tag);
            await RefreshDataAsync();
        }

        public async Task<string> ExportJsonAsync() => await _repository.ExportJsonAsync();
        public async Task ImportJsonAsync(string json)
        {
            await _repository.ImportJsonAsync(json);
            await RefreshDataAsync();
        }
    }
}
