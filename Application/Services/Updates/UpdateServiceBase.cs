using Jamrah.Core.Interfaces;

namespace Jamrah.Application.Services.Updates;

public sealed record UpdateCandidate(string Version, string? Notes, long DownloadSizeBytes);

public sealed class UpdatePermissionRequiredException : Exception
{
    public UpdatePermissionRequiredException(string message) : base(message)
    {
    }
}

public abstract class UpdateServiceBase : IUpdateService
{
    private readonly LocalizationService _lang;
    private readonly object _gate = new();
    private UpdateState _state = new();
    private UpdateCandidate? _candidate;

    protected UpdateServiceBase(LocalizationService lang)
    {
        _lang = lang;
    }

    public abstract bool IsSupported { get; }
    public virtual string CurrentVersion => AppInfo.Current.VersionString;
    public UpdateState State
    {
        get
        {
            lock (_gate) return _state;
        }
    }

    public event Action? Changed;

    public async Task CheckAsync(CancellationToken cancellationToken = default)
    {
        if (!IsSupported)
        {
            SetState(s => s with
            {
                Stage = UpdateStage.Unsupported,
                Error = null,
                PromptVisible = false
            });
            return;
        }

        if (State.IsBusy) return;

        _candidate = null;
        SetState(s => s with
        {
            Stage = UpdateStage.Checking,
            Version = null,
            Notes = null,
            DownloadSizeBytes = null,
            Progress = 0,
            Error = null,
            PromptVisible = false
        });

        try
        {
            var candidate = await CheckCoreAsync(cancellationToken);
            var checkedAt = DateTimeOffset.Now;
            if (candidate is null)
            {
                SetState(s => s with
                {
                    Stage = UpdateStage.UpToDate,
                    LastChecked = checkedAt
                });
                return;
            }

            _candidate = candidate;
            SetState(_ => new UpdateState(
                UpdateStage.Available,
                candidate.Version,
                candidate.Notes,
                candidate.DownloadSizeBytes,
                0,
                null,
                true,
                checkedAt));
        }
        catch (OperationCanceledException)
        {
            SetState(s => s with { Stage = UpdateStage.Idle });
        }
        catch (Exception ex)
        {
            Log(nameof(CheckAsync), ex);
            SetState(s => s with
            {
                Stage = UpdateStage.Error,
                Error = _lang["upd.error"],
                PromptVisible = false,
                LastChecked = DateTimeOffset.Now
            });
        }
    }

    public async Task DownloadAsync(CancellationToken cancellationToken = default)
    {
        var candidate = _candidate;
        if (candidate is null || State.Stage != UpdateStage.Available) return;

        SetState(s => s with
        {
            Stage = UpdateStage.Downloading,
            Progress = 0,
            Error = null,
            PromptVisible = true
        });

        try
        {
            await DownloadCoreAsync(candidate, new Progress<double>(ReportProgress), cancellationToken);
            SetState(s => s with
            {
                Stage = UpdateStage.ReadyToInstall,
                Progress = 1,
                Error = null,
                PromptVisible = true
            });
        }
        catch (OperationCanceledException)
        {
            SetState(s => s with
            {
                Stage = UpdateStage.Available,
                Progress = 0,
                Error = null
            });
        }
        catch (UpdatePermissionRequiredException ex)
        {
            SetState(s => s with
            {
                Stage = UpdateStage.ReadyToInstall,
                Error = ex.Message,
                PromptVisible = true
            });
        }
        catch (Exception ex)
        {
            Log(nameof(DownloadAsync), ex);
            SetState(s => s with
            {
                Stage = UpdateStage.Available,
                Progress = 0,
                Error = _lang["upd.downloadError"],
                PromptVisible = true
            });
        }
    }

    public async Task InstallAsync()
    {
        if (State.Stage is not (UpdateStage.ReadyToInstall or UpdateStage.InstallerOpened)) return;

        SetState(s => s with
        {
            Stage = UpdateStage.Installing,
            Error = null,
            PromptVisible = true
        });

        try
        {
            await InstallCoreAsync();
            if (InstallerLaunchesExternally)
            {
                SetState(s => s with
                {
                    Stage = UpdateStage.InstallerOpened,
                    Error = null,
                    PromptVisible = false
                });
            }
            else
            {
                SetState(s => s with
                {
                    Stage = UpdateStage.ReadyToInstall,
                    Error = null,
                    PromptVisible = true
                });
            }
        }
        catch (UpdatePermissionRequiredException ex)
        {
            SetState(s => s with
            {
                Stage = UpdateStage.ReadyToInstall,
                Error = ex.Message,
                PromptVisible = true
            });
        }
        catch (Exception ex)
        {
            Log(nameof(InstallAsync), ex);
            SetState(s => s with
            {
                Stage = UpdateStage.ReadyToInstall,
                Error = _lang["upd.installError"],
                PromptVisible = true
            });
        }
    }

    public void DismissPrompt()
    {
        SetState(s => s with { PromptVisible = false });
    }

    protected abstract Task<UpdateCandidate?> CheckCoreAsync(CancellationToken cancellationToken);
    protected abstract Task DownloadCoreAsync(
        UpdateCandidate candidate,
        IProgress<double> progress,
        CancellationToken cancellationToken);
    protected abstract Task InstallCoreAsync();
    protected virtual bool InstallerLaunchesExternally => false;

    protected void SetState(Func<UpdateState, UpdateState> update)
    {
        Action? changed;
        lock (_gate)
        {
            var next = update(_state);
            if (next == _state) return;
            _state = next;
            changed = Changed;
        }

        try { changed?.Invoke(); } catch { }
    }

    private void ReportProgress(double progress)
    {
        var value = Math.Clamp(progress, 0, 1);
        SetState(s => s.Stage == UpdateStage.Downloading
            ? s with { Progress = value }
            : s);
    }

    private static void Log(string operation, Exception ex)
        => System.Diagnostics.Debug.WriteLine($"[UPDATE] {operation} failed: {ex.GetType().Name}: {ex.Message}");
}
