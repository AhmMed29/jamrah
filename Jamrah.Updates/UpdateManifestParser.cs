using System.Text.Json;

namespace Jamrah.Updates;

public static class UpdateManifestParser
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true
    };

    public static UpdateManifest Parse(string json, Uri baseUri)
    {
        if (string.IsNullOrWhiteSpace(json))
            throw new UpdateManifestException("Update manifest is empty.");

        ManifestDto? dto;
        try
        {
            dto = JsonSerializer.Deserialize<ManifestDto>(json, JsonOptions);
        }
        catch (JsonException ex)
        {
            throw new UpdateManifestException("Update manifest is not valid JSON.", ex);
        }

        if (dto is null || string.IsNullOrWhiteSpace(dto.Version))
            throw new UpdateManifestException("Update manifest is missing a version.");
        if (dto.VersionCode <= 0)
            throw new UpdateManifestException("Update manifest has an invalid versionCode.");
        if (string.IsNullOrWhiteSpace(dto.ApkUrl))
            throw new UpdateManifestException("Update manifest is missing apkUrl.");
        if (dto.SizeBytes <= 0)
            throw new UpdateManifestException("Update manifest has an invalid sizeBytes.");
        if (!UpdateVerifier.IsValidSha256(dto.Sha256))
            throw new UpdateManifestException("Update manifest has an invalid sha256.");

        if (!Uri.TryCreate(baseUri, dto.ApkUrl, out var apkUri)
            || !apkUri.IsAbsoluteUri
            || apkUri.Scheme != Uri.UriSchemeHttps)
            throw new UpdateManifestException("Update manifest has an unsafe apkUrl.");

        return new UpdateManifest(
            dto.Version.Trim(),
            dto.VersionCode,
            apkUri,
            dto.Sha256!.Trim(),
            dto.SizeBytes,
            dto.Notes);
    }

    private sealed class ManifestDto
    {
        public string? Version { get; set; }
        public int VersionCode { get; set; }
        public string? ApkUrl { get; set; }
        public string? Sha256 { get; set; }
        public long SizeBytes { get; set; }
        public string? Notes { get; set; }
    }
}
