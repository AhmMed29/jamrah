using System.Security.Cryptography;

namespace Jamrah.Files.Core;

public static class FileOps
{
    private const int ChunkSize = 1024 * 1024;

    /// <summary>
    /// Comparer for path strings on the current OS: case-insensitive on Windows, ordinal
    /// (case-sensitive) elsewhere, matching the typical filesystem. Used for path
    /// equality and dedupe so a case-sensitive OS (e.g. Android) no longer collapses
    /// "A.txt" and "a.txt" into one entry.
    /// </summary>
    public static StringComparer PathComparer { get; } =
        OperatingSystem.IsWindows() ? StringComparer.OrdinalIgnoreCase : StringComparer.Ordinal;

    /// <summary>Deletes a file or a directory tree without using the recycle bin.</summary>
    public static void DeletePermanently(string path)
    {
        if (File.Exists(path)) File.Delete(path);
        else if (Directory.Exists(path)) Directory.Delete(path, true);
    }

    /// <summary>
    /// Recursively copies a directory (including empty subdirectories).
    /// Reparse points (junctions and symlinks) are skipped so a copy can never
    /// recurse outside the source tree or duplicate external files.
    /// </summary>
    /// <exception cref="DirectoryNotFoundException">The source directory does not exist.</exception>
    public static void CopyDirectory(string sourceDir, string destDir)
    {
        var src = Path.GetFullPath(sourceDir);
        if (!Directory.Exists(src)) throw new DirectoryNotFoundException("Source directory not found: " + src);
        var dst = Path.GetFullPath(destDir);
        Directory.CreateDirectory(dst);

        var pending = new Stack<string>();
        pending.Push(src);
        while (pending.Count > 0)
        {
            var current = pending.Pop();

            foreach (var dir in Directory.EnumerateDirectories(current))
            {
                if (IsReparsePoint(dir)) continue;
                var target = Path.Combine(dst, Path.GetRelativePath(src, dir));
                Directory.CreateDirectory(target);
                pending.Push(dir);
            }

            foreach (var file in Directory.EnumerateFiles(current))
            {
                if (IsReparsePoint(file)) continue;
                File.Copy(file, Path.Combine(dst, Path.GetRelativePath(src, file)), true);
            }
        }
    }

    private static bool IsReparsePoint(string path) =>
        (File.GetAttributes(path) & FileAttributes.ReparsePoint) != 0;

    /// <summary>Copies with a progress callback of total bytes written + cancellable.</summary>
    /// <remarks>
    /// Overwrites an existing target (opened with <see cref="FileMode.Create"/>).
    /// On failure or cancellation a partial target file may remain; callers importing into the
    /// library must wrap the call and clean up / verify (Task 11 does).
    /// </remarks>
    /// <exception cref="ArgumentException">Source and target resolve to the same file.</exception>
    public static async Task CopyWithProgressAsync(
        string source, string target, IProgress<long>? progress, CancellationToken ct = default)
    {
        if (PathComparer.Equals(Path.GetFullPath(source), Path.GetFullPath(target)))
            throw new ArgumentException("Source and target paths are the same file.", nameof(target));

        var dir = Path.GetDirectoryName(target);
        if (!string.IsNullOrEmpty(dir)) Directory.CreateDirectory(dir);

        await using var src = new FileStream(source, FileMode.Open, FileAccess.Read, FileShare.Read, ChunkSize, true);
        await using var dst = new FileStream(target, FileMode.Create, FileAccess.Write, FileShare.None, ChunkSize, true);
        var buffer = new byte[ChunkSize];
        long total = 0;
        int read;
        while ((read = await src.ReadAsync(buffer, ct)) > 0)
        {
            await dst.WriteAsync(buffer.AsMemory(0, read), ct);
            total += read;
            progress?.Report(total);
        }
    }
}

public static class FileHasher
{
    /// <summary>Computes the SHA-256 of a file as lowercase hex.</summary>
    /// <remarks>
    /// All zero-byte files hash identically (the empty-input digest); dedup callers should
    /// exclude empty files (Task 11's job).
    /// </remarks>
    public static async Task<string> Sha256Async(string path, CancellationToken ct = default)
    {
        await using var stream = new FileStream(path, FileMode.Open, FileAccess.Read, FileShare.Read, 1024 * 1024, true);
        var hash = await SHA256.HashDataAsync(stream, ct);
        return Convert.ToHexString(hash).ToLowerInvariant();
    }
}
