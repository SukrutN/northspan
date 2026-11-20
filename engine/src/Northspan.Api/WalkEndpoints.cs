using Microsoft.AspNetCore.Mvc;

using Northspan.Application;
using Northspan.Domain;

namespace Northspan.Api;

internal static class WalkEndpoints
{
    public static void MapWalks(this WebApplication app)
    {
        app.MapPost("/v1/walks", Plan)
            .WithName("PlanWalk")
            .WithTags("Walks")
            .Produces<WalkResponse>(StatusCodes.Status200OK)
            .Produces<ProblemDetails>(StatusCodes.Status400BadRequest)
            .Produces<ProblemDetails>(StatusCodes.Status404NotFound);
    }

    private static IResult Plan(
        WalkRequest request,
        FixtureLibrary fixtures,
        PlanWalk planner,
        ILogger<PlanWalk> logger)
    {
        if (request.FloorId is not null && request.Floor is not null)
        {
            return Problem(StatusCodes.Status400BadRequest, "Name a fixture floor or send a floor, not both.");
        }

        if (request.FloorId is null && request.Floor is null)
        {
            return Problem(StatusCodes.Status400BadRequest, "Name a fixture floor or send a floor.");
        }

        if (request.TicketId is not null && request.Locations is not null)
        {
            return Problem(StatusCodes.Status400BadRequest, "Name a fixture ticket or send locations, not both.");
        }

        if (request.TicketId is null && request.Locations is null)
        {
            return Problem(StatusCodes.Status400BadRequest, "Name a fixture ticket or send locations.");
        }

        if (request.TicketId is not null && request.Floor is not null)
        {
            return Problem(
                StatusCodes.Status400BadRequest,
                "A fixture ticket belongs to a named floor. Send locations with an inline floor.");
        }

        var floor = request.Floor is null
            ? fixtures.LoadFloor(request.FloorId!)
            : FloorFile.FromDocument(request.Floor);

        var ticket = request.TicketId is null
            ? new Ticket(null, null, null, request.Locations!)
            : fixtures.LoadTicket(floor.Id, request.TicketId);

        var rules = request.Rules?.ToRules() ?? WalkRules.Demo;
        var planned = planner.Execute(floor, ticket, rules);

        logger.LogInformation(
            "Planned {FloorId} ticket {TicketId} as {DistanceM} m over {StopCount} stops",
            planned.Floor.Id,
            planned.TicketId,
            planned.Walk.DistanceM,
            planned.Walk.Stops.Count);

        return Results.Ok(WalkResponse.From(planned));
    }

    private static IResult Problem(int status, string detail) =>
        Results.Problem(title: "The walk could not be planned", detail: detail, statusCode: status, type: "/problems/invalid-request");
}

internal sealed class WalkRequest
{
    public string? FloorId { get; set; }

    public FloorDocument? Floor { get; set; }

    public string? TicketId { get; set; }

    public List<string>? Locations { get; set; }

    public RulesDocument? Rules { get; set; }
}

internal sealed record WalkResponse(
    string FloorId,
    string FloorName,
    string? TicketId,
    string? House,
    bool ReturnedToGate,
    int StopCount,
    double DistanceM,
    double DurationSeconds,
    string Duration,
    SweepResponse Sweep,
    IReadOnlyList<StopResponse> Stops,
    IReadOnlyList<PointResponse> Polyline,
    IReadOnlyList<PointResponse> SweepPolyline)
{
    public static WalkResponse From(PlannedWalk planned)
    {
        var walk = planned.Walk;
        return new WalkResponse(
            planned.Floor.Id,
            planned.Floor.Name,
            planned.TicketId,
            planned.House,
            walk.ReturnedToGate,
            walk.Stops.Count,
            walk.DistanceM,
            planned.DurationSeconds,
            planned.DurationLabel,
            new SweepResponse(walk.SweepDistanceM, planned.SavedM, planned.ShorterPercent),
            walk.Stops.Select(stop => new StopResponse(
                stop.Order,
                stop.Locations,
                stop.RunCode,
                stop.X,
                stop.Y,
                stop.MetresFromPrevious,
                stop.Via)).ToArray(),
            walk.Polyline.Select(point => new PointResponse(point.X, point.Y)).ToArray(),
            walk.SweepPolyline.Select(point => new PointResponse(point.X, point.Y)).ToArray());
    }
}

internal sealed record SweepResponse(double DistanceM, double SavedM, int ShorterPercent);

internal sealed record StopResponse(
    int Order,
    IReadOnlyList<string> Locations,
    string Run,
    double X,
    double Y,
    double MetresFromPrevious,
    string Via);

internal sealed record PointResponse(double X, double Y);
