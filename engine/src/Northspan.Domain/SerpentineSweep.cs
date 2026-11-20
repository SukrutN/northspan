namespace Northspan.Domain;

/// <summary>
/// The naive aisle sweep: runs from west to east, direction alternating, no look-ahead.
/// The westmost run is walked south to north. This order, before two-opt, is the comparison figure.
/// </summary>
public static class SerpentineSweep
{
    public static IReadOnlyList<CartStop> Order(Floor floor, IReadOnlyList<CartStop> stops, CartStop gate)
    {
        var byRun = new Dictionary<string, List<CartStop>>(StringComparer.Ordinal);
        foreach (var stop in stops)
        {
            if (stop.RunCode is null)
            {
                throw new InvalidOperationException("A pick stop has no run.");
            }

            if (!byRun.TryGetValue(stop.RunCode, out var list))
            {
                list = [];
                byRun.Add(stop.RunCode, list);
            }

            list.Add(stop);
        }

        var runs = floor.Runs
            .Where(run => byRun.ContainsKey(run.Code))
            .OrderBy(run => run.X)
            .ThenBy(run => run.Code, StringComparer.Ordinal)
            .ToList();

        var ordered = new List<CartStop>(stops.Count);
        for (var index = 0; index < runs.Count; index++)
        {
            var southToNorth = index % 2 == 0;
            var row = byRun[runs[index].Code];
            row.Sort((a, b) =>
            {
                if (Math.Abs(a.Y - b.Y) > 1e-9)
                {
                    return southToNorth ? a.Y.CompareTo(b.Y) : b.Y.CompareTo(a.Y);
                }

                return string.CompareOrdinal(a.Key, b.Key);
            });
            ordered.AddRange(row);
        }

        return [gate, .. ordered, gate];
    }
}
