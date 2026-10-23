using System.Security.Cryptography;

namespace Jamrah.Updates.Tests;

public sealed class UpdateVerificationTests
{
    [Fact]
    public void VerifySha256_ReturnsTrueForMatchingContent()
    {
        var content = "jamrah update"u8.ToArray();
        var expected = Convert.ToHexString(SHA256.HashData(content));

        Assert.True(UpdateVerifier.VerifySha256(content, expected));
        Assert.True(UpdateVerifier.VerifySha256(content, expected.ToLowerInvariant()));
    }

    [Fact]
    public void VerifySha256_ReturnsFalseForDifferentContent()
    {
        var content = "jamrah update"u8.ToArray();
        var expected = Convert.ToHexString(SHA256.HashData("other"u8.ToArray()));

        Assert.False(UpdateVerifier.VerifySha256(content, expected));
    }

    [Fact]
    public void VerifySha256_ReturnsFalseForInvalidExpectedHash()
    {
        Assert.False(UpdateVerifier.VerifySha256("x"u8.ToArray(), "not-a-hash"));
    }

    [Fact]
    public async Task VerifyFileSha256_ReturnsTrueForMatchingFile()
    {
        var path = Path.GetTempFileName();
        try
        {
            var content = "jamrah file update"u8.ToArray();
            await File.WriteAllBytesAsync(path, content);
            var expected = Convert.ToHexString(SHA256.HashData(content));

            Assert.True(await UpdateVerifier.VerifyFileSha256Async(path, expected, CancellationToken.None));
        }
        finally
        {
            File.Delete(path);
        }
    }

    [Fact]
    public async Task VerifyFileSha256_ReturnsFalseForMissingFile()
    {
        var path = Path.Combine(Path.GetTempPath(), $"{Guid.NewGuid():N}.apk");

        Assert.False(await UpdateVerifier.VerifyFileSha256Async(path, new string('a', 64), CancellationToken.None));
    }

    [Theory]
    [InlineData(1, 2, true)]
    [InlineData(2, 2, false)]
    [InlineData(3, 2, false)]
    public void IsNewer_ComparesVersionCodes(int current, int available, bool expected)
    {
        Assert.Equal(expected, UpdateVersion.IsNewer(current, available));
    }
}
