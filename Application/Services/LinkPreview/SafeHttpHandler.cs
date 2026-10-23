using System;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Net.Sockets;
using System.Threading;
using System.Threading.Tasks;
using Jamrah.Files.Core;

namespace Jamrah.Application.Services.LinkPreview
{
    /// <summary>
    /// HttpClient handler that validates every DNS answer at connect time, including
    /// redirects, so link previews cannot reach loopback, private or metadata endpoints.
    /// </summary>
    public static class SafeHttpHandler
    {
        public static SocketsHttpHandler Create() => new()
        {
            UseCookies = false,
            ConnectCallback = async (context, ct) =>
            {
                var host = context.DnsEndPoint.Host;
                if (NetworkGuard.IsBlockedHostName(host))
                    throw new HttpRequestException("Blocked host: " + host);

                IPAddress[] addresses;
                if (IPAddress.TryParse(host, out var literal))
                {
                    addresses = new[] { literal };
                }
                else
                {
                    addresses = await Dns.GetHostAddressesAsync(host, ct).ConfigureAwait(false);
                }

                var allowed = addresses.Where(a => !NetworkGuard.IsBlockedAddress(a)).ToArray();
                if (allowed.Length == 0)
                    throw new HttpRequestException("Blocked non-public address: " + host);

                var socket = new Socket(SocketType.Stream, ProtocolType.Tcp) { NoDelay = true };
                try
                {
                    await socket.ConnectAsync(allowed, context.DnsEndPoint.Port, ct).ConfigureAwait(false);
                    return new NetworkStream(socket, ownsSocket: true);
                }
                catch
                {
                    socket.Dispose();
                    throw;
                }
            },
        };
    }
}
