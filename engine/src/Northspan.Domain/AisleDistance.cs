namespace Northspan.Domain;

/// <summary>
/// Cart distance on one floor. Inside a run the cart travels along that run.
/// Between runs it takes the cross-aisle that costs fewer metres. It does not cut through a rack.
/// </summary>
public sealed class AisleDistance
{
    private readonly Floor _floor;

    public AisleDistance(Floor floor)
    {
        ArgumentNullException.ThrowIfNull(floor);
        _floor = floor;
    }

    public double Between(CartStop a, CartStop b)
    {
        if (SamePlace(a, b))
        {
            return 0;
        }

        if (SameRun(a, b))
        {
            return Math.Abs(a.Y - b.Y);
        }

        return Crossing(a, b).Cost;
    }

    /// <summary>"run" when the cart stays on one run; otherwise the id of the cross-aisle it used.</summary>
    public string Via(CartStop a, CartStop b)
    {
        if (SamePlace(a, b) || SameRun(a, b))
        {
            return "run";
        }

        return Crossing(a, b).Aisle.Id;
    }

    public IReadOnlyList<Point> Leg(CartStop a, CartStop b)
    {
        if (SameRun(a, b))
        {
            return [new Point(a.X, a.Y), new Point(b.X, b.Y)];
        }

        var y = Crossing(a, b).Aisle.Y;
        var points = new List<Point> { new(a.X, a.Y) };
        if (Math.Abs(a.Y - y) > 1e-6)
        {
            points.Add(new Point(a.X, y));
        }

        if (Math.Abs(a.X - b.X) > 1e-6)
        {
            points.Add(new Point(b.X, y));
        }

        var last = points[^1];
        if (Math.Abs(last.X - b.X) > 1e-6 || Math.Abs(last.Y - b.Y) > 1e-6)
        {
            points.Add(new Point(b.X, b.Y));
        }

        return points;
    }

    public double Length(IReadOnlyList<CartStop> tour)
    {
        var total = 0d;
        for (var i = 0; i < tour.Count - 1; i++)
        {
            total += Between(tour[i], tour[i + 1]);
        }

        return total;
    }

    public IReadOnlyList<Point> Polyline(IReadOnlyList<CartStop> tour)
    {
        var points = new List<Point>();
        for (var i = 0; i < tour.Count - 1; i++)
        {
            var leg = Leg(tour[i], tour[i + 1]);
            var start = points.Count == 0 ? 0 : 1;
            for (var p = start; p < leg.Count; p++)
            {
                points.Add(leg[p]);
            }
        }

        var deduped = new List<Point>(points.Count);
        foreach (var point in points)
        {
            if (deduped.Count == 0)
            {
                deduped.Add(point);
                continue;
            }

            var prev = deduped[^1];
            if (Math.Abs(prev.X - point.X) > 1e-6 || Math.Abs(prev.Y - point.Y) > 1e-6)
            {
                deduped.Add(point);
            }
        }

        return deduped;
    }

    private static bool SamePlace(CartStop a, CartStop b) =>
        Math.Abs(a.X - b.X) < 1e-9 && Math.Abs(a.Y - b.Y) < 1e-9;

    private static bool SameRun(CartStop a, CartStop b) =>
        a.RunCode is not null && string.Equals(a.RunCode, b.RunCode, StringComparison.Ordinal);

    private (CrossAisle Aisle, double Cost) Crossing(CartStop a, CartStop b)
    {
        var horizontal = Math.Abs(a.X - b.X);
        CrossAisle? best = null;
        var bestCost = double.PositiveInfinity;
        foreach (var aisle in _floor.CrossAisles)
        {
            var cost = Math.Abs(a.Y - aisle.Y) + horizontal + Math.Abs(b.Y - aisle.Y);
            if (cost < bestCost - 1e-9)
            {
                best = aisle;
                bestCost = cost;
            }
        }

        if (best is null)
        {
            throw new FloorInvalidException(
                $"{_floor.Name} cannot be walked: it has no cross-aisle, so the cart cannot move between runs.");
        }

        return (best, bestCost);
    }
}
