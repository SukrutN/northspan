using Northspan.Application;
using Northspan.Domain;

namespace Northspan.Domain.Tests;

public class DryStoreTests
{
    [Fact]
    public void Second_floor_is_a_different_graph()
    {
        var floor = SampleFiles.DryStore;
        Assert.Equal(["ASH", "BIR"], floor.Runs.Select(run => run.Code).ToArray());
        Assert.Equal(["Ash", "Birch"], floor.Runs.Select(run => run.Name).ToArray());
        Assert.DoesNotContain(floor.Runs, run => run.Code is "CIN" or "LOA" or "FLI" or "REE" or "COB");

        var planned = new PlanWalk().Execute(floor, SampleFiles.Ticket("dry-store", "DS-014"), WalkRules.Demo);
        Assert.Equal(["ASH-B", "BIR-B", "BIR-A"], planned.Walk.Stops.Select(stop => stop.Locations.Single()).ToArray());
        Assert.Equal(["apron", "rear", "run"], planned.Walk.Stops.Select(stop => stop.Via).ToArray());
        Assert.Equal(32, planned.Walk.DistanceM);
        Assert.Equal(32, planned.Walk.SweepDistanceM);
        Assert.Equal(1, planned.Walk.Polyline[0].X);
        Assert.Equal(2, planned.Walk.Polyline[0].Y);
        Assert.Equal(1, planned.Walk.Polyline[^1].X);
        Assert.Equal(2, planned.Walk.Polyline[^1].Y);
        Assert.Contains(planned.Walk.Polyline, point => point.Y == 10);
    }

    [Fact]
    public void Moving_a_run_changes_the_metres()
    {
        var near = Shed(birchX: 9);
        var far = Shed(birchX: 12);
        var locations = new[] { "ASH-B", "BIR-A", "BIR-B" };
        Assert.Equal(32, WalkPlanner.Plan(near, locations, true).DistanceM);
        Assert.Equal(38, WalkPlanner.Plan(far, locations, true).DistanceM);
    }

    [Fact]
    public void Kiln_location_is_unknown_on_the_dry_store()
    {
        var error = Assert.Throws<UnknownLocationException>(() =>
            WalkPlanner.Plan(SampleFiles.DryStore, ["CIN-06-W"], true));
        Assert.Equal("CIN-06-W", error.Location);
        Assert.Contains("Dry Store", error.Message, StringComparison.Ordinal);
    }

    private static Floor Shed(double birchX) => Floor.Create(
        "shed",
        "Shed",
        20,
        12,
        [new CrossAisle("apron", "Apron aisle", 2), new CrossAisle("rear", "Rear aisle", 10)],
        new Gate("GATE", "Shed gate", 1, 2),
        [new Run("ASH", "Ash", 4), new Run("BIR", "Birch", birchX)],
        [
            new Slot("ASH-B", "ASH", "ASH-B", 8, null, null),
            new Slot("BIR-A", "BIR", "BIR-A", 5, null, null),
            new Slot("BIR-B", "BIR", "BIR-B", 9, null, null),
        ]);
}
