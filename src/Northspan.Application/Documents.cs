using Northspan.Domain;

namespace Northspan.Application;

public sealed class FloorDocument
{
    public string? Id { get; set; }

    public string? Name { get; set; }

    public double WidthM { get; set; }

    public double HeightM { get; set; }

    public List<CrossAisleDocument>? CrossAisles { get; set; }

    public GateDocument? Gate { get; set; }

    public List<RunDocument>? Runs { get; set; }

    public List<SlotDocument>? Slots { get; set; }

    public List<LandmarkDocument>? Landmarks { get; set; }
}

public sealed class CrossAisleDocument
{
    public string? Id { get; set; }

    public string? Name { get; set; }

    public double Y { get; set; }
}

public sealed class GateDocument
{
    public string? Id { get; set; }

    public string? Name { get; set; }

    public double X { get; set; }

    public double Y { get; set; }
}

public sealed class RunDocument
{
    public string? Code { get; set; }

    public string? Name { get; set; }

    public double X { get; set; }
}

public sealed class SlotDocument
{
    public string? Code { get; set; }

    public string? Run { get; set; }

    public string? Stand { get; set; }

    public double AlongM { get; set; }

    public string? Sku { get; set; }

    public string? Item { get; set; }
}

public sealed class LandmarkDocument
{
    public string? Id { get; set; }

    public string? Name { get; set; }

    public double X { get; set; }

    public double Y { get; set; }
}

public sealed class TicketDocument
{
    public string? Id { get; set; }

    public string? House { get; set; }

    public string? Note { get; set; }

    public List<string>? Locations { get; set; }
}

public sealed class RulesDocument
{
    public double? SpeedMps { get; set; }

    public bool? MustReturn { get; set; }

    public double? DwellSecondsPerStop { get; set; }

    public WalkRules ToRules() => new(
        SpeedMps ?? WalkRules.Demo.SpeedMps,
        MustReturn ?? WalkRules.Demo.MustReturn,
        DwellSecondsPerStop ?? WalkRules.Demo.DwellSecondsPerStop);
}
