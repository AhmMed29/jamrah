namespace Jamrah.Files.Core;

/// <summary>
/// Resolves user/library supplied relative paths without allowing them to escape a
/// trusted root. Used for local-file metadata, imports and permanent deletes.
/// </summary>
public static class SafePath
{
    public static string? ResolveUnderRoot(string? root, string? relative, bool checkReparsePoints = true)
    {
        if (string.IsNullOrWhiteSpace(root) || string.IsNullOrWhiteSpace(relative)) return null;

        try
        {
            if (Path.IsPathRooted(relative)) return null;
            if (OperatingSystem.IsWindows() && relative.Contains(':')) return null;

            var rootFull = Path.TrimEndingDirectorySeparator(Path.GetFullPath(root));
            var relativeNormalized = relative
                .Replace('/', Path.DirectorySeparatorChar)
                .Replace('\\', Path.DirectorySeparatorChar);
            var combined = Path.GetFullPath(Path.Combine(rootFull, relativeNormalized));

            if (!IsUnderRoot(rootFull, combined)) return null;
            if (checkReparsePoints && HasReparsePointBelowRoot(rootFull, combined)) return null;
            return combined;
        }
        catch
        {
            return null;
        }
    }

    public static bool IsUnderRoot(string root, string path)
    {
        try
        {
            var rootFull = Path.TrimEndingDirectorySeparator(Path.GetFullPath(root));
            var pathFull = Path.GetFullPath(path);
            var rootPrefix = rootFull.EndsWith(Path.DirectorySeparatorChar)
                ? rootFull
                : rootFull + Path.DirectorySeparatorChar;
            var comparison = OperatingSystem.IsWindows()
                ? StringComparison.OrdinalIgnoreCase
                : StringComparison.Ordinal;
            return pathFull.StartsWith(rootPrefix, comparison);
        }
        catch
        {
            return false;
        }
    }

    private static bool HasReparsePointBelowRoot(string rootFull, string pathFull)
    {
        var relative = Path.GetRelativePath(rootFull, pathFull);
        if (relative == "." || relative.StartsWith("..", StringComparison.Ordinal)) return true;

        var current = rootFull;
        foreach (var segment in relative.Split(
                     new[] { Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar },
                     StringSplitOptions.RemoveEmptyEntries))
        {
            current = Path.Combine(current, segment);
            if (!File.Exists(current) && !Directory.Exists(current)) continue;
            if ((File.GetAttributes(current) & FileAttributes.ReparsePoint) != 0) return true;
        }
        return false;
    }
}
