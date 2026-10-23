using System.Security.Cryptography;
using System.Text;

namespace Jamrah.Files.Core;

/// <summary>
/// Protects secrets with Windows DPAPI (current user) before they are written to the
/// settings database or translator-config.json. Tokens are never accepted as plaintext.
/// </summary>
public static class SecretProtector
{
    private const string Prefix = "dpapi:";

    public static string Protect(string? plaintext)
    {
        if (string.IsNullOrEmpty(plaintext) || !OperatingSystem.IsWindows()) return string.Empty;
        try
        {
            var protectedBytes = ProtectedData.Protect(
                Encoding.UTF8.GetBytes(plaintext), null, DataProtectionScope.CurrentUser);
            return Prefix + Convert.ToBase64String(protectedBytes);
        }
        catch
        {
            return string.Empty;
        }
    }

    public static string Unprotect(string? token)
    {
        if (string.IsNullOrWhiteSpace(token) || !OperatingSystem.IsWindows()) return string.Empty;
        if (!token.StartsWith(Prefix, StringComparison.Ordinal)) return string.Empty;
        try
        {
            var bytes = Convert.FromBase64String(token[Prefix.Length..]);
            var plaintext = ProtectedData.Unprotect(bytes, null, DataProtectionScope.CurrentUser);
            return Encoding.UTF8.GetString(plaintext);
        }
        catch
        {
            return string.Empty;
        }
    }
}
