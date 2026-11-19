using System.Net;
using System.Net.Http.Json;
using System.Text.Json;

using Microsoft.AspNetCore.Mvc.Testing;

using Northspan.Application;

namespace Northspan.Api.Tests;

public class StandardsEndpointTests : IClassFixture<ApiFactory>
{
    private readonly HttpClient _client;

    public StandardsEndpointTests(ApiFactory factory) => _client = factory.CreateClient();

    [Fact]
    public async Task Counter_refill_standards_carry_the_published_table()
    {
        var response = await _client.GetAsync("/v1/floors/kiln-annex/standards");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("counter-refill", body.GetProperty("operationId").GetString());
        Assert.Equal("Counter refill", body.GetProperty("operationName").GetString());
        Assert.Equal(10, body.GetProperty("cartStops").GetInt32());
        Assert.Equal(2, body.GetProperty("unitsPerLine").GetInt32());

        var zones = body.GetProperty("zones");
        Assert.Equal(5, zones.GetArrayLength());
        var cinder = zones[0];
        Assert.Equal("CIN", cinder.GetProperty("run").GetString());
        Assert.Equal("Cinder", cinder.GetProperty("runName").GetString());
        Assert.Equal(0.182, cinder.GetProperty("mpuMinutes").GetDouble(), 3);
        Assert.Equal(0.364, cinder.GetProperty("mplMinutes").GetDouble(), 3);
        Assert.Equal(329.9, cinder.GetProperty("unitsPerHour").GetDouble(), 1);
        Assert.Equal(86.4, cinder.GetProperty("utilPercent").GetDouble(), 1);

        var skills = cinder.GetProperty("skills");
        Assert.Equal(3, skills.GetArrayLength());
        Assert.Equal("day", skills[1].GetProperty("bandId").GetString());
        Assert.Equal(280.4, skills[1].GetProperty("unitsPerHour").GetDouble(), 1);

        var sample = body.GetProperty("sample");
        Assert.Equal("MR-204", sample.GetProperty("ticketId").GetString());
        Assert.Equal(181.652, sample.GetProperty("totalSeconds").GetDouble(), 3);
        Assert.Equal(7, sample.GetProperty("buckets").GetArrayLength());
    }

    [Fact]
    public async Task Dry_store_standards_are_a_different_operation()
    {
        var response = await _client.GetAsync("/v1/floors/dry-store/standards");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("case-pull", body.GetProperty("operationId").GetString());
        Assert.Equal(2, body.GetProperty("zones").GetArrayLength());
        Assert.Equal(0.858, body.GetProperty("zones")[0].GetProperty("mplMinutes").GetDouble(), 3);
    }

    [Fact]
    public async Task Unknown_floor_is_moved_to_the_404_lane()
    {
        var response = await _client.GetAsync("/v1/floors/no-annex/standards");
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(404, body.GetProperty("status").GetInt32());
    }
}
