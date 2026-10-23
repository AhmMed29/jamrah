using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Jamrah.Core.Entities;
using Jamrah.Core.Interfaces;
using Jamrah.Files.Core;
using Jamrah.Infrastructure;

namespace Jamrah.Application.Services
{
    public sealed record ImportReport(
        int Imported,
        int SkippedDuplicates,
        IReadOnlyList<string> Errors,
        IReadOnlyList<string> FailedSources,
        int FoldersCreated = 0);

    /// <summary>
    /// ADDITIVE: all physical file operations for the managed library.
    /// Only items/folders that carry local-file metadata are ever touched on disk.
    /// </summary>
    public sealed class LocalFileService
    {
        private readonly IBookmarkRepository _repository;
        private readonly object _iconBackfillLock = new();
        private bool _iconBackfillStarted;

        public LocalFileService(IBookmarkRepository repository) => _repository = repository;

        public static readonly string[] ImageExts = LocalFileClassifier.ImageExts;
        public static readonly string[] VideoExts = LocalFileClassifier.VideoExts;
        public static readonly string[] AudioExts = LocalFileClassifier.AudioExts;
        public static readonly string[] TextExts = LocalFileClassifier.TextExts;

        public static string KindFor(string path) => LocalFileClassifier.KindFor(path);

        // Imported text files carry no "content" metadata, so the note template would
        // render an empty body; the file template shows metadata + actions instead.
        public static string ItemTypeFor(string kind) => LocalFileClassifier.ItemTypeFor(kind);

        /// <summary>Folder chain (root-first names) for a folder id, from current state.</summary>
        public string FolderChainFor(string? folderId, IEnumerable<BookmarkFolder> folders)
        {
            if (string.IsNullOrEmpty(folderId)) return string.Empty;
            var byId = folders.ToDictionary(f => f.Id, f => (f.Name, f.ParentId));
            // DEVIATION 1: FolderPathMap's contract is now nullable-name (null = unknown id);
            // the old "?" sentinel was removed and would sanitize to "_".
            return FolderPathMap.RelativePathFor(folderId, id => byId.TryGetValue(id, out var v) ? v : (null, null));
        }

        /// <summary>Absolute physical directory for a managed library folder ("" when unknown).</summary>
        public string FolderAbsolutePath(string folderId, IEnumerable<BookmarkFolder> folders)
        {
            var chain = FolderChainFor(folderId, folders);
            if (string.IsNullOrEmpty(chain)) return string.Empty;
            return SafePath.ResolveUnderRoot(AppPaths.Layout.LibraryDir, chain) ?? string.Empty;
        }

        /// <summary>Creates the real directory for a folder (used for brand-new empty folders).</summary>
        public void EnsureFolderDirectory(string folderId, IEnumerable<BookmarkFolder> folders)
        {
            var abs = FolderAbsolutePath(folderId, folders);
            if (!string.IsNullOrEmpty(abs)) Directory.CreateDirectory(abs);
        }

        /// <summary>Copies a folder's physical tree to the path of its freshly-created clone.</summary>
        public void CopyFolderDirectory(string oldRelative, string newRelative)
        {
            if (string.IsNullOrEmpty(oldRelative) || string.IsNullOrEmpty(newRelative) || oldRelative == newRelative) return;
            var src = SafePath.ResolveUnderRoot(AppPaths.Layout.LibraryDir, oldRelative);
            var dst = SafePath.ResolveUnderRoot(AppPaths.Layout.LibraryDir, newRelative);
            if (src == null || dst == null) return;
            if (!Directory.Exists(src)) return; // legacy folder with no directory yet: the clone stays empty
            if (Directory.Exists(dst) || File.Exists(dst)) throw new IOException("Folder copy target already exists: " + newRelative);
            Directory.CreateDirectory(Path.GetDirectoryName(dst)!);
            FileOps.CopyDirectory(src, dst);
        }

