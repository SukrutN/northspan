using System.Text.Json;
using System.Text.Json.Serialization;

using Northspan.Domain;

namespace Northspan.Application;

public static class FloorFile
{
    public static readonly JsonSerializerOptions Options = new(JsonSerializerDefaults.Web)
    {
        UnmappedMemberHandling = JsonUnmappedMemberHandling.Disallow,
        ReadCommentHandling = JsonCommentHandling.Skip,
        AllowTrailingCommas = true,
    };

    public static Floor Read(string path)
    {
        string json;
        try
        {
            json = File.ReadAllText(path);
        }
        catch (Exception ex) when (ex is IOException or UnauthorizedAccessException)
        {
            throw new FloorInvalidException($"The floor file could not be read: {ex.Message}");
        }

        try
        {
            return Parse(json);
        }
        catch (JsonException ex)
        {
            throw new FloorInvalidException($"The floor file could not be read: {ex.Message}");
        }
    }

    public static Floor Parse(string json)
    {
        FloorDocument? document;
        try
        {
            document = JsonSerializer.Deserialize<FloorDocument>(json, Options);
        }
        catch (JsonException ex)
        {
            throw new FloorInvalidException($"The floor file could not be read: {ex.Message}");
        }

        return FromDocument(document);
    }

    public static Floor FromDocument(FloorDocument? document)
    {
        if (document is null)
        {
            throw new FloorInvalidException("The floor file was empty.");
        }

        if (document.CrossAisles is null || document.Gate is null || document.Runs is null || document.Slots is null)
        {
            throw new FloorInvalidException("The floor file is missing runs, cross-aisles, a gate, or slots.");
        }

        return Floor.Create(
            document.Id ?? "",
            document.Name ?? "",
            document.WidthM,
            document.HeightM,
            document.CrossAisles.Select(aisle => new CrossAisle(aisle.Id ?? "", aisle.Name ?? "", aisle.Y)).ToArray(),
            new Gate(document.Gate.Id ?? "", document.Gate.Name ?? "", document.Gate.X, document.Gate.Y),
            document.Runs.Select(run => new Run(run.Code ?? "", run.Name ?? "", run.X)).ToArray(),
            document.Slots.Select(slot => new Slot(
                slot.Code ?? "",
                slot.Run ?? "",
                slot.Stand ?? "",
                slot.AlongM,
                slot.Sku,
                slot.Item)).ToArray(),
            document.Landmarks?.Select(mark => new Landmark(mark.Id ?? "", mark.Name ?? "", mark.X, mark.Y)).ToArray());
    }
}
