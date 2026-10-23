using System.IO.Compression;

namespace Jamrah.Files.Core;

public static class BackupArchive
{
    /// <summary>
    /// Zips {db} (as-is, name preserved) + the whole library folder (under "Library/" prefix).
    /// The DB should be a consistent snapshot path supplied by the caller (e.g. from VACUUM INTO).
    /// </summary>
    /// <remarks>
    /// On success, <paramref name="destZipPath"/> holds the complete archive; any previous file is
    /// replaced atomically via temp file + move. If an exception is thrown — e.g. <see cref="IOException"/>
    /// when a library file is locked, where the exception's message/path identifies the file — any
    /// existing <paramref name="destZipPath"/> is left untouched and the temp file is removed.
    /// Cancellation behaves the same way; <paramref name="ct"/> is honored between archive entries only.
    /// The DB entry keeps the snapshot file's name, so callers must name the VACUUM snapshot exactly
    /// like the real DB file (e.g. "jamrah_bookmarks.db3") for restores to find it.
    /// </remarks>
    public static async Task CreateAsync(string libraryDir, string dbSnapshotPath, string destZipPath,
        CancellationToken ct = default)
    {
        var destDir = Path.GetDirectoryName(destZipPath);
        if (!string.IsNullOrEmpty(destDir)) Directory.CreateDirectory(destDir);
        var tmpPath = destZipPath + ".tmp";

        try
        {
            if (File.Exists(tmpPath)) File.Delete(tmpPath);
            await Task.Run(() =>
            {
                using (var zip = ZipFile.Open(tmpPath, ZipArchiveMode.Create))
                {
                    if (File.Exists(dbSnapshotPath))
                        zip.CreateEntryFromFile(dbSnapshotPath, Path.GetFileName(dbSnapshotPath), CompressionLevel.Optimal);

                    if (Directory.Exists(libraryDir))
                    {
                        foreach (var file in Directory.EnumerateFiles(libraryDir, "*", SearchOption.AllDirectories))
                        {
                            ct.ThrowIfCancellationRequested();
                            var rel = Path.GetRelativePath(libraryDir, file).Replace('\\', '/');
                            zip.CreateEntryFromFile(file, "Library/" + rel, CompressionLevel.Optimal);
                        }
                    }
                }
                File.Move(tmpPath, destZipPath, overwrite: true);
            }, ct);
        }
        catch
        {
            try { if (File.Exists(tmpPath)) File.Delete(tmpPath); } catch { }
            throw;
        }
    }
}
