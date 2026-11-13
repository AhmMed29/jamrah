using Jamrah.Core.Entities;

namespace Jamrah.Application.Services;

/// <summary>
/// Sidebar folder order. SQLite hands rows back in physical order (which changes
/// whenever a row is re-saved), so the tree compares names itself: Arabic names
/// first (alef → ya), then Latin A–Z, then anything else, each group alphabetical.
/// </summary>
public static class FolderSort
{
    private static readonly Dictionary<char, int> Arabic = new()
    {
        ['ا'] = 1, ['أ'] = 1, ['إ'] = 1, ['آ'] = 1, ['ٱ'] = 1, ['ء'] = 1,
        ['ب'] = 2, ['ت'] = 3, ['ث'] = 4, ['ج'] = 5, ['ح'] = 6, ['خ'] = 7,
        ['د'] = 8, ['ذ'] = 9, ['ر'] = 10, ['ز'] = 11, ['س'] = 12, ['ش'] = 13,
        ['ص'] = 14, ['ض'] = 15, ['ط'] = 16, ['ظ'] = 17, ['ع'] = 18, ['غ'] = 19,
        ['ف'] = 20, ['ق'] = 21, ['ك'] = 22, ['ل'] = 23, ['م'] = 24, ['ن'] = 25,
        ['ه'] = 26, ['ة'] = 26, ['و'] = 27, ['ؤ'] = 27, ['ي'] = 28, ['ى'] = 28, ['ئ'] = 28,
    };

    private static readonly Comparer<BookmarkFolder> FolderComparer =
        Comparer<BookmarkFolder>.Create((a, b) => CompareNames(a.Name, b.Name));

    public static List<BookmarkFolder> Sorted(IEnumerable<BookmarkFolder> folders) =>
        folders.OrderBy(f => f, FolderComparer).ToList();

    public static int CompareNames(string? a, string? b)
    {
        a ??= string.Empty;
        b ??= string.Empty;
        int i = 0, j = 0;
        while (i < a.Length || j < b.Length)
        {
            if (i >= a.Length) return -1;
            if (j >= b.Length) return 1;
            var ca = a[i];
            var cb = b[j];
            if (Skip(ca)) { i++; continue; }
            if (Skip(cb)) { j++; continue; }
            var (ga, ra) = Weight(ca);
            var (gb, rb) = Weight(cb);
            if (ga != gb) return ga.CompareTo(gb);
            if (ra != rb) return ra.CompareTo(rb);
            i++;
            j++;
        }
        return 0;
    }

    // Harakat, shadda/sukun and tatweel do not change the letter a name starts with.
    private static bool Skip(char c) =>
        (c >= '\u064B' && c <= '\u065F') || c == '\u0670' || c == '\u0640';

    // Group 0 = Arabic, 1 = Latin, 2 = digits, 3 = everything else.
    private static (int Group, int Rank) Weight(char c)
    {
        if (Arabic.TryGetValue(c, out var rank)) return (0, rank);
        if (c >= '\u0600' && c <= '\u06FF') return (0, 100 + c);
        if (c >= 'a' && c <= 'z') return (1, c - 'a');
        if (c >= 'A' && c <= 'Z') return (1, c - 'A');
        if (c >= '0' && c <= '9') return (2, c - '0');
        return (3, c);
    }
}
