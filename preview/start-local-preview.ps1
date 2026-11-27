param(
  [int]$Port = 8765,
  [ValidateSet('cards', 'objective')]
  [string]$Page = 'cards'
)

$ErrorActionPreference = 'Stop'
$repoRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))

$serverSource = @'
using System;
using System.IO;
using System.Net;
using System.Net.Sockets;
using System.Text;
using System.Threading;

public sealed class BoardGamePreviewServer
{
    private readonly string root;
    private readonly TcpListener listener;
    private volatile bool running;

    public BoardGamePreviewServer(string directory, int port)
    {
        root = Path.GetFullPath(directory).TrimEnd(Path.DirectorySeparatorChar) + Path.DirectorySeparatorChar;
        listener = new TcpListener(IPAddress.Loopback, port);
    }

    public void Start()
    {
        listener.Start();
        running = true;
        ThreadPool.QueueUserWorkItem(_ => AcceptRequests());
    }

    private void AcceptRequests()
    {
        while (running)
        {
            try
            {
                var client = listener.AcceptTcpClient();
                ThreadPool.QueueUserWorkItem(_ => Respond(client));
            }
            catch { if (running) Thread.Sleep(100); }
        }
    }

    private void Respond(TcpClient client)
    {
        using (client)
        {
            try
            {
                client.ReceiveTimeout = 5000;
                var stream = client.GetStream();
                var request = new StringBuilder();
                var one = new byte[1];
                while (request.Length < 16384)
                {
                    int count = stream.Read(one, 0, 1);
                    if (count == 0) return;
                    request.Append((char)one[0]);
                    if (request.ToString().EndsWith("\r\n\r\n", StringComparison.Ordinal)) break;
                }

                var firstLine = request.ToString().Split(new[] { "\r\n" }, StringSplitOptions.None)[0].Split(' ');
                if (firstLine.Length < 2) { Send(stream, 400, "Bad Request", "Bad request"); return; }
                var method = firstLine[0];
                if (method != "GET" && method != "HEAD") { Send(stream, 405, "Method Not Allowed", "Only GET and HEAD are supported"); return; }

                var url = new Uri("http://localhost" + firstLine[1]);
                var relative = Uri.UnescapeDataString(url.AbsolutePath.TrimStart('/')).Replace('/', Path.DirectorySeparatorChar);
                if (relative.Length == 0) relative = "index.html";
                var file = Path.GetFullPath(Path.Combine(root, relative));
                if (!file.StartsWith(root, StringComparison.OrdinalIgnoreCase)) { Send(stream, 403, "Forbidden", "Forbidden"); return; }
                if (!File.Exists(file)) { Send(stream, 404, "Not Found", "File not found: " + url.AbsolutePath); return; }

                var bytes = File.ReadAllBytes(file);
                var header = "HTTP/1.1 200 OK\r\nContent-Type: " + ContentType(file) + "\r\nContent-Length: " + bytes.Length + "\r\nConnection: close\r\nCache-Control: no-store\r\nAccess-Control-Allow-Origin: *\r\n\r\n";
                var head = Encoding.ASCII.GetBytes(header);
                stream.Write(head, 0, head.Length);
                if (method == "GET") stream.Write(bytes, 0, bytes.Length);
            }
            catch { }
        }
    }

    private static string ContentType(string file)
    {
        switch (Path.GetExtension(file).ToLowerInvariant())
        {
            case ".html": return "text/html; charset=utf-8";
            case ".js": return "text/javascript; charset=utf-8";
            case ".css": return "text/css; charset=utf-8";
            case ".json": return "application/json; charset=utf-8";
            case ".png": return "image/png";
            case ".jpg": case ".jpeg": return "image/jpeg";
            case ".webp": return "image/webp";
            case ".svg": return "image/svg+xml";
            case ".woff": return "font/woff";
            case ".woff2": return "font/woff2";
            default: return "application/octet-stream";
        }
    }

    private static void Send(NetworkStream stream, int status, string label, string message)
    {
        var body = Encoding.UTF8.GetBytes(message);
        var header = Encoding.ASCII.GetBytes("HTTP/1.1 " + status + " " + label + "\r\nContent-Type: text/plain; charset=utf-8\r\nContent-Length: " + body.Length + "\r\nConnection: close\r\n\r\n");
        stream.Write(header, 0, header.Length);
        stream.Write(body, 0, body.Length);
    }

    public void Stop()
    {
        running = false;
        listener.Stop();
    }
}
'@

if (-not ('BoardGamePreviewServer' -as [type])) {
  Add-Type -TypeDefinition $serverSource
}

$server = [BoardGamePreviewServer]::new($repoRoot, $Port)
try {
  $server.Start()
} catch {
  throw "Impossible de démarrer l'aperçu sur le port $Port. Essaie avec -Port 8766. Détail : $($_.Exception.Message)"
}

$url = "http://127.0.0.1:$Port/preview/$Page.html"
Write-Host "Aperçu local : $url" -ForegroundColor Green
Write-Host "Le serveur ne lit que le dossier du jeu : $repoRoot" -ForegroundColor DarkGray
Write-Host 'Laisse cette fenêtre ouverte pendant l’export. Ctrl+C arrête le serveur.' -ForegroundColor DarkGray
Start-Process $url

try {
  while ($true) { Start-Sleep -Seconds 1 }
} finally {
  $server.Stop()
}
