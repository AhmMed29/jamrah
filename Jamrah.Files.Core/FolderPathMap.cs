namespace Jamrah.Files.Core;

public static class FolderPathMap
{
    /// <summary>
    /// Builds the library-relative directory for a folder id by walking parent links.
    /// Each segment is sanitized with <see cref="FileNaming.Sanitize"/>; segments are
    /// joined with '/'. An unknown id (lookup returns a null name) yields "".
    /// Walking stops at 50 levels to survive cycles in bad data.
    /// </summary>
    public static string RelativePathFor(string folderId, Func<string, (string? Name, string? ParentId)> lookup)
    {
        var segments = new List<string>();
        var current = folderId;
        var guard = 0;
        while (!string.IsNullOrEmpty(current) && guard++ < 50)
        {
            var (name, parentId) = lookup(current);
            if (name == null) return "";
            segments.Add(FileNaming.Sanitize(name));
            current = parentId ?? string.Empty;
        }
        segments.Reverse();
        return string.Join('/', segments);
    }
}
