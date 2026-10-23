using System.Text.Json.Nodes;

namespace Jamrah.Files.Core;

/// <summary>Safe read/write of the flexible MetadataJson object on BookmarkItem.</summary>
public static class ItemMeta
{
    /// <summary>
    /// Reads a metadata value. Never throws: returns <see cref="string.Empty"/> when the
    /// JSON is null, blank, invalid, not an object, missing the key, or otherwise corrupt.
    /// Non-string nodes (numbers, arrays, objects) are returned in their textual form.
    /// </summary>
    public static string Get(string? metadataJson, string key)
    {
        try
        {
            var obj = JsonNode.Parse(string.IsNullOrWhiteSpace(metadataJson) ? "{}" : metadataJson) as JsonObject;
            var node = obj?[key];
            if (node == null) return string.Empty;
            try { return node.GetValue<string>(); } catch { return node.ToString(); }
        }
        catch { return string.Empty; }
    }

    /// <summary>
    /// Writes a metadata value, preserving existing keys. Never throws: when the existing
    /// JSON is corrupt or cannot be mutated (e.g. duplicate keys), it is replaced by a
    /// fresh object holding just the new key/value pair.
    /// </summary>
    public static string Set(string? metadataJson, string key, string value)
    {
        JsonObject obj;
        try
        {
            obj = JsonNode.Parse(string.IsNullOrWhiteSpace(metadataJson) ? "{}" : metadataJson) as JsonObject ?? new JsonObject();
            obj[key] = value;
        }
        catch
        {
            obj = new JsonObject();
            obj[key] = value;
        }
        return obj.ToJsonString();
    }
}