        public async Task<ImportReport> ImportAsync(
            IReadOnlyList<string> sourcePaths, string? destFolderId, ImportMode mode,
            Func<IEnumerable<BookmarkFolder>> foldersProvider,
            IProgress<(int Index, int Total, string FileName, long Bytes, long TotalBytes)>? progress = null,
            CancellationToken ct = default)
        {
            var library = AppPaths.Layout.LibraryDir;
            var folders = foldersProvider().ToList();
            var chain = FolderChainFor(destFolderId, folders);
            var chainParts = chain.Split('/', StringSplitOptions.RemoveEmptyEntries);
            var existing = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            var existingHashes = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            foreach (var it in await _repository.GetItemsAsync())
            {
                var rel = ItemMeta.Get(it.MetadataJson, "localFile");
                // Trashed items keep their file on disk (soft trash does not recycle), so their
                // paths still occupy the library and must block a colliding re-import target
                // (the planner then allocates "name (2).ext" instead).
                if (!string.IsNullOrEmpty(rel)) existing.Add(rel.StartsWith("Library/", StringComparison.OrdinalIgnoreCase) ? rel.Substring("Library/".Length) : rel);
                // Their hashes must NOT be seeded: identical content may be re-imported under the new name.
                if (it.Deleted) continue;
                var h = ItemMeta.Get(it.MetadataJson, "fileHash");
                if (!string.IsNullOrEmpty(h)) existingHashes.Add(h);
            }
            // ImportPlanner contract: directory paths must be seeded too, so a new file
            // cannot take an existing folder's future name.
            foreach (var f in folders)
            {
                var frel = FolderChainFor(f.Id, folders);
                if (!string.IsNullOrEmpty(frel)) existing.Add(frel);
            }
            // Orphan files/directories (no DB row) still occupy names on disk.
            SeedPhysicalEntries(existing, library, chainParts);

            var errors = new List<string>();
            var failedSources = new List<string>();
            int imported = 0, skipped = 0, foldersCreated = 0;

            var fileSources = new List<string>();
            var folderSources = new List<string>();
            foreach (var raw in sourcePaths)
            {
                if (string.IsNullOrWhiteSpace(raw)) continue;
                var source = raw.Trim();
                if (Directory.Exists(source)) folderSources.Add(source);
                else if (File.Exists(source)) fileSources.Add(source);
                else
                {
                    errors.Add($"{Path.GetFileName(source)}: not found");
                    failedSources.Add(source);
                }
            }

            foreach (var source in folderSources)
            {
                ct.ThrowIfCancellationRequested();
                try
                {
                    if (IsSameOrUnder(source, library))
                        throw new IOException("cannot import the Jamrah library into itself");

                    var plan = FolderImportPlanner.Plan(source, chainParts, existing, library);
                    if (plan.Count == 0)
                        throw new IOException("folder is empty or cannot be imported");

                    var result = await ImportFolderPlanAsync(plan, destFolderId, folders, progress, ct);
                    imported += result.Imported;
                    foldersCreated += result.FoldersCreated;
                    foreach (var entry in plan) existing.Add(entry.RelativePath);
                }
                catch (OperationCanceledException) { throw; }
                catch (Exception ex)
                {
                    errors.Add($"{Path.GetFileName(source)}: {ex.Message}");
                    failedSources.Add(source);
                }
            }

            if (fileSources.Count > 0)
            {
                var ops = ImportPlanner.Plan(fileSources, chainParts, mode, existing);
                var index = 0;
                foreach (var op in ops)
                {
                    index++;
                    var currentIndex = index;
                    // DEVIATION 4: Link mode is Phase 2 (linked folders); Phase 1 import UI only
                    // offers Copy/Move. Never proceed with a null target.
                    if (op.Mode == ImportMode.Link)
                    {
                        errors.Add($"{Path.GetFileName(op.SourcePath)}: link mode not supported yet");
                        failedSources.Add(op.SourcePath);
                        continue;
                    }
                    try
                    {
                        ct.ThrowIfCancellationRequested();
                        var info = new FileInfo(op.SourcePath);
                        if (!info.Exists) { errors.Add($"{Path.GetFileName(op.SourcePath)}: not found"); failedSources.Add(op.SourcePath); continue; }

                        // Identical content never imported twice (hash of the SOURCE, before copying).
                        var hash = await FileHasher.Sha256Async(op.SourcePath, ct);
                        // DEVIATION 5: zero-byte files all share the same SHA-256; never dedupe them.
                        var dedupe = info.Length > 0;
                        if (dedupe && existingHashes.Contains(hash)) { skipped++; continue; }
                        if (dedupe) existingHashes.Add(hash);

                        var rel = op.TargetRelativePath!;
                        var target = AbsoluteLibraryPath(rel);
                        Directory.CreateDirectory(Path.GetDirectoryName(target)!);

                        var reporter = new Progress<long>(bytes => progress?.Report((currentIndex, ops.Count, info.Name, bytes, info.Length)));

                        if (op.Mode == ImportMode.Copy)
                        {
                            // Copy to a unique temp name, then land it non-overwriting so a
                            // concurrent import or orphan file can never be clobbered.
                            var temp = target + ".part-" + Guid.NewGuid().ToString("N");
                            try
                            {
                                await FileOps.CopyWithProgressAsync(op.SourcePath, temp, reporter, ct);
                                if (File.Exists(target)) throw new IOException("target already exists: " + rel);
                                File.Move(temp, target, false);
                            }
                            catch
                            {
                                try { if (File.Exists(temp)) File.Delete(temp); } catch { }
                                throw;
                            }
                        }
                        else
                        {
                            try
                            {
                                File.Move(op.SourcePath, target, false);
                                progress?.Report((currentIndex, ops.Count, info.Name, info.Length, info.Length));
                            }
                            catch
                            {
                                if (File.Exists(target)) throw new IOException("target already exists: " + rel);
                                try { await FileOps.CopyWithProgressAsync(op.SourcePath, target, reporter, ct); }
                                catch
                                {
                                    try { if (File.Exists(target)) File.Delete(target); } catch { }
                                    throw;
                                }
                                if (new FileInfo(target).Length != info.Length)
                                {
                                    try { File.Delete(target); } catch { }
                                    throw new IOException("size mismatch after move-copy: " + info.Name);
                                }
                                try { File.Delete(op.SourcePath); }
                                catch
                                {
                                    try { if (File.Exists(target)) File.Delete(target); } catch { }
                                    throw new IOException("could not remove source after copy: " + op.SourcePath);
                                }
                            }
                        }

                        var kind = KindFor(op.SourcePath);

                        var item = new BookmarkItem
                        {
                            Type = ItemTypeFor(kind),
                            Title = Path.GetFileNameWithoutExtension(op.SourcePath),
                            Url = string.Empty,
                            MetadataJson = "{}",
                        };
                        item.MetadataJson = ItemMeta.Set(item.MetadataJson, "localFile", "Library/" + rel);
                        item.MetadataJson = ItemMeta.Set(item.MetadataJson, "sourcePath", op.SourcePath);
                        item.MetadataJson = ItemMeta.Set(item.MetadataJson, "fileHash", hash);
                        item.MetadataJson = ItemMeta.Set(item.MetadataJson, "fileKind", kind);
                        item.MetadataJson = ItemMeta.Set(item.MetadataJson, "fileStatus", "ok");
                        var icon = await TryExtractIconAsync(target, kind, ct);
                        if (icon != null)
                        {
                            item.MetadataJson = ItemMeta.Set(item.MetadataJson, "fileIcon", icon.Value.DataUri);
                            item.MetadataJson = ItemMeta.Set(item.MetadataJson, "fileIconKind", icon.Value.Kind);
                        }
                        await TryAttachPdfCoverAsync(item, target, kind, ct);
                        if (!string.IsNullOrEmpty(destFolderId))
                            item.FolderIdsJson = System.Text.Json.JsonSerializer.Serialize(new[] { destFolderId });

                        try
                        {
                            await _repository.SaveItemAsync(item);
                        }
                        catch (Exception saveEx)
                        {
                            // Roll the physical move/copy back so a failed save cannot orphan or lose the file.
                            var rolledBack = true;
                            try
                            {
                                if (op.Mode == ImportMode.Move)
                                {
                                    if (File.Exists(target) && !File.Exists(op.SourcePath)) File.Move(target, op.SourcePath, false);
                                    else if (File.Exists(target)) File.Delete(target);
                                }
                                else if (File.Exists(target))
                                {
                                    File.Delete(target);
                                }
                            }
                            catch { rolledBack = false; }
                            if (!rolledBack)
                                throw new Exception(saveEx.Message + " (imported file left at " + target + ")", saveEx);
                            throw;
                        }
                        imported++;
                    }
                    catch (OperationCanceledException) { throw; }
                    catch (Exception ex) { errors.Add($"{Path.GetFileName(op.SourcePath)}: {ex.Message}"); failedSources.Add(op.SourcePath); }
                }
            }
            return new ImportReport(imported, skipped, errors, failedSources, foldersCreated);
        }

