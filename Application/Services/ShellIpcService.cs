using System.Collections.Concurrent;
using System.Text;
using System.Text.Json;
#if WINDOWS
using System.IO.Pipes;
#endif

namespace Jamrah.Application.Services;

public sealed class ShellIpcService : IDisposable
{
    public const string PipeName = "JamrahShellImport";

    private readonly ConcurrentQueue<string> _pending = new();
#if WINDOWS
    private CancellationTokenSource? _cts;
#endif

    public event Action<IReadOnlyList<string>>? PathsReceived;

    public void Start()
    {
#if WINDOWS
        if (_cts != null) return;
        _cts = new CancellationTokenSource();
        _ = Task.Run(() => ListenAsync(_cts.Token));
#endif
    }

    public void Enqueue(IEnumerable<string> paths)
    {
        var accepted = paths
            .Where(p => !string.IsNullOrWhiteSpace(p) && (File.Exists(p) || Directory.Exists(p)))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();
        if (accepted.Count == 0) return;

        foreach (var path in accepted) _pending.Enqueue(path);
        try { PathsReceived?.Invoke(accepted); } catch { }
    }

    public IReadOnlyList<string> DrainPending()
    {
        var paths = new List<string>();
        while (_pending.TryDequeue(out var path)) paths.Add(path);
        return paths;
    }

#if WINDOWS
    private async Task ListenAsync(CancellationToken ct)
    {
        while (!ct.IsCancellationRequested)
        {
            try
            {
                await using var server = new NamedPipeServerStream(
                    PipeName, PipeDirection.In, 1, PipeTransmissionMode.Byte, PipeOptions.Asynchronous);
                await server.WaitForConnectionAsync(ct);

                using var reader = new StreamReader(server, Encoding.UTF8);
                var json = await reader.ReadToEndAsync(ct);
                if (string.IsNullOrWhiteSpace(json)) continue;

                var paths = JsonSerializer.Deserialize<List<string>>(json);
                if (paths != null) Enqueue(paths);
            }
            catch (OperationCanceledException) { return; }
            catch
            {
                try { await Task.Delay(500, ct); } catch (OperationCanceledException) { return; }
            }
        }
    }
#endif

    public void Dispose()
    {
#if WINDOWS
        try { _cts?.Cancel(); } catch { }
        _cts?.Dispose();
        _cts = null;
#endif
    }
}
