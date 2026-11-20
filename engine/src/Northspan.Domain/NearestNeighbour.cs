namespace Northspan.Domain;

/// <summary>
/// Builds a closed tour from the gate. The next stop is the nearest remaining one.
/// An equal distance keeps the stop whose location code sorts first.
/// </summary>
public static class NearestNeighbour
{
    public static IReadOnlyList<CartStop> Order(
        IReadOnlyList<CartStop> stops,
        CartStop gate,
        AisleDistance distance)
    {
        var remaining = stops.ToList();
        var tour = new List<CartStop>(stops.Count + 2) { gate };
        var current = gate;
        while (remaining.Count > 0)
        {
            var best = 0;
            var bestDistance = double.PositiveInfinity;
            for (var i = 0; i < remaining.Count; i++)
            {
                var candidate = distance.Between(current, remaining[i]);
                var closer = candidate < bestDistance - 1e-9;
                var tie = Math.Abs(candidate - bestDistance) <= 1e-9
                    && string.CompareOrdinal(remaining[i].Key, remaining[best].Key) < 0;
                if (closer || tie)
                {
                    best = i;
                    bestDistance = candidate;
                }
            }

            current = remaining[best];
            remaining.RemoveAt(best);
            tour.Add(current);
        }

        tour.Add(gate);
        return tour;
    }
}
