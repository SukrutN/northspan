namespace Northspan.Domain;

/// <summary>
/// The task mix: what the hands cost, per activity. These are the engineered
/// coefficients the fixtures carry; the engine owns no numbers of its own.
/// All seconds are per occurrence: per line picked, per unit lifted, and so on.
/// </summary>
public sealed record TaskMix(
    double GrabPerLineSeconds,
    double GrabPerUnitSeconds,
    double CountAndGiveSeconds,
    double CartManeuverSeconds,
    double PutAndVerifySeconds,
    double PackSplitSeconds)
{
    public static readonly TaskMix Zero = new(0, 0, 0, 0, 0, 0);

    public void Check()
    {
        FailUnlessFinite(GrabPerLineSeconds, "grab per line");
        FailUnlessFinite(GrabPerUnitSeconds, "grab per unit");
        FailUnlessFinite(CountAndGiveSeconds, "count-and-give");
        FailUnlessFinite(CartManeuverSeconds, "cart maneuver");
        FailUnlessFinite(PutAndVerifySeconds, "put-and-verify");
        FailUnlessFinite(PackSplitSeconds, "pack split");
    }

    static void FailUnlessFinite(double seconds, string what)
    {
        if (!double.IsFinite(seconds) || seconds < 0)
        {
            throw new InvalidStandardsException($"The {what} seconds cannot be negative or unmeasurable.");
        }
    }

    /// <summary>This mix with one coefficient adjusted; the tests use it as a sensitivity lever.</summary>
    public TaskMix WithGrabPerUnitSeconds(double seconds) =>
        new(GrabPerLineSeconds, seconds, CountAndGiveSeconds, CartManeuverSeconds, PutAndVerifySeconds, PackSplitSeconds);
}

public enum MixKind
{
    Travel,
    GrabPerLine,
    GrabPerUnit,
    CountAndGive,
    CartManeuver,
    PutAndVerify,
    PackSplit,
}

public sealed class InvalidStandardsException : PlanningException
{
    public InvalidStandardsException(string message)
        : base(message)
    {
    }
}

/// <summary>One activity in a decomposition: how often it happened and the seconds it took.</summary>
public sealed record MixBucket(MixKind Kind, int Occurrences, double Seconds);

/// <summary>
/// A walk decomposed into its activities. Tours-first and table-first both end here,
/// and the characterization tests hold them to the same totals.
/// </summary>
public sealed record MixDecomposition(
    string Name,
    IReadOnlyList<MixBucket> Buckets,
    double TravelSeconds,
    double TotalSeconds)
{
    public double SecondsOf(MixKind kind) =>
        Buckets.FirstOrDefault(bucket => bucket.Kind == kind)?.Seconds ?? 0;
}

/// <summary>The engineered standard for one zone of the floor, per ticket of the operation.</summary>
public sealed record ZoneStandard(
    string RunCode,
    string RunName,
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
    int LinesPerShift,
    double UtilPercent);

public static class Standards
{
    /// <summary>A ticket of the operation: one line per pick face, the units the line carries.</summary>
    public sealed record TicketShape(int Lines, int Units, int Stops)
    {
        public static TicketShape For(IReadOnlyList<string> locations, int unitsPerLine) =>
            new(locations.Count, locations.Count * unitsPerLine, locations.Count);
    }

    /// <summary>
    /// How many tickets one cart carries when a ticket takes <paramref name="stops"/> cart
    /// stops: the cart's capacity, divided down, never less than one.
    /// </summary>
    public static int TicketsPerCart(int cartStops, int stops)
    {
        if (cartStops < 1)
        {
            throw new InvalidStandardsException("A cart carries at least one stop.");
        }

        return Math.Max(1, cartStops / stops);
    }

    /// <summary>
    /// The amortized ticket: cart travel shared out across the cart's tickets,
    /// hands and the pack split never shared. This is the interleaving rule.
    /// </summary>
    public static double SecondsPerTicket(
        TaskMix tasks,
        TicketShape shape,
        double travelSeconds,
        int ticketsPerCart) =>
        travelSeconds / ticketsPerCart
        + tasks.GrabPerLineSeconds * shape.Lines
        + (tasks.GrabPerUnitSeconds + tasks.CountAndGiveSeconds) * shape.Units
        + tasks.PutAndVerifySeconds * shape.Lines
        + tasks.CartManeuverSeconds * shape.Stops
        + tasks.PackSplitSeconds;

    public static double MpuMinutes(double secondsPerTicket, int units) => secondsPerTicket / units / 60;
    public static double MplMinutes(double secondsPerTicket, int lines) => secondsPerTicket / lines / 60;
    public static double UnitsPerHour(double secondsPerTicket, int units) => 3600.0 * units / secondsPerTicket;
    public static double UtilPercent(double secondsPerTicket, int lines, int linesPerShift, double shiftSeconds) =>
        100.0 * linesPerShift * secondsPerTicket / lines / shiftSeconds;

    /// <summary>
    /// Decompose a planned walk: the clock law covers the metres, and every stop
    /// of the tour buys hands. The walk itself stays the single source of the travel.
    /// </summary>
    public static MixDecomposition Decompose(
        string name,
        Walk walk,
        TaskMix tasks,
        int unitsPerLine,
        WalkRules rules,
        int tickets)
    {
        ArgumentNullException.ThrowIfNull(walk);
        ArgumentNullException.ThrowIfNull(rules);
        tasks.Check();

        var lines = walk.Stops.Sum(stop => stop.Locations.Count);
        var units = lines * unitsPerLine;
        var travel = WalkSeconds.Of(walk, rules);
        var buckets = new List<MixBucket>
        {
            new(MixKind.Travel, 1, travel),
            new(MixKind.GrabPerLine, lines, tasks.GrabPerLineSeconds * lines),
            new(MixKind.GrabPerUnit, units, tasks.GrabPerUnitSeconds * units),
            new(MixKind.CountAndGive, units, tasks.CountAndGiveSeconds * units),
            new(MixKind.CartManeuver, walk.Stops.Count, tasks.CartManeuverSeconds * walk.Stops.Count),
            new(MixKind.PutAndVerify, lines, tasks.PutAndVerifySeconds * lines),
            new(MixKind.PackSplit, tickets, tasks.PackSplitSeconds * tickets),
        };
        var total = buckets.Sum(bucket => bucket.Seconds);
        return new MixDecomposition(name, buckets, travel, total);
    }
}
