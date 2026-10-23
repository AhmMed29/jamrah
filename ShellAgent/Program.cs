using System.Diagnostics;
using System.IO.Pipes;
using System.Text;
using System.Text.Json;
using Jamrah.Files.Core;
using SQLite;

namespace Jamrah.ShellAgent;

internal static class Program
{
    private const string AppPipeName = "JamrahShellImport";

    private static async Task<int> Main(string[] args)
    {
        var paths = ShellCommandLine.ParseAddToJamrah(args);
        if (paths.Count == 0) return 0;

        var cfg = ShellAgentConfig.Load();
        if (cfg == null) return 1;

        if (await TrySendToRunningAppAsync(cfg, paths)) return 0;

        if (!File.Exists(cfg.DbPath))
        {
            if (!IsAppRunning())
                LaunchApp(cfg, paths);
            return 0;
        }

        using var importLock = AcquireImportLock(cfg);
        if (importLock == null)
        {
            Log(cfg, "timed out waiting for another import");
            return 1;
        }

        try
        {
            await ShellImporter.ImportAsync(cfg, paths);
            return 0;
        }
        catch (Exception ex)
        {
            Log(cfg, "import failed: " + ex);
            if (!IsAppRunning())
                LaunchApp(cfg, paths);
            return 1;
        }
    }

    private static FileStream? AcquireImportLock(ShellAgentConfig cfg)
    {
        var dir = Path.GetDirectoryName(cfg.DbPath);
        if (string.IsNullOrEmpty(dir)) return null;
        var path = Path.Combine(dir, "shell-agent.import.lock");
        var deadline = DateTime.UtcNow.AddSeconds(30);
        while (DateTime.UtcNow < deadline)
        {
            try
            {
                return new FileStream(path, FileMode.OpenOrCreate, FileAccess.ReadWrite,
                    FileShare.None, 1, FileOptions.DeleteOnClose);
            }
            catch (IOException) { Thread.Sleep(150); }
            catch { return null; }
        }
        return null;
    }

    private static async Task<bool> TrySendToRunningAppAsync(ShellAgentConfig cfg, IReadOnlyList<string> paths)
    {
        if (!IsAppRunning()) return false;

        for (var attempt = 0; attempt < 3; attempt++)
        {
            try
            {
                using var client = new NamedPipeClientStream(
                    ".", AppPipeName, PipeDirection.Out, PipeOptions.Asynchronous);
                await client.ConnectAsync(1500);
                await using var writer = new StreamWriter(client, new UTF8Encoding(false));
                await writer.WriteAsync(JsonSerializer.Serialize(paths));
                await writer.FlushAsync();
                return true;
            }
            catch
            {
                if (attempt < 2) await Task.Delay(500);
            }
        }

        Log(cfg, "app is running but the import pipe was unavailable");
        return false;
    }

    private static bool IsAppRunning()
    {
        try
        {
            var processes = Process.GetProcessesByName("Jamrah");
            try { return processes.Length > 0; }
            finally
            {
                foreach (var p in processes) p.Dispose();
            }
        }
        catch { return false; }
    }

    private static void LaunchApp(ShellAgentConfig cfg, IReadOnlyList<string> paths)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(cfg.AppExePath) || !File.Exists(cfg.AppExePath)) return;
            var psi = new ProcessStartInfo
            {
                FileName = cfg.AppExePath,
                UseShellExecute = false,
                CreateNoWindow = true,
            };
            psi.ArgumentList.Add(ShellCommandLine.AddToJamrahFlag);
            foreach (var path in paths) psi.ArgumentList.Add(path);
            Process.Start(psi);
        }
        catch { }
    }

    internal static void Log(ShellAgentConfig cfg, string message)
    {
        try
        {
            var path = string.IsNullOrWhiteSpace(cfg.LogPath)
                ? Path.Combine(AppContext.BaseDirectory, "shell-agent.log")
                : cfg.LogPath;
            File.AppendAllText(path, $"{DateTime.Now:O} {message}{Environment.NewLine}");
        }
        catch { }
    }
}

internal sealed class ShellAgentConfig
{
    public string DbPath { get; set; } = string.Empty;
    public string LibraryDir { get; set; } = string.Empty;
    public string AppExePath { get; set; } = string.Empty;
    public string LogPath { get; set; } = string.Empty;

