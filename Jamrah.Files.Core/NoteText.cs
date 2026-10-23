using System.Text.RegularExpressions;

namespace Jamrah.Files.Core;

/// <summary>
/// Shared rules for note descriptions vs. note bodies. Descriptions are short,
/// single-line summaries shown on cards; notes hold the full body shown in preview.
/// </summary>
public static class NoteText
{
    public const int DescriptionMax = 100;

    /// <summary>Trims and caps text at <paramref name="max"/> characters.</summary>
    public static string Clamp(string? text, int max = DescriptionMax)
    {
        if (string.IsNullOrWhiteSpace(text) || max <= 0) return string.Empty;
        var trimmed = text.Trim();
        return trimmed.Length <= max ? trimmed : trimmed[..max].TrimEnd();
    }

    /// <summary>Collapses line breaks and repeated whitespace so the card stays on one line.</summary>
    public static string Excerpt(string? text, int max = DescriptionMax)
    {
        if (string.IsNullOrWhiteSpace(text)) return string.Empty;
        var oneLine = Regex.Replace(text, @"\s+", " ").Trim();
        return Clamp(oneLine, max);
    }

    /// <summary>
    /// Keeps the note body as the source of truth: moves a legacy description into an
    /// empty note body and drops a description that is an exact duplicate of the notes.
    /// </summary>
    public static (string Description, string Notes) Normalize(string? description, string? notes)
    {
        var desc = description?.Trim() ?? string.Empty;
        var body = notes?.Trim() ?? string.Empty;
        if (body.Length == 0 && desc.Length > 0) return (string.Empty, desc);
        if (desc.Length > 0 && string.Equals(desc, body, StringComparison.Ordinal)) return (string.Empty, body);
        return (desc, body);
    }
}
