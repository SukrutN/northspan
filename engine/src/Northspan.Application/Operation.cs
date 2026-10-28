using Northspan.Domain;

namespace Northspan.Application;

/// <summary>How fast a zone moves stock: a demand class the fixture names and pays in lines per shift.</summary>
public sealed record VelocityClass(string Id, string Name, int LinesPerShift);

/// <summary>A band of pickers whose hands are allowed a share of the standard. The veteran carries 1.0.</summary>
public sealed record SkillBand(string Id, string Name, double RateFactor);

/// <summary>One zone of the operation: its demand class and the faces that stand for its tour.</summary>
public sealed record OperationZone(string RunCode, string VelocityClassId, IReadOnlyList<string> SampleFaces);

/// <summary>
/// The fictional operation the standards describe: order width is where the ticket's
/// faces fall, units per line and the task mix are the hands, and the velocity classes
/// are the demand. Everything the standards need is data; the engine owns no constants.
/// </summary>
public sealed record Operation(
    string Id,
    string Name,
    string? Note,
    WalkRules Rules,
    double ShiftSeconds,
    int CartStops,
    int UnitsPerLine,
    TaskMix Tasks,
    IReadOnlyList<VelocityClass> VelocityClasses,
    IReadOnlyList<OperationZone> Zones,
    IReadOnlyList<SkillBand> Skills,
    string? SampleTicketId)
{
    public void Check()
    {
        if (string.IsNullOrWhiteSpace(Id))
        {
            throw new InvalidStandardsException("The operation needs an id.");
        }

        var operationName = string.IsNullOrWhiteSpace(Name) ? "This operation" : Name.Trim();

        Rules.Check();

        if (!double.IsFinite(ShiftSeconds) || ShiftSeconds <= 0)
        {
            throw new InvalidStandardsException($"{operationName} needs a positive shift in seconds.");
        }

        if (CartStops < 1)
        {
            throw new InvalidStandardsException($"{operationName} needs a cart of at least one stop.");
        }

        if (UnitsPerLine < 1)
        {
            throw new InvalidStandardsException($"{operationName} needs at least one unit per line.");
        }

        Tasks.Check();

        var classIds = new HashSet<string>(StringComparer.Ordinal);
        foreach (var velocityClass in VelocityClasses)
        {
            if (string.IsNullOrWhiteSpace(velocityClass.Id) || !classIds.Add(velocityClass.Id))
            {
                throw new InvalidStandardsException($"{operationName} repeats or blanks a velocity class id.");
            }

            if (velocityClass.LinesPerShift <= 0)
            {
                throw new InvalidStandardsException(
                    $"{operationName} pays velocity class {velocityClass.Id} no lines per shift.");
            }
        }

        if (VelocityClasses.Count == 0)
        {
            throw new InvalidStandardsException($"{operationName} has no velocity classes, so no zone carries demand.");
        }

        if (Zones.Count == 0)
        {
            throw new InvalidStandardsException($"{operationName} has no zones, so there is no standard to build.");
        }

        var runCodes = new HashSet<string>(StringComparer.Ordinal);
        foreach (var zone in Zones)
        {
            if (string.IsNullOrWhiteSpace(zone.RunCode) || !runCodes.Add(zone.RunCode))
            {
                throw new InvalidStandardsException($"{operationName} repeats or blanks a zone run.");
            }

            var velocity = VelocityClasses.FirstOrDefault(c => c.Id == zone.VelocityClassId);
            if (velocity is null)
            {
                throw new InvalidStandardsException(
                    $"{operationName} pays zone {zone.RunCode} no velocity class it knows. Add the class or fix the zone.");
            }

            if (zone.SampleFaces.Count == 0)
            {
                throw new InvalidStandardsException(
                    $"{operationName} leaves zone {zone.RunCode} no faces, so its tour cannot be walked.");
            }
        }

        var bandIds = new HashSet<string>(StringComparer.Ordinal);
        foreach (var band in Skills)
        {
            if (string.IsNullOrWhiteSpace(band.Id) || !bandIds.Add(band.Id))
            {
                throw new InvalidStandardsException($"{operationName} repeats or blanks a skill band id.");
            }

            if (!double.IsFinite(band.RateFactor) || band.RateFactor <= 0 || band.RateFactor > 1)
            {
                throw new InvalidStandardsException(
                    $"{operationName} pays skill band {band.Id} a rate factor outside 0 to 1.");
            }
        }

        if (Skills.Count == 0)
        {
            throw new InvalidStandardsException($"{operationName} has no skill bands, so sheet 06 gets no matrix.");
        }
    }
}