    public static ShellAgentConfig? Load()
    {
        try
        {
            var path = Path.Combine(AppContext.BaseDirectory, "shell-agent-config.json");
            if (!File.Exists(path)) return null;
            var cfg = JsonSerializer.Deserialize<ShellAgentConfig>(File.ReadAllText(path));
            if (cfg == null || string.IsNullOrWhiteSpace(cfg.DbPath) || string.IsNullOrWhiteSpace(cfg.LibraryDir))
                return null;
            return cfg;
        }
        catch { return null; }
    }
}

internal static class ShellImporter
{
    public static async Task ImportAsync(ShellAgentConfig cfg, IReadOnlyList<string> sourcePaths)
    {
        SQLitePCL.Batteries_V2.Init();
        var db = new SQLiteAsyncConnection(cfg.DbPath);
        try
        {
            try { await db.ExecuteAsync("PRAGMA busy_timeout=5000;"); } catch { }
            try { await db.ExecuteAsync("PRAGMA journal_mode=WAL;"); } catch { }

            var items = await db.Table<BookmarkItemRow>().ToListAsync();
            var folders = await db.Table<BookmarkFolderRow>().ToListAsync();

            var existing = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            var existingHashes = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            foreach (var item in items)
            {
                var rel = ItemMeta.Get(item.MetadataJson, "localFile");
                if (!string.IsNullOrEmpty(rel))
                {
                    if (rel.StartsWith("Library/", StringComparison.OrdinalIgnoreCase))
                        rel = rel.Substring("Library/".Length);
                    existing.Add(rel);
                }

                if (item.Deleted) continue;
                var hash = ItemMeta.Get(item.MetadataJson, "fileHash");
                if (!string.IsNullOrEmpty(hash)) existingHashes.Add(hash);
            }

            var byId = folders.ToDictionary(f => f.Id, f => (f.Name, f.ParentId));
            foreach (var folder in folders)
            {
                var rel = FolderPathMap.RelativePathFor(folder.Id,
                    id => byId.TryGetValue(id, out var f) ? f : (null, null));
                if (!string.IsNullOrEmpty(rel)) existing.Add(rel);
            }
            SeedPhysicalEntries(existing, cfg.LibraryDir);

            var fileSources = new List<string>();
            var folderSources = new List<string>();
            foreach (var raw in sourcePaths)
            {
                if (string.IsNullOrWhiteSpace(raw)) continue;
                if (Directory.Exists(raw)) folderSources.Add(raw);
                else if (File.Exists(raw)) fileSources.Add(raw);
                else Program.Log(cfg, "missing " + raw);
            }

            foreach (var source in folderSources)
            {
                try
                {
                    if (IsSameOrUnder(source, cfg.LibraryDir))
                        throw new IOException("cannot import the Jamrah library into itself");

                    var plan = FolderImportPlanner.Plan(source, Array.Empty<string>(), existing, cfg.LibraryDir);
                    if (plan.Count == 0)
                        throw new IOException("folder is empty or cannot be imported");

                    await ImportFolderAsync(db, cfg, plan);
                    foreach (var entry in plan) existing.Add(entry.RelativePath);
                }
                catch (Exception ex)
                {
                    Program.Log(cfg, "failed folder " + source + ": " + ex.Message);
                }
            }

            var ops = ImportPlanner.Plan(fileSources, Array.Empty<string>(), ImportMode.Copy, existing);
            foreach (var op in ops)
            {
                try
                {
                    var info = new FileInfo(op.SourcePath);
                    if (!info.Exists) continue;

                    var hash = await FileHasher.Sha256Async(op.SourcePath);
                    var dedupe = info.Length > 0;
                    if (dedupe && existingHashes.Contains(hash)) continue;
                    if (dedupe) existingHashes.Add(hash);

                    var rel = op.TargetRelativePath!;
                    var target = AbsoluteLibraryPath(cfg.LibraryDir, rel);
                    Directory.CreateDirectory(Path.GetDirectoryName(target)!);

                    var temp = target + ".part-" + Guid.NewGuid().ToString("N");
                    try
                    {
                        await FileOps.CopyWithProgressAsync(op.SourcePath, temp, null);
                        if (File.Exists(target)) throw new IOException("target already exists: " + rel);
                        File.Move(temp, target, false);
                    }
                    catch
                    {
                        try { if (File.Exists(temp)) File.Delete(temp); } catch { }
                        throw;
                    }

                    var kind = LocalFileClassifier.KindFor(op.SourcePath);
                    var metadata = "{}";
                    metadata = ItemMeta.Set(metadata, "localFile", "Library/" + rel);
                    metadata = ItemMeta.Set(metadata, "sourcePath", op.SourcePath);
                    metadata = ItemMeta.Set(metadata, "fileHash", hash);
                    metadata = ItemMeta.Set(metadata, "fileKind", kind);
                    metadata = ItemMeta.Set(metadata, "fileStatus", "ok");

                    var row = new BookmarkItemRow
                    {
                        Id = Guid.NewGuid().ToString(),
                        Type = LocalFileClassifier.ItemTypeFor(kind),
                        Title = Path.GetFileNameWithoutExtension(op.SourcePath),
                        MetadataJson = metadata,
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow,
                        LastOpenedAt = DateTime.MinValue,
                    };

                    try
                    {
                        await db.InsertAsync(row);
                    }
                    catch
                    {
                        try { if (File.Exists(target)) File.Delete(target); } catch { }
                        throw;
                    }

                    existing.Add(rel);
                }
                catch (Exception ex)
                {
                    Program.Log(cfg, "failed " + op.SourcePath + ": " + ex.Message);
                }
            }
        }
        finally
        {
            await db.CloseAsync();
        }
    }

