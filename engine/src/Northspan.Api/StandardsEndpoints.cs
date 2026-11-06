using Microsoft.AspNetCore.Mvc;

using Northspan.Application;
using Northspan.Domain;

namespace Northspan.Api;

internal static class StandardsEndpoints
{
    public static RouteHandlerBuilder MapStandards(this WebApplication app)
    {
        return app.MapGet("/v1/floors/{floorId}/standards", Build)
            .WithName("Standards")
            .WithTags("Standards")
            .Produces<StandardsResponse>(StatusCodes.Status200OK)
            .Produces<ProblemDetails>(StatusCodes.Status400BadRequest)
            .Produces<ProblemDetails>(StatusCodes.Status404NotFound);
    }

    private static IResult Build(string floorId, FixtureLibrary fixtures)
    {
        var floor = fixtures.LoadFloor(floorId);
        var operation = fixtures.LoadOperation(floorId);
        Ticket? sample = operation.SampleTicketId is null
            ? null
            : fixtures.LoadTicket(floorId, operation.SampleTicketId);

        var built = new StandardsReport().Execute(floor, operation, sample);

        return Results.Ok(StandardsResponse.From(built));
    }
}

internal sealed record StandardsResponse(
    string OperationId,
    string OperationName,
    string FloorId,
    string FloorName,
    double ShiftSeconds,
    int CartStops,
    int UnitsPerLine,
    IReadOnlyList<ZoneRowResponse> Zones,
    SampleResponse? Sample)
{
    public static StandardsResponse From(OperationStandards built)
    {
        var operation = built.Operation;
        var byRun = operation.Zones.ToDictionary(zone => zone.RunCode, zone => zone);
        return new StandardsResponse(
            operation.Id,
            operation.Name,
            built.FloorId,
            built.FloorName,
            operation.ShiftSeconds,
            operation.CartStops,
            operation.UnitsPerLine,
            built.Rows.Select(row => ZoneRowResponse.From(row, byRun[row.Zone.RunCode])).ToArray(),
            built.Sample is null ? null : SampleResponse.From(built.SampleTicketId!, built.Sample));
    }
}

internal sealed record ZoneRowResponse(
    string Run,
    string RunName,
    string VelocityClass,
    int StopsPerTicket,
    int LinesPerTicket,
    int UnitsPerTicket,
    double TourMetres,
    int TicketsPerCart,
    double TravelSeconds,
    double SecondsPerTicket,
    double MpuMinutes,
    double MplMinutes,
    double UnitsPerHour,
    double UtilPercent,
    int LinesPerShift,
    IReadOnlyList<SkillResponse> Skills)
{
    public static ZoneRowResponse From(StandardsRow row, OperationZone zone) =>
        new(
            row.Zone.RunCode,
            row.Zone.RunName,
            zone.VelocityClassId,
            row.Zone.StopsPerTicket,
            row.Zone.LinesPerTicket,
            row.Zone.UnitsPerTicket,
            row.Zone.TourMetres,
            row.Zone.TicketsPerCart,
            row.Zone.TravelSeconds,
            row.Zone.SecondsPerTicket,
            row.Zone.MpuMinutes,
            row.Zone.MplMinutes,
            row.Zone.UnitsPerHour,
            row.Zone.UtilPercent,
            row.Zone.LinesPerShift,
            row.Skills.Select(SkillResponse.From).ToArray());
}

internal sealed record SkillResponse(string BandId, string BandName, double RateFactor, double UnitsPerHour)
{
    public static SkillResponse From(SkillRate skill) => new(skill.BandId, skill.BandName, skill.RateFactor, skill.UnitsPerHour);
}

internal sealed record SampleResponse(string TicketId, double TotalSeconds, IReadOnlyList<BucketResponse> Buckets)
{
    public static SampleResponse From(string ticketId, MixDecomposition sample) => new(
        ticketId,
        sample.TotalSeconds,
        sample.Buckets.Select(bucket => new BucketResponse(bucket.Kind.ToString(), bucket.Occurrences, bucket.Seconds)).ToArray());
}

internal sealed record BucketResponse(string Kind, int Occurrences, double Seconds);
