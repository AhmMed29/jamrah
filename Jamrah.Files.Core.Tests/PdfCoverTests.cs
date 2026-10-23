using Jamrah.Files.Core;

namespace Jamrah.Files.Core.Tests;

public class PdfCoverTests
{
    [Theory]
    [InlineData("pdf", true)]
    [InlineData("PDF", true)]
    [InlineData("image", false)]
    [InlineData("", false)]
    [InlineData(null, false)]
    public void ShouldRender_OnlyPdfFiles(string? kind, bool expected)
        => Assert.Equal(expected, PdfCover.ShouldRender(kind));

    [Fact]
    public void FileNameFor_ReturnsStableJpegName()
        => Assert.Equal("pdf-cover-abc-123.jpg", PdfCover.FileNameFor("abc-123"));

    [Fact]
    public void FileNameFor_SanitizesPathCharacters()
        => Assert.Equal("pdf-cover-a_b_c.jpg", PdfCover.FileNameFor(@"a/b\c"));

    [Fact]
    public void FileNameFor_Null_WhenBlank()
    {
        Assert.Null(PdfCover.FileNameFor(""));
        Assert.Null(PdfCover.FileNameFor("   "));
    }

    [Theory]
    [InlineData("pdf-cover-a.jpg", true)]
    [InlineData("pdf-cover-a.png", true)]
    [InlineData("", false)]
    [InlineData(null, false)]
    [InlineData("../evil.jpg", false)]
    [InlineData(@"..\evil.jpg", false)]
    [InlineData(@"C:\temp\evil.jpg", false)]
    [InlineData("sub/evil.jpg", false)]
    [InlineData("sub\\evil.jpg", false)]
    public void IsSafeFileName_RejectsTraversalAndRootedPaths(string? fileName, bool expected)
        => Assert.Equal(expected, PdfCover.IsSafeFileName(fileName));

    [Fact]
    public void AbsolutePathFor_CombinesThumbsDir_ForSafeName()
        => Assert.Equal(Path.Combine("thumbs", "pdf-cover-a.jpg"),
            PdfCover.AbsolutePathFor("thumbs", "pdf-cover-a.jpg"));

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("../evil.jpg")]
    [InlineData(@"C:\temp\evil.jpg")]
    public void AbsolutePathFor_Null_ForUnsafeName(string? fileName)
        => Assert.Null(PdfCover.AbsolutePathFor("thumbs", fileName));
}
