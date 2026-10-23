using System;
using System.IO;
using System.Threading;
using System.Threading.Tasks;
using Jamrah.Files.Core;

namespace Jamrah.Application.Services
{
    /// <summary>
    /// ADDITIVE: pulls the real Windows thumbnail/icon for an imported file so cards can
    /// show a program icon or a document's first page instead of a note-like rectangle.
    /// Windows only; every failure returns null and never breaks the caller.
    /// </summary>
    public static class FileIconService
    {
        public const int MaxDataUriBytes = 120 * 1024;
        public const uint ThumbSize = 160;

        public static bool IsSupported => OperatingSystem.IsWindows();

        /// <summary>Returns a compact data URI plus "preview"/"icon", or null when unavailable.</summary>
        public static async Task<(string DataUri, string Kind)?> ExtractAsync(string absolutePath, CancellationToken ct = default)
        {
#if WINDOWS
            if (string.IsNullOrWhiteSpace(absolutePath) || !File.Exists(absolutePath)) return null;
            try
            {
                ct.ThrowIfCancellationRequested();
                var file = await Windows.Storage.StorageFile.GetFileFromPathAsync(absolutePath);
                using var thumb = await file.GetThumbnailAsync(
                    Windows.Storage.FileProperties.ThumbnailMode.SingleItem,
                    ThumbSize,
                    Windows.Storage.FileProperties.ThumbnailOptions.ResizeThumbnail);
                if (thumb == null || thumb.Size == 0) return null;

                var bytes = await ReadAllBytesAsync(thumb, ct);
                if (bytes.Length == 0) return null;

                var (w, h) = await GetSizeAsync(bytes, ct);
                var kind = FileIcon.KindForSize(w, h);

                var uri = FileIcon.BuildDataUri(bytes, thumb.ContentType, MaxDataUriBytes);
                if (uri == null)
                {
                    var jpeg = await TryEncodeJpegAsync(bytes, ct);
                    uri = FileIcon.BuildDataUri(jpeg, "image/jpeg", MaxDataUriBytes);
                }
                return uri == null ? null : (uri, kind);
            }
            catch { return null; }
#else
            await Task.CompletedTask;
            return null;
#endif
        }

#if WINDOWS
        private static async Task<byte[]> ReadAllBytesAsync(Windows.Storage.Streams.IRandomAccessStreamWithContentType stream, CancellationToken ct)
        {
            using var s = stream.AsStreamForRead();
            using var ms = new MemoryStream();
            await s.CopyToAsync(ms, ct);
            return ms.ToArray();
        }

        private static async Task<(int Width, int Height)> GetSizeAsync(byte[] bytes, CancellationToken ct)
        {
            try
            {
                using var ras = new Windows.Storage.Streams.InMemoryRandomAccessStream();
                using (var ws = ras.AsStreamForWrite())
                {
                    await ws.WriteAsync(bytes, 0, bytes.Length, ct);
                    await ws.FlushAsync(ct);
                }
                ras.Seek(0);
                var decoder = await Windows.Graphics.Imaging.BitmapDecoder.CreateAsync(ras);
                return ((int)decoder.PixelWidth, (int)decoder.PixelHeight);
            }
            catch { return (0, 0); }
        }

        private static async Task<byte[]?> TryEncodeJpegAsync(byte[] bytes, CancellationToken ct)
        {
            try
            {
                using var input = new Windows.Storage.Streams.InMemoryRandomAccessStream();
                using (var ws = input.AsStreamForWrite())
                {
                    await ws.WriteAsync(bytes, 0, bytes.Length, ct);
                    await ws.FlushAsync(ct);
                }
                input.Seek(0);
                var decoder = await Windows.Graphics.Imaging.BitmapDecoder.CreateAsync(input);

                var props = new Windows.Graphics.Imaging.BitmapPropertySet
                {
                    ["ImageQuality"] = new Windows.Graphics.Imaging.BitmapTypedValue(
                        0.7f, Windows.Foundation.PropertyType.Single),
                };
                using var output = new Windows.Storage.Streams.InMemoryRandomAccessStream();
                var encoder = await Windows.Graphics.Imaging.BitmapEncoder.CreateAsync(
                    Windows.Graphics.Imaging.BitmapEncoder.JpegEncoderId, output, props);

                var pixels = await decoder.GetPixelDataAsync();
                encoder.SetPixelData(Windows.Graphics.Imaging.BitmapPixelFormat.Bgra8,
                    Windows.Graphics.Imaging.BitmapAlphaMode.Ignore,
                    decoder.PixelWidth, decoder.PixelHeight, 96, 96, pixels.DetachPixelData());
                await encoder.FlushAsync();

                output.Seek(0);
                using var rs = output.AsStreamForRead();
                using var ms = new MemoryStream();
                await rs.CopyToAsync(ms, ct);
                return ms.ToArray();
            }
            catch { return null; }
        }
#endif
    }
}
