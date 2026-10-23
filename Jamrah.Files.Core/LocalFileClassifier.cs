namespace Jamrah.Files.Core;

public static class LocalFileClassifier
{
    public static readonly string[] ImageExts = { ".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp", ".svg", ".avif" };
    public static readonly string[] VideoExts = { ".mp4", ".mkv", ".webm", ".mov", ".avi", ".m4v" };
    public static readonly string[] AudioExts = { ".mp3", ".wav", ".m4a", ".ogg", ".flac", ".aac" };
    public static readonly string[] TextExts = { ".txt", ".md", ".markdown", ".log", ".json", ".csv" };

    public static string KindFor(string path)
    {
        var ext = Path.GetExtension(path).ToLowerInvariant();
        if (ImageExts.Contains(ext)) return "image";
        if (VideoExts.Contains(ext)) return "video";
        if (AudioExts.Contains(ext)) return "audio";
        if (ext == ".pdf") return "pdf";
        if (TextExts.Contains(ext)) return "text";
        return "generic";
    }

    public static string ItemTypeFor(string kind) => kind switch
    {
        "image" => "image",
        "video" => "video",
        "audio" => "audio",
        "pdf" => "pdf",
        "text" => "file",
        _ => "file",
    };
}