        /// <summary>
        /// Copies a planned folder tree into the library and creates matching folder items.
        /// All-or-nothing per root: a DB or copy failure removes the new tree and rows.
        /// </summary>
        private async Task<(int Imported, int FoldersCreated)> ImportFolderPlanAsync(
            IReadOnlyList<FolderImportEntry> plan,
            string? destFolderId,
            IReadOnlyList<BookmarkFolder> folders,
            IProgress<(int Index, int Total, string FileName, long Bytes, long TotalBytes)>? progress,
            CancellationToken ct)
        {
            if (plan.Count == 0 || !plan[0].IsDirectory)
                throw new InvalidOperationException("folder import plan has no root directory");

            var library = AppPaths.Layout.LibraryDir;
            var rootEntry = plan[0];
            var rootRelative = rootEntry.RelativePath;
            var rootAbsolute = AbsoluteLibraryPath(rootRelative);
            if (File.Exists(rootAbsolute) || Directory.Exists(rootAbsolute))
                throw new IOException("target already exists: " + rootRelative);

            var folderIds = new Dictionary<string, string>(StringComparer.Ordinal);
            var createdFolderIds = new List<string>();
            var createdItemIds = new List<string>();
            var foldersCreated = 0;

            try
            {
                Directory.CreateDirectory(rootAbsolute);
                foreach (var dir in plan.Where(e => e.IsDirectory))
                    Directory.CreateDirectory(AbsoluteLibraryPath(dir.RelativePath));

                var files = plan.Where(e => !e.IsDirectory).ToList();
                for (var i = 0; i < files.Count; i++)
                {
                    ct.ThrowIfCancellationRequested();
                    var entry = files[i];
                    var info = new FileInfo(entry.SourcePath);
                    if (!info.Exists)
                        throw new FileNotFoundException("source file not found", entry.SourcePath);

                    var target = AbsoluteLibraryPath(entry.RelativePath);
                    Directory.CreateDirectory(Path.GetDirectoryName(target)!);
                    var temp = target + ".part-" + Guid.NewGuid().ToString("N");
                    var reporter = new Progress<long>(bytes =>
                        progress?.Report((i + 1, files.Count, info.Name, bytes, info.Length)));
                    try
                    {
                        await FileOps.CopyWithProgressAsync(entry.SourcePath, temp, reporter, ct);
                        if (File.Exists(target))
                            throw new IOException("target already exists: " + entry.RelativePath);
                        File.Move(temp, target, false);
                    }
                    catch
                    {
                        try { if (File.Exists(temp)) File.Delete(temp); } catch { }
                        throw;
                    }
                    progress?.Report((i + 1, files.Count, info.Name, info.Length, info.Length));
                }

                var parent = folders.FirstOrDefault(f => f.Id == destFolderId);
                foreach (var dir in plan.Where(e => e.IsDirectory))
                {
                    var id = Guid.NewGuid().ToString();
                    folderIds[dir.RelativePath] = id;
                    var parentId = string.Equals(dir.RelativePath, rootRelative, StringComparison.Ordinal)
                        ? destFolderId
                        : folderIds[ParentRelative(dir.RelativePath) ?? throw new InvalidOperationException("folder plan is not rooted")];
                    var folder = new BookmarkFolder
                    {
                        Id = id,
                        Name = LastSegment(dir.RelativePath),
                        ParentId = parentId,
                        CollectionId = parent?.CollectionId,
                        IsOpen = true,
                        Color = BookmarkStateService.FolderColorFor(id),
                    };
                    await _repository.SaveFolderAsync(folder);
                    createdFolderIds.Add(id);
                    foldersCreated++;
                }

                foreach (var entry in files)
                {
                    ct.ThrowIfCancellationRequested();
                    var parentRelative = ParentRelative(entry.RelativePath)
                        ?? throw new InvalidOperationException("file plan is not rooted");
                    if (!folderIds.TryGetValue(parentRelative, out var folderId))
                        throw new InvalidOperationException("missing parent folder for " + entry.RelativePath);

                    var target = AbsoluteLibraryPath(entry.RelativePath);
                    var kind = KindFor(entry.SourcePath);
                    var item = new BookmarkItem
                    {
                        Type = ItemTypeFor(kind),
                        Title = Path.GetFileNameWithoutExtension(LastSegment(entry.RelativePath)),
                        Url = string.Empty,
                        MetadataJson = "{}",
                        FolderIdsJson = System.Text.Json.JsonSerializer.Serialize(new[] { folderId }),
                    };
                    item.MetadataJson = ItemMeta.Set(item.MetadataJson, "localFile", "Library/" + entry.RelativePath);
                    item.MetadataJson = ItemMeta.Set(item.MetadataJson, "sourcePath", entry.SourcePath);
                    item.MetadataJson = ItemMeta.Set(item.MetadataJson, "fileKind", kind);
                    item.MetadataJson = ItemMeta.Set(item.MetadataJson, "fileStatus", "ok");
                    var icon = await TryExtractIconAsync(target, kind, ct);
                    if (icon != null)
                    {
                        item.MetadataJson = ItemMeta.Set(item.MetadataJson, "fileIcon", icon.Value.DataUri);
                        item.MetadataJson = ItemMeta.Set(item.MetadataJson, "fileIconKind", icon.Value.Kind);
                    }
                    await TryAttachPdfCoverAsync(item, target, kind, ct);
                    await _repository.SaveItemAsync(item);
                    createdItemIds.Add(item.Id);
                }

                return (files.Count, foldersCreated);
            }
            catch
            {
                foreach (var id in createdItemIds)
                {
                    try { await _repository.DeleteItemAsync(id); } catch { }
                }
                foreach (var id in createdFolderIds)
                {
                    try { await _repository.DeleteFolderAsync(id); } catch { }
                }
                try { FileOps.DeletePermanently(rootAbsolute); } catch { }
                throw;
            }
        }

