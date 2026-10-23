using Jamrah.Files.Core;

namespace Jamrah.Files.Core.Tests;

public class FileNamingTests
{
    private static string Unique(string desired, params string[] taken)
        => FileNaming.EnsureUnique(desired, new HashSet<string>(taken, StringComparer.OrdinalIgnoreCase));

    [Fact]
    public void Free_Name_Unchanged() => Assert.Equal("photo.jpg", Unique("photo.jpg"));

    [Fact]
    public void Taken_AppendsTwo() => Assert.Equal("photo (2).jpg", Unique("photo.jpg", "photo.jpg"));

    [Fact]
    public void TakenTwice_AppendsThree() => Assert.Equal("photo (3).jpg", Unique("photo.jpg", "photo.jpg", "photo (2).jpg"));

    [Fact]
    public void CaseInsensitive() => Assert.Equal("Photo (2).JPG", Unique("Photo.JPG", "photo.jpg"));

    [Fact]
    public void NoExtension() => Assert.Equal("notes (2)", Unique("notes", "notes"));

    [Fact]
    public void Dotfile_Taken_AppendsSuffixAtEnd()
        => Assert.Equal(".gitignore (2)", Unique(".gitignore", ".gitignore"));

    [Fact]
    public void Sanitize_ReplacesIllegalChars()
        => Assert.Equal("a_b_c_.txt", FileNaming.Sanitize("a:b*c?.txt"));

    [Fact]
    public void Sanitize_TrimsDotsAndSpaces()
        => Assert.Equal("name", FileNaming.Sanitize("  name...  "));

    [Fact]
    public void Sanitize_WhitespaceAndDotsOnly_FallsBackToUnderscore()
    {
        Assert.Equal("_", FileNaming.Sanitize(""));
        Assert.Equal("_", FileNaming.Sanitize("   "));
        Assert.Equal("_", FileNaming.Sanitize("..."));
    }

    [Fact]
    public void Sanitize_ReplacesSeparators()
        => Assert.Equal("a_b_c", FileNaming.Sanitize("a/b\\c"));

    [Theory]
    [InlineData("NUL.txt", "NUL_.txt")]
    [InlineData("con", "con_")]
    [InlineData("COM3.tar.gz", "COM3_.tar.gz")]
    [InlineData("AUX.md", "AUX_.md")]
    [InlineData("PRN", "PRN_")]
    [InlineData("LPT9.log", "LPT9_.log")]
    [InlineData("NUL .txt", "NUL _.txt")]
    public void Sanitize_ReservedDeviceNames_AppendsUnderscoreToStem(string input, string expected)
        => Assert.Equal(expected, FileNaming.Sanitize(input));

    [Theory]
    [InlineData("console.txt")]
    [InlineData("NULx.txt")]
    [InlineData("COM0")]
    [InlineData("COM10.log")]
    [InlineData("LPT")]
    [InlineData(".CON")]
    [InlineData("My NUL.txt")]
    public void Sanitize_NonReservedDeviceLookalikes_Unchanged(string input)
        => Assert.Equal(input, FileNaming.Sanitize(input));

    [Theory]
    [InlineData("تقرير اجتماع.txt")]
    [InlineData("موسيقى.mp3")]
    [InlineData("日本語 ドキュメント.pdf")]
    public void Sanitize_PreservesUnicodeLetters(string name)
        => Assert.Equal(name, FileNaming.Sanitize(name));
}
