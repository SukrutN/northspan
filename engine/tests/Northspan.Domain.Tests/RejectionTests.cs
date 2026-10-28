using Northspan.Application;
using Northspan.Domain;

namespace Northspan.Domain.Tests;

public class RejectionTests
{
    [Fact]
    public void Unknown_location_names_the_mark()
    {
        var error = Assert.Throws<UnknownLocationException>(() =>
            WalkPlanner.Plan(SampleFiles.Kiln, ["NO-SUCH"], true));
        Assert.Equal("NO-SUCH", error.Location);
        Assert.Contains("Kiln Annex", error.Message, StringComparison.Ordinal);
    }

    [Fact]
    public void Empty_ticket_fails()
    {
        var error = Assert.Throws<EmptyTicketException>(() =>
            new PlanWalk().Execute(SampleFiles.Kiln, new Ticket("EMPTY", null, null, []), WalkRules.Demo));
        Assert.Contains("at least one stop", error.Message, StringComparison.Ordinal);
    }

    [Fact]
    public void Blank_location_is_not_invented()
    {
        Assert.Throws<UnknownLocationException>(() =>
            WalkPlanner.Plan(SampleFiles.Kiln, ["  "], true));
    }

    [Fact]
    public void Floor_without_a_cross_aisle_fails()
    {
        const string json = """
            {
              "id": "gap",
              "name": "Gap",
              "widthM": 10,
              "heightM": 10,
              "crossAisles": [],
              "gate": { "id": "G", "name": "Gate", "x": 1, "y": 1 },
              "runs": [ { "code": "A", "name": "Only", "x": 3 } ],
              "slots": [ { "code": "A-1", "run": "A", "stand": "A-1", "alongM": 4 } ]
            }
            """;

        var error = Assert.Throws<FloorInvalidException>(() => FloorFile.Parse(json));
        Assert.Contains("cross-aisle", error.Message, StringComparison.Ordinal);
    }

    [Fact]
    public void Slot_on_a_missing_run_fails()
    {
        var error = Assert.Throws<FloorInvalidException>(() => Floor.Create(
            "gap",
            "Gap",
            10,
            10,
            [new CrossAisle("apron", "Apron", 1)],
            new Gate("G", "Gate", 1, 1),
            [new Run("A", "Only", 3)],
            [new Slot("B-1", "B", "B-1", 4, null, null)]));
        Assert.Contains("run B", error.Message, StringComparison.Ordinal);
    }

    [Fact]
    public void Repeated_slot_fails()
    {
        var error = Assert.Throws<FloorInvalidException>(() => Floor.Create(
            "gap",
            "Gap",
            10,
            10,
            [new CrossAisle("apron", "Apron", 1)],
            new Gate("G", "Gate", 1, 1),
            [new Run("A", "Only", 3)],
            [
                new Slot("A-1", "A", "A-1", 4, null, null),
                new Slot("A-1", "A", "A-1", 4, null, null),
            ]));
        Assert.Contains("repeats slot", error.Message, StringComparison.Ordinal);
    }

    [Fact]
    public void Zero_speed_is_rejected()
    {
        var error = Assert.Throws<InvalidRulesException>(() =>
            new PlanWalk().Execute(
                SampleFiles.Kiln,
                SampleFiles.Ticket("kiln-annex", "NB-012"),
                new WalkRules(0, true, 0)));
        Assert.Contains("speed", error.Message, StringComparison.OrdinalIgnoreCase);
    }
}