        private static string AbsoluteLibraryPath(string relative) =>
            SafePath.ResolveUnderRoot(AppPaths.Layout.LibraryDir, relative)
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

        private static void SeedPhysicalEntries(HashSet<string> existing, string library, string[] chain)
        {
            var dir = chain.Length == 0 ? library : Path.Combine(library, Path.Combine(chain));
            if (!Directory.Exists(dir)) return;
            var prefix = chain.Length == 0 ? string.Empty : string.Join('/', chain) + "/";
            foreach (var entry in Directory.EnumerateFileSystemEntries(dir))
            {
                var name = Path.GetFileName(entry);
                if (!string.IsNullOrEmpty(name)) existing.Add(prefix + name);
            }
        }

        private static bool IsSameOrUnder(string path, string root)
        {
            var comparison = OperatingSystem.IsWindows()
                ? StringComparison.OrdinalIgnoreCase
                : StringComparison.Ordinal;
            var p = Path.GetFullPath(path).TrimEnd(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar);
            var r = Path.GetFullPath(root).TrimEnd(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar);
            return string.Equals(p, r, comparison)
                || p.StartsWith(r + Path.DirectorySeparatorChar, comparison);
        }

        /// <summary>Windows: recycle bin. Android: permanent delete (caller must confirm).</summary>
        public Task DeleteLocalFileAsync(string absolutePath)
        {
            if (!SafePath.IsUnderRoot(AppPaths.Layout.LibraryDir, absolutePath))
                return Task.CompletedTask;
#if WINDOWS
            return Task.Run(() =>
            {
                try
                {
                    if (File.Exists(absolutePath))
                        Microsoft.VisualBasic.FileIO.FileSystem.DeleteFile(absolutePath,
                            Microsoft.VisualBasic.FileIO.UIOption.OnlyErrorDialogs,
                            Microsoft.VisualBasic.FileIO.RecycleOption.SendToRecycleBin);
                    else if (Directory.Exists(absolutePath))
                        Microsoft.VisualBasic.FileIO.FileSystem.DeleteDirectory(absolutePath,
                            Microsoft.VisualBasic.FileIO.UIOption.OnlyErrorDialogs,
                            Microsoft.VisualBasic.FileIO.RecycleOption.SendToRecycleBin);
                }
                catch (Exception ex) { System.Diagnostics.Debug.WriteLine("[LocalFileService] recycle failed: " + ex.Message); }
            });
#else
            return Task.Run(() =>
            {
                try
                {
                    if (File.Exists(absolutePath)) File.Delete(absolutePath);
                    else if (Directory.Exists(absolutePath)) Directory.Delete(absolutePath, true);
                }
                catch (Exception ex) { System.Diagnostics.Debug.WriteLine("[LocalFileService] delete failed: " + ex.Message); }
            });
#endif
        }

