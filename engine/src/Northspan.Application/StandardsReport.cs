using Northspan.Domain;

namespace Northspan.Application;

/// <summary>One skill band's expected rate in a zone: the zone standard under a band's hands.</summary>
public sealed record SkillRate(string BandId, string BandName, double RateFactor, double UnitsPerHour);

/// <summary>One zone row of the standards table: the locked cells plus the band matrix.</summary>
public sealed record StandardsRow(ZoneStandard Zone, IReadOnlyList<SkillRate> Skills);

/// <summary>The built standard for an operation on a floor: the table and the sample's decomposition.</summary>
public sealed record OperationStandards(
    Operation Operation,
    string FloorId,
    string FloorName,
    IReadOnlyList<StandardsRow> Rows,
    MixDecomposition? Sample,
    string? SampleTicketId);

/// <summary>
/// The use case: plan each zone's own tour and the sample ticket, then price them with
/// the operation's task mix. The table is a pure function of the floor and the operation;
/// nothing here is learned, and no number lives in code.
/// </summary>
public sealed class StandardsReport
{
    public OperationStandards Execute(Floor floor, Operation operation, Ticket? sampleTicket)
    {
        ArgumentNullException.ThrowIfNull(floor);
        ArgumentNullException.ThrowIfNull(operation);

        operation.Check();

        var covered = operation.Zones.Select(zone => zone.RunCode).ToHashSet(StringComparer.Ordinal);
        foreach (var run in floor.Runs)
        {
            if (!covered.Contains(run.Code))
            {
                throw new InvalidStandardsException(
                    $"{operation.Name} prices no zone for run {run.Code}, so {floor.Name} has an unpriced aisle.");
            }
        }

        var byRun = operation.Zones.ToDictionary(zone => zone.RunCode, zone => zone);
        var classes = operation.VelocityClasses.ToDictionary(c => c.Id, c => c);
        var rows = new List<StandardsRow>(operation.Zones.Count);

        foreach (var run in floor.Runs)
        {
            var zone = byRun[run.Code];
            var faces = zone.SampleFaces;
            var tour = WalkPlanner.Plan(floor, faces, operation.Rules.MustReturn);
            var shape = Standards.TicketShape.For(faces, operation.UnitsPerLine);
            var tickets = Standards.TicketsPerCart(operation.CartStops, tour.Stops.Count);
            var travel = WalkSeconds.Of(tour, operation.Rules);
            var seconds = Standards.SecondsPerTicket(operation.Tasks, shape, travel, tickets);
            var linesPerShift = classes[zone.VelocityClassId].LinesPerShift;
            var standard = new ZoneStandard(
                run.Code,
                run.Name,
                tour.Stops.Count,
                shape.Lines,
                shape.Units,
                tour.DistanceM,
                tickets,
                travel,
                seconds,
                Standards.MpuMinutes(seconds, shape.Units),
                Standards.MplMinutes(seconds, shape.Lines),
                Standards.UnitsPerHour(seconds, shape.Units),
                linesPerShift,
                Standards.UtilPercent(seconds, shape.Lines, linesPerShift, operation.ShiftSeconds));

            rows.Add(new StandardsRow(
                standard,
                operation.Skills
                    .Select(band => new SkillRate(band.Id, band.Name, band.RateFactor, standard.UnitsPerHour * band.RateFactor))
                    .ToArray()));
        }

        MixDecomposition? sample = sampleTicket is null
            ? null
            : Standards.Decompose(
                sampleTicket.Id ?? "the sample",
                WalkPlanner.Plan(floor, sampleTicket.Locations, operation.Rules.MustReturn),
                operation.Tasks,
                operation.UnitsPerLine,
                operation.Rules,
                1);

        return new OperationStandards(operation, floor.Id, floor.Name, rows, sample, sampleTicket?.Id);
    }
}
