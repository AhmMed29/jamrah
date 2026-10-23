using Android.Content;
using Jamrah.Application.Services;
using Jamrah.Application.Services.Updates;
using Jamrah.Updates;

namespace Jamrah.Platforms.Android;

public sealed class AndroidUpdateService : UpdateServiceBase
{
    private const string RepositoryUrl = "https://github.com/AhmMed29/jamrah";
    private const string ManifestUrl = RepositoryUrl + "/releases/latest/download/version.json";

    private readonly LocalizationService _lang;
    private UpdateManifest? _pendingManifest;
    private string? _downloadedApkPath;

    public AndroidUpdateService(LocalizationService lang) : base(lang)
    {
        _lang = lang;
    }

    public override bool IsSupported => true;
    protected override bool InstallerLaunchesExternally => true;

    protected override async Task<UpdateCandidate?> CheckCoreAsync(CancellationToken cancellationToken)
    {
        if (Connectivity.Current.NetworkAccess == NetworkAccess.None)
            throw new InvalidOperationException("No network connection.");

        using var http = CreateClient(TimeSpan.FromSeconds(30));
        var manifestUri = new Uri(ManifestUrl);
        var cacheBustedUri = new Uri(ManifestUrl + "?t=" + DateTimeOffset.UtcNow.ToUnixTimeSeconds());
        var json = await http.GetStringAsync(cacheBustedUri, cancellationToken);
        var manifest = UpdateManifestParser.Parse(json, manifestUri);

        var currentCode = ReadCurrentVersionCode();
        if (!UpdateVersion.IsNewer(currentCode, manifest.VersionCode))
        {
            _pendingManifest = null;
            return null;
        }

        _pendingManifest = manifest;
        return new UpdateCandidate(manifest.Version, manifest.Notes, manifest.SizeBytes);
    }

    protected override async Task DownloadCoreAsync(
        UpdateCandidate candidate,
        IProgress<double> progress,
        CancellationToken cancellationToken)
    {
        var manifest = _pendingManifest
            ?? throw new InvalidOperationException("No update manifest is available.");

        var folder = Path.Combine(FileSystem.CacheDirectory, "updates");
        Directory.CreateDirectory(folder);

        var safeVersion = string.Concat(manifest.Version.Where(c =>
            char.IsLetterOrDigit(c) || c is '.' or '-' or '_'));
        var finalPath = Path.Combine(folder, $"Jamrah-{safeVersion}.apk");
        var tempPath = finalPath + ".part";

        try
        {
            using var http = CreateClient(TimeSpan.FromMinutes(30));
            using var response = await http.GetAsync(
                manifest.ApkUrl,
                HttpCompletionOption.ResponseHeadersRead,
                cancellationToken);
            response.EnsureSuccessStatusCode();

            var total = response.Content.Headers.ContentLength ?? manifest.SizeBytes;
            await using (var input = await response.Content.ReadAsStreamAsync(cancellationToken))
            await using (var output = new FileStream(
                tempPath,
                FileMode.Create,
                FileAccess.Write,
                FileShare.None,
                81920,
                useAsync: true))
            {
                var buffer = new byte[81920];
                long received = 0;
                int read;
                while ((read = await input.ReadAsync(buffer, cancellationToken)) > 0)
                {
                    await output.WriteAsync(buffer.AsMemory(0, read), cancellationToken);
                    received += read;
                    if (total > 0)
                        progress.Report((double)received / total);
                }
            }

            if (!await UpdateVerifier.VerifyFileSha256Async(
                    tempPath,
                    manifest.Sha256,
                    cancellationToken))
                throw new InvalidDataException("Downloaded APK failed SHA-256 verification.");

            var actualSize = new FileInfo(tempPath).Length;
            if (actualSize != manifest.SizeBytes)
                throw new InvalidDataException("Downloaded APK size does not match the manifest.");

            File.Move(tempPath, finalPath, overwrite: true);
            _downloadedApkPath = finalPath;
            progress.Report(1);
        }
        catch
        {
            TryDelete(tempPath);
            throw;
        }
    }

    protected override Task InstallCoreAsync()
    {
        if (string.IsNullOrWhiteSpace(_downloadedApkPath) || !File.Exists(_downloadedApkPath))
            throw new FileNotFoundException("The update APK has not been downloaded.");

        var context = global::Android.App.Application.Context;
        var packageManager = context.PackageManager
            ?? throw new InvalidOperationException("Package manager is unavailable.");

        if (OperatingSystem.IsAndroidVersionAtLeast(26)
            && !packageManager.CanRequestPackageInstalls())
        {
            var settings = new Intent(
                global::Android.Provider.Settings.ActionManageUnknownAppSources,
                global::Android.Net.Uri.Parse("package:" + context.PackageName));
            settings.AddFlags(ActivityFlags.NewTask);
            context.StartActivity(settings);
            throw new UpdatePermissionRequiredException(_lang["upd.allowInstall"]);
        }

        var file = new Java.IO.File(_downloadedApkPath);
        var authority = context.PackageName + ".fileprovider";
        var uri = AndroidX.Core.Content.FileProvider.GetUriForFile(context, authority, file)
            ?? throw new InvalidOperationException("Could not create a content URI for the APK.");

        var intent = new Intent(Intent.ActionView);
        intent.SetDataAndType(uri, "application/vnd.android.package-archive");
        intent.AddFlags(ActivityFlags.GrantReadUriPermission | ActivityFlags.NewTask);
        intent.ClipData = ClipData.NewRawUri("apk", uri);
        context.StartActivity(intent);

        return Task.CompletedTask;
    }

    private static int ReadCurrentVersionCode()
        => int.TryParse(AppInfo.Current.BuildString, out var code) ? code : 0;

    private static HttpClient CreateClient(TimeSpan timeout)
    {
        var http = new HttpClient { Timeout = timeout };
        http.DefaultRequestHeaders.UserAgent.ParseAdd("Jamrah-Updater/1.0");
        http.DefaultRequestHeaders.CacheControl =
            new System.Net.Http.Headers.CacheControlHeaderValue { NoCache = true };
        return http;
    }

    private static void TryDelete(string path)
    {
        try { if (File.Exists(path)) File.Delete(path); } catch { }
    }
}
