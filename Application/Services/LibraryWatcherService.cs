using System;
using System.Collections.Generic;
using System.IO;
using System.Threading;
using System.Threading.Tasks;
using Jamrah.Infrastructure;

namespace Jamrah.Application.Services
{
    /// <summary>
    /// LIVE SYNC: watches the managed library folder so changes made outside the app
    /// (pasting/deleting/renaming in Explorer, or any other program) show up on their own.
    /// Events are batched behind a short quiet window because a single paste fires several
    /// events (temp file, move, folder creation) and each reconcile pass costs a disk walk.
    /// </summary>
    public sealed class LibraryWatcherService : IDisposable
    {
        private readonly BookmarkStateService _state;
        private readonly object _gate = new();
        private readonly List<(string OldRel, string NewRel)> _renames = new();
        private readonly List<string> _deletedPaths = new();
        private readonly CancellationTokenSource _cts = new();
        private DateTime _lastEventUtc = DateTime.MinValue;
        private volatile bool _dirty;
        private bool _started;
        private Task? _loop;
        private FileSystemWatcher? _watcher;

        private static readonly TimeSpan QuietWindow = TimeSpan.FromMilliseconds(1200);
        private const int PollMs = 350;

        public LibraryWatcherService(BookmarkStateService state)
            => _state = state ?? throw new ArgumentNullException(nameof(state));

        public void Start()
        {
            if (_started) return;
            _started = true;

            try
            {
                var root = AppPaths.Layout.LibraryDir;
                Directory.CreateDirectory(root);
                var watcher = new FileSystemWatcher(root)
                {
                    IncludeSubdirectories = true,
                    NotifyFilter = NotifyFilters.FileName | NotifyFilters.DirectoryName,
                    InternalBufferSize = 64 * 1024,
                };
                watcher.Created += (_, e) => Mark(e.FullPath);
                watcher.Deleted += (_, e) => Mark(e.FullPath, deleted: true);
                watcher.Renamed += (_, e) => Mark(e.FullPath, renamedFrom: e.OldFullPath);
                // Buffer overflow: remember that something was missed; the reconcile pass
                // re-walks the whole library so nothing stays stale.
                watcher.Error += (_, _) => Mark(string.Empty);
                watcher.EnableRaisingEvents = true;
                _watcher = watcher;
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine("[LibraryWatcher] could not start: " + ex.Message);
                return;
            }

            _loop = Task.Run(() => LoopAsync(_cts.Token));
        }

        /// <summary>Absolute path -> path relative to the library root (forward slashes).</summary>
        private static string? RelativeOf(string fullPath)
        {
            if (string.IsNullOrEmpty(fullPath)) return null;
            try
            {
                var root = Path.GetFullPath(AppPaths.Layout.LibraryDir)
                    .TrimEnd(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar);
                var full = Path.GetFullPath(fullPath);
                if (string.Equals(full, root, StringComparison.OrdinalIgnoreCase)) return null;
                if (!full.StartsWith(root + Path.DirectorySeparatorChar, StringComparison.OrdinalIgnoreCase)) return null;
                return full.Substring(root.Length + 1).Replace('\\', '/');
            }
            catch { return null; }
        }

        private void Mark(string fullPath, string? renamedFrom = null, bool deleted = false)
        {
            var rel = RelativeOf(fullPath);
            var oldRel = renamedFrom == null ? null : RelativeOf(renamedFrom);
            lock (_gate)
            {
                if (!string.IsNullOrEmpty(rel))
                {
                    if (oldRel != null) _renames.Add((oldRel, rel));
                    else if (deleted) _deletedPaths.Add(rel);
                }
                _lastEventUtc = DateTime.UtcNow;
                _dirty = true;
            }
        }

        private async Task LoopAsync(CancellationToken ct)
        {
            while (!ct.IsCancellationRequested)
            {
                try
                {
                    await Task.Delay(PollMs, ct).ConfigureAwait(false);
                    if (!_dirty) continue;
                    if (DateTime.UtcNow - _lastEventUtc < QuietWindow) continue;
                    // Our own import/move/rename batches are still running: wait them out.
                    if (LocalFileService.WatchingSuppressed) continue;

                    List<(string OldRel, string NewRel)> renames;
                    List<string> deleted;
                    lock (_gate)
                    {
                        _dirty = false;
                        renames = new List<(string, string)>(_renames);
                        deleted = new List<string>(_deletedPaths);
                        _renames.Clear();
                        _deletedPaths.Clear();
                    }

                    await _state.SyncLibraryFromDiskAsync(renames, deleted, ct).ConfigureAwait(false);
                }
                catch (OperationCanceledException) { return; }
                catch (Exception ex)
                {
                    System.Diagnostics.Debug.WriteLine("[LibraryWatcher] sync failed: " + ex.Message);
                    await Task.Delay(2000, ct).ConfigureAwait(false);
                }
            }
        }

        public void Dispose()
        {
            try { _cts.Cancel(); } catch { }
            try { _watcher?.Dispose(); } catch { }
            try { _cts.Dispose(); } catch { }
        }
    }
}
