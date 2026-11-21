using System.Net;
using System.Net.Http.Json;
using System.Text.Json;

using Microsoft.AspNetCore.Mvc.Testing;

namespace Northspan.Api.Tests;

public class WorkbenchTests : IClassFixture<ApiFactory>
{
    private readonly HttpClient _client;

    public WorkbenchTests(ApiFactory factory) => _client = factory.CreateClient();

    [Fact]
    public async Task The_workbench_page_is_served()
    {
        var response = await _client.GetAsync("/");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("text/html", response.Content.Headers.ContentType?.MediaType);
        var body = await response.Content.ReadAsStringAsync();
        Assert.Contains("walk workbench", body, StringComparison.Ordinal);
        Assert.Contains("<h1>Northspan</h1>", body, StringComparison.Ordinal);
    }

    [Fact]
    public async Task The_floor_reading_lists_the_faces_and_landmarks()
    {
        var response = await _client.GetAsync("/v1/floors/kiln-annex");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        var locations = body.GetProperty("locations");
        Assert.True(locations.GetArrayLength() > 50, "the annex should publish its faces");
        var first = locations[0];
        Assert.Equal("CIN-01-W", first.GetProperty("code").GetString());
        Assert.Equal("CIN", first.GetProperty("run").GetString());
        Assert.Equal("CIN-01", first.GetProperty("stand").GetString());
        Assert.True(first.GetProperty("alongM").GetDouble() > 0);
        Assert.NotNull(first.GetProperty("item").GetString());

        var landmarks = body.GetProperty("landmarks");
        Assert.Equal("pack", landmarks[0].GetProperty("id").GetString());
    }

    [Fact]
    public async Task A_marked_list_of_faces_walks_from_the_engine()
    {
        var response = await _client.PostAsJsonAsync("/v1/walks", new
        {
            floorId = "kiln-annex",
            locations = new[] { "CIN-01-W", "CIN-01-E", "LOA-01-E" },
        });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        // Both Cinder faces share one stand, so the cart makes two stops.
        Assert.Equal(2, body.GetProperty("stopCount").GetInt32());
        Assert.True(body.GetProperty("distanceM").GetDouble() > 0);
        Assert.True(body.GetProperty("returnedToGate").GetBoolean());
        var faces = body.GetProperty("stops")[0].GetProperty("locations");
        Assert.Equal(2, faces.GetArrayLength());
        var polyline = body.GetProperty("polyline");
        Assert.True(polyline.GetArrayLength() >= 4);
    }

    [Fact]
    public async Task The_second_floor_walks_its_own_tickets()
    {
        var floors = await _client.GetFromJsonAsync<JsonElement>("/v1/floors");
        Assert.Contains("dry-store", floors.GetProperty("floors").EnumerateArray()
            .Select(id => id.GetString()), StringComparer.Ordinal);

        var tickets = await _client.GetFromJsonAsync<JsonElement>("/v1/floors/dry-store/tickets");
        Assert.True(tickets.GetProperty("tickets").GetArrayLength() > 0);
    }
}