        // ADDITIVE: real Windows icon / first-page preview so file cards do not look like notes.
        private static bool ShouldExtractIcon(string kind) => kind is "generic" or "pdf" or "text";

        private static async Task<(string DataUri, string Kind)?> TryExtractIconAsync(
            string absolutePath, string kind, CancellationToken ct)
        {
            if (!ShouldExtractIcon(kind) || !FileIconService.IsSupported) return null;
            try { return await FileIconService.ExtractAsync(absolutePath, ct); }
            catch { return null; }
        }

        private static async Task<bool> TryAttachPdfCoverAsync(
            BookmarkItem item, string absolutePath, string kind, CancellationToken ct)
        {
            if (!PdfCover.ShouldRender(kind) || !PdfCoverRenderer.IsSupported) return false;
            var fileName = PdfCover.FileNameFor(item.Id);
            var target = PdfCover.AbsolutePathFor(AppPaths.Layout.ThumbsDir, fileName);
            if (target == null) return false;

            string? temp = null;
            try
            {
                var bytes = await PdfCoverRenderer.RenderFirstPageJpegAsync(absolutePath, ct: ct);
                if (bytes == null || bytes.Length == 0 || bytes.Length > PdfCoverRenderer.MaxInlineBytes)
                    return false;

                Directory.CreateDirectory(AppPaths.Layout.ThumbsDir);
                temp = target + ".part-" + Guid.NewGuid().ToString("N");
                await File.WriteAllBytesAsync(temp, bytes, ct);
                File.Move(temp, target, true);
                temp = null;

                item.MetadataJson = ItemMeta.Set(item.MetadataJson, PdfCover.MetaKey, fileName!);
                item.MetadataJson = ItemMeta.Set(item.MetadataJson, PdfCover.KindMetaKey, PdfCover.Kind);
                return true;
            }
            catch (OperationCanceledException) { throw; }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine("[LocalFileService] PDF cover failed: " + ex.Message);
                return false;
            }
            finally
            {
                if (temp != null)
                {
                    try { if (File.Exists(temp)) File.Delete(temp); } catch { }
                }
            }
        }

