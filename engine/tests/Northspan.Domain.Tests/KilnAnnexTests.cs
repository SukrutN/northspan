using Northspan.Application;
using Northspan.Domain;

namespace Northspan.Domain.Tests;

public class KilnAnnexTests
{
    private static readonly (string Ticket, int Stops, double Planned, double Sweep, string[] Order)[] Published =
    [
        ("MR-204", 5, 110.0, 150.8, ["LOA-01-E", "REE-01-W", "COB-06-W", "FLI-06-E", "CIN-06-W"]),
        ("SH-118", 5, 106.1, 106.1, ["CIN-02-E", "FLI-01-W", "REE-02-E", "REE-04-W", "COB-05-E"]),
        ("PD-077", 4, 88.4, 88.4, ["CIN-04-W", "LOA-05-E", "LOA-03-W", "FLI-04-W"]),
        ("NB-012", 1, 58.5, 58.5, ["COB-01-E"]),
    ];

    [Fact]
    public void Floor_matches_the_published_building()
    {
        var floor = SampleFiles.Kiln;
        Assert.Equal("kiln-annex", floor.Id);
        Assert.Equal(38, floor.WidthM);
        Assert.Equal(26, floor.HeightM);
        Assert.Equal(["apron", "rear"], floor.CrossAisles.Select(aisle => aisle.Id).ToArray());
        Assert.Equal(3.8, floor.CrossAisles[0].Y);
        Assert.Equal(22.8, floor.CrossAisles[1].Y);
        Assert.Equal("APRON", floor.Gate.Id);
        Assert.Equal(1.5, floor.Gate.X);
        Assert.Equal(3.8, floor.Gate.Y);
        Assert.Equal(["CIN", "LOA", "FLI", "REE", "COB"], floor.Runs.Select(run => run.Code).ToArray());
        Assert.Equal(5.6, floor.Runs[0].X);
        Assert.Equal(5.6 + (4 * 5.7), floor.Runs[4].X);
        Assert.Equal(60, floor.Slots.Count);
        Assert.Equal(6.15 + (5 * 2.45), floor.FindSlot("CIN-06-W")!.AlongM);
        Assert.Equal("Beeswax sheet", floor.FindSlot("CIN-06-W")!.Item);
        Assert.Contains(floor.Landmarks, mark => mark.Id == "pack");
    }

    [Theory]
    [MemberData(nameof(Tickets))]
    public void Published_tickets_match_the_site(string ticketId, int stops, double planned, double sweep, string[] order)
    {
        var result = Plan(ticketId);
        Assert.Equal(stops, result.Walk.Stops.Count);
        SampleFiles.EqualTenths(planned, result.Walk.DistanceM);
        SampleFiles.EqualTenths(sweep, result.Walk.SweepDistanceM);
        Assert.Equal(order, result.Walk.Stops.Select(stop => stop.Locations.Single()).ToArray());
        Assert.True(result.Walk.SweepDistanceM + 1e-6 >= result.Walk.DistanceM);
    }

    [Fact]
    public void Mr204_clock_matches_the_published_walk()
    {
        var result = Plan("MR-204");
        Assert.Equal(110.0, result.Walk.DistanceM);
        SampleFiles.EqualTenths(150.8, result.Walk.SweepDistanceM);
        Assert.Equal(27, result.ShorterPercent);
        Assert.Equal("1 min 36 sec", result.DurationLabel);
        Assert.Equal(96, WalkClock.RoundSeconds(result.DurationSeconds));
        Assert.Equal(5, result.Walk.Stops.Count);
        Assert.Equal(1.15, result.Rules.SpeedMps);
    }

    [Fact]
    public void Sweep_for_merrow_is_the_unimproved_west_to_east_order()
    {
        var floor = SampleFiles.Kiln;
        var ticket = SampleFiles.Ticket("kiln-annex", "MR-204");
        var stops = WalkPlanner.StopsFor(floor, ticket.Locations);
        var sweep = SerpentineSweep.Order(floor, stops, WalkPlanner.GateOf(floor));
        var distance = new AisleDistance(floor);

        Assert.Equal(
            ["APRON", "CIN-06-W", "LOA-01-E", "FLI-06-E", "REE-01-W", "COB-06-W", "APRON"],
            sweep.Select(stop => stop.Locations.SingleOrDefault() ?? stop.Key).ToArray());
        SampleFiles.EqualTenths(150.8, distance.Length(sweep));
    }

    [Fact]
    public void Opposite_faces_of_one_bay_are_a_single_stop()
    {
        var walk = WalkPlanner.Plan(SampleFiles.Kiln, ["CIN-06-W", "CIN-06-E"], mustReturn: true);
        Assert.Single(walk.Stops);
        Assert.Equal(["CIN-06-E", "CIN-06-W"], walk.Stops[0].Locations.OrderBy(code => code, StringComparer.Ordinal).ToArray());
        Assert.Equal(SampleFiles.Kiln.Runs[0].X, walk.Stops[0].X);
    }

    [Fact]
    public void Dwell_is_added_per_stop_and_is_not_in_the_demo_clock()
    {
        var ticket = SampleFiles.Ticket("kiln-annex", "MR-204");
        var withDwell = new PlanWalk().Execute(SampleFiles.Kiln, ticket, new WalkRules(1.15, true, 10));
        var demo = Plan("MR-204");
        Assert.Equal(demo.DurationSeconds + 50, withDwell.DurationSeconds);
    }

    [Fact]
    public void Leaving_the_return_off_drops_the_walk_home()
    {
        var open = WalkPlanner.Plan(SampleFiles.Kiln, ["COB-01-E"], mustReturn: false);
        var closed = WalkPlanner.Plan(SampleFiles.Kiln, ["COB-01-E"], mustReturn: true);
        Assert.False(open.ReturnedToGate);
        Assert.True(closed.ReturnedToGate);
        Assert.True(open.DistanceM < closed.DistanceM);
        Assert.InRange(Math.Abs((closed.DistanceM - open.DistanceM) - open.DistanceM), 0, 1e-6);
    }

    public static IEnumerable<object[]> Tickets() =>
        Published.Select(row => new object[] { row.Ticket, row.Stops, row.Planned, row.Sweep, row.Order });

    private static PlannedWalk Plan(string ticketId) =>
        new PlanWalk().Execute(
            SampleFiles.Kiln,
            SampleFiles.Ticket("kiln-annex", ticketId),
            WalkRules.Demo);
}
