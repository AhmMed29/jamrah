using Jamrah.Files.Core;

namespace Jamrah.Files.Core.Tests;

public class ShellCommandLineTests
{
    [Fact]
    public void ParseAddToJamrah_returns_empty_when_flag_is_absent()
    {
        var paths = ShellCommandLine.ParseAddToJamrah(new[] { "Jamrah.exe", @"C:\a.txt" });

        Assert.Empty(paths);
    }

    [Fact]
    public void ParseAddToJamrah_returns_the_path_after_the_flag()
    {
        var paths = ShellCommandLine.ParseAddToJamrah(new[] { "Jamrah.exe", "--add-to-jamrah", @"C:\a.txt" });

        Assert.Equal(new[] { @"C:\a.txt" }, paths);
    }

    [Fact]
    public void ParseAddToJamrah_returns_every_path_after_the_flag()
    {
        var paths = ShellCommandLine.ParseAddToJamrah(new[]
        {
            "Jamrah.exe", "--add-to-jamrah", @"C:\a.txt", @"C:\b.png", @"C:\c.mp4"
        });

        Assert.Equal(new[] { @"C:\a.txt", @"C:\b.png", @"C:\c.mp4" }, paths);
    }

    [Fact]
    public void ParseAddToJamrah_is_case_insensitive_and_ignores_empty_values()
    {
        var paths = ShellCommandLine.ParseAddToJamrah(new[]
        {
            "Jamrah.exe", "--ADD-TO-JAMRAH", "", @"C:\a.txt", null!
        });

        Assert.Equal(new[] { @"C:\a.txt" }, paths);
    }
}
