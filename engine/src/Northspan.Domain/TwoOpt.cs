namespace Northspan.Domain;

/// <summary>
/// Reverses any stretch of a tour whose ends stay fixed when the reversal saves metres.
/// First improvement, then the search starts again. The result is never longer than the tour it was given.
/// </summary>
public static class TwoOpt
{
    /// <summary>Enough passes for a single pick ticket. The loop also stops when a pass finds nothing.</summary>
    public const int PassLimit = 80;

    public static IReadOnlyList<CartStop> Improve(IReadOnlyList<CartStop> tour, AisleDistance distance)
    {
        var next = tour.ToList();
        var guard = 0;
        var improved = true;
        while (improved && guard < PassLimit)
        {
            improved = false;
            guard++;
            var n = next.Count;
            for (var i = 1; i < n - 2 && !improved; i++)
            {
                for (var k = i + 1; k < n - 1; k++)
                {
                    var before = distance.Between(next[i - 1], next[i]) + distance.Between(next[k], next[k + 1]);
                    var after = distance.Between(next[i - 1], next[k]) + distance.Between(next[i], next[k + 1]);
                    if (before - after > 1e-6)
                    {
                        next.Reverse(i, k - i + 1);
                        improved = true;
                        break;
                    }
                }
            }
        }

        return next;
    }
}
