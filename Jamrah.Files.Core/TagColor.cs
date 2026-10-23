namespace Jamrah.Files.Core;

/// <summary>
/// Tag colors are stored in the database and rendered into card/chip HTML. Only accept
/// a strict hex color so a crafted color can never inject attributes or CSS.
/// </summary>
public static class TagColor
{
    public static string? Normalize(string? color)
    {
        if (string.IsNullOrWhiteSpace(color)) return null;
        var value = color.Trim();
        if (value.Length == 4 && value[0] == '#' && IsHex(value[1..]))
            return $"#{value[1]}{value[1]}{value[2]}{value[2]}{value[3]}{value[3]}".ToLowerInvariant();
        if (value.Length == 7 && value[0] == '#' && IsHex(value[1..]))
            return value.ToLowerInvariant();
        return null;
    }

    public static string StyleAttribute(string? color)
    {
        var normalized = Normalize(color);
        return normalized == null
            ? string.Empty
            : $"style=\"background:{normalized}16;color:{normalized}\"";
    }

    private static bool IsHex(string value)
    {
        foreach (var c in value)
        {
            if (!char.IsAsciiHexDigit(c)) return false;
        }
        return true;
    }
}
