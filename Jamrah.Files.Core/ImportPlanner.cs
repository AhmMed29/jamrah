namespace Jamrah.Files.Core;

public enum ImportMode { Copy, Move, Link }

public sealed record ImportOp(string SourcePath, ImportMode Mode, string? TargetRelativePath);

public static class ImportPlanner
{
    /// <summary>
    /// Plans imports of dropped/picked paths into a folder chain (names, no library root).
    /// <paramref name="existingRelativePaths"/> holds the library-relative paths (forward slashes)
    /// of all currently existing entries, files and directories, so a new file cannot collide with
    /// an existing folder name (e.g. "Personal/Photos/2024"). Matching is case-insensitive and
    /// unique names are also allocated against ops planned in this same call.
    /// Folder-chain and file names are sanitized via <see cref="FileNaming"/>.
    /// Repeated source paths are dropped using <see cref="FileOps.PathComparer"/>
    /// (case-insensitive on Windows, case-sensitive elsewhere).
    /// Link ops have no target.
    /// </summary>
    public static IReadOnlyList<ImportOp> Plan(
        IReadOnlyList<string> sourcePaths,
        IReadOnlyList<string> folderChain,
        ImportMode mode,
        ISet<string> existingRelativePaths)
    {
        var result = new List<ImportOp>();
        var seenSources = new HashSet<string>(FileOps.PathComparer);
        var prefix = string.Join('/', folderChain.Select(FileNaming.Sanitize));
        var taken = new HashSet<string>(
            existingRelativePaths
                .Where(p => prefix.Length == 0
                    ? !p.Contains('/')
                    : p.StartsWith(prefix + "/", StringComparison.OrdinalIgnoreCase))
                .Select(p => prefix.Length == 0 ? p : p.Substring(prefix.Length + 1)),
            StringComparer.OrdinalIgnoreCase);

        foreach (var raw in sourcePaths)
        {
            if (string.IsNullOrWhiteSpace(raw)) continue;
            var src = raw.Trim();
            if (!seenSources.Add(src)) continue;

            if (mode == ImportMode.Link)
            {
                result.Add(new ImportOp(src, mode, null));
                continue;
            }

            var name = FileNaming.Sanitize(Path.GetFileName(src));
            var unique = FileNaming.EnsureUnique(name, taken);
            taken.Add(unique);
            var rel = prefix.Length == 0 ? unique : prefix + "/" + unique;
            result.Add(new ImportOp(src, mode, rel));
        }
        return result;
    }
}
