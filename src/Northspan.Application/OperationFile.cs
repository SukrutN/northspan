using System.Text.Json;

using Northspan.Domain;

namespace Northspan.Application;

/// <summary>The operation file: the tasks, the demand, and the faces that stand for each zone.</summary>
public sealed class OperationDocument
{
    public string? Id { get; set; }

    public string? Name { get; set; }

    public string? Note { get; set; }

    public RulesDocument? Walk { get; set; }

    public double? ShiftSeconds { get; set; }

    public int? CartStops { get; set; }

    public int? UnitsPerLine { get; set; }

    public TaskMixDocument? Tasks { get; set; }

    public List<VelocityClassDocument>? VelocityClasses { get; set; }

    public List<OperationZoneDocument>? Zones { get; set; }

    public List<SkillDocument>? Skills { get; set; }

    public SampleDocument? Sample { get; set; }
}

public sealed class TaskMixDocument
{
    public double? GrabPerLineSeconds { get; set; }

    public double? GrabPerUnitSeconds { get; set; }

    public double? CountAndGiveSeconds { get; set; }

    public double? CartManeuverSeconds { get; set; }

    public double? PutAndVerifySeconds { get; set; }

    public double? PackSplitSeconds { get; set; }
}

public sealed class VelocityClassDocument
{
    public string? Id { get; set; }

    public string? Name { get; set; }

    public int? LinesPerShift { get; set; }
}

public sealed class OperationZoneDocument
{
    public string? Run { get; set; }

    public string? Velocity { get; set; }

    public List<string>? SampleStands { get; set; }
}

public sealed class SkillDocument
{
    public string? Id { get; set; }

    public string? Name { get; set; }

    public double? RateFactor { get; set; }
}

public sealed class SampleDocument
{
    public string? TicketId { get; set; }
}

public static class OperationFile
{
    public static Operation Read(string path, Floor floor)
    {
        string json;
        try
        {
            json = File.ReadAllText(path);
        }
        catch (Exception ex) when (ex is IOException or UnauthorizedAccessException)
        {
            throw new InvalidStandardsException($"The operation file could not be read: {ex.Message}");
        }

        try
        {
            return Parse(json, floor);
        }
        catch (JsonException ex)
        {
            throw new InvalidStandardsException($"The operation file could not be read: {ex.Message}");
        }
    }

    public static Operation Parse(string json, Floor floor)
    {
        OperationDocument? document;
        try
        {
            document = JsonSerializer.Deserialize<OperationDocument>(json, FloorFile.Options);
        }
        catch (JsonException ex)
        {
            throw new InvalidStandardsException($"The operation file could not be read: {ex.Message}");
        }

        if (document is null)
        {
            throw new InvalidStandardsException("The operation file was empty.");
        }

        return FromDocument(document, floor);
    }

    public static Operation FromDocument(OperationDocument document, Floor floor)
    {
        var walk = document.Walk?.ToRules() ?? WalkRules.Demo;
        var tasks = document.Tasks is null
            ? TaskMix.Zero
            : new TaskMix(
                document.Tasks.GrabPerLineSeconds ?? 0,
                document.Tasks.GrabPerUnitSeconds ?? 0,
                document.Tasks.CountAndGiveSeconds ?? 0,
                document.Tasks.CartManeuverSeconds ?? 0,
                document.Tasks.PutAndVerifySeconds ?? 0,
                document.Tasks.PackSplitSeconds ?? 0);

        var operation = new Operation(
            document.Id ?? "",
            document.Name ?? "",
            document.Note,
            walk,
            document.ShiftSeconds ?? 0,
            document.CartStops ?? 0,
            document.UnitsPerLine ?? 0,
            tasks,
            document.VelocityClasses?.Select(c => new VelocityClass(c.Id ?? "", c.Name ?? "", c.LinesPerShift ?? 0)).ToArray()
                ?? [],
            document.Zones?.Select(zone => new OperationZone(
                    zone.Run ?? "",
                    zone.Velocity ?? "",
                    zone.SampleStands ?? [])).ToArray()
                ?? [],
            document.Skills?.Select(band => new SkillBand(band.Id ?? "", band.Name ?? "", band.RateFactor ?? 0)).ToArray()
                ?? [],
            document.Sample?.TicketId);

        operation.Check();

        foreach (var zone in operation.Zones)
        {
            floor.RequireRun(zone.RunCode);
            foreach (var face in zone.SampleFaces)
            {
                if (floor.FindSlot(face) is null)
                {
                    throw new InvalidStandardsException(
                        $"{operation.Name} stands zone {zone.RunCode} on {face}, which is not on {floor.Name}.");
                }
            }
        }

        return operation;
    }
}
