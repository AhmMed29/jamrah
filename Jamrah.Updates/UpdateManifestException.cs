namespace Jamrah.Updates;

public sealed class UpdateManifestException : Exception
{
    public UpdateManifestException(string message) : base(message)
    {
    }

    public UpdateManifestException(string message, Exception inner) : base(message, inner)
    {
    }
}
