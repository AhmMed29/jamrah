namespace Jamrah.Files.Core;

/// <summary>One folder in a clone plan: old DB id -> new DB id, with the new parent link.</summary>
public sealed record FolderCloneEntry(
    string OldId,
    string NewId,
    string Name,
    string? ParentId,
    bool IsRoot);

/// <summary>
/// Builds the DB side of a recursive folder copy (root first, then descendants in
/// breadth-first order). Physical files are copied separately by copying the root
/// directory, so descendant names stay untouched; only the root name is made unique
/// against the destination's taken sibling names.
/// </summary>
public static class FolderCloner
{
    public static List<FolderCloneEntry> Plan(
        string rootId,
        IReadOnlyList<(string Id, string Name, string? ParentId)> folders,
        string newRootId,
        string rootName,
        ISet<string> takenRootNames,
        Func<string> newId)
    {
        var root = folders.FirstOrDefault(f => f.Id == rootId);
        if (root.Id == null) return new List<FolderCloneEntry>();

        var result = new List<FolderCloneEntry>
        {
            new(root.Id, newRootId, FileNaming.EnsureUnique(rootName, takenRootNames), root.ParentId, true),
        };
        var map = new Dictionary<string, string>(StringComparer.Ordinal) { [rootId] = newRootId };
        var visited = new HashSet<string>(StringComparer.Ordinal) { rootId };
        var queue = new Queue<string>();
        queue.Enqueue(rootId);

        while (queue.Count > 0)
        {
            var parentOld = queue.Dequeue();
            foreach (var child in folders.Where(f => f.ParentId == parentOld))
            {
                if (!visited.Add(child.Id)) continue;
                var childNewId = newId();
                result.Add(new FolderCloneEntry(child.Id, childNewId, child.Name, map[parentOld], false));
                map[child.Id] = childNewId;
                queue.Enqueue(child.Id);
            }
        }
        return result;
    }
}
