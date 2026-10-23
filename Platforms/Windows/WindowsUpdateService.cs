using Jamrah.Application.Services;
using Jamrah.Application.Services.Updates;
using Velopack;
using Velopack.Sources;

namespace Jamrah.Platforms.Windows;

public sealed class WindowsUpdateService : UpdateServiceBase
{
    private const string RepositoryUrl = "https://github.com/AhmMed29/jamrah";

    private readonly UpdateManager _manager;
    private UpdateInfo? _pending;

    public WindowsUpdateService(LocalizationService lang) : base(lang)
    {
        _manager = new UpdateManager(new GithubSource(RepositoryUrl, null, false));
    }

    public override bool IsSupported
    {
        get
        {
            try { return _manager.IsInstalled; }
            catch { return false; }
        }
    }

    public override string CurrentVersion
    {
        get
        {
            try
            {
                var version = _manager.CurrentVersion?.ToString();
                return string.IsNullOrWhiteSpace(version) ? base.CurrentVersion : version;
            }
            catch { return base.CurrentVersion; }
        }
    }

    protected override async Task<UpdateCandidate?> CheckCoreAsync(CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();

        var prepared = _manager.UpdatePendingRestart;
        if (prepared is not null)
        {
            _pending = null;
            return new UpdateCandidate(
                prepared.Version.ToString(),
                prepared.NotesMarkdown,
                prepared.Size);
        }

        var update = await _manager.CheckForUpdatesAsync();
        cancellationToken.ThrowIfCancellationRequested();
        _pending = update;
        if (update is null) return null;

        var target = update.TargetFullRelease;
        var deltas = update.DeltasToTarget;
        var downloadSize = deltas.Length > 0
            ? deltas.Sum(d => d.Size)
            : target.Size;

        return new UpdateCandidate(
            target.Version.ToString(),
            target.NotesMarkdown,
            downloadSize);
    }

    protected override async Task DownloadCoreAsync(
        UpdateCandidate candidate,
        IProgress<double> progress,
        CancellationToken cancellationToken)
    {
        if (_manager.UpdatePendingRestart is not null)
        {
            progress.Report(1);
            return;
        }

        if (_pending is null)
            throw new InvalidOperationException("No pending Velopack update was found.");

        await _manager.DownloadUpdatesAsync(
            _pending,
            percent => progress.Report(percent / 100d),
            cancellationToken);
    }

    protected override Task InstallCoreAsync()
    {
        var target = _manager.UpdatePendingRestart ?? _pending?.TargetFullRelease;
        if (target is null)
            throw new InvalidOperationException("The update has not been downloaded yet.");

        _manager.ApplyUpdatesAndRestart(target);
        return Task.CompletedTask;
    }
}
