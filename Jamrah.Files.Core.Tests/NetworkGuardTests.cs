using System.Net;
using Jamrah.Files.Core;

namespace Jamrah.Files.Core.Tests;

public class NetworkGuardTests
{
    [Theory]
    [InlineData("127.0.0.1")]
    [InlineData("10.0.0.1")]
    [InlineData("172.16.0.1")]
    [InlineData("172.31.255.255")]
    [InlineData("192.168.1.1")]
    [InlineData("169.254.169.254")]
    [InlineData("100.64.0.1")]
    [InlineData("0.0.0.0")]
    [InlineData("224.0.0.1")]
    [InlineData("::1")]
    [InlineData("fe80::1")]
    [InlineData("fc00::1")]
    [InlineData("::ffff:127.0.0.1")]
    public void IsBlockedAddress_BlocksLocalAndReservedRanges(string value)
        => Assert.True(NetworkGuard.IsBlockedAddress(IPAddress.Parse(value)));

    [Theory]
    [InlineData("8.8.8.8")]
    [InlineData("1.1.1.1")]
    [InlineData("172.32.0.1")]
    [InlineData("2001:4860:4860::8888")]
    public void IsBlockedAddress_AllowsPublicAddresses(string value)
        => Assert.False(NetworkGuard.IsBlockedAddress(IPAddress.Parse(value)));

    [Theory]
    [InlineData("https://example.com/article")]
    [InlineData("http://example.com")]
    public void IsAllowedHttpUri_AllowsWebUrls(string value)
        => Assert.True(NetworkGuard.IsAllowedHttpUri(value));

    [Theory]
    [InlineData("file:///C:/Windows/win.ini")]
    [InlineData("ftp://example.com/file")]
    [InlineData("javascript:alert(1)")]
    [InlineData("https://127.0.0.1/")]
    [InlineData("http://localhost/")]
    [InlineData("http://169.254.169.254/latest/meta-data/")]
    [InlineData("not a url")]
    public void IsAllowedHttpUri_RejectsUnsafeUrls(string value)
        => Assert.False(NetworkGuard.IsAllowedHttpUri(value));

    [Theory]
    [InlineData("localhost")]
    [InlineData("LOCALHOST")]
    [InlineData("printer.local")]
    [InlineData("metadata.google.internal")]
    public void IsBlockedHostName_BlocksLocalNames(string value)
        => Assert.True(NetworkGuard.IsBlockedHostName(value));

    [Theory]
    [InlineData("example.com")]
    [InlineData("github.com")]
    [InlineData("")]
    public void IsBlockedHostName_AllowsPublicNames(string value)
        => Assert.False(NetworkGuard.IsBlockedHostName(value));
}
