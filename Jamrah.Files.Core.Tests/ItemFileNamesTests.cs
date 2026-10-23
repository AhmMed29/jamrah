using Jamrah.Files.Core;

namespace Jamrah.Files.Core.Tests;

public class ItemFileNamesTests
{
    [Fact]
    public void Rename_preserves_the_original_extension()
    {
        Assert.Equal("new title.png", ItemFileNames.Rename("old.png", "new title"));
    }

    [Fact]
    public void Rename_does_not_double_the_extension()
    {
        Assert.Equal("new.png", ItemFileNames.Rename("old.png", "new.png"));
    }

    [Fact]
    public void Rename_sanitizes_invalid_characters()
    {
        Assert.Equal("a_b.txt", ItemFileNames.Rename("old.txt", "a?b"));
    }

    [Fact]
    public void Rename_returns_null_for_an_empty_title()
    {
        Assert.Null(ItemFileNames.Rename("old.txt", "   "));
    }

}
