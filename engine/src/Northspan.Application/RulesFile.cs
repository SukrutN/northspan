using System.Text.Json;

using Northspan.Domain;

namespace Northspan.Application;

public static class RulesFile
{
    public static WalkRules Read(string path)
    {
        string json;
        try
        {
            json = File.ReadAllText(path);
        }
        catch (Exception ex) when (ex is IOException or UnauthorizedAccessException)
        {
            throw new InvalidRulesException($"The rules file could not be read: {ex.Message}");
        }

        try
        {
            var document = JsonSerializer.Deserialize<RulesDocument>(json, FloorFile.Options);
            return (document ?? new RulesDocument()).ToRules();
        }
        catch (JsonException ex)
        {
            throw new InvalidRulesException($"The rules file could not be read: {ex.Message}");
        }
    }
}
