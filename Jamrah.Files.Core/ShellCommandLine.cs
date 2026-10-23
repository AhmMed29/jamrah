namespace Jamrah.Files.Core;

public static class ShellCommandLine
{
    public const string AddToJamrahFlag = "--add-to-jamrah";

    public static IReadOnlyList<string> ParseAddToJamrah(IReadOnlyList<string>? args)
    {
        if (args == null || args.Count == 0) return Array.Empty<string>();

        var start = -1;
        for (var i = 0; i < args.Count; i++)
        {
            if (string.Equals(args[i], AddToJamrahFlag, StringComparison.OrdinalIgnoreCase))
            {
                start = i + 1;
                break;
            }
        }

        if (start < 0) return Array.Empty<string>();

        return args.Skip(start)
            .Where(a => !string.IsNullOrWhiteSpace(a))
            .ToArray();
    }
}
