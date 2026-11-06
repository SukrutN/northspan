using System.Diagnostics;
using System.Threading.RateLimiting;

using Northspan.Api;
using Northspan.Application;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddOpenApi();
builder.Services.AddProblemDetails();
builder.Services.AddExceptionHandler<PlanningExceptionHandler>();

var fixturesRoot = builder.Configuration["Fixtures:Root"];
if (string.IsNullOrWhiteSpace(fixturesRoot))
{
    fixturesRoot = Environment.GetEnvironmentVariable("NORTHSPAN_FIXTURES");
}

if (string.IsNullOrWhiteSpace(fixturesRoot))
{
    fixturesRoot = FixtureLibrary.Discover();
}

builder.Services.AddSingleton(new FixtureLibrary(fixturesRoot));
builder.Services.AddSingleton<PlanWalk>();

// ---- the operations shell: metrics, the gate, the limiter, the body cap ----

// The shell's knobs: a token (blank means the gate stays open), requests per
// client each minute, and the largest body accepted. Kestrel enforces the
// same cap at the socket, so a request that lies about its length still
// cannot push more than the cap through.
static string? NonBlank(string? value) =>
    string.IsNullOrWhiteSpace(value) ? null : value.Trim();

var token = NonBlank(builder.Configuration["Auth:Token"]
    ?? Environment.GetEnvironmentVariable("NORTHSPAN_TOKEN"));
var ratePerMinute = builder.Configuration["Ops:RateLimit"]
    ?? Environment.GetEnvironmentVariable("NORTHSPAN_RATE_LIMIT");
var maxBody = builder.Configuration["Ops:MaxBody"]
    ?? Environment.GetEnvironmentVariable("NORTHSPAN_MAX_BODY");
var gate = new OpsOptions(
    token,
    long.TryParse(maxBody, out var body) && body > 0 ? body : 1024 * 1024);
var requestLimit = int.TryParse(ratePerMinute, out var limit) && limit > 0 ? limit : 600;

builder.WebHost.ConfigureKestrel(kestrel =>
    kestrel.Limits.MaxRequestBodySize = gate.MaxBodyBytes);
builder.Services.AddSingleton(gate);

var metrics = new OpsMetrics();
builder.Services.AddSingleton(metrics);

builder.Services.AddRateLimiter(limiterOptions =>
{
    limiterOptions.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    limiterOptions.OnRejected = async (context, _) =>
    {
        if (context.Lease.TryGetMetadata(MetadataName.RetryAfter, out var retry))
        {
            context.HttpContext.Response.Headers.RetryAfter = ((int)retry.TotalSeconds).ToString();
        }
        // Written by hand for the same reason as the gate: WriteAsJsonAsync
        // would reset the content type to application/json.
        context.HttpContext.Response.StatusCode = StatusCodes.Status429TooManyRequests;
        context.HttpContext.Response.ContentType = "application/problem+json";
        await context.HttpContext.Response.WriteAsync(System.Text.Json.JsonSerializer.Serialize(new
        {
            type = "urn:northspan:rate-limited",
            title = "Too many requests",
            status = StatusCodes.Status429TooManyRequests,
            detail = "This engine is limiting this client's requests. Wait for the retry window and try again.",
        }));
    };
    limiterOptions.AddPolicy("per-client", http => RateLimitPartition.GetFixedWindowLimiter(
        http.Connection.RemoteIpAddress?.ToString() ?? "unknown",
        _ => new FixedWindowRateLimiterOptions
        {
            PermitLimit = requestLimit,
            Window = TimeSpan.FromMinutes(1),
        }));
});

var app = builder.Build();

// The observation every request passes on its way out: the metrics page
// carries the route pattern, never the raw path, so fixture names cannot
// grow the label set.
app.Use(async (context, next) =>
{
    var started = Stopwatch.GetTimestamp();
    try
    {
        await next(context);
    }
    finally
    {
        string route = (context.GetEndpoint() as RouteEndpoint)?.RoutePattern.RawText ?? "unmatched";
        double elapsedMs = (Stopwatch.GetTimestamp() - started) * 1000.0 / Stopwatch.Frequency;
        metrics.Observed(context.Request.Method, route, context.Response.StatusCode, elapsedMs);
    }
});

app.UseExceptionHandler();
app.UseMiddleware<OpsGate>();
app.UseRateLimiter();
app.MapOpenApi();
app.MapGet("/health", () => Results.Ok(new { status = "healthy" }))
    .WithName("Health")
    .WithTags("Health");
app.MapGet("/ready", (FixtureLibrary fixtures) =>
    {
        var floors = fixtures.FloorIds();
        return floors.Count == 0
            ? Results.Json(new { status = "not-ready", floors = 0 }, statusCode: 503)
            : Results.Ok(new { status = "ready", floors = floors.Count });
    })
    .WithName("Readiness")
    .WithTags("Health");
app.MapGet("/metrics", () => Results.Text(metrics.Render(), "text/plain; version=0.0.4; charset=utf-8"))
    .WithName("Metrics")
    .WithTags("Health");
app.MapFloors().RequireRateLimiting("per-client");
app.MapWalks().RequireRateLimiting("per-client");
app.MapStandards().RequireRateLimiting("per-client");
app.MapImports().RequireRateLimiting("per-client");
app.MapWorkbench();

app.Run();

public partial class Program;
