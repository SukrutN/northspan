using System.Globalization;

using Northspan.Application;
using Northspan.Domain;

if (args.Length == 0 || args is ["--help"] || args is ["-h"])
{
    PrintUsage();
    return 0;
}

if (args[0] != "walk" && args[0] != "standards")
{
    Console.Error.WriteLine($"Unknown command '{args[0]}'.");
    PrintUsage();
    return 2;
}

if (args[0] == "standards")
{
    try
    {
        var standardsFlags = ReadFlags(args.AsSpan(1));
        if (!standardsFlags.TryGetValue("--floor", out var floorPath) || !standardsFlags.TryGetValue("--operation", out var operationPath))
        {
            Console.Error.WriteLine("standards needs --floor and --operation.");
            PrintUsage();
            return 2;
        }

        if (!File.Exists(floorPath))
        {
            Console.Error.WriteLine($"No floor file at {floorPath}.");
            return 2;
        }

        if (!File.Exists(operationPath))
        {
            Console.Error.WriteLine($"No operation file at {operationPath}.");
            return 2;
        }

        var floor = FloorFile.Read(floorPath);
        var operation = OperationFile.Read(operationPath, floor);

        if (standardsFlags.TryGetValue("--rules", out var rulesPath))
        {
            if (!File.Exists(rulesPath))
            {
                Console.Error.WriteLine($"No rules file at {rulesPath}.");
                return 2;
            }

            operation = operation with { Rules = RulesFile.Read(rulesPath) };
        }

        Ticket? sample = null;
        if (standardsFlags.TryGetValue("--ticket", out var ticketPath))
        {
            if (!File.Exists(ticketPath))
            {
                Console.Error.WriteLine($"No ticket file at {ticketPath}.");
                return 2;
            }

            sample = TicketFile.Read(ticketPath);
        }

        var built = new StandardsReport().Execute(floor, operation, sample);
        PrintStandards(built);
        return 0;
    }
    catch (PlanningException ex)
    {
        Console.Error.WriteLine(ex.Message);
        return 1;
    }
}

try
{
    var flags = ReadFlags(args.AsSpan(1));
    if (!flags.TryGetValue("--floor", out var floorPath) || !flags.TryGetValue("--ticket", out var ticketPath))
    {
        Console.Error.WriteLine("walk needs --floor and --ticket.");
        PrintUsage();
        return 2;
    }

    if (!File.Exists(floorPath))
    {
        Console.Error.WriteLine($"No floor file at {floorPath}.");
        return 2;
    }

    if (!File.Exists(ticketPath))
    {
        Console.Error.WriteLine($"No ticket file at {ticketPath}.");
        return 2;
    }

    var rules = WalkRules.Demo;
    if (flags.TryGetValue("--rules", out var rulesPath))
    {
        if (!File.Exists(rulesPath))
        {
            Console.Error.WriteLine($"No rules file at {rulesPath}.");
            return 2;
        }

        rules = RulesFile.Read(rulesPath);
    }

    var floor = FloorFile.Read(floorPath);
    var ticket = TicketFile.Read(ticketPath);
    var planned = new PlanWalk().Execute(floor, ticket, rules);
    PrintWalk(planned);
    return 0;
}
catch (PlanningException ex)
{
    Console.Error.WriteLine(ex.Message);
    return 1;
}
catch (ArgumentException ex)
{
    Console.Error.WriteLine(ex.Message);
    return 2;
}

static Dictionary<string, string> ReadFlags(ReadOnlySpan<string> args)
{
    var map = new Dictionary<string, string>(StringComparer.Ordinal);
    for (var i = 0; i < args.Length; i++)
    {
        var token = args[i];
        if (!token.StartsWith("--", StringComparison.Ordinal))
        {
            throw new ArgumentException($"Unexpected argument '{token}'.");
        }

        if (i + 1 >= args.Length || args[i + 1].StartsWith("--", StringComparison.Ordinal))
        {
            throw new ArgumentException($"Missing value for {token}.");
        }

        map[token] = args[++i];
    }

    return map;
}

