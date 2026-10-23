using Jamrah.Files.Core;

namespace Jamrah.Files.Core.Tests;

public class FolderPathMapTests
{
    private static Func<string, (string? Name, string? ParentId)> Lookup(Dictionary<string, (string, string?)> map)
        => id => map.TryGetValue(id, out var v) ? v : (null, null);

    [Fact]
    public void RelativePath_JoinsAncestorsWithSlash()
    {
        var map = new Dictionary<string, (string, string?)>
        {
            ["c"] = ("Photos", "b"),
            ["b"] = ("Personal", "a"),
            ["a"] = ("Root", null),
        };
        Assert.Equal("Root/Personal/Photos", FolderPathMap.RelativePathFor("c", Lookup(map)));
    }

    [Fact]
    public void RelativePath_SanitizesNames()
    {
        var map = new Dictionary<string, (string, string?)> { ["x"] = ("My:Stuff", null) };
        Assert.Equal("My_Stuff", FolderPathMap.RelativePathFor("x", Lookup(map)));
    }

    [Fact]
    public void RelativePath_UnknownId_ReturnsEmpty()
        => Assert.Equal("", FolderPathMap.RelativePathFor("nope", Lookup(new())));

    [Fact]
    public void RelativePath_UnknownDirectParent_ReturnsEmpty_DiscardingCollectedSegments()
    {
        var map = new Dictionary<string, (string, string?)> { ["c"] = ("Photos", "ghost") };
        Assert.Equal("", FolderPathMap.RelativePathFor("c", Lookup(map)));
    }

    [Fact]
    public void RelativePath_UnknownIntermediateParent_ReturnsEmpty_DiscardingCollectedSegments()
    {
        var map = new Dictionary<string, (string, string?)>
        {
            ["c"] = ("Leaf", "b"),
            ["b"] = ("Mid", "ghost"),
        };
        Assert.Equal("", FolderPathMap.RelativePathFor("c", Lookup(map)));
    }

    [Fact]
    public void RelativePath_Cycle_ReturnsExactlyFiftySegments()
    {
        var map = new Dictionary<string, (string, string?)> { ["a"] = ("A", "b"), ["b"] = ("B", "a") };
        var path = FolderPathMap.RelativePathFor("a", Lookup(map));
        Assert.Equal(50, path.Split('/').Length);
    }

    [Fact]
    public void RelativePath_DeepChain_TruncatedAtFiftyLevels()
    {
        var map = new Dictionary<string, (string, string?)>();
        for (var i = 0; i < 60; i++)
            map["f" + i] = ("F" + i, i == 59 ? null : "f" + (i + 1));

        var segments = FolderPathMap.RelativePathFor("f0", Lookup(map)).Split('/');

        Assert.Equal(50, segments.Length);
        Assert.Equal("F49", segments[0]);
        Assert.Equal("F0", segments[^1]);
    }
}
