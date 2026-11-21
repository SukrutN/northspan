using System.Net;
using System.Net.Http.Json;
using System.Text.Json;

using Microsoft.AspNetCore.Mvc.Testing;

namespace Northspan.Api.Tests;

public class OpsTests
{
    private static WebApplicationFactory<Program> Factory(params (string, string?)[] settings)
    {
        var factory = new ApiFactory();
        return settings.Length == 0
            ? factory
            : factory.WithWebHostBuilder(builder =>
            {
                foreach (var (key, value) in settings)
                {
                    builder.UseSetting(key, value);
                }
            });
    }

    [Fact]
    public async Task Metrics_are_served_in_prometheus_text()
    {
        using var client = Factory().CreateClient();

        var walk = await client.PostAsJsonAsync("/v1/walks", new { floorId = "kiln-annex", ticketId = "MR-204" });
        Assert.Equal(HttpStatusCode.OK, walk.StatusCode);

        var metrics = await client.GetAsync("/metrics");
        Assert.Equal(HttpStatusCode.OK, metrics.StatusCode);
        Assert.Contains("text/plain", metrics.Content.Headers.ContentType?.ToString());
        var body = await metrics.Content.ReadAsStringAsync();
        Assert.Contains("# TYPE northspan_http_requests_total counter", body);
        Assert.Contains("northspan_http_requests_total{", body);
        Assert.Contains("# TYPE northspan_walks_planned_total counter", body);
        Assert.Contains("northspan_walks_planned_total 1", body);
        Assert.Contains("northspan_uptime_seconds", body);
    }

    [Fact]
    public async Task Readiness_reports_the_published_floors()
    {
        using var client = Factory().CreateClient();

        var response = await client.GetAsync("/ready");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("ready", body.GetProperty("status").GetString());
        Assert.True(body.GetProperty("floors").GetInt32() > 0);
    }

    [Fact]
    public async Task A_token_locks_the_api_and_keeps_the_public_routes_open()
    {
        using var client = Factory(("Auth:Token", "sesame")).CreateClient();

        var refused = await client.GetAsync("/v1/floors");
        Assert.Equal(HttpStatusCode.Unauthorized, refused.StatusCode);
        Assert.Equal("application/problem+json", refused.Content.Headers.ContentType?.MediaType);
        var problem = await refused.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Contains("token", problem.GetProperty("title").GetString());

        client.DefaultRequestHeaders.Authorization = new("Bearer", "sesame");
        var allowed = await client.GetAsync("/v1/floors");
        Assert.Equal(HttpStatusCode.OK, allowed.StatusCode);
        client.DefaultRequestHeaders.Authorization = null;

        foreach (var open in new[] { "/health", "/ready", "/metrics", "/" })
        {
            var page = await client.GetAsync(open);
            Assert.True(page.StatusCode == HttpStatusCode.OK,
                open + " should stay open for probes and the workbench page");
        }
    }

    [Fact]
    public async Task The_rate_limit_refuses_with_retry_after()
    {
        using var client = Factory(("Ops:RateLimit", "3")).CreateClient();

        for (var i = 0; i < 3; i++)
        {
            var allowed = await client.GetAsync("/v1/floors");
            Assert.Equal(HttpStatusCode.OK, allowed.StatusCode);
        }

        var refused = await client.GetAsync("/v1/floors");
        Assert.Equal(HttpStatusCode.TooManyRequests, refused.StatusCode);
        Assert.NotNull(refused.Content.Headers.ContentType);
        Assert.Equal("application/problem+json", refused.Content.Headers.ContentType?.MediaType);
        Assert.True(int.TryParse(refused.Headers.RetryAfter?.ToString(), out var seconds) && seconds > 0);
        var problem = await refused.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("Too many requests", problem.GetProperty("title").GetString());
    }

    [Fact]
    public async Task An_oversize_body_is_refused_before_it_is_read()
    {
        using var client = Factory(("Ops:MaxBody", "512")).CreateClient();

        var response = await client.PostAsJsonAsync("/v1/walks", new
        {
            floorId = "kiln-annex",
            locations = new[] { "CIN-01-W", "LOA-01-E" },
        });
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var oversized = await client.PostAsync("/v1/walks",
            new StringContent(new string('x', 2048), System.Text.Encoding.UTF8, "application/json"));
        Assert.Equal(HttpStatusCode.RequestEntityTooLarge, oversized.StatusCode);
        var problem = await oversized.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("The request body is too large", problem.GetProperty("title").GetString());
    }
}
