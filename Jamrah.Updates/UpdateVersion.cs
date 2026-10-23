namespace Jamrah.Updates;

public static class UpdateVersion
{
    public static bool IsNewer(int currentVersionCode, int availableVersionCode)
        => availableVersionCode > currentVersionCode;
}
