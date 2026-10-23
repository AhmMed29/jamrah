namespace Jamrah.Core.Interfaces;

public enum UpdateStage
{
    Idle,
    Checking,
    UpToDate,
    Available,
    Downloading,
    ReadyToInstall,
    Installing,
    InstallerOpened,
    Unsupported,
    Error
}

public sealed record UpdateState(
    UpdateStage Stage = UpdateStage.Idle,
    string? Version = null,
    string? Notes = null,
    long? DownloadSizeBytes = null,
    double Progress = 0,
    string? Error = null,
    bool PromptVisible = false,
    DateTimeOffset? LastChecked = null)
{
    public bool HasUpdate => Stage is UpdateStage.Available
        or UpdateStage.Downloading
        or UpdateStage.ReadyToInstall
        or UpdateStage.Installing
        or UpdateStage.InstallerOpened;

    public bool IsBusy => Stage is UpdateStage.Checking
        or UpdateStage.Downloading
        or UpdateStage.Installing;
}

public interface IUpdateService
{
    string CurrentVersion { get; }
    bool IsSupported { get; }
    UpdateState State { get; }
    event Action? Changed;

    Task CheckAsync(CancellationToken cancellationToken = default);
    Task DownloadAsync(CancellationToken cancellationToken = default);
    Task InstallAsync();
    void DismissPrompt();
}