static void PrintWalk(PlannedWalk planned)
{
    var floor = planned.Floor;
    var walk = planned.Walk;
    var title = planned.TicketId is null ? floor.Name : $"{floor.Name} — {planned.TicketId}";
    if (!string.IsNullOrWhiteSpace(planned.House))
    {
        title = $"{title} {planned.House}";
    }

    Console.WriteLine(title);
    if (!string.IsNullOrWhiteSpace(planned.Note))
    {
        Console.WriteLine(planned.Note);
    }

    Console.WriteLine();
    Console.WriteLine($"{"#",-4}{"Location",-12}{"Run",-10}{"Metres",8}  Via");
    foreach (var stop in walk.Stops)
    {
        var run = floor.RequireRun(stop.RunCode);
        var location = string.Join(",", stop.Locations);
        Console.WriteLine(
            $"{stop.Order,-4}{location,-12}{run.Name,-10}{MetresText.Format(stop.MetresFromPrevious),8}  {stop.Via}");
    }

    Console.WriteLine();
    Console.WriteLine($"{walk.Stops.Count} stops");
    Console.WriteLine($"Planned   {MetresText.Format(walk.DistanceM)} m   {planned.DurationLabel}");
    Console.WriteLine($"Sweep     {MetresText.Format(walk.SweepDistanceM)} m   before improvement");
    var comparison = planned.ShorterPercent == 0
        ? "same length as the sweep"
        : $"{planned.ShorterPercent.ToString(CultureInfo.InvariantCulture)}%";
    Console.WriteLine($"Shorter   {MetresText.Format(planned.SavedM)} m   {comparison}");

    if (!walk.ReturnedToGate)
    {
        Console.WriteLine("The walk does not return to the gate.");
    }
}

static void PrintStandards(OperationStandards built)
{
    var operation = built.Operation;
    var title = $"{operation.Name} — {built.FloorName}";
    Console.WriteLine(title);
    if (!string.IsNullOrWhiteSpace(operation.Note))
    {
        Console.WriteLine(operation.Note);
    }

    Console.WriteLine();
    Console.WriteLine(
        $"{"#",2} {"Zone",-10}{"Stops",6}{"Lines",6}{"Units",6}{"Metres",8}{"Cart",6}{"MPU",10}{"MPL",10}{"UPH",8}{"Util",8}");
    for (var i = 0; i < built.Rows.Count; i++)
    {
        var row = built.Rows[i];
        var zone = row.Zone;
        Console.WriteLine(
            $"{i + 1,2} {zone.RunName,-10}{zone.StopsPerTicket,6}{zone.LinesPerTicket,6}{zone.UnitsPerTicket,6}"
            + $"{MetresText.Format(zone.TourMetres),8}{zone.TicketsPerCart,6}"
            + $"{zone.MpuMinutes.ToString("0.000", CultureInfo.InvariantCulture),10}"
            + $"{zone.MplMinutes.ToString("0.000", CultureInfo.InvariantCulture),10}"
            + $"{zone.UnitsPerHour.ToString("0.0", CultureInfo.InvariantCulture),8}"
            + $"{zone.UtilPercent.ToString("0.0", CultureInfo.InvariantCulture),7}%");
    }

    var bands = operation.Skills;
    Console.WriteLine();
    Console.WriteLine("Units per hour, zone by band:");
    foreach (var row in built.Rows)
    {
        var cells = string.Join(
            "",
            bands.Select(band =>
            {
                var rate = row.Skills.First(skill => skill.BandId == band.Id).UnitsPerHour;
                return $"  {band.Name,-10}{rate.ToString("0.0", CultureInfo.InvariantCulture),9}";
            }));
        Console.WriteLine($"  {row.Zone.RunName,-10}{cells}");
    }

    if (built.Sample is not null)
    {
        var sample = built.Sample;
        Console.WriteLine();
        Console.WriteLine($"Sample {built.SampleTicketId} — {WalkClock.Format(sample.TotalSeconds)} for the ticket");
        foreach (var bucket in sample.Buckets)
        {
            var share = sample.TotalSeconds == 0 ? 0 : 100.0 * bucket.Seconds / sample.TotalSeconds;
            Console.WriteLine(
                $"  {MixText.Label(bucket.Kind),-13}{WalkClock.Format(bucket.Seconds),14}  {share.ToString("0.0", CultureInfo.InvariantCulture)}%");
        }
    }
}

static void PrintUsage()
{
    Console.WriteLine("northspan walk --floor <file> --ticket <file> [--rules <file>]");
    Console.WriteLine("northspan standards --floor <file> --operation <file> [--rules <file>] [--ticket <file>]");
    Console.WriteLine();
    Console.WriteLine("walk plans a cart walk and prints it beside the unimproved aisle sweep.");
    Console.WriteLine("standards prices each zone of the floor with the operation's task mix.");
}

static class MixText
{
    public static string Label(MixKind kind) => kind switch
    {
        MixKind.Travel => "travel",
        MixKind.GrabPerLine => "grab/line",
        MixKind.GrabPerUnit => "grab/unit",
        MixKind.CountAndGive => "count/give",
        MixKind.CartManeuver => "maneuver",
        MixKind.PutAndVerify => "put/verify",
        MixKind.PackSplit => "pack split",
        _ => kind.ToString(),
    };
}
