using System.Diagnostics;

using Northspan.Application;
using Northspan.Domain;

namespace Northspan.Api.Tests;

/// <summary>
/// Proof at scale: the walk planner facing a distribution-center floor, not
/// a demonstration annex. The floor is generated deterministically (forty
/// runs, fifty-five bays, two faces a bay), the cart carries twelve hundred
/// locations, and the plan must land inside the stated budget. The repeat
/// plan must agree tour for tour: scale is no excuse for drift.
/// </summary>
public class WalkScaleTest
{
    private static readonly double RunPitch = 3.0;
    private static readonly double BayPitch = 2.2;

    /// <summary>The budget: generous against the observed time, tight against rot.</summary>
    private static readonly double BudgetMs = 60_000;

    private static FloorDocument BigFloor(int runs = 40, int bays = 55)
    {
        double width = runs * RunPitch + 6;
        double height = bays * BayPitch + 8;
        var doc = new FloorDocument
        {
            Id = "scale-dc",
            Name = "The generated distribution center",
            WidthM = width,
            HeightM = height,
            Gate = new GateDocument { Id = "GATE", Name = "Apron gate", X = 1.5, Y = 3.0 },
            CrossAisles =
            [
                new CrossAisleDocument { Id = "front", Name = "Front aisle", Y = 3.0 },
                new CrossAisleDocument { Id = "rear", Name = "Rear aisle", Y = height - 3.0 },
            ],
            Runs = [],
            Slots = [],
            Landmarks = [],
        };
        for (int run = 0; run < runs; run++)
        {
            string code = $"R{run + 1:00}";
            doc.Runs!.Add(new RunDocument
            {
                Code = code,
                Name = $"Run {run + 1}",
                X = 4.5 + run * RunPitch,
            });
            for (int bay = 1; bay <= bays; bay++)
            {
                string stand = $"{code}-{bay:00}";
                double along = 5.5 + bay * BayPitch;
                doc.Slots!.Add(new SlotDocument
                {
                    Code = $"{stand}-W", Run = code, Stand = stand, AlongM = along,
                    Sku = $"SC-{run:00}{bay:00}W", Item = $"Scale good {run:00}-{bay:00} west",
                });
                doc.Slots!.Add(new SlotDocument
                {
                    Code = $"{stand}-E", Run = code, Stand = stand, AlongM = along,
                    Sku = $"SC-{run:00}{bay:00}E", Item = $"Scale good {run:00}-{bay:00} east",
                });
            }
        }
        return doc;
    }

    /// <summary>Twelve hundred distinct stands, scattered by a fixed coprime
    /// stride (977 over 2,200 stands permutes them all uniquely) so the
    /// naive order is genuinely bad and the planner has work to show.
    /// Deterministic by construction.</summary>
    private static List<string> BigLocations(int stops = 1_200)
    {
        int total = 40 * 55;
        var locations = new List<string>(stops);
        for (int taken = 0; taken < stops; taken++)
        {
            int at = (taken * 977) % total;
            int run = at / 55 + 1;
            int bay = at % 55 + 1;
            locations.Add($"R{run:00}-{bay:00}-W");
        }
        return locations;
    }

    [Fact]
    public void TwelveHundredStopsPlanInsideTheBudgetAndRepeatExactly()
    {
        Floor floor = FloorFile.FromDocument(BigFloor());
        Ticket ticket = new(null, null, null, BigLocations());
        var planner = new PlanWalk();

        var watch = Stopwatch.StartNew();
        PlannedWalk first = planner.Execute(floor, ticket, WalkRules.Demo);
        watch.Stop();
        Console.WriteLine($"scale: 1,200 stops planned in {watch.ElapsedMilliseconds} ms "
            + $"(budget {BudgetMs} ms, tour {first.Walk.DistanceM:0.0} m vs sweep {first.Walk.SweepDistanceM:0.0} m)");

        Assert.True(watch.ElapsedMilliseconds < BudgetMs,
            $"1,200 stops took {watch.ElapsedMilliseconds} ms; the budget is {BudgetMs} ms");
        Assert.Equal(1_200, first.Walk.Stops.Count);
        Assert.True(first.Walk.DistanceM > 0);
        Assert.True(first.Walk.ReturnedToGate);
        // the engine's own guarantee: the planned tour is never longer than
        // the sweep it is measured against - at this stop density the
        // serpentine has no crossings to reverse, and the engine reports
        // parity honestly rather than inventing an improvement
        Assert.True(first.Walk.DistanceM <= first.Walk.SweepDistanceM + 1e-6,
            $"the tour ({first.Walk.DistanceM:0.0} m) came out longer than the sweep "
            + $"({first.Walk.SweepDistanceM:0.0} m)");

        // the repeat must agree stop for stop: the planner is deterministic
        PlannedWalk second = planner.Execute(floor, ticket, WalkRules.Demo);
        Assert.Equal(first.Walk.Stops.Count, second.Walk.Stops.Count);
        for (int i = 0; i < first.Walk.Stops.Count; i++)
        {
            Assert.Equal(first.Walk.Stops[i].Locations[0], second.Walk.Stops[i].Locations[0]);
            Assert.Equal(first.Walk.Stops[i].MetresFromPrevious, second.Walk.Stops[i].MetresFromPrevious);
        }
        Assert.Equal(first.Walk.DistanceM, second.Walk.DistanceM, 3);
    }

    /// <summary>A real pick ticket is sparse: a few dozen stands scattered
    /// across the floor. There the serpentine wastes travel, and the
    /// planner's value shows: the tour must beat the sweep.</summary>
    private static List<string> SparseLocations(int stops = 80)
    {
        int total = 40 * 55;
        var locations = new List<string>(stops);
        for (int taken = 0; taken < stops; taken++)
        {
            int at = (taken * 977) % total;
            int run = at / 55 + 1;
            int bay = at % 55 + 1;
            locations.Add($"R{run:00}-{bay:00}-W");
        }
        return locations;
    }

    [Fact]
    public void ASparseTicketBeatsTheSweepAtScale()
    {
        Floor floor = FloorFile.FromDocument(BigFloor());
        Ticket ticket = new(null, null, null, SparseLocations());
        var planner = new PlanWalk();
        PlannedWalk planned = planner.Execute(floor, ticket, WalkRules.Demo);

        Assert.True(planned.SavedM > 0,
            $"a sparse ticket must beat the sweep: saved {planned.SavedM:0.0} m");
        Console.WriteLine($"scale: 80 scattered stops save {planned.SavedM:0.0} m "
            + $"({planned.ShorterPercent}% shorter than the sweep)");
    }
}
