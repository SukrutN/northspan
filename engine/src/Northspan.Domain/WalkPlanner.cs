namespace Northspan.Domain;

/// <summary>
/// Plans one cart walk. Nearest neighbour builds a tour, two-opt shortens it, and the same
/// improvement is tried on a serpentine sweep. The shorter improved tour is the plan.
/// The sweep distance is the sweep before that improvement.
/// </summary>
public static class WalkPlanner
{
    public static CartStop GateOf(Floor floor) =>
        new(floor.Gate.Id, null, null, floor.Gate.X, floor.Gate.Y, []);

    public static IReadOnlyList<CartStop> StopsFor(Floor floor, IReadOnlyList<string> locationCodes)
    {
        ArgumentNullException.ThrowIfNull(floor);
        ArgumentNullException.ThrowIfNull(locationCodes);

        var seen = new HashSet<string>(StringComparer.Ordinal);
        var groups = new Dictionary<string, List<Slot>>(StringComparer.Ordinal);
        foreach (var raw in locationCodes)
        {
            if (string.IsNullOrWhiteSpace(raw))
            {
                throw new UnknownLocationException(raw?.Trim() ?? "", floor.Name);
            }

            var code = Floor.NormalizeCode(raw);
            if (!seen.Add(code))
            {
                continue;
            }

            var slot = floor.FindSlot(code) ?? throw new UnknownLocationException(code, floor.Name);
            if (!groups.TryGetValue(slot.Stand, out var list))
            {
                list = [];
                groups.Add(slot.Stand, list);
            }

            list.Add(slot);
        }

        if (groups.Count == 0)
        {
            throw new EmptyTicketException();
        }

        var stops = new List<CartStop>(groups.Count);
        foreach (var (stand, slots) in groups)
        {
            slots.Sort((a, b) => string.CompareOrdinal(a.Code, b.Code));
            var run = floor.RequireRun(slots[0].Run);
            stops.Add(new CartStop(
                slots[0].Code,
                run.Code,
                stand,
                run.X,
                slots[0].AlongM,
                slots.Select(slot => slot.Code).ToArray()));
        }

        return stops;
    }

    public static Walk Plan(Floor floor, IReadOnlyList<string> locationCodes, bool mustReturn)
    {
        var stops = StopsFor(floor, locationCodes);
        var distance = new AisleDistance(floor);
        var gate = GateOf(floor);

        var seeded = TwoOpt.Improve(NearestNeighbour.Order(stops, gate, distance), distance);
        var sweep = SerpentineSweep.Order(floor, stops, gate);
        var sweepImproved = TwoOpt.Improve(sweep, distance);
        var planned = distance.Length(seeded) <= distance.Length(sweepImproved) ? seeded : sweepImproved;

        IReadOnlyList<CartStop> reported = planned;
        IReadOnlyList<CartStop> reportedSweep = sweep;
        if (!mustReturn)
        {
            reported = planned.Take(planned.Count - 1).ToArray();
            reportedSweep = sweep.Take(sweep.Count - 1).ToArray();
        }

        return Describe(reported, reportedSweep, distance, mustReturn);
    }

    private static Walk Describe(
        IReadOnlyList<CartStop> tour,
        IReadOnlyList<CartStop> sweep,
        AisleDistance distance,
        bool returnedToGate)
    {
        var lastStop = returnedToGate ? tour.Count - 1 : tour.Count;
        var stops = new List<WalkStop>(Math.Max(0, lastStop - 1));
        for (var i = 1; i < lastStop; i++)
        {
            var point = tour[i];
            stops.Add(new WalkStop(
                stops.Count + 1,
                point.Stand ?? point.Key,
                point.Locations,
                point.RunCode ?? "",
                point.X,
                point.Y,
                distance.Between(tour[i - 1], point),
                distance.Via(tour[i - 1], point)));
        }

        return new Walk(
            stops,
            distance.Length(tour),
            distance.Length(sweep),
            returnedToGate,
            distance.Polyline(tour),
            distance.Polyline(sweep));
    }
}
