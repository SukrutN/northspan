namespace Northspan.Domain;

/// <summary>A point on the floor, in metres. North is +Y, east is +X.</summary>
public readonly record struct Point(double X, double Y);

/// <summary>An east-west aisle the cart may use to change runs. The first shortest aisle wins a tie.</summary>
public sealed record CrossAisle(string Id, string Name, double Y);

/// <summary>A north-south run. The cart travels this line; it does not enter the rack.</summary>
public sealed record Run(string Code, string Name, double X);

/// <summary>Where the tour starts. On Kiln Annex this is the west end of the apron.</summary>
public sealed record Gate(string Id, string Name, double X, double Y);

/// <summary>
/// One pick face. Slots that share a stand are one cart stop: the picker reaches both faces
/// from the same point in the run.
/// </summary>
public sealed record Slot(string Code, string Run, string Stand, double AlongM, string? Sku, string? Item);

/// <summary>Something drawn on the floor that the cart does not visit. Pack is a landmark.</summary>
public sealed record Landmark(string Id, string Name, double X, double Y);

/// <summary>
/// One building. Runs are north-south, cross-aisles are east-west, and the slot map is data.
/// The solver does not know the names of the runs.
/// </summary>
public sealed class Floor
{
    private readonly Dictionary<string, Slot> _slots;
    private readonly Dictionary<string, Run> _runs;

    private Floor(
        string id,
        string name,
        double widthM,
        double heightM,
        IReadOnlyList<CrossAisle> crossAisles,
        Gate gate,
        IReadOnlyList<Run> runs,
        IReadOnlyList<Slot> slots,
        IReadOnlyList<Landmark> landmarks)
    {
        Id = id;
        Name = name;
        WidthM = widthM;
        HeightM = heightM;
        CrossAisles = crossAisles;
        Gate = gate;
        Runs = runs;
        Slots = slots;
        Landmarks = landmarks;
        _slots = slots.ToDictionary(slot => slot.Code, StringComparer.Ordinal);
        _runs = runs.ToDictionary(run => run.Code, StringComparer.Ordinal);
    }

    public string Id { get; }

    public string Name { get; }

    public double WidthM { get; }

    public double HeightM { get; }

    public IReadOnlyList<CrossAisle> CrossAisles { get; }

    public Gate Gate { get; }

    public IReadOnlyList<Run> Runs { get; }

    public IReadOnlyList<Slot> Slots { get; }

    public IReadOnlyList<Landmark> Landmarks { get; }

    public static string NormalizeCode(string code) => code.Trim().ToUpperInvariant();

    public Slot? FindSlot(string code) =>
        _slots.TryGetValue(NormalizeCode(code), out var slot) ? slot : null;

    public Run RequireRun(string code) =>
        _runs.TryGetValue(code, out var run)
            ? run
            : throw new InvalidOperationException($"Run {code} is not on {Name}.");

