namespace Jamrah.Files.Core;

public sealed record FolderImportEntry(string SourcePath, string RelativePath, bool IsDirectory);

public static class FolderImportPlanner
{
    public static IReadOnlyList<FolderImportEntry> Plan(
        string sourceRoot,
        IReadOnlyList<string> destinationChain,
        ISet<string> existingRelativePaths,
        string? excludedRoot = null)
    {
        var root = Path.GetFullPath(sourceRoot);
        if (!Directory.Exists(root))
            throw new DirectoryNotFoundException("Source folder not found: " + root);

        var excluded = string.IsNullOrWhiteSpace(excludedRoot)
            ? null
            : Path.GetFullPath(excludedRoot);

        if (excluded != null && IsSameOrUnder(root, excluded))
            return Array.Empty<FolderImportEntry>();

        var chain = destinationChain
            .Where(s => !string.IsNullOrWhiteSpace(s))
            .Select(FileNaming.Sanitize)
            .ToList();
        var prefix = string.Join('/', chain);

        var takenRootNames = DirectChildNames(prefix, existingRelativePaths);
        var rootName = FileNaming.Sanitize(Path.GetFileName(TrimEndingSeparators(root)));
        if (rootName.Length == 0) rootName = "Folder";
        rootName = FileNaming.EnsureUnique(rootName, takenRootNames);

        var rootRelative = Join(prefix, rootName);
        var result = new List<FolderImportEntry> { new(root, rootRelative, true) };
        var queue = new Queue<(string Source, string Relative)>();
        queue.Enqueue((root, rootRelative));

        while (queue.Count > 0)
        {
            var (sourceDir, targetDir) = queue.Dequeue();
            var takenNames = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

            foreach (var child in Directory.EnumerateDirectories(sourceDir))
            {
                if (IsReparsePoint(child)) continue;
                if (excluded != null && IsSameOrUnder(child, excluded)) continue;

                var name = FileNaming.EnsureUnique(
                    FileNaming.Sanitize(Path.GetFileName(child)), takenNames);
                takenNames.Add(name);
                var relative = Join(targetDir, name);
                result.Add(new FolderImportEntry(child, relative, true));
                queue.Enqueue((child, relative));
            }

            foreach (var file in Directory.EnumerateFiles(sourceDir))
            {
                if (IsReparsePoint(file)) continue;

                var name = FileNaming.EnsureUnique(
                    FileNaming.Sanitize(Path.GetFileName(file)), takenNames);
                takenNames.Add(name);
                result.Add(new FolderImportEntry(file, Join(targetDir, name), false));
            }
        }

        return result;
    }

    private static HashSet<string> DirectChildNames(string prefix, ISet<string> paths)
    {
        var result = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        foreach (var path in paths)
        {
            if (string.IsNullOrWhiteSpace(path)) continue;
            if (prefix.Length == 0)
            {
                if (path.Contains('/')) continue;
                result.Add(path);
            }
            else
            {
                var start = prefix + "/";
                if (!path.StartsWith(start, StringComparison.OrdinalIgnoreCase)) continue;
                var rest = path[start.Length..];
                if (rest.Length == 0 || rest.Contains('/')) continue;
                result.Add(rest);
            }
        }
        return result;
    }

    private static string Join(string parent, string name) =>
        parent.Length == 0 ? name : parent + "/" + name;

    private static string TrimEndingSeparators(string path) =>
        path.TrimEnd(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar);

    private static bool IsReparsePoint(string path) =>
        (File.GetAttributes(path) & FileAttributes.ReparsePoint) != 0;

    private static bool IsSameOrUnder(string path, string root)
    {
        var p = TrimEndingSeparators(Path.GetFullPath(path));
        var r = TrimEndingSeparators(Path.GetFullPath(root));
        if (FileOps.PathComparer.Equals(p, r)) return true;
        var comparison = OperatingSystem.IsWindows()
            ? StringComparison.OrdinalIgnoreCase
            : StringComparison.Ordinal;
        return p.StartsWith(r + Path.DirectorySeparatorChar, comparison);
    }
}
