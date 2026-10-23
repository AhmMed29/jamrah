using Jamrah.Files.Core;

namespace Jamrah.Files.Core.Tests;

public class NoteTextTests
{
    [Fact]
    public void Clamp_ShortText_Unchanged()
    {
        Assert.Equal("نص قصير", NoteText.Clamp("  نص قصير  "));
    }

    [Fact]
    public void Clamp_LongText_TruncatedToDescriptionMax()
    {
        var result = NoteText.Clamp(new string('a', 150));

        Assert.Equal(NoteText.DescriptionMax, result.Length);
        Assert.Equal(new string('a', 100), result);
    }

    [Fact]
    public void Clamp_NullOrWhitespace_ReturnsEmpty()
    {
        Assert.Equal(string.Empty, NoteText.Clamp(null));
        Assert.Equal(string.Empty, NoteText.Clamp("   "));
    }

    [Fact]
    public void Excerpt_CollapsesNewlinesAndTabsToOneLine()
    {
        Assert.Equal("سطر أول سطر تاني", NoteText.Excerpt("سطر أول\n\n\tسطر تاني"));
    }

    [Fact]
    public void Excerpt_LongText_TruncatedToDescriptionMax()
    {
        var result = NoteText.Excerpt(new string('x', 40) + "\n" + new string('y', 80));

        Assert.Equal(NoteText.DescriptionMax, result.Length);
        Assert.DoesNotContain('\n', result);
    }

    [Fact]
    public void Normalize_NotesEmpty_MovesDescriptionToNotes()
    {
        var (description, notes) = NoteText.Normalize("  النص الكامل  ", " ");

        Assert.Equal(string.Empty, description);
        Assert.Equal("النص الكامل", notes);
    }

    [Fact]
    public void Normalize_DuplicateDescriptionAndNotes_ClearsDescription()
    {
        var (description, notes) = NoteText.Normalize("نص الملاحظة", "نص الملاحظة");

        Assert.Equal(string.Empty, description);
        Assert.Equal("نص الملاحظة", notes);
    }

    [Fact]
    public void Normalize_DistinctValues_KeepsBoth()
    {
        var (description, notes) = NoteText.Normalize("ملخص", "المتن الكامل");

        Assert.Equal("ملخص", description);
        Assert.Equal("المتن الكامل", notes);
    }

    [Fact]
    public void Normalize_WhitespaceOnly_ReturnsEmptyPairs()
    {
        var (description, notes) = NoteText.Normalize(null, "  ");

        Assert.Equal(string.Empty, description);
        Assert.Equal(string.Empty, notes);
    }
}
