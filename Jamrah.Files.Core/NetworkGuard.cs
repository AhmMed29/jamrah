using System.Net;

namespace Jamrah.Files.Core;

/// <summary>
/// Blocks link-preview/archive requests from reaching loopback, private, link-local,
/// carrier-grade NAT and reserved addresses (SSRF protection).
/// </summary>
public static class NetworkGuard
{
    public static bool IsAllowedHttpUri(string? value)
    {
        if (!Uri.TryCreate((value ?? string.Empty).Trim(), UriKind.Absolute, out var uri)) return false;
        if (uri.Scheme != Uri.UriSchemeHttp && uri.Scheme != Uri.UriSchemeHttps) return false;
        if (string.IsNullOrWhiteSpace(uri.Host)) return false;
        if (IsBlockedHostName(uri.DnsSafeHost)) return false;
        if (IPAddress.TryParse(uri.DnsSafeHost, out var ip) && IsBlockedAddress(ip)) return false;
        return true;
    }

    public static bool IsBlockedHostName(string? host)
    {
        var value = (host ?? string.Empty).Trim().TrimEnd('.').ToLowerInvariant();
        if (value.Length == 0) return false;
        return value == "localhost"
            || value.EndsWith(".localhost", StringComparison.Ordinal)
            || value.EndsWith(".local", StringComparison.Ordinal)
            || value.EndsWith(".internal", StringComparison.Ordinal)
            || value.EndsWith(".lan", StringComparison.Ordinal)
            || value.EndsWith(".home", StringComparison.Ordinal)
            || value == "metadata.google.internal"
            || value == "instance-data";
    }

    public static bool IsBlockedAddress(IPAddress address)
    {
        if (address.IsIPv4MappedToIPv6) address = address.MapToIPv4();

        if (IPAddress.IsLoopback(address)) return true;

        var bytes = address.GetAddressBytes();
        if (address.AddressFamily == System.Net.Sockets.AddressFamily.InterNetwork)
        {
            return bytes[0] == 0
                || bytes[0] == 10
                || bytes[0] == 127
                || (bytes[0] == 100 && bytes[1] >= 64 && bytes[1] <= 127)
                || (bytes[0] == 169 && bytes[1] == 254)
                || (bytes[0] == 172 && bytes[1] >= 16 && bytes[1] <= 31)
                || (bytes[0] == 192 && bytes[1] == 168)
                || (bytes[0] == 198 && (bytes[1] == 18 || bytes[1] == 19))
                || bytes[0] >= 224;
        }

        if (address.AddressFamily == System.Net.Sockets.AddressFamily.InterNetworkV6)
        {
            if (address.Equals(IPAddress.IPv6Any) || address.Equals(IPAddress.IPv6None)) return true;
            if ((bytes[0] & 0xFE) == 0xFC) return true;
            if (bytes[0] == 0xFE && (bytes[1] & 0xC0) is 0x80 or 0xC0) return true;
            if (bytes[0] == 0xFF) return true;
            if (bytes[0] == 0x20 && bytes[1] == 0x01 && bytes[2] == 0x0D && bytes[3] == 0xB8) return true;
        }

        return false;
    }
}
