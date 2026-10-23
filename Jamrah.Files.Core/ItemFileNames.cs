namespace Jamrah.Files.Core;

public static class ItemFileNames
{
    public static string? Rename(string currentName, string newTitle)
    {
        if (string.IsNullOrWhiteSpace(newTitle)) return null;

        var ext = Path.GetExtension(currentName);
        var title = newTitle.Trim();
        if (ext.Length > 0 && title.Length > ext.Length
            && title.EndsWith(ext, StringComparison.OrdinalIgnoreCase))
        {
            title = title[..^ext.Length];
        }

        return FileNaming.Sanitize(title) + ext;
    }
}
