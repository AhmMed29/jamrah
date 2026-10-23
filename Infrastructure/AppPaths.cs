using System;
using System.Diagnostics;
using System.IO;
using System.Linq;
using Jamrah.Files.Core;
using Microsoft.Maui.Storage;

namespace Jamrah.Infrastructure
{
    /// <summary>
    /// Single source of truth for where app data lives. Windows: Documents\Jamrah
    /// (user-overridable via preference). Android: app data dir (sandbox).
    /// Runs a one-time copy-then-delete migration from FileSystem.AppDataDirectory.
    /// </summary>
    /// <remarks>
    /// While migration is pending or blocked (e.g. the old DB trio is still locked),
    /// the app deliberately keeps using the old AppData root for that session and
    /// retries on the next launch. Deferrals are written to Backups\migration.log.
    /// The move covers the DB trio plus Library\, Backups\, bookmark-thumbs\, Archive\
    /// and clips\, so files imported or backups taken during a fallback session are
    /// not stranded. The preflight stops the app's companion ClipAgent once — it holds
    /// the old DB open while running — and re-probes before deferring; ClipAgentService
    /// restarts the agent on the next warmup with whichever root this class selected.
    /// Documents may be OneDrive-redirected on Win11; SQLite under active sync is a
    /// known hazard — the jamrah_storage_root preference is the escape hatch
    /// (accepted for Phase 1).
    /// </remarks>
    public static class AppPaths
    {
        public const string HostLibrary = "jamrahlibrary.local";
        private const string RootPreferenceKey = "jamrah_storage_root";
        private const string MigratedKey = "jamrah_migration_v1_done";

        private static volatile StorageLayout? _layout;
        private static readonly object Gate = new();

        public static StorageLayout Layout
        {
            get
            {
                EnsureReady();
                return _layout!;
            }
        }

        /// <summary>
        /// Public URL for a path inside the library, served via the WebView virtual host.
        /// Accepts the metadata form (with a leading "Library/" segment) or a bare library-relative path.
        /// </summary>
        public static string LibraryUrlFor(string relativePath)
        {
            var normalized = relativePath.Replace('\\', '/').TrimStart('/');
            if (normalized.StartsWith("Library/", StringComparison.OrdinalIgnoreCase))
                normalized = normalized.Substring("Library/".Length);
            var segments = normalized
                .Split('/', StringSplitOptions.RemoveEmptyEntries)
                .Select(Uri.EscapeDataString);
            return "https://" + HostLibrary + "/" + string.Join('/', segments);
        }

        public static void EnsureReady()
        {
            if (_layout != null) return;
            lock (Gate)
            {
                if (_layout != null) return;
                var root = ResolveRoot();
                var layout = StorageLayout.FromRoot(root);
                layout.EnsureDirectories();
                RunMigrationIfNeeded(layout);

                var appData = FileSystem.AppDataDirectory;
                var oldDb = Path.Combine(appData, "jamrah_bookmarks.db3");
                var migrated = false;
                try { migrated = Preferences.Default.Get(MigratedKey, false); } catch { }

                if (!migrated && File.Exists(oldDb) &&
                    !string.Equals(Path.GetFullPath(appData), Path.GetFullPath(layout.Root), StringComparison.OrdinalIgnoreCase))
                {
                    // Migration is still pending (blocked or interrupted). Keep using the old
                    // location for this session so the user never sees an empty library.
                    var fallback = StorageLayout.FromRoot(appData);
                    fallback.EnsureDirectories();
                    Debug.WriteLine("[AppPaths] migration still pending - using old storage this session");
                    _layout = fallback;
                    return;
                }
                _layout = layout;
            }
        }

        private static string ResolveRoot()
        {
            try
            {
                var saved = Preferences.Default.Get(RootPreferenceKey, string.Empty);
                if (!string.IsNullOrWhiteSpace(saved)) return saved;
            }
            catch { }

#if WINDOWS
            var docs = Environment.GetFolderPath(Environment.SpecialFolder.MyDocuments);
            if (!string.IsNullOrWhiteSpace(docs)) return Path.Combine(docs, "Jamrah");
#endif
            return FileSystem.AppDataDirectory;
        }

