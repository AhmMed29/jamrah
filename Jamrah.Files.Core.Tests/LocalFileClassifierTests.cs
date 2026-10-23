using Jamrah.Files.Core;

namespace Jamrah.Files.Core.Tests;

public class LocalFileClassifierTests
{
    [Theory]
    [InlineData("photo.JPG", "image")]
    [InlineData("clip.mp4", "video")]
    [InlineData("voice.ogg", "audio")]
    [InlineData("paper.pdf", "pdf")]
    [InlineData("readme.md", "text")]
    [InlineData("archive.zip", "generic")]
    [InlineData("no-extension", "generic")]
    public void KindFor_maps_extensions_to_kinds(string path, string expected)
    {
        Assert.Equal(expected, LocalFileClassifier.KindFor(path));
    }

    [Theory]
    [InlineData("image", "image")]
    [InlineData("video", "video")]
    [InlineData("audio", "audio")]
    [InlineData("pdf", "pdf")]
    [InlineData("text", "file")]
    [InlineData("generic", "file")]
    public void ItemTypeFor_maps_kinds_to_item_types(string kind, string expected)
    {
        Assert.Equal(expected, LocalFileClassifier.ItemTypeFor(kind));
    }
}
