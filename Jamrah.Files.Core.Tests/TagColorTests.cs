using Jamrah.Files.Core;

namespace Jamrah.Files.Core.Tests;

public class TagColorTests
{
    [Theory]
    [InlineData("#AABBCC", "#aabbcc")]
    [InlineData("#abc", "#aabbcc")]
    [InlineData(" #fff ", "#ffffff")]
    [InlineData("#123456", "#123456")]
    public void Normalize_AcceptsOnlyHexColors(string input, string expected)
        => Assert.Equal(expected, TagColor.Normalize(input));

    [Theory]
    [InlineData("red")]
    [InlineData("rgb(255,0,0)")]
    [InlineData("#12345")]
    [InlineData("#12345g")]
    [InlineData("#fff\" onmouseover=\"alert(1)")]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData(null)]
    public void Normalize_RejectsAnythingElse(string? input)
        => Assert.Null(TagColor.Normalize(input));

    [Fact]
    public void StyleAttribute_EncodesValidatedColorOnly()
    {
        Assert.Equal("style=\"background:#aabbcc16;color:#aabbcc\"", TagColor.StyleAttribute("#AABBCC"));
        Assert.Equal(string.Empty, TagColor.StyleAttribute("red\"; onmouseover=\"alert(1)"));
        Assert.Equal(string.Empty, TagColor.StyleAttribute(null));
    }
}
