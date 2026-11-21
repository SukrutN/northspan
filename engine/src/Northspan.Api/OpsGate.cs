using System.Security.Cryptography;
using System.Text;
using System.Text.Json;

namespace Northspan.Api;

/// <summary>The shell's knobs: a token (nullable), and the largest body accepted.</summary>
internal sealed record OpsOptions(string? Token, long MaxBodyBytes);

/// <summary>
/// The gate every request passes before any route runs: a body cap that
/// refuses before reading, and an optional bearer token. The public routes
/// stay open on purpose: /health and /ready for the platform's probes,
/// /metrics for the scraper, and / for the workbench page itself. Kestrel's
/// own body limit enforces the same cap for requests that lie about their
/// length; this middleware answers first, with words.
/// </summary>
internal sealed class OpsGate(RequestDelegate next, OpsOptions options)
{
    private static readonly HashSet<string> OpenRoutes = new(StringComparer.Ordinal)
    {
        "/health",
        "/ready",
        "/metrics",
        "/",
    };

    public async Task InvokeAsync(HttpContext context)
    {
        if (!OpenRoutes.Contains(context.Request.Path.Value ?? string.Empty))
        {
            long? length = context.Request.Headers.ContentLength;
            if (length > options.MaxBodyBytes)
            {
                await Refuse(context, 413, "urn:northspan:body-too-large", "The request body is too large",
                    $"This engine accepts bodies up to {options.MaxBodyBytes} bytes.");
                return;
            }

            if (options.Token is not null)
            {
                string header = context.Request.Headers.Authorization.ToString();
                byte[] expected = Encoding.UTF8.GetBytes("Bearer " + options.Token);
                byte[] received = Encoding.UTF8.GetBytes(header);
                if (header.Length == 0
                    || expected.Length != received.Length
                    || !CryptographicOperations.FixedTimeEquals(expected, received))
                {
                    await Refuse(context, 401, "urn:northspan:token-required", "A token is required",
                        "Send the engine's token as a Bearer authorization header.");
                    return;
                }
            }
        }

        await next(context);
    }

    private static async Task Refuse(HttpContext context, int status, string type, string title, string detail)
    {
        context.Response.StatusCode = status;
        // WriteAsJsonAsync would reset the content type to application/json,
        // so the problem is serialized by hand and the type stays honest.
        context.Response.ContentType = "application/problem+json";
        await context.Response.WriteAsync(JsonSerializer.Serialize(new { type, title, status, detail }));
    }
}