        /// <summary>
        /// ADDITIVE: one-shot backfill for files imported before icons existed (e.g. Gemini).
        /// Never throws; returns how many items were updated.
        /// </summary>
        public async Task<int> BackfillFileIconsAsync(CancellationToken ct = default)
        {
            if (!FileIconService.IsSupported && !PdfCoverRenderer.IsSupported) return 0;
            lock (_iconBackfillLock)
            {
                if (_iconBackfillStarted) return 0;
                _iconBackfillStarted = true;
            }

            var changed = 0;
            foreach (var it in await _repository.GetItemsAsync())
            {
                ct.ThrowIfCancellationRequested();
                var rel = ItemMeta.Get(it.MetadataJson, "localFile");
                if (string.IsNullOrEmpty(rel) || Path.IsPathRooted(rel)) continue;

                var kind = ItemMeta.Get(it.MetadataJson, "fileKind");
                if (string.IsNullOrEmpty(kind)) kind = KindFor(rel);

                var abs = SafePath.ResolveUnderRoot(AppPaths.Layout.Root, rel);
                if (abs == null || !File.Exists(abs)) continue;

                var dirty = false;
                var coverName = ItemMeta.Get(it.MetadataJson, PdfCover.MetaKey);
                var coverPath = PdfCover.AbsolutePathFor(AppPaths.Layout.ThumbsDir, coverName);
                if (PdfCover.ShouldRender(kind)
                    && (string.IsNullOrEmpty(coverName) || coverPath == null || !File.Exists(coverPath))
                    && await TryAttachPdfCoverAsync(it, abs, kind, ct))
                    dirty = true;

                if (string.IsNullOrEmpty(ItemMeta.Get(it.MetadataJson, "fileIcon"))
                    && ShouldExtractIcon(kind))
                {
                    var icon = await TryExtractIconAsync(abs, kind, ct);
                    if (icon != null)
                    {
                        it.MetadataJson = ItemMeta.Set(it.MetadataJson, "fileIcon", icon.Value.DataUri);
                        it.MetadataJson = ItemMeta.Set(it.MetadataJson, "fileIconKind", icon.Value.Kind);
                        dirty = true;
                    }
                }

                if (!dirty) continue;
                try { await _repository.SaveItemAsync(it); changed++; }
                catch (Exception ex) { System.Diagnostics.Debug.WriteLine("[LocalFileService] icon backfill save failed: " + ex.Message); }
            }
            return changed;
        }

