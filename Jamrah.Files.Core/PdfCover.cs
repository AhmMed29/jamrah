namespace Jamrah.Files.Core;

public static class PdfCover
{
    public const string MetaKey = "fileCover";
    public const string KindMetaKey = "fileCoverKind";
    public const string Kind = "page";

    public static bool ShouldRender(string? kind) =>
        string.Equals(kind, "pdf", StringComparison.OrdinalIgnoreCase);

    public static string? FileNameFor(string? sourceId)
    {
        if (string.IsNullOrWhiteSpace(sourceId)) return null;

        var invalid = Path.GetInvalidFileNameChars();
        var chars = sourceId.Select(c =>
            c is '/' or '\\' || invalid.Contains(c) ? '_' : c).ToArray();
        return "pdf-cover-" + new string(chars) + ".jpg";
    }

    public static bool IsSafeFileName(string? fileName)
    {
        if (string.IsNullOrWhiteSpace(fileName)) return false;
        if (Path.IsPathRooted(fileName)) return false;
        if (fileName.Contains('/') || fileName.Contains('\\')) return false;
        return fileName.IndexOfAny(Path.GetInvalidFileNameChars()) < 0;
    }

    public static string? AbsolutePathFor(string directory, string? fileName)
    {
        if (!IsSafeFileName(fileName)) return null;
        return Path.Combine(directory, fileName!);
    }
}
