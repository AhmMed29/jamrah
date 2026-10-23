namespace Jamrah.Files.Core;

public enum ClipboardPayloadKind { Text, File }

public sealed record ClipboardPayload(ClipboardPayloadKind Kind, string Text, string? FilePath);

public static class ClipboardContent
{
    public static ClipboardPayload? Resolve(
        string? url,
        string? notes,
        string? description,
        string? localFilePath,
        string? sourcePath,
        string? title,
        Func<string, bool>? fileExists = null)
    {
        if (!string.IsNullOrWhiteSpace(localFilePath))
        {
            var exists = fileExists?.Invoke(localFilePath) ?? File.Exists(localFilePath);
            if (exists)
                return new ClipboardPayload(ClipboardPayloadKind.File, localFilePath, localFilePath);
        }

        if (!string.IsNullOrWhiteSpace(url))
            return Text(url);

        if (!string.IsNullOrWhiteSpace(notes))
            return Text(notes);

        if (!string.IsNullOrWhiteSpace(description))
            return Text(description);

        if (!string.IsNullOrWhiteSpace(sourcePath))
            return Text(sourcePath);

        if (!string.IsNullOrWhiteSpace(title))
            return Text(title);

        return null;
    }

    private static ClipboardPayload Text(string value) =>
        new(ClipboardPayloadKind.Text, value.Trim(), null);
}
