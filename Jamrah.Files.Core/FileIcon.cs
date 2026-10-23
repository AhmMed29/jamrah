using System;
using System.Collections.Generic;
using System.IO;

namespace Jamrah.Files.Core;

/// <summary>
/// Pure helpers for the local-library file icons (no Windows APIs here so they stay testable).
/// Platform extraction lives in Jamrah.Application.Services.FileIconService.
/// </summary>
public static class FileIcon
{
    private static readonly HashSet<string> ProgramExts = new(StringComparer.OrdinalIgnoreCase)
    {
        ".exe", ".lnk", ".msi", ".bat", ".cmd", ".com", ".scr", ".appref-ms", ".ps1",
    };

    public static bool IsProgram(string? path)
    {
        if (string.IsNullOrWhiteSpace(path)) return false;
        var ext = Path.GetExtension(path);
        return !string.IsNullOrEmpty(ext) && ProgramExts.Contains(ext);
    }

    /// <summary>Builds a small data URI for card rendering; null when empty or above the cap.</summary>
    public static string? BuildDataUri(byte[]? bytes, string? contentType, int maxBytes)
    {
        if (bytes == null || bytes.Length == 0) return null;
        if (maxBytes > 0 && bytes.Length > maxBytes) return null;
        var mime = (contentType ?? string.Empty).Trim().ToLowerInvariant();
        if (mime.Length == 0 || !mime.StartsWith("image/", StringComparison.Ordinal)) mime = "image/png";
        return "data:" + mime + ";base64," + Convert.ToBase64String(bytes);
    }

    /// <summary>Square thumbnails are shell icons; non-square ones are real previews (first page, etc.).</summary>
    public static string KindForSize(int width, int height)
        => width > 0 && width == height ? "icon" : "preview";
}
