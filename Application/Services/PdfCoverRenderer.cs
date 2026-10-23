using System;
using System.IO;
using System.Threading;
using System.Threading.Tasks;

namespace Jamrah.Application.Services
{
    /// <summary>
    /// Renders the first page of a PDF to a JPEG using the native Windows/Android APIs.
    /// Every failure returns null and never breaks the import or backfill caller.
    /// </summary>
    public static class PdfCoverRenderer
    {
        public const int CoverWidth = 420;
        public const int JpegQuality = 80;
        public const int MaxInlineBytes = 280 * 1024;

        public static bool IsSupported =>
#if WINDOWS || ANDROID
            true;
#else
            false;
#endif

        public static async Task<byte[]?> RenderFirstPageJpegAsync(
            string absolutePath, int width = CoverWidth, CancellationToken ct = default)
        {
            if (string.IsNullOrWhiteSpace(absolutePath) || !File.Exists(absolutePath)) return null;
            width = Math.Clamp(width, 120, 1200);
            try
            {
                ct.ThrowIfCancellationRequested();
#if WINDOWS
                var bytes = await RenderWindowsAsync(absolutePath, width);
#elif ANDROID
                var bytes = await Task.Run(() => RenderAndroid(absolutePath, width), ct);
#else
                await Task.CompletedTask;
                byte[]? bytes = null;
#endif
                ct.ThrowIfCancellationRequested();
                return bytes is { Length: > 0 } ? bytes : null;
            }
            catch (OperationCanceledException) { throw; }
            catch { return null; }
        }

#if WINDOWS
        private static async Task<byte[]?> RenderWindowsAsync(string absolutePath, int width)
        {
            var file = await Windows.Storage.StorageFile.GetFileFromPathAsync(absolutePath);
            var doc = await Windows.Data.Pdf.PdfDocument.LoadFromFileAsync(file);
            if (doc.PageCount == 0) return null;

            using var page = doc.GetPage(0);
            using var rendered = new Windows.Storage.Streams.InMemoryRandomAccessStream();
            var options = new Windows.Data.Pdf.PdfPageRenderOptions
            {
                DestinationWidth = (uint)width,
                BackgroundColor = Windows.UI.Color.FromArgb(255, 255, 255, 255),
            };
            await page.RenderToStreamAsync(rendered, options);
            rendered.Seek(0);

            var decoder = await Windows.Graphics.Imaging.BitmapDecoder.CreateAsync(rendered);
            var props = new Windows.Graphics.Imaging.BitmapPropertySet
            {
                ["ImageQuality"] = new Windows.Graphics.Imaging.BitmapTypedValue(
                    JpegQuality / 100f, Windows.Foundation.PropertyType.Single),
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
            using var stream = output.AsStreamForRead();
            using var ms = new MemoryStream();
            await stream.CopyToAsync(ms);
            return ms.ToArray();
        }
#endif

#if ANDROID
        private static byte[]? RenderAndroid(string absolutePath, int width)
        {
            using var file = new Java.IO.File(absolutePath);
            if (!file.Exists()) return null;

            using var pfd = Android.OS.ParcelFileDescriptor.Open(
                file, Android.OS.ParcelFileMode.ReadOnly);
            if (pfd == null) return null;
            using var renderer = new Android.Graphics.Pdf.PdfRenderer(pfd);
            if (renderer.PageCount == 0) return null;

            using var page = renderer.OpenPage(0);
            if (page.Width <= 0 || page.Height <= 0) return null;

            var height = Math.Max(1, (int)Math.Round(width * (double)page.Height / page.Width));
            using var bitmap = Android.Graphics.Bitmap.CreateBitmap(
                width, height, Android.Graphics.Bitmap.Config.Argb8888!);
            bitmap.EraseColor(Android.Graphics.Color.White);
            page.Render(bitmap, null, null, Android.Graphics.Pdf.PdfRenderMode.ForDisplay);

            using var ms = new MemoryStream();
            return bitmap.Compress(Android.Graphics.Bitmap.CompressFormat.Jpeg!, JpegQuality, ms)
                ? ms.ToArray()
                : null;
        }
#endif
    }
}
