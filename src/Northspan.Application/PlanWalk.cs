using Northspan.Domain;

namespace Northspan.Application;

public sealed record Ticket(string? Id, string? House, string? Note, IReadOnlyList<string> Locations);

public sealed record PlannedWalk(
    Floor Floor,
    string? TicketId,
    string? House,
    string? Note,
    Walk Walk,
    WalkRules Rules,
    double DurationSeconds)
{
    public string DurationLabel => WalkClock.Format(DurationSeconds);

    public double SavedM => Walk.SweepDistanceM - Walk.DistanceM;

    public int ShorterPercent =>
        Walk.SweepDistanceM == 0
            ? 0
            : (int)Math.Round(SavedM / Walk.SweepDistanceM * 100, MidpointRounding.AwayFromZero);
}

/// <summary>The use case: check the rules, plan the walk, and put a clock on it.</summary>
public sealed class PlanWalk
{
    public PlannedWalk Execute(Floor floor, Ticket ticket, WalkRules rules)
    {
        ArgumentNullException.ThrowIfNull(floor);
        ArgumentNullException.ThrowIfNull(ticket);
        ArgumentNullException.ThrowIfNull(rules);
        rules.Check();

        var walk = WalkPlanner.Plan(floor, ticket.Locations, rules.MustReturn);
        var seconds = WalkSeconds.Of(walk, rules);
        return new PlannedWalk(floor, ticket.Id, ticket.House, ticket.Note, walk, rules, seconds);
    }
}
