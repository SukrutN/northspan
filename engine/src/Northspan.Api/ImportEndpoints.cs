using Microsoft.AspNetCore.Mvc;

using Northspan.Application;
using Northspan.Domain;

namespace Northspan.Api;

/// <summary>
/// The location-master import: a CSV of pick faces spliced into a floor
/// document, proven through the engine's own floor reader before it is
/// returned.
/// </summary>
internal static class ImportEndpoints
{
    public static RouteHandlerBuilder MapImports(this WebApplication app)
    {
        return app.MapPost("/v1/import/floor", Import)
            .WithName("ImportFloor")
            .WithTags("Import")
            .Produces<FloorImportResponse>(StatusCodes.Status200OK)
            .Produces<ProblemDetails>(StatusCodes.Status400BadRequest)
            .Produces<ProblemDetails>(StatusCodes.Status404NotFound);
    }

    private static IResult Import(ImportRequest request, FixtureLibrary fixtures, OpsMetrics counters)
    {
        if (request.Floor is not null && request.Fixture is not null)
        {
            counters.WalkRefused();
            return Results.Problem(title: "The walk could not be planned",
                detail: "Name a fixture floor or send a floor, not both.",
                statusCode: StatusCodes.Status400BadRequest, type: "/problems/invalid-request");
        }
        if (request.Floor is null && request.Fixture is null)
        {
            counters.WalkRefused();
            return Results.Problem(title: "The walk could not be planned",
                detail: "Name a fixture floor or send a floor.",
                statusCode: StatusCodes.Status400BadRequest, type: "/problems/invalid-request");
        }
        if (string.IsNullOrWhiteSpace(request.Csv))
        {
            counters.WalkRefused();
            return Results.Problem(title: "The walk could not be planned",
                detail: "Send the location master as a csv string.",
                statusCode: StatusCodes.Status400BadRequest, type: "/problems/invalid-request");
        }

        var floor = request.Floor ?? fixtures.ReadFloorDocument(request.Fixture!);
        var imported = FloorCsv.Slots(floor, request.Csv);

        // Prove the spliced floor through the engine's own reader, so the
        // importer cannot hand back something the planner refuses.
        _ = FloorFile.FromDocument(imported.Floor);

        counters.WalkPlanned();
        return Results.Ok(FloorImportResponse.From(imported));
    }
}

internal sealed class ImportRequest
{
    public string? Fixture { get; set; }

    public FloorDocument? Floor { get; set; }

    public string? Csv { get; set; }
}

internal sealed record FloorImportResponse(
    string FloorId,
    string FloorName,
    ImportReport Report,
    FloorDocument Floor)
{
    public static FloorImportResponse From(FloorImport imported) =>
        new(imported.Floor.Id ?? "unnamed", imported.Floor.Name ?? "unnamed", imported.Report, imported.Floor);
}
