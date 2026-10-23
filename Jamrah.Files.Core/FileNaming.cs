using System.Text.RegularExpressions;

namespace Jamrah.Files.Core;

public static class FileNaming
{
    private static readonly Regex ReservedDeviceName = new(
        @"\A(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])\z",
        RegexOptions.IgnoreCase | RegexOptions.CultureInvariant);

    /// <summary>Returns <paramref name="desiredName"/> or "name (n).ext" until free (case-insensitive).</summary>
    public static string EnsureUnique(string desiredName, ISet<string> takenNames)
    {
        if (!takenNames.Contains(desiredName)) return desiredName;
        var ext = Path.GetExtension(desiredName);
        var stem = Path.GetFileNameWithoutExtension(desiredName);
        if (stem.Length == 0) { stem = desiredName; ext = string.Empty; }
        for (var n = 2; ; n++)
        {
            var candidate = $"{stem} ({n}){ext}";
            if (!takenNames.Contains(candidate)) return candidate;
        }
    }

    /// <summary>
    /// Sanitizes a single file/folder name for Windows (no separators, no reserved chars).
    /// A stem matching a reserved device name (CON/PRN/AUX/NUL/COM1-9/LPT1-9, compared
    /// before the first dot and ignoring trailing spaces) gets an appended '_' so the name
    /// never resolves to a device path; extension(s) are kept intact.
    /// </summary>
    public static string Sanitize(string name)
    {
        var invalid = Path.GetInvalidFileNameChars();
        var chars = name.Trim().Select(c => invalid.Contains(c) ? '_' : c).ToArray();
        var result = new string(chars).Trim().TrimEnd('.', ' ');
        if (result.Length == 0) return "_";
        var dot = result.IndexOf('.');
        var stem = dot < 0 ? result : result[..dot];
        if (ReservedDeviceName.IsMatch(stem.TrimEnd(' ')))
            result = stem + "_" + (dot < 0 ? string.Empty : result[dot..]);
        return result;
    }
}
