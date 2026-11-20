using System.Net;
using System.Net.Http.Json;
using System.Text.Json;

using Microsoft.AspNetCore.Mvc.Testing;

using Northspan.Application;

namespace Northspan.Api.Tests;

public class WalkEndpointTests : IClassFixture<ApiFactory>
{
    private readonly HttpClient _client;

    public WalkEndpointTests(ApiFactory factory) => _client = factory.CreateClient();

    [Fact]
    public async Task Health_is_up()
    {
        var response = await _client.GetAsync("/health");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("healthy", body.GetProperty("status").GetString());
    }

    [Fact]
    public async Task Mr204_returns_the_published_walk()
    {
        var response = await _client.PostAsJsonAsync("/v1/walks", new
        {
            floorId = "kiln-annex",
            ticketId = "MR-204",
        });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("Kiln Annex", body.GetProperty("floorName").GetString());
        Assert.Equal("MR-204", body.GetProperty("ticketId").GetString());
        Assert.Equal("Merrow Chandlery", body.GetProperty("house").GetString());
        Assert.Equal(5, body.GetProperty("stopCount").GetInt32());
        Assert.Equal(110.0, MetresText.Tenths(body.GetProperty("distanceM").GetDouble()));
        Assert.Equal(150.8, MetresText.Tenths(body.GetProperty("sweep").GetProperty("distanceM").GetDouble()));
        Assert.Equal(27, body.GetProperty("sweep").GetProperty("shorterPercent").GetInt32());
        Assert.Equal("1 min 36 sec", body.GetProperty("duration").GetString());
        Assert.Equal("LOA-01-E", body.GetProperty("stops")[0].GetProperty("locations")[0].GetString());
        var polyline = body.GetProperty("polyline");
        var last = polyline[polyline.GetArrayLength() - 1];
        Assert.Equal(1.5, polyline[0].GetProperty("x").GetDouble());
        Assert.Equal(3.8, polyline[0].GetProperty("y").GetDouble());
        Assert.Equal(1.5, last.GetProperty("x").GetDouble());
        Assert.Equal(3.8, last.GetProperty("y").GetDouble());
    }

    [Fact]
    public async Task Unknown_location_is_a_problem()
    {
        var response = await _client.PostAsJsonAsync("/v1/walks", new
        {
            floorId = "kiln-annex",
            locations = new[] { "NO-SUCH" },
        });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(400, body.GetProperty("status").GetInt32());
        Assert.Equal("Unknown location", body.GetProperty("title").GetString());
        Assert.Contains("NO-SUCH", body.GetProperty("detail").GetString(), StringComparison.Ordinal);
        Assert.Equal("NO-SUCH", body.GetProperty("location").GetString());
    }

    [Fact]
    public async Task Empty_ticket_is_a_problem()
    {
        var response = await _client.PostAsJsonAsync("/v1/walks", new
        {
            floorId = "kiln-annex",
            locations = Array.Empty<string>(),
        });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(400, body.GetProperty("status").GetInt32());
        Assert.Equal("Empty ticket", body.GetProperty("title").GetString());
    }

    [Fact]
    public async Task OpenApi_document_is_served()
    {
        var response = await _client.GetAsync("/openapi/v1.json");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadAsStringAsync();
        Assert.Contains("/v1/walks", body, StringComparison.Ordinal);
        Assert.Contains("/health", body, StringComparison.Ordinal);
    }
}

public sealed class ApiFactory : WebApplicationFactory<Program>
{
    protected override void ConfigureWebHost(Microsoft.AspNetCore.Hosting.IWebHostBuilder builder)
    {
        builder.UseSetting("Fixtures:Root", FixtureLibrary.Discover());
    }
}
