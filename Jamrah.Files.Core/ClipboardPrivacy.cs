namespace Jamrah.Files.Core;

/// <summary>
/// Windows clipboard producers can opt out of monitoring/history (password managers set
/// these formats). <c>null</c> means the format was absent; <c>false</c> means the app
/// explicitly asked not to capture it.
/// </summary>
public static class ClipboardPrivacy
{
    public static bool ShouldSkip(bool excludeFromMonitoring, bool? canIncludeInHistory, bool? canUploadToCloud)
        => excludeFromMonitoring
            || canIncludeInHistory == false
            || canUploadToCloud == false;
}
