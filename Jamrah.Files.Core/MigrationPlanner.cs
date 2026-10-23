namespace Jamrah.Files.Core;

public sealed record MigrationOp(string RelativeEntry, string SourcePath, string TargetPath, bool IsDirectory);

public static class MigrationPlanner
{
    /// <summary>
    /// Pure path mapping for a one-shot move of app data. Database files first,
    /// then the media folder entries, preserving the given order. Entries passed in
    /// <paramref name="directoryEntries"/> (matched case-insensitively, trailing separators
    /// trimmed) are already marked via <see cref="MigrationOp.IsDirectory"/>; the executor
    /// only filters by existence. Kept as a standalone tested mapping helper: the production
    /// migration is implemented inline in AppPaths, so nothing in the app depends on this.
    /// </summary>
    public static IReadOnlyList<MigrationOp> BuildPlan(
        string sourceRoot, string targetRoot, IEnumerable<string> relativeEntries, params string[] directoryEntries)
    {
        var dirs = new HashSet<string>(
            (directoryEntries ?? Array.Empty<string>()).Select(e => e.Trim().TrimEnd('\\', '/')),
            StringComparer.OrdinalIgnoreCase);
        var result = new List<MigrationOp>();
        foreach (var entry in relativeEntries)
        {
            var rel = entry.Trim().TrimEnd('\\', '/');
            if (rel.Length == 0) continue;
            result.Add(new MigrationOp(
                rel,
                Path.Combine(Path.TrimEndingDirectorySeparator(sourceRoot), rel),
                Path.Combine(Path.TrimEndingDirectorySeparator(targetRoot), rel),
                dirs.Contains(rel)));
        }
        // DB (+wal/shm) first so a half-done run still has the DB available.
        return result.OrderBy(op => op.IsDirectory ? 1 : 0).ToList();
    }
}
