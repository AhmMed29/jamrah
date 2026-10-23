namespace Jamrah.Files.Core;

public static class FolderTargeting
{
    public static string? ResolveNewItemFolder(
        string? routeContext,
        string? routeId,
        IEnumerable<string> existingFolderIds,
        string? explicitFolderId = null)
    {
        var folderIds = existingFolderIds as ICollection<string> ?? existingFolderIds.ToList();
        if (!string.IsNullOrWhiteSpace(explicitFolderId))
            return folderIds.Contains(explicitFolderId, StringComparer.Ordinal) ? explicitFolderId : null;
        if (!string.Equals(routeContext, "folder", StringComparison.OrdinalIgnoreCase)
            || string.IsNullOrWhiteSpace(routeId))
            return null;
        return folderIds.Contains(routeId, StringComparer.Ordinal) ? routeId : null;
    }
}
