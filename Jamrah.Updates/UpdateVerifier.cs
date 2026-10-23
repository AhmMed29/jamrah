using System.Security.Cryptography;

namespace Jamrah.Updates;

public static class UpdateVerifier
{
    public static bool VerifySha256(ReadOnlySpan<byte> content, string expectedHex)
    {
        if (!IsValidSha256(expectedHex))
            return false;

        Span<byte> hash = stackalloc byte[32];
        SHA256.HashData(content, hash);
        return Convert.ToHexString(hash).Equals(expectedHex, StringComparison.OrdinalIgnoreCase);
    }

    public static async Task<bool> VerifyFileSha256Async(
        string filePath,
        string expectedHex,
        CancellationToken cancellationToken)
    {
        if (!IsValidSha256(expectedHex) || !File.Exists(filePath))
            return false;

        await using var stream = new FileStream(
            filePath,
            FileMode.Open,
            FileAccess.Read,
            FileShare.Read,
            bufferSize: 81920,
            useAsync: true);
        var hash = await SHA256.HashDataAsync(stream, cancellationToken);
        return Convert.ToHexString(hash).Equals(expectedHex, StringComparison.OrdinalIgnoreCase);
    }

    public static bool IsValidSha256(string? value)
    {
        if (value is null || value.Length != 64)
            return false;

        foreach (var c in value)
        {
            if (!Uri.IsHexDigit(c))
                return false;
        }

        return true;
    }
}
