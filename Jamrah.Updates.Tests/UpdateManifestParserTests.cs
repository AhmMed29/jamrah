using System.Text.Json;

namespace Jamrah.Updates.Tests;

public sealed class UpdateManifestParserTests
{
    private static readonly Uri ReleasesUrl = new("https://github.com/AhmMed29/jamrah/releases/latest/download/");

    [Fact]
    public void Parse_ReadsManifestAndResolvesRelativeApkUrl()
    {
        var manifest = UpdateManifestParser.Parse("""
            {
              "version": "5.0.1",
              "versionCode": 2,
              "apkUrl": "Jamrah-5.0.1.apk",
              "sha256": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
              "sizeBytes": 123456,
              "notes": "fixes"
            }
            """, ReleasesUrl);

        Assert.Equal("5.0.1", manifest.Version);
        Assert.Equal(2, manifest.VersionCode);
        Assert.Equal("https://github.com/AhmMed29/jamrah/releases/latest/download/Jamrah-5.0.1.apk", manifest.ApkUrl.AbsoluteUri);
        Assert.Equal(123456, manifest.SizeBytes);
        Assert.Equal("fixes", manifest.Notes);
    }

    [Theory]
    [InlineData("")]
    [InlineData("not-json")]
    [InlineData("{}")]
    public void Parse_RejectsInvalidJson(string json)
    {
        Assert.Throws<UpdateManifestException>(() => UpdateManifestParser.Parse(json, ReleasesUrl));
    }

    [Theory]
    [InlineData("short")]
    [InlineData("zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz")]
    public void Parse_RejectsInvalidSha256(string sha)
    {
        var json = JsonSerializer.Serialize(new
        {
            version = "5.0.1",
            versionCode = 2,
            apkUrl = "Jamrah-5.0.1.apk",
            sha256 = sha,
            sizeBytes = 1
        });

        Assert.Throws<UpdateManifestException>(() => UpdateManifestParser.Parse(json, ReleasesUrl));
    }

    [Theory]
    [InlineData("file:///tmp/update.apk")]
    [InlineData("javascript:alert(1)")]
    [InlineData("https://")]
    public void Parse_RejectsUnsafeApkUrl(string url)
    {
        var json = JsonSerializer.Serialize(new
        {
            version = "5.0.1",
            versionCode = 2,
            apkUrl = url,
            sha256 = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
            sizeBytes = 1
        });

        Assert.Throws<UpdateManifestException>(() => UpdateManifestParser.Parse(json, ReleasesUrl));
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    public void Parse_RejectsNonPositiveVersionCode(int code)
    {
        var json = JsonSerializer.Serialize(new
        {
            version = "5.0.1",
            versionCode = code,
            apkUrl = "Jamrah-5.0.1.apk",
            sha256 = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
            sizeBytes = 1
        });

        Assert.Throws<UpdateManifestException>(() => UpdateManifestParser.Parse(json, ReleasesUrl));
    }

    [Fact]
    public void Parse_RejectsHttpBaseForHttpsOnlyPolicy()
    {
        var json = JsonSerializer.Serialize(new
        {
            version = "5.0.1",
            versionCode = 2,
            apkUrl = "http://example.com/update.apk",
            sha256 = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
            sizeBytes = 1
        });

        Assert.Throws<UpdateManifestException>(() => UpdateManifestParser.Parse(json, ReleasesUrl));
    }
}
