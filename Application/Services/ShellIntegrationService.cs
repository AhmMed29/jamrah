using System.Text.Json;
#if WINDOWS
using System.Runtime.InteropServices;
using Microsoft.Win32;
#endif

namespace Jamrah.Application.Services;

/// <summary>
/// Installs the always-on Explorer verb for files and folders.
/// The verb launches ShellAgent so adding an item works even when Jamrah is closed.
/// </summary>
public sealed class ShellIntegrationService
{
    private const string FileVerbKey = @"Software\Classes\*\shell\JamrahAddToInbox";
    private const string FolderVerbKey = @"Software\Classes\Directory\shell\JamrahAddToInbox";
    private const string ConfigFileName = "shell-agent-config.json";

    public bool IsSupported => OperatingSystem.IsWindows();

    public string AgentExePath => Path.Combine(AppContext.BaseDirectory, "ShellAgent.exe");

    public string AppExePath =>
        Environment.ProcessPath ?? Path.Combine(AppContext.BaseDirectory, "Jamrah.exe");

    public string ConfigPath => Path.Combine(AppContext.BaseDirectory, ConfigFileName);

    public bool IsEnabled
    {
        get
        {
#if WINDOWS
            return IsVerbInstalled(FileVerbKey) && IsVerbInstalled(FolderVerbKey);
#else
            return false;
#endif
        }
    }

    /// <summary>
    /// Creates/refreshes both Explorer verbs. Called on every Windows startup so the
    /// command follows the app if the installation folder changes.
    /// </summary>
    public (bool Ok, string? Error) EnsureInstalled()
    {
        if (!IsSupported) return (false, "Windows only");
#if WINDOWS
        try
        {
            EnsureConfig();

            var commandExe = File.Exists(AgentExePath) ? AgentExePath : AppExePath;
            if (string.IsNullOrWhiteSpace(commandExe) || !File.Exists(commandExe))
                return (false, "Shell agent not found");

            var iconExe = File.Exists(AppExePath) ? AppExePath : commandExe;
            var changed = WriteVerb(FileVerbKey, commandExe, iconExe);
            changed |= WriteVerb(FolderVerbKey, commandExe, iconExe);

            if (changed) NotifyShell();
            return (true, null);
        }
        catch (Exception ex)
        {
            return (false, ex.Message);
        }
#else
        return (false, "Windows only");
#endif
    }

    public void ApplyStartupState()
    {
        if (!IsSupported) return;
        try { EnsureConfig(); } catch { }
        try { EnsureInstalled(); } catch { }
    }

    public void EnsureConfig()
    {
        var payload = new
        {
            DbPath = Infrastructure.AppPaths.Layout.DbPath,
            LibraryDir = Infrastructure.AppPaths.Layout.LibraryDir,
            AppExePath,
            LogPath = Path.Combine(AppContext.BaseDirectory, "shell-agent.log"),
        };
        Directory.CreateDirectory(Infrastructure.AppPaths.Layout.LibraryDir);
        File.WriteAllText(ConfigPath, JsonSerializer.Serialize(payload, new JsonSerializerOptions
        {
            WriteIndented = true,
        }));
    }

#if WINDOWS
    private static bool IsVerbInstalled(string keyPath)
    {
        try
        {
            using var key = Registry.CurrentUser.OpenSubKey(keyPath + @"\command");
            return key?.GetValue(null) is string value && value.Length > 0;
        }
        catch { return false; }
    }

    private static bool WriteVerb(string keyPath, string commandExe, string iconExe)
    {
        var command = "\"" + commandExe + "\" --add-to-jamrah \"%1\"";
        var icon = "\"" + iconExe + "\",0";

        using var verb = Registry.CurrentUser.CreateSubKey(keyPath)
            ?? throw new InvalidOperationException("Could not create the Explorer menu key");
        using var commandKey = verb.CreateSubKey("command")
            ?? throw new InvalidOperationException("Could not create the Explorer command key");

        var previousLabel = verb.GetValue(null) as string;
        var previousIcon = verb.GetValue("Icon") as string;
        var previousCommand = commandKey.GetValue(null) as string;

        verb.SetValue(null, "Add to Jamrah");
        verb.SetValue("Icon", icon);
        verb.SetValue("MultiSelectModel", "Player");
        commandKey.SetValue(null, command);

        return previousLabel != "Add to Jamrah"
            || previousIcon != icon
            || previousCommand != command;
    }

    private const uint ShcneAssocChanged = 0x08000000;
    private const uint ShcnfIdList = 0;

    [DllImport("shell32.dll")]
    private static extern void SHChangeNotify(uint eventId, uint flags, IntPtr item1, IntPtr item2);

    private static void NotifyShell()
    {
        try { SHChangeNotify(ShcneAssocChanged, ShcnfIdList, IntPtr.Zero, IntPtr.Zero); }
        catch { }
    }
#endif
}