    public static Floor Create(
        string id,
        string name,
        double widthM,
        double heightM,
        IReadOnlyList<CrossAisle> crossAisles,
        Gate gate,
        IReadOnlyList<Run> runs,
        IReadOnlyList<Slot> slots,
        IReadOnlyList<Landmark>? landmarks = null)
    {
        var floorName = string.IsNullOrWhiteSpace(name) ? "This floor" : name.Trim();
        id = RequireText(id, "id", floorName);
        name = RequireText(name, "name", floorName);

        if (!double.IsFinite(widthM) || widthM <= 0 || !double.IsFinite(heightM) || heightM <= 0)
        {
            throw new FloorInvalidException($"{floorName} needs a positive width and height.");
        }

        if (crossAisles.Count == 0)
        {
            throw new FloorInvalidException(
                $"{floorName} cannot be walked: it has no cross-aisle, so the cart cannot move between runs.");
        }

        var aisleIds = new HashSet<string>(StringComparer.Ordinal);
        var aisles = new List<CrossAisle>(crossAisles.Count);
        foreach (var aisle in crossAisles)
        {
            var aisleId = RequireText(aisle.Id, "cross-aisle id", floorName);
            var aisleName = RequireText(aisle.Name, "cross-aisle name", floorName);
            RequireInside(aisle.Y, heightM, $"cross-aisle {aisleId}", floorName);
            if (!aisleIds.Add(aisleId))
            {
                throw new FloorInvalidException($"{floorName} repeats cross-aisle '{aisleId}'.");
            }

            aisles.Add(new CrossAisle(aisleId, aisleName, aisle.Y));
        }

        var gateId = RequireText(gate.Id, "gate id", floorName);
        var gateName = RequireText(gate.Name, "gate name", floorName);
        RequireInside(gate.X, widthM, "the gate", floorName);
        RequireInside(gate.Y, heightM, "the gate", floorName);

        if (runs.Count == 0)
        {
            throw new FloorInvalidException($"{floorName} has no runs.");
        }

        var runCodes = new HashSet<string>(StringComparer.Ordinal);
        var builtRuns = new List<Run>(runs.Count);
        foreach (var run in runs)
        {
            var code = RequireCode(run.Code, "run code", floorName);
            var runName = RequireText(run.Name, "run name", floorName);
            RequireInside(run.X, widthM, $"run {code}", floorName);
            if (!runCodes.Add(code))
            {
                throw new FloorInvalidException($"{floorName} repeats run '{code}'.");
            }

            builtRuns.Add(new Run(code, runName, run.X));
        }

        var slotCodes = new HashSet<string>(StringComparer.Ordinal);
        var stands = new Dictionary<string, (string Run, double Along)>(StringComparer.Ordinal);
        var builtSlots = new List<Slot>(slots.Count);
        foreach (var slot in slots)
        {
            var code = RequireCode(slot.Code, "slot code", floorName);
            var runCode = RequireCode(slot.Run, "slot run", floorName);
            var stand = RequireCode(slot.Stand, "stand", floorName);
            if (!runCodes.Contains(runCode))
            {
                throw new FloorInvalidException(
                    $"{floorName} slot {code} names run {runCode}, which is not on this floor.");
            }

            RequireInside(slot.AlongM, heightM, $"slot {code}", floorName);
            if (!slotCodes.Add(code))
            {
                throw new FloorInvalidException($"{floorName} repeats slot '{code}'.");
            }

            if (stands.TryGetValue(stand, out var existing))
            {
                if (!string.Equals(existing.Run, runCode, StringComparison.Ordinal)
                    || Math.Abs(existing.Along - slot.AlongM) > 1e-9)
                {
                    throw new FloorInvalidException(
                        $"{floorName} stand {stand} is claimed by two different positions.");
                }
            }
            else
            {
                stands.Add(stand, (runCode, slot.AlongM));
            }

            builtSlots.Add(new Slot(code, runCode, stand, slot.AlongM, BlankToNull(slot.Sku), BlankToNull(slot.Item)));
        }

        var builtLandmarks = new List<Landmark>();
        var landmarkIds = new HashSet<string>(StringComparer.Ordinal);
        foreach (var landmark in landmarks ?? [])
        {
            var landmarkId = RequireText(landmark.Id, "landmark id", floorName);
            var landmarkName = RequireText(landmark.Name, "landmark name", floorName);
            RequireInside(landmark.X, widthM, $"landmark {landmarkId}", floorName);
            RequireInside(landmark.Y, heightM, $"landmark {landmarkId}", floorName);
            if (!landmarkIds.Add(landmarkId))
            {
                throw new FloorInvalidException($"{floorName} repeats landmark '{landmarkId}'.");
            }

            builtLandmarks.Add(new Landmark(landmarkId, landmarkName, landmark.X, landmark.Y));
        }

        return new Floor(
            id,
            name,
            widthM,
            heightM,
            aisles,
            new Gate(gateId, gateName, gate.X, gate.Y),
            builtRuns,
            builtSlots,
            builtLandmarks);
    }

    private static string RequireText(string? value, string label, string floorName)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            throw new FloorInvalidException($"{floorName} has a blank {label}.");
        }

        return value.Trim();
    }

    private static string RequireCode(string? value, string label, string floorName) =>
        NormalizeCode(RequireText(value, label, floorName));

    private static void RequireInside(double value, double limit, string what, string floorName)
    {
        if (!double.IsFinite(value) || value < 0 || value > limit)
        {
            throw new FloorInvalidException($"{floorName} places {what} outside the building.");
        }
    }

    private static string? BlankToNull(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}