        private static void RunMigrationIfNeeded(StorageLayout layout)
        {
            var appData = FileSystem.AppDataDirectory;
            // Same folder (Android) or already done -> nothing to do.
            try { if (string.Equals(Path.GetFullPath(appData), Path.GetFullPath(layout.Root), StringComparison.OrdinalIgnoreCase)) return; }
            catch { return; }
            try { if (Preferences.Default.Get(MigratedKey, false)) return; } catch { }

            var dbFiles = new[] { "jamrah_bookmarks.db3", "jamrah_bookmarks.db3-wal", "jamrah_bookmarks.db3-shm" };

            // Preflight: the DB trio must be fully unlocked before copying anything,
            // otherwise a live writer yields a torn snapshot. Abort with zero copies.
            string lockedName;
            string lockedMessage;
            if (!DbTrioUnlocked(appData, dbFiles, out lockedName, out lockedMessage))
            {
                // The app's companion ClipAgent holds the old DB open for its process
                // lifetime; stop it once so migration can proceed. It is restarted by
                // ClipAgentService on the next warmup with whichever root was selected.
                Log(layout, "db locked (" + lockedName + "): " + lockedMessage + " - stopping ClipAgent and re-probing");
                StopClipAgent();
                if (!DbTrioUnlocked(appData, dbFiles, out lockedName, out lockedMessage))
                {
                    Log(layout, "db locked (" + lockedName + "): " + lockedMessage + " - migration deferred");
                    return;
                }
            }

            // Move the DB trio as one unit: copy all, verify all, then delete all.
            var trio = dbFiles.Select(n => Path.Combine(appData, n)).Where(File.Exists).ToList();
            if (trio.Count > 0)
            {
                try
                {
                    var copied = new List<string>();
                    foreach (var source in trio)
                    {
                        var target = Path.Combine(layout.Root, Path.GetFileName(source));
                        Directory.CreateDirectory(Path.GetDirectoryName(target)!);
                        File.Copy(source, target, true);
                        if (new FileInfo(target).Length != new FileInfo(source).Length)
                            throw new IOException("size mismatch after copy: " + Path.GetFileName(source));
                        copied.Add(source);
                    }
                    foreach (var source in copied)
                        File.Delete(source);
                }
                catch (Exception ex)
                {
                    Log(layout, "db move failed: " + ex.Message + " - migration deferred");
                    return;
                }
            }

            var allOk = true;
            foreach (var name in new[] { "Library", "Backups", "bookmark-thumbs", "Archive", "clips" })
            {
                var source = Path.Combine(appData, name);
                if (!Directory.Exists(source)) continue;
                try
                {
                    CopyDirectory(source, Path.Combine(layout.Root, name));
                    Directory.Delete(source, true);
                }
                catch (Exception ex)
                {
                    allOk = false;
                    Log(layout, name + " move failed: " + ex.Message + " - will retry next launch");
                }
            }

            if (!allOk) return; // dirs retried next launch; trio sources are already gone
            try { Preferences.Default.Set(MigratedKey, true); } catch { }
            Log(layout, "migration complete -> " + layout.Root);
        }

        private static bool DbTrioUnlocked(string appData, string[] dbFiles, out string lockedName, out string lockedMessage)
        {
            lockedName = string.Empty;
            lockedMessage = string.Empty;
            foreach (var name in dbFiles)
            {
                var path = Path.Combine(appData, name);
                if (!File.Exists(path)) continue;
                try
                {
                    using var handle = new FileStream(path, FileMode.Open, FileAccess.Read, FileShare.None);
                }
                catch (Exception ex)
                {
                    lockedName = name;
                    lockedMessage = ex.Message;
                    return false;
                }
            }
            return true;
        }

        private static void StopClipAgent()
        {
            foreach (var p in Process.GetProcessesByName("ClipAgent"))
            {
                try
                {
                    p.Kill();
                    p.WaitForExit(3000);
                }
                catch { }
                finally { try { p.Dispose(); } catch { } }
            }
        }

        private static void Log(StorageLayout layout, string message)
        {
            Debug.WriteLine("[AppPaths] " + message);
            try
            {
                Directory.CreateDirectory(layout.BackupsDir);
                File.AppendAllText(Path.Combine(layout.BackupsDir, "migration.log"),
                    DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss") + " " + message + Environment.NewLine);
            }
            catch { }
        }

        private static void CopyDirectory(string source, string target)
        {
            Directory.CreateDirectory(target);
            foreach (var file in Directory.GetFiles(source))
                File.Copy(file, Path.Combine(target, Path.GetFileName(file)), true);
            foreach (var dir in Directory.GetDirectories(source))
                CopyDirectory(dir, Path.Combine(target, Path.GetFileName(dir)));
        }
    }
}
