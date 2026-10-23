using Jamrah.Files.Core;

namespace Jamrah.Files.Core.Tests;

public class ItemMetaTests
{
    [Fact]
    public void Get_MissingKey_ReturnsEmpty() => Assert.Equal("", ItemMeta.Get("{}", "localFile"));

    [Fact]
    public void Get_InvalidJson_ReturnsEmpty() => Assert.Equal("", ItemMeta.Get("not-json", "x"));

    [Fact]
    public void SetThenGet_RoundTrips()
    {
        var json = ItemMeta.Set("{}", "localFile", "Library/a.jpg");
        Assert.Equal("Library/a.jpg", ItemMeta.Get(json, "localFile"));
    }

    [Fact]
    public void Set_PreservesOtherKeys()
    {
        var json = ItemMeta.Set("{\"thumbLocal\":\"C:\\\\t.jpg\"}", "localFile", "Library/a.jpg");
        Assert.Equal("C:\\t.jpg", ItemMeta.Get(json, "thumbLocal"));
        Assert.Equal("Library/a.jpg", ItemMeta.Get(json, "localFile"));
    }

    [Fact]
    public void Set_OverwritesExistingKey()
    {
        var json = ItemMeta.Set(ItemMeta.Set("{}", "k", "1"), "k", "2");
        Assert.Equal("2", ItemMeta.Get(json, "k"));
    }

    [Fact]
    public void Set_DuplicateKeys_DoesNotThrow()
    {
        var json = ItemMeta.Set("{\"a\":1,\"a\":2}", "b", "v");
        Assert.Equal("v", ItemMeta.Get(json, "b"));
    }

    [Fact]
    public void Get_NullOrWhitespaceMetadata_ReturnsEmpty()
    {
        Assert.Equal("", ItemMeta.Get(null, "x"));
        Assert.Equal("", ItemMeta.Get("  ", "x"));
    }

    [Fact]
    public void Get_NonStringNode_ReturnsText()
    {
        Assert.Equal("123", ItemMeta.Get("{\"a\":123}", "a"));
    }

    [Fact]
    public void Set_CorruptJson_ReturnsFreshValidJsonWithKey()
    {
        var json = ItemMeta.Set("{not json", "localFile", "Library/a.jpg");

        Assert.Equal("{\"localFile\":\"Library/a.jpg\"}", json);
        Assert.Equal("Library/a.jpg", ItemMeta.Get(json, "localFile"));
    }
}