    private static async Task ImportFolderAsync(
        SQLiteAsyncConnection db, ShellAgentConfig cfg, IReadOnlyList<FolderImportEntry> plan)
    {
        if (plan.Count == 0 || !plan[0].IsDirectory)
            throw new InvalidOperationException("folder import plan has no root directory");

        var rootEntry = plan[0];
        var rootRelative = rootEntry.RelativePath;
        var rootAbsolute = AbsoluteLibraryPath(cfg.LibraryDir, rootRelative);
        if (File.Exists(rootAbsolute) || Directory.Exists(rootAbsolute))
            throw new IOException("target already exists: " + rootRelative);

        var folderIds = new Dictionary<string, string>(StringComparer.Ordinal);
        var createdFolders = new List<string>();
        var createdItems = new List<string>();

        try
        {
            Directory.CreateDirectory(rootAbsolute);
            foreach (var dir in plan.Where(e => e.IsDirectory))
                Directory.CreateDirectory(AbsoluteLibraryPath(cfg.LibraryDir, dir.RelativePath));

            var files = plan.Where(e => !e.IsDirectory).ToList();
            foreach (var entry in files)
            {
                var info = new FileInfo(entry.SourcePath);
                if (!info.Exists)
                    throw new FileNotFoundException("source file not found", entry.SourcePath);

                var target = AbsoluteLibraryPath(cfg.LibraryDir, entry.RelativePath);
                Directory.CreateDirectory(Path.GetDirectoryName(target)!);
                var temp = target + ".part-" + Guid.NewGuid().ToString("N");
                try
                {
                    await FileOps.CopyWithProgressAsync(entry.SourcePath, temp, null);
                    if (File.Exists(target))
                        throw new IOException("target already exists: " + entry.RelativePath);
                    File.Move(temp, target, false);
                }
                catch
                {
                    try { if (File.Exists(temp)) File.Delete(temp); } catch { }
                    throw;
                }
            }

            foreach (var dir in plan.Where(e => e.IsDirectory))
            {
                var id = Guid.NewGuid().ToString();
                folderIds[dir.RelativePath] = id;
                var parentId = string.Equals(dir.RelativePath, rootRelative, StringComparison.Ordinal)
                    ? null
                    : folderIds[ParentRelative(dir.RelativePath) ?? throw new InvalidOperationException("folder plan is not rooted")];
                var row = new BookmarkFolderRow
                {
                    Id = id,
                    Name = LastSegment(dir.RelativePath),
                    Icon = string.Empty,
                    Color = FolderColorFor(id),
                    IsOpen = true,
                    IsArchived = false,
                    CollectionId = null,
                    ParentId = parentId,
                    SourcePath = null,
                };
                await db.InsertAsync(row);
                createdFolders.Add(id);
            }

            foreach (var entry in files)
            {
                var parentRelative = ParentRelative(entry.RelativePath)
                    ?? throw new InvalidOperationException("file plan is not rooted");
                if (!folderIds.TryGetValue(parentRelative, out var folderId))
                    throw new InvalidOperationException("missing parent folder for " + entry.RelativePath);

                var kind = LocalFileClassifier.KindFor(entry.SourcePath);
                var metadata = "{}";
                metadata = ItemMeta.Set(metadata, "localFile", "Library/" + entry.RelativePath);
                metadata = ItemMeta.Set(metadata, "sourcePath", entry.SourcePath);
                metadata = ItemMeta.Set(metadata, "fileKind", kind);
                metadata = ItemMeta.Set(metadata, "fileStatus", "ok");

                var row = new BookmarkItemRow
                {
                    Id = Guid.NewGuid().ToString(),
                    Type = LocalFileClassifier.ItemTypeFor(kind),
                    Title = Path.GetFileNameWithoutExtension(LastSegment(entry.RelativePath)),
                    FolderIdsJson = JsonSerializer.Serialize(new[] { folderId }),
                    MetadataJson = metadata,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow,
                    LastOpenedAt = DateTime.MinValue,
                };
                await db.InsertAsync(row);
                createdItems.Add(row.Id);
            }
        }
        catch
        {
            foreach (var id in createdItems)
            {
                try { await db.DeleteAsync<BookmarkItemRow>(id); } catch { }
            }
            foreach (var id in createdFolders)
            {
                try { await db.DeleteAsync<BookmarkFolderRow>(id); } catch { }
            }
            try { FileOps.DeletePermanently(rootAbsolute); } catch { }
            throw;
        }
    }

