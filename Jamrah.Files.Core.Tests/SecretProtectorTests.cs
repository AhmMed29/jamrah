using Jamrah.Files.Core;

namespace Jamrah.Files.Core.Tests;

public class SecretProtectorTests
{
    [Fact]
    public void Protect_RoundTripsAndNeverStoresPlaintext()
    {
        if (!OperatingSystem.IsWindows()) return;

        var token = SecretProtector.Protect("AIza-test-secret");

        Assert.StartsWith("dpapi:", token);
        Assert.DoesNotContain("AIza-test-secret", token);
        Assert.Equal("AIza-test-secret", SecretProtector.Unprotect(token));
    }

    [Theory]
    [InlineData("")]
    [InlineData("plain-text")]
    [InlineData("dpapi:not-base64")]
    public void Unprotect_RejectsMissingOrMalformedTokens(string token)
    {
        if (!OperatingSystem.IsWindows()) return;
        Assert.Equal(string.Empty, SecretProtector.Unprotect(token));
    }
}
