namespace Jamrah.Updates;

public sealed record UpdateManifest(
    string Version,
    int VersionCode,
    Uri ApkUrl,
    string Sha256,
    long SizeBytes,
    string? Notes);