        /// <summary>
        /// ADDITIVE (collections): physically moves the given local files into a managed
        /// library folder and points their metadata/FolderIds at it. Rolls the whole batch
        /// back when anything fails, so no file is ever lost or orphaned.
        /// </summary>
        public async Task<bool> MoveFilesIntoFolderAsync(
            IReadOnlyList<BookmarkItem> items, string? folderId, IEnumerable<BookmarkFolder> folders)
        {
            var chain = string.IsNullOrEmpty(folderId) ? string.Empty : FolderChainFor(folderId, folders);
            if (!string.IsNullOrEmpty(folderId) && string.IsNullOrEmpty(chain)) return false;
            var library = AppPaths.Layout.LibraryDir;
            var destDir = string.IsNullOrEmpty(chain)
                ? library
                : SafePath.ResolveUnderRoot(library, chain);
            if (destDir == null) return false;

            var moves = new List<(string OldAbs, string NewAbs, string OldMeta, string OldFoldersJson, BookmarkItem Item)>();
            try
            {
                var destDirExisted = Directory.Exists(destDir);
                Directory.CreateDirectory(destDir);
                var taken = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
                if (destDirExisted)
                    foreach (var f in Directory.EnumerateFiles(destDir)) taken.Add(Path.GetFileName(f));

                foreach (var it in items)
                {
                    var rel = ItemMeta.Get(it.MetadataJson, "localFile");
                    if (string.IsNullOrEmpty(rel) || Path.IsPathRooted(rel)) throw new IOException("not a managed local file");
                    var libRel = rel.StartsWith("Library/", StringComparison.OrdinalIgnoreCase)
                        ? rel.Substring("Library/".Length) : rel;
                    var abs = SafePath.ResolveUnderRoot(library, libRel);
                    if (abs == null || !File.Exists(abs)) throw new IOException("source file missing: " + libRel);

                    var fileName = FileNaming.EnsureUnique(Path.GetFileName(abs), taken);
                    taken.Add(fileName);
                    var newAbs = Path.Combine(destDir, fileName);

                    var oldMeta = it.MetadataJson;
                    var oldFolders = it.FolderIdsJson;
                    File.Move(abs, newAbs, false);
                    moves.Add((abs, newAbs, oldMeta, oldFolders, it));

                    var newRelative = string.IsNullOrEmpty(chain)
                        ? "Library/" + fileName
                        : "Library/" + chain.TrimEnd('/') + "/" + fileName;
                    it.MetadataJson = ItemMeta.Set(it.MetadataJson, "localFile", newRelative);
                    it.FolderIdsJson = string.IsNullOrEmpty(folderId)
                        ? "[]"
                        : System.Text.Json.JsonSerializer.Serialize(new[] { folderId });
                    await _repository.SaveItemAsync(it);
                }
                return true;
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine("[LocalFileService] group move failed, rolling back: " + ex.Message);
                for (var i = moves.Count - 1; i >= 0; i--)
                {
                    var m = moves[i];
                    try
                    {
                        if (File.Exists(m.NewAbs) && !File.Exists(m.OldAbs))
                            File.Move(m.NewAbs, m.OldAbs, false);
                    }
                    catch (Exception moveEx) { System.Diagnostics.Debug.WriteLine("[LocalFileService] rollback move failed: " + moveEx.Message); }
                    m.Item.MetadataJson = m.OldMeta;
                    m.Item.FolderIdsJson = m.OldFoldersJson;
                    try { await _repository.SaveItemAsync(m.Item); } catch { }
                }
                return false;
            }
        }