    private static string AbsoluteLibraryPath(string library, string relative) =>
        SafePath.ResolveUnderRoot(library, relative)
        ?? throw new InvalidOperationException("Unsafe library path: " + relative);

    private static string LastSegment(string relative)
    {
        var slash = relative.LastIndexOf('/');
        return slash < 0 ? relative : relative[(slash + 1)..];
    }

    private static string? ParentRelative(string relative)
    {
        var slash = relative.LastIndexOf('/');
        return slash < 0 ? null : relative[..slash];
    }

    private static void SeedPhysicalEntries(HashSet<string> existing, string library)
    {
        if (!Directory.Exists(library)) return;
        foreach (var entry in Directory.EnumerateFileSystemEntries(library))
        {
            var name = Path.GetFileName(entry);
            if (!string.IsNullOrEmpty(name)) existing.Add(name);
        }
    }

    private static bool IsSameOrUnder(string path, string root)
    {
        var comparison = StringComparison.OrdinalIgnoreCase;
        var p = Path.GetFullPath(path).TrimEnd(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar);
        var r = Path.GetFullPath(root).TrimEnd(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar);
        return string.Equals(p, r, comparison)
            || p.StartsWith(r + Path.DirectorySeparatorChar, comparison);
    }

    private static string FolderColorFor(string id)
    {
        var palette = new[] { "#8a8580", "#2563eb", "#0f766e", "#4d7c0f", "#b45309", "#b91c1c", "#9333ea", "#be185d" };
        var hash = 0;
        foreach (var c in id) hash += c;
        return palette[Math.Abs(hash) % palette.Length];
    }
}
[Table("BookmarkItems")]
internal sealed class BookmarkItemRow
{
    [PrimaryKey]
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string Type { get; set; } = "link";
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Url { get; set; } = string.Empty;
    public string Thumb { get; set; } = string.Empty;
    public string Notes { get; set; } = string.Empty;
    public string TagsJson { get; set; } = "[]";
    public string FolderIdsJson { get; set; } = "[]";
    public string CollectionIdsJson { get; set; } = "[]";
    public string PageIdsJson { get; set; } = "[]";
    public string RelationsJson { get; set; } = "[]";
    public string SessionsJson { get; set; } = "[]";
    public string MetadataJson { get; set; } = "{}";
    public string? Tpl { get; set; }
    public bool Favorite { get; set; }
    public bool Pinned { get; set; }
    public bool Archived { get; set; }
    public bool Deleted { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public DateTime LastOpenedAt { get; set; } = DateTime.MinValue;
}

[Table("BookmarkFolders")]
internal sealed class BookmarkFolderRow
{
    [PrimaryKey]
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Icon { get; set; } = string.Empty;
    public string Color { get; set; } = string.Empty;
    public bool IsOpen { get; set; } = true;
    public bool IsArchived { get; set; }
    public string? CollectionId { get; set; }
    public string? ParentId { get; set; }
    public string? SourcePath { get; set; }
}
