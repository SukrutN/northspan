using Northspan.Application;

namespace Northspan.Api;

internal static class FloorEndpoints
{
    public static void MapFloors(this WebApplication app)
    {
        var floors = app.MapGroup("/v1/floors").WithTags("Floors");

        floors.MapGet("/", (FixtureLibrary library) => Results.Ok(new { floors = library.FloorIds() }))
            .WithName("ListFloors");

        floors.MapGet("/{floorId}", (string floorId, FixtureLibrary library) =>
            {
                var floor = library.LoadFloor(floorId);
                return Results.Ok(new
                {
                    id = floor.Id,
                    name = floor.Name,
                    widthM = floor.WidthM,
                    heightM = floor.HeightM,
                    runs = floor.Runs.Select(run => new { code = run.Code, name = run.Name, x = run.X }),
                    crossAisles = floor.CrossAisles.Select(aisle => new { id = aisle.Id, name = aisle.Name, y = aisle.Y }),
                    gate = new { id = floor.Gate.Id, name = floor.Gate.Name, x = floor.Gate.X, y = floor.Gate.Y },
                    slotCount = floor.Slots.Count,
                });
            })
            .WithName("GetFloor");

        floors.MapGet("/{floorId}/tickets", (string floorId, FixtureLibrary library) =>
                Results.Ok(new { tickets = library.Tickets(floorId) }))
            .WithName("ListTickets");
    }
}
