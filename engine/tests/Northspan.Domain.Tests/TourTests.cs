using Northspan.Domain;

namespace Northspan.Domain.Tests;

public class TourTests
{
    [Fact]
    public void Tour_starts_and_ends_at_the_gate_and_visits_each_stop_once()
    {
        var floor = SampleFiles.Kiln;
        var walk = WalkPlanner.Plan(
            floor,
            ["CIN-06-W", "LOA-01-E", "FLI-06-E", "REE-01-W", "COB-06-W", "LOA-01-E"],
            mustReturn: true);

        Assert.Equal(floor.Gate.X, walk.Polyline[0].X);
        Assert.Equal(floor.Gate.Y, walk.Polyline[0].Y);
        Assert.Equal(floor.Gate.X, walk.Polyline[^1].X);
        Assert.Equal(floor.Gate.Y, walk.Polyline[^1].Y);
        Assert.Equal(5, walk.Stops.Count);
        Assert.Equal(5, walk.Stops.Select(stop => stop.Stand).Distinct().Count());
        Assert.Equal(
            ["CIN-06-W", "COB-06-W", "FLI-06-E", "LOA-01-E", "REE-01-W"],
            walk.Stops.SelectMany(stop => stop.Locations).OrderBy(code => code, StringComparer.Ordinal).ToArray());
    }

    [Fact]
    public void Cart_stays_on_the_runs_and_the_cross_aisles()
    {
        var floor = SampleFiles.Kiln;
        var walk = WalkPlanner.Plan(
            floor,
            ["CIN-06-W", "LOA-01-E", "FLI-06-E", "REE-01-W", "COB-06-W"],
            mustReturn: true);

        var runX = floor.Runs.Select(run => run.X).ToHashSet();
        runX.Add(floor.Gate.X);
        var aisleY = floor.CrossAisles.Select(aisle => aisle.Y).ToHashSet();

        for (var i = 1; i < walk.Polyline.Count; i++)
        {
            var a = walk.Polyline[i - 1];
            var b = walk.Polyline[i];
            var horizontal = Math.Abs(a.Y - b.Y) <= 1e-6;
            var vertical = Math.Abs(a.X - b.X) <= 1e-6;
            Assert.True(horizontal || vertical, $"Leg {i} is diagonal, which would cut a rack.");
            if (horizontal && Math.Abs(a.X - b.X) > 1e-6)
            {
                Assert.Contains(walk.Polyline[i].Y, aisleY);
            }

            if (vertical && Math.Abs(a.Y - b.Y) > 1e-6)
            {
                Assert.Contains(a.X, runX);
            }
        }

        foreach (var stop in walk.Stops)
        {
            Assert.Equal(floor.RequireRun(stop.RunCode).X, stop.X);
        }

        var cinder = floor.FindSlot("CIN-06-W")!;
        var cobalt = floor.FindSlot("COB-06-W")!;
        var cinderStop = new CartStop(cinder.Code, cinder.Run, cinder.Stand, floor.RequireRun(cinder.Run).X, cinder.AlongM, [cinder.Code]);
        var cobaltStop = new CartStop(cobalt.Code, cobalt.Run, cobalt.Stand, floor.RequireRun(cobalt.Run).X, cobalt.AlongM, [cobalt.Code]);
        var across = new AisleDistance(floor).Between(cinderStop, cobaltStop);
        var throughTheRacks = Math.Abs(cinderStop.X - cobaltStop.X);
        Assert.True(across > throughTheRacks + 1);
        SampleFiles.EqualTenths(31.6, across);
    }

    [Fact]
    public void Polyline_length_is_the_walk()
    {
        var floor = SampleFiles.Kiln;
        var walk = WalkPlanner.Plan(floor, ["CIN-06-W", "LOA-01-E", "FLI-06-E", "REE-01-W", "COB-06-W"], true);
        var drawn = 0d;
        for (var i = 1; i < walk.Polyline.Count; i++)
        {
            var a = walk.Polyline[i - 1];
            var b = walk.Polyline[i];
            drawn += Math.Abs(a.X - b.X) + Math.Abs(a.Y - b.Y);
        }

        Assert.InRange(Math.Abs(drawn - walk.DistanceM), 0, 1e-6);
    }

    [Fact]
    public void Two_opt_never_returns_a_longer_tour()
    {
        var floor = SampleFiles.Kiln;
        var distance = new AisleDistance(floor);
        var gate = WalkPlanner.GateOf(floor);
        var stops = WalkPlanner.StopsFor(floor, ["CIN-06-W", "LOA-01-E", "FLI-06-E", "REE-01-W"]);

        foreach (var order in Permutations(stops))
        {
            var tour = new List<CartStop> { gate };
            tour.AddRange(order);
            tour.Add(gate);
            var improved = TwoOpt.Improve(tour, distance);
            Assert.True(distance.Length(improved) <= distance.Length(tour) + 1e-9);
            Assert.Equal(gate.Key, improved[0].Key);
            Assert.Equal(gate.Key, improved[^1].Key);
            Assert.Equal(order.Count, improved.Count - 2);
        }

        var neighbour = NearestNeighbour.Order(stops, gate, distance);
        var reversed = new List<CartStop> { neighbour[0] };
        reversed.AddRange(neighbour.Skip(1).Take(neighbour.Count - 2).Reverse());
        reversed.Add(neighbour[^1]);
        Assert.True(distance.Length(TwoOpt.Improve(reversed, distance)) <= distance.Length(reversed) + 1e-9);
    }

    private static IEnumerable<IReadOnlyList<CartStop>> Permutations(IReadOnlyList<CartStop> stops)
    {
        var items = stops.ToArray();
        return Permute(items, 0);

        static IEnumerable<IReadOnlyList<CartStop>> Permute(CartStop[] items, int index)
        {
            if (index == items.Length)
            {
                yield return items.ToArray();
                yield break;
            }

            for (var i = index; i < items.Length; i++)
            {
                (items[index], items[i]) = (items[i], items[index]);
                foreach (var permutation in Permute(items, index + 1))
                {
                    yield return permutation;
                }

                (items[index], items[i]) = (items[i], items[index]);
            }
        }
    }
}
