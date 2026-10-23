using Jamrah.Files.Core;

namespace Jamrah.Files.Core.Tests;

public class FileIconTests
{
    [Theory]
    [InlineData(@"C:\Users\me\Desktop\Gemini.lnk", true)]
    [InlineData(@"C:\Apps\tool.EXE", true)]
    [InlineData("setup.msi", true)]
    [InlineData("run.bat", true)]
    [InlineData("run.cmd", true)]
    [InlineData("game.appref-ms", true)]
    [InlineData("legacy.com", true)]
    [InlineData("screensaver.scr", true)]
    [InlineData("report.pdf", false)]
    [InlineData("notes.docx", false)]
    [InlineData("picture.png", false)]
    [InlineData("noext", false)]
    public void IsProgram_DetectsProgramExtensions(string path, bool expected)
        => Assert.Equal(expected, FileIcon.IsProgram(path));

    [Fact]
    public void BuildDataUri_ReturnsDataUri_ForSmallImage()
        => Assert.Equal("data:image/png;base64,AQID", FileIcon.BuildDataUri(new byte[] { 1, 2, 3 }, "image/png", 1024));

    [Fact]
    public void BuildDataUri_Null_WhenTooLarge()
        => Assert.Null(FileIcon.BuildDataUri(new byte[] { 1, 2, 3 }, "image/png", 2));

    [Fact]
    public void BuildDataUri_Null_WhenEmpty()
        => Assert.Null(FileIcon.BuildDataUri(Array.Empty<byte>(), "image/png", 1024));

    [Fact]
    public void BuildDataUri_DefaultsNonImageContentType_ToPng()
        => Assert.Equal("data:image/png;base64,AQID", FileIcon.BuildDataUri(new byte[] { 1, 2, 3 }, "", 1024));

    [Fact]
    public void BuildDataUri_LowercasesContentType()
        => Assert.Equal("data:image/jpeg;base64,AQID", FileIcon.BuildDataUri(new byte[] { 1, 2, 3 }, "IMAGE/JPEG", 1024));

    [Theory]
    [InlineData(32, 32, "icon")]
    [InlineData(256, 256, "icon")]
    [InlineData(160, 120, "preview")]
    [InlineData(0, 0, "preview")]
    public void KindForSize_SquareIsIcon_ElsePreview(int width, int height, string expected)
        => Assert.Equal(expected, FileIcon.KindForSize(width, height));
}
