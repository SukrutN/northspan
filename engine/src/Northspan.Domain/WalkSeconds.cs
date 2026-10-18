namespace Northspan.Domain;

/// <summary>
/// The one clock law: metres over speed, plus the dwell the rules buy at each stop.
/// PlanWalk and the standards both read their seconds from here, so a tour
/// estimate and an engineered standard can never drift apart.
/// </summary>
public static class WalkSeconds
{
    public static double Of(Walk walk, WalkRules rules)
    {
        ArgumentNullException.ThrowIfNull(walk);
        ArgumentNullException.ThrowIfNull(rules);
        rules.Check();
        return walk.DistanceM / rules.SpeedMps + walk.Stops.Count * rules.DwellSecondsPerStop;
    }
}
