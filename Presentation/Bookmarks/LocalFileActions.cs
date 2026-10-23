using System.Diagnostics;
using System.Threading.Tasks;
using Jamrah.Files.Core;
using Microsoft.Maui.ApplicationModel;
using Microsoft.Maui.Storage;

namespace Jamrah.Presentation.Bookmarks
{
    /// <summary>ADDITIVE: OS actions for local-file items.</summary>
    public static class LocalFileActions
    {
        public static async Task OpenAsync(string absolutePath)
        {
            try { await Launcher.Default.OpenAsync(new OpenFileRequest("Open", new ReadOnlyFile(absolutePath))); }
            catch { }
        }

        public static void ShowInExplorer(string absolutePath)
        {
#if WINDOWS
            try { Process.Start(new ProcessStartInfo("explorer.exe", $"/select,\"{absolutePath}\"") { UseShellExecute = true }); } catch { }
#endif
        }

        public static void ShowFolderInExplorer(string absolutePath)
        {
#if WINDOWS
            try
            {
                if (!string.IsNullOrEmpty(absolutePath) && System.IO.Directory.Exists(absolutePath))
                    Process.Start(new ProcessStartInfo("explorer.exe", $"\"{absolutePath}\"") { UseShellExecute = true });
            }
            catch { }
#endif
        }

        /// <summary>The path for an item, honoring library-relative or absolute link metadata.</summary>
        public static string? PathFor(Core.Entities.BookmarkItem item)
        {
            var rel = ItemMeta.Get(item.MetadataJson, "localFile");
            if (string.IsNullOrWhiteSpace(rel)) return null;
            if (System.IO.Path.IsPathRooted(rel)) return rel; // linked file (Phase 2)
            return SafePath.ResolveUnderRoot(Infrastructure.AppPaths.Layout.Root, rel);
        }

        /// <summary>
        /// Resolves a managed file only inside the library. Used for destructive operations;
        /// linked files and paths such as ../Backups or the database are rejected.
        /// </summary>
        public static string? ManagedPathFor(string? localFile)
        {
            if (string.IsNullOrWhiteSpace(localFile) || System.IO.Path.IsPathRooted(localFile)) return null;
            var rel = localFile.Replace('\\', '/');
            const string prefix = "Library/";
            if (rel.StartsWith(prefix, System.StringComparison.OrdinalIgnoreCase))
                rel = rel[prefix.Length..];
            return SafePath.ResolveUnderRoot(Infrastructure.AppPaths.Layout.LibraryDir, rel);
        }

        public static bool Exists(Core.Entities.BookmarkItem item)
        {
            var p = PathFor(item);
            return p != null && System.IO.File.Exists(p);
        }
    }
}