        /// <summary>Renames a managed local file and its card title. Returns the new title.</summary>
        public async Task<string?> RenameLocalFileAsync(BookmarkItem item, string newTitle)
        {
            var rel = ItemMeta.Get(item.MetadataJson, "localFile");
            if (string.IsNullOrEmpty(rel) || Path.IsPathRooted(rel)) return null;

            var libRel = rel.StartsWith("Library/", StringComparison.OrdinalIgnoreCase)
                ? rel.Substring("Library/".Length) : rel;
            var abs = SafePath.ResolveUnderRoot(AppPaths.Layout.LibraryDir, libRel);
            if (abs == null || !File.Exists(abs)) return null;

            var desired = ItemFileNames.Rename(abs, newTitle);
            if (desired == null) return null;

            var dir = Path.GetDirectoryName(abs)!;
            var currentName = Path.GetFileName(abs);
            var taken = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            foreach (var path in Directory.EnumerateFileSystemEntries(dir))
            {
                var name = Path.GetFileName(path);
                if (!string.IsNullOrEmpty(name) && !FileOps.PathComparer.Equals(name, currentName))
                    taken.Add(name);
            }

            var unique = FileNaming.EnsureUnique(desired, taken);
            var target = Path.Combine(dir, unique);
            if (FileOps.PathComparer.Equals(abs, target) && item.Title == Path.GetFileNameWithoutExtension(unique))
                return item.Title;

            var oldMeta = item.MetadataJson;
            var oldTitle = item.Title;
            var moved = false;
            try
            {
                if (!FileOps.PathComparer.Equals(abs, target))
                {
                    File.Move(abs, target, false);
                    moved = true;
                }

                var slash = libRel.LastIndexOf('/');
                var dirRel = slash < 0 ? string.Empty : libRel[..slash];
                var newRel = string.IsNullOrEmpty(dirRel)
                    ? "Library/" + unique
                    : "Library/" + dirRel + "/" + unique;
                item.MetadataJson = ItemMeta.Set(item.MetadataJson, "localFile", newRel);
                item.Title = Path.GetFileNameWithoutExtension(unique);
                item.UpdatedAt = DateTime.UtcNow;
                await _repository.SaveItemAsync(item);
                return item.Title;
            }
            catch
            {
                if (moved && File.Exists(target) && !File.Exists(abs))
                {
                    try { File.Move(target, abs, false); } catch { }
                }
                item.MetadataJson = oldMeta;
                item.Title = oldTitle;
                throw;
            }
        }

        /// <summary>
        /// Called after a library folder's name/parent changed: moves the physical directory
        /// and rewrites item metadata so localFile values follow the folder move.
        /// </summary>
        public async Task OnFolderPathChangedAsync(string oldRelative, string newRelative)
        {
            if (string.IsNullOrEmpty(oldRelative) || oldRelative == newRelative) return;
            var oldAbs = SafePath.ResolveUnderRoot(AppPaths.Layout.LibraryDir, oldRelative);
            var newAbs = SafePath.ResolveUnderRoot(AppPaths.Layout.LibraryDir, newRelative);
            if (oldAbs == null || newAbs == null) return;
            try
            {
                if (Directory.Exists(oldAbs))
                {
                    // Target conflict: leave both the directory and metadata untouched.
                    if (File.Exists(newAbs) || Directory.Exists(newAbs)) return;
                    Directory.CreateDirectory(Path.GetDirectoryName(newAbs)!);
                    Directory.Move(oldAbs, newAbs);
                }
                // Old dir absent: nothing to move; metadata still follows the folder tree.
            }
            catch (Exception ex)
            {
                // Move failed: files are still at the old path, so metadata must stay unchanged.
                System.Diagnostics.Debug.WriteLine("[LocalFileService] folder sync failed: " + ex.Message);
                return;
            }

            // Rewrite every item whose localFile points under the moved directory. Trashed
            // (Deleted) items are included: their files moved with the directory and Restore
            // needs the new path.
            var oldPrefix = "Library/" + oldRelative.TrimEnd('/') + "/";
            var newPrefix = "Library/" + newRelative.TrimEnd('/') + "/";
            foreach (var it in await _repository.GetItemsAsync())
            {
                var rel = ItemMeta.Get(it.MetadataJson, "localFile");
                if (string.IsNullOrEmpty(rel) || !rel.StartsWith(oldPrefix, StringComparison.OrdinalIgnoreCase)) continue;
                it.MetadataJson = ItemMeta.Set(it.MetadataJson, "localFile", newPrefix + rel.Substring(oldPrefix.Length));
                try { await _repository.SaveItemAsync(it); }
                catch (Exception ex) { System.Diagnostics.Debug.WriteLine("[LocalFileService] metadata rewrite failed for " + it.Id + ": " + ex.Message); }
            }
        }
    }
}
