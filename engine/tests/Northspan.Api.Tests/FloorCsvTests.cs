using System.Net;
using System.Net.Http.Json;
using System.Text.Json;

using Microsoft.AspNetCore.Mvc.Testing;

using Northspan.Application;

namespace Northspan.Api.Tests;

public class FloorCsvTests
{
    private static FixtureLibrary Fixtures() =>
        new(FixtureLibrary.Discover());

    private static string Csv(params string[] rows) => string.Join("\n", rows);

    [Fact]
    public void A_clean_import_replaces_the_slots_and_the_engine_proves_it()
    {
        var floor = Fixtures().ReadFloorDocument("kiln-annex")!;

        var imported = FloorCsv.Slots(floor, Csv(
            "code,run,stand,alongM,sku,item",
            "CIN-01-W,CIN,CIN-01,6.15,KW-08,Cotton wick, 8 mm",
            "CIN-01-E,CIN,CIN-01,6.15,KW-09,Wick spool",
            "LOA-01-W,LOA,LOA-01,7.0,KW-10,Wick bench"));

        Assert.Equal(3, imported.Report.RowsAccepted);
        Assert.Equal(0, imported.Report.RowsRejected);
        Assert.Equal(3, imported.Floor.Slots!.Count);
        Assert.Equal("CIN-01-W", imported.Floor.Slots[0]!.Code);
        Assert.Equal("Wick spool", imported.Floor.Slots[1]!.Item);
        // the proof: the engine's own reader accepts the spliced floor
        _ = Northspan.Application.FloorFile.FromDocument(imported.Floor);
        Assert.Contains("replaced by 3 imported locations", imported.Report.Notes[0]);
    }

    [Fact]
    public void Rows_on_runs_the_floor_does_not_have_are_refused()
    {
        var floor = Fixtures().ReadFloorDocument("kiln-annex")!;

        var imported = FloorCsv.Slots(floor, Csv(
            "code,run,stand,alongM",
            "ZZ-01-W,ZZZ,ZZ-01,5.0"));

        Assert.Equal(0, imported.Report.RowsAccepted);
        Assert.Single(imported.Report.Rejections);
        Assert.Contains("run ZZZ is not on this floor", imported.Report.Rejections[0].Reasons[0]);
        Assert.Contains("CIN", imported.Report.Rejections[0].Reasons[0]);
    }

    [Fact]
    public void A_stand_claimed_at_two_positions_is_refused()
    {
        var floor = Fixtures().ReadFloorDocument("kiln-annex")!;

        var imported = FloorCsv.Slots(floor, Csv(
            "code,run,stand,alongM",
            "CIN-01-W,CIN,CIN-01,6.15",
            "CIN-01-E,LOA,CIN-01,9.0"));

        Assert.Equal(1, imported.Report.RowsAccepted);
        Assert.Equal(1, imported.Report.RowsRejected);
        Assert.Equal(3, imported.Report.Rejections[0].Line);
        Assert.Contains("claimed by two different positions", imported.Report.Rejections[0].Reasons[0]);
    }

    [Fact]
    public void Off_building_positions_and_bad_numbers_are_refused()
    {
        var floor = Fixtures().ReadFloorDocument("kiln-annex")!;

        var imported = FloorCsv.Slots(floor, Csv(
            "code,run,stand,alongM",
            "CIN-01-W,CIN,CIN-01,99.5",
            "CIN-02-W,CIN,CIN-02,seventy"));

        Assert.Equal(0, imported.Report.RowsAccepted);
        Assert.Equal(2, imported.Report.RowsRejected);
        Assert.Contains("outside the building", imported.Report.Rejections[0].Reasons[0]);
        Assert.Contains("alongM is not a usable number", imported.Report.Rejections[1].Reasons[0]);
    }

    [Fact]
    public void An_unknown_header_column_refuses_the_file()
    {
        var floor = Fixtures().ReadFloorDocument("kiln-annex")!;

        var refused = Assert.Throws<ImportRefusalException>(() =>
            FloorCsv.Slots(floor, Csv("code,run,stand,alongM,colour", "CIN-01-W,CIN,CIN-01,6.15,blue")));
        Assert.Contains("unknown column: colour", refused.Message);
    }

    [Fact]
    public void An_empty_file_refuses_rather_than_emptying_the_floor()
    {
        var floor = Fixtures().ReadFloorDocument("kiln-annex")!;

        var refused = Assert.Throws<ImportRefusalException>(() =>
            FloorCsv.Slots(floor, Csv("code,run,stand,alongM")));
        Assert.Contains("no data rows", refused.Message);
    }

    [Fact]
    public async Task The_endpoint_imports_into_a_fixture_floor()
    {
        using var client = new ApiFactory().CreateClient();

        var csv = Csv(
            "code,run,stand,alongM,sku,item",
            "CIN-01-W,CIN,CIN-01,6.15,KW-08,Cotton wick",
            "LOA-01-E,LOA,LOA-01,5.2,KW-11,Wick oil");

        var response = await client.PostAsJsonAsync("/v1/import/floor", new
        {
            fixture = "kiln-annex",
            csv,
        });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("kiln-annex", body.GetProperty("floorId").GetString());
        Assert.Equal(2, body.GetProperty("report").GetProperty("rowsAccepted").GetInt32());
        var slots = body.GetProperty("floor").GetProperty("slots");
        Assert.Equal(2, slots.GetArrayLength());
        Assert.Equal("CIN-01-W", slots[0].GetProperty("code").GetString());
    }

    [Fact]
    public async Task The_endpoint_refuses_a_bad_header_with_words()
    {
        using var client = new ApiFactory().CreateClient();

        var response = await client.PostAsJsonAsync("/v1/import/floor", new
        {
            fixture = "kiln-annex",
            csv = "code,run,stand,alongM,colour\nCIN-01-W,CIN,CIN-01,6.15,blue",
        });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("The import was refused", body.GetProperty("title").GetString());
        Assert.Contains("unknown column", body.GetProperty("detail").GetString());
    }
}
