using Jamrah.Core.Entities;
using Jamrah.Files.Core;
using Jamrah.Infrastructure;
using Microsoft.Maui.ApplicationModel;
using Microsoft.Maui.ApplicationModel.DataTransfer;

namespace Jamrah.Application.Services;

/// <summary>
/// Copies an item to the system clipboard without creating another card or file.
/// Text items copy their URL/note; managed local files copy the file itself.
/// </summary>
public sealed class ItemClipboardService
{
    public async Task<bool> CopyAsync(BookmarkItem item)
    {
        var localFile = ResolveLocalFile(item);
        var payload = ClipboardContent.Resolve(
            item.Url,
            item.Notes,
            item.Description,
            localFile,
            ItemMeta.Get(item.MetadataJson, "sourcePath"),
            item.Title);

        if (payload == null) return false;

        if (payload.Kind == ClipboardPayloadKind.File && !string.IsNullOrEmpty(payload.FilePath))
            return await CopyFileAsync(payload.FilePath);

        try
        {
            await Clipboard.Default.SetTextAsync(payload.Text);
            return true;
        }
        catch { return false; }
    }

    public string? ResolveLocalFile(BookmarkItem item)
    {
        var relative = ItemMeta.Get(item.MetadataJson, "localFile");
        if (string.IsNullOrWhiteSpace(relative)) return null;

        var absolute = Path.IsPathRooted(relative)
            ? relative
            : SafePath.ResolveUnderRoot(AppPaths.Layout.Root, relative);

        return absolute != null && File.Exists(absolute) ? absolute : null;
    }

    private static async Task<bool> CopyFileAsync(string path)
    {
#if WINDOWS
        try
        {
            var file = await Windows.Storage.StorageFile.GetFileFromPathAsync(path);
            var package = new Windows.ApplicationModel.DataTransfer.DataPackage();
            package.SetStorageItems(new Windows.Storage.IStorageItem[] { file });
            package.SetText(path);

            await MainThread.InvokeOnMainThreadAsync(() =>
            {
                Windows.ApplicationModel.DataTransfer.Clipboard.SetContent(package);
                Windows.ApplicationModel.DataTransfer.Clipboard.Flush();
            });
            return true;
        }
        catch
        {
            try { await Clipboard.Default.SetTextAsync(path); return true; }
            catch { return false; }
        }
#else
        try { await Clipboard.Default.SetTextAsync(path); return true; }
        catch { return false; }
#endif
    }
}
