using Northspan.Application;
using Northspan.Domain;

namespace Northspan.Domain.Tests;

public class StandardsTests
{
    // The standards table for the canonical counter-refill operation on Kiln Annex.
    // Metres to the tenth (the house rule), seconds and minutes to the thousandth,
    // rates and utilization to a tenth of a unit or percent. Every cell is a test.
    private static readonly (string Run, int Stops, int Lines, int Units, double Metres, int Cart, double Travel, double Seconds, double Mpu, double Mpl, double Uph, double Util)[] KilnTable =
    [
        ("CIN", 2, 2, 4, 32.5, 5, 28.261, 43.652, 0.182, 0.364, 329.9, 86.4),
        ("LOA", 1, 1, 2, 34.1, 10, 29.652, 24.965, 0.208, 0.416, 288.4, 83.2),
        ("FLI", 1, 1, 2, 50.4, 10, 43.826, 26.383, 0.220, 0.440, 272.9, 87.9),
        ("REE", 2, 2, 4, 61.8, 5, 53.739, 48.748, 0.203, 0.406, 295.4, 81.2),
        ("COB", 1, 1, 2, 58.5, 10, 50.870, 27.087, 0.226, 0.451, 265.8, 56.4),
    ];

    private static readonly (string Run, int Stops, int Lines, int Units, double Metres, int Cart, double Travel, double Seconds, double Mpu, double Mpl, double Uph, double Util)[] DryTable =
    [
        ("ASH", 1, 1, 6, 18.0, 8, 15.652, 51.457, 0.143, 0.858, 419.8, 75.0),
        ("BIR", 2, 2, 12, 30.0, 4, 26.087, 97.522, 0.135, 0.813, 443.0, 61.0),
    ];

    private static OperationStandards CounterRefill() =>
        new StandardsReport().Execute(
            SampleFiles.Kiln,
            SampleFiles.KilnOperation,
            SampleFiles.Ticket("kiln-annex", "MR-204"));

    private static OperationStandards CasePull() =>
        new StandardsReport().Execute(
            SampleFiles.DryStore,
            SampleFiles.DryStoreOperation,
            SampleFiles.Ticket("dry-store", "DS-014"));

    private static ZoneStandard Row(OperationStandards built, string run) =>
        built.Rows.Single(row => row.Zone.RunCode == run).Zone;

    public static IEnumerable<object[]> KilnRows() => KilnTable.Select(row => new object[] { row });

    [Theory]
    [MemberData(nameof(KilnRows))]
    public void Every_cell_of_the_counter_refill_table_is_locked(
        (string Run, int Stops, int Lines, int Units, double Metres, int Cart, double Travel, double Seconds, double Mpu, double Mpl, double Uph, double Util) expected)
    {
        var built = CounterRefill();
        var zone = Row(built, expected.Run);
        var run = SampleFiles.Kiln.RequireRun(expected.Run);

        Assert.Equal(run.Name, zone.RunName);
        Assert.Equal(expected.Stops, zone.StopsPerTicket);
        Assert.Equal(expected.Lines, zone.LinesPerTicket);
        Assert.Equal(expected.Units, zone.UnitsPerTicket);
        SampleFiles.EqualTenths(expected.Metres, zone.TourMetres);
        Assert.Equal(expected.Cart, zone.TicketsPerCart);
        SampleFiles.EqualThousandths(expected.Travel, zone.TravelSeconds);
        SampleFiles.EqualThousandths(expected.Seconds, zone.SecondsPerTicket);
        SampleFiles.EqualThousandths(expected.Mpu, zone.MpuMinutes);
        SampleFiles.EqualThousandths(expected.Mpl, zone.MplMinutes);
        SampleFiles.EqualTenthsOfAPercent(expected.Uph, zone.UnitsPerHour);
        SampleFiles.EqualTenthsOfAPercent(expected.Util, zone.UtilPercent);
    }

    [Fact]
    public void The_table_carries_every_zone_of_the_floor_in_run_order()
    {
        var built = CounterRefill();
        Assert.Equal(
            SampleFiles.Kiln.Runs.Select(run => run.Code).ToArray(),
            built.Rows.Select(row => row.Zone.RunCode).ToArray());
        Assert.Equal("Counter refill", built.Operation.Name);
    }

    [Theory]
    [MemberData(nameof(KilnRows))]
    public void Zone_cycles_recombine_their_own_chain(
        (string Run, int Stops, int Lines, int Units, double Metres, int Cart, double Travel, double Seconds, double Mpu, double Mpl, double Uph, double Util) expected)
    {
        // Standard-first: the locked travel, shared across the cart, plus the hands.
        var tasks = SampleFiles.KilnOperation.Tasks;
        var zone = Row(CounterRefill(), expected.Run);
        var recomputed = zone.TravelSeconds / zone.TicketsPerCart
            + tasks.GrabPerLineSeconds * zone.LinesPerTicket
            + (tasks.GrabPerUnitSeconds + tasks.CountAndGiveSeconds) * zone.UnitsPerTicket
            + tasks.PutAndVerifySeconds * zone.LinesPerTicket
            + tasks.CartManeuverSeconds * zone.StopsPerTicket
            + tasks.PackSplitSeconds;
        SampleFiles.EqualThousandths(expected.Seconds, recomputed);
    }

    [Fact]
    public void The_sample_ticket_decomposes_into_the_seven_activities()
    {
        var built = CounterRefill();
        var sample = built.Sample;
        Assert.NotNull(sample);
        Assert.Equal("MR-204", built.SampleTicketId);
        Assert.Equal(7, sample!.Buckets.Count);

        var names = new[]
        {
            MixKind.Travel, MixKind.GrabPerLine, MixKind.GrabPerUnit, MixKind.CountAndGive,
            MixKind.CartManeuver, MixKind.PutAndVerify, MixKind.PackSplit,
        };
        Assert.Equal(names, sample.Buckets.Select(bucket => bucket.Kind).ToArray());
        SampleFiles.EqualThousandths(95.652, sample.TravelSeconds);
        SampleFiles.EqualThousandths(15, sample.SecondsOf(MixKind.GrabPerLine));
        SampleFiles.EqualThousandths(20, sample.SecondsOf(MixKind.GrabPerUnit));
        SampleFiles.EqualThousandths(15, sample.SecondsOf(MixKind.CountAndGive));
        SampleFiles.EqualThousandths(20, sample.SecondsOf(MixKind.CartManeuver));
        SampleFiles.EqualThousandths(10, sample.SecondsOf(MixKind.PutAndVerify));
        SampleFiles.EqualThousandths(6, sample.SecondsOf(MixKind.PackSplit));
        SampleFiles.EqualThousandths(181.652, sample.TotalSeconds);
    }

    [Fact]
    public void Tour_first_and_standard_first_agree_on_the_sample()
    {
        // Tours-first: the published walk, priced by the clock and the stops along it.
        var rules = WalkRules.Demo;
        var planned = new PlanWalk().Execute(
            SampleFiles.Kiln,
            SampleFiles.Ticket("kiln-annex", "MR-204"),
            rules);
        var tourSeconds = WalkSeconds.Of(planned.Walk, rules);
        var tasks = SampleFiles.KilnOperation.Tasks;
        var lines = 5;
        var units = 10;
        var tourFirst = tourSeconds
            + tasks.GrabPerLineSeconds * lines
            + (tasks.GrabPerUnitSeconds + tasks.CountAndGiveSeconds) * units
            + tasks.PutAndVerifySeconds * lines
            + tasks.CartManeuverSeconds * planned.Walk.Stops.Count
            + tasks.PackSplitSeconds;

        // Standards-first: the bucket decomposition of the same walk, rebuilt from the chain.
        var built = CounterRefill();
        var sample = built.Sample!;
        Assert.Equal(planned.DurationSeconds, tourSeconds, 9);
        SampleFiles.EqualThousandths(181.652, tourFirst);
        Assert.Equal(tourFirst, sample.TotalSeconds, 5);
    }

    [Fact]
    public void The_standards_clock_is_the_walk_clock()
    {
        // Demo clock and the floor's rules file are the two existing modes.
        // Both must price the same tour to the same seconds.
        var planned = new PlanWalk().Execute(
            SampleFiles.Kiln,
            SampleFiles.Ticket("kiln-annex", "MR-204"),
            WalkRules.Demo);

        var fixtureRules = RulesFile.Read(Path.Combine(FixtureLibrary.Discover(), "kiln-annex", "rules.json"));
        var plannedWithFixtureRules = new PlanWalk().Execute(
            SampleFiles.Kiln,
            SampleFiles.Ticket("kiln-annex", "MR-204"),
            fixtureRules);

        Assert.StrictEqual(WalkRules.Demo, fixtureRules);
        Assert.Equal(planned.DurationSeconds, plannedWithFixtureRules.DurationSeconds, 9);

        // And the sample's travel bucket is that clock, not a second opinion of it.
        var sample = CounterRefill().Sample!;
        Assert.Equal(planned.DurationSeconds, sample.TravelSeconds, 9);
        Assert.Equal(96, WalkClock.RoundSeconds(sample.TravelSeconds));
    }

    [Fact]
    public void The_standard_admits_an_open_walk_when_the_rules_say_no_return()
    {
        var operation = SampleFiles.KilnOperation with
        {
            Rules = new WalkRules(1.15, MustReturn: false, DwellSecondsPerStop: 0),
        };
        var built = new StandardsReport().Execute(SampleFiles.Kiln, operation, null);
        var cinder = Row(built, "CIN");

        SampleFiles.EqualTenths(16.3, cinder.TourMetres);
        SampleFiles.EqualThousandths(14.130, cinder.TravelSeconds);
        SampleFiles.EqualThousandths(40.826, cinder.SecondsPerTicket);
        SampleFiles.EqualThousandths(0.170, cinder.MpuMinutes);
    }

    [Fact]
    public void Sensitivity_to_grab_time_propagates_exactly_per_the_chain()
    {
        var tasks = SampleFiles.KilnOperation.Tasks;
        var bumped = tasks.WithGrabPerUnitSeconds(tasks.GrabPerUnitSeconds * 1.1);
        var operation = SampleFiles.KilnOperation with { Tasks = bumped };
        var built = new StandardsReport().Execute(
            SampleFiles.Kiln,
            operation,
            SampleFiles.Ticket("kiln-annex", "MR-204"));

        var cinder = Row(built, "CIN");
        // The chain: +10% on grab per unit lifts only its own terms.
        var expected = 43.652 + 0.1 * 2.0 * 4;
        SampleFiles.EqualThousandths(expected, cinder.SecondsPerTicket);
        SampleFiles.EqualThousandths(0.185, cinder.MpuMinutes);
        SampleFiles.EqualThousandths(0.370, cinder.MplMinutes);
        SampleFiles.EqualTenthsOfAPercent(323.9, cinder.UnitsPerHour);

        var sample = built.Sample!;
        SampleFiles.EqualThousandths(183.652, sample.TotalSeconds);
        Assert.Equal("3 min 04 sec", WalkClock.Format(sample.TotalSeconds));
    }

    [Fact]
    public void The_band_matrix_scales_the_zone_standard()
    {
        var built = CounterRefill();
        foreach (var row in built.Rows)
        {
            var zone = row.Zone;
            Assert.Equal(zone.UnitsPerHour, row.Skills.Single(skill => skill.BandId == "veteran").UnitsPerHour, 9);
            Assert.Equal(0.85 * zone.UnitsPerHour, row.Skills.Single(skill => skill.BandId == "day").UnitsPerHour, 9);
            Assert.Equal(0.7 * zone.UnitsPerHour, row.Skills.Single(skill => skill.BandId == "night").UnitsPerHour, 9);
        }

        var cinder = built.Rows.Single(row => row.Zone.RunCode == "CIN");
        SampleFiles.EqualTenthsOfAPercent(280.4, cinder.Skills.Single(skill => skill.BandId == "day").UnitsPerHour);
        SampleFiles.EqualTenthsOfAPercent(230.9, cinder.Skills.Single(skill => skill.BandId == "night").UnitsPerHour);
    }

    private static void AssertCasePull(OperationStandards built)
    {
        Assert.Equal("Case pull", built.Operation.Name);
        var ash = Row(built, "ASH");
        SampleFiles.EqualTenths(18.0, ash.TourMetres);
        Assert.Equal(8, ash.TicketsPerCart);
        SampleFiles.EqualThousandths(51.457, ash.SecondsPerTicket);
        SampleFiles.EqualThousandths(0.143, ash.MpuMinutes);
        SampleFiles.EqualThousandths(0.858, ash.MplMinutes);
        SampleFiles.EqualTenthsOfAPercent(419.8, ash.UnitsPerHour);
        SampleFiles.EqualTenthsOfAPercent(75.0, ash.UtilPercent);

        var birch = Row(built, "BIR");
        SampleFiles.EqualTenths(30.0, birch.TourMetres);
        Assert.Equal(4, birch.TicketsPerCart);
        SampleFiles.EqualThousandths(97.522, birch.SecondsPerTicket);
        SampleFiles.EqualThousandths(0.135, birch.MpuMinutes);
        SampleFiles.EqualThousandths(0.813, birch.MplMinutes);
        SampleFiles.EqualTenthsOfAPercent(443.0, birch.UnitsPerHour);
        SampleFiles.EqualTenthsOfAPercent(61.0, birch.UtilPercent);

        var sample = built.Sample!;
        SampleFiles.EqualThousandths(27.826, sample.TravelSeconds);
        SampleFiles.EqualThousandths(160.326, sample.TotalSeconds);
        Assert.Equal("2 min 40 sec", WalkClock.Format(sample.TotalSeconds));
        Assert.Equal(
            0.8 * birch.UnitsPerHour,
            built.Rows.Single(row => row.Zone.RunCode == "BIR")
                .Skills.Single(skill => skill.BandId == "crew").UnitsPerHour,
            9);
    }

    [Fact]
    public void A_zone_without_a_velocity_class_it_knows_is_rejected()
    {
        var zones = SampleFiles.KilnOperation.Zones.ToArray();
        zones[0] = zones[0] with { VelocityClassId = "no-such" };
        var operation = SampleFiles.KilnOperation with { Zones = zones };

        var error = Assert.Throws<InvalidStandardsException>(() =>
            new StandardsReport().Execute(SampleFiles.Kiln, operation, null));

        Assert.Contains("no velocity class it knows", error.Message);
    }

    [Fact]
    public void A_floor_run_left_unpriced_is_rejected()
    {
        var operation = SampleFiles.KilnOperation with
        {
            Zones = SampleFiles.KilnOperation.Zones.Take(4).ToArray(),
        };

        var error = Assert.Throws<InvalidStandardsException>(() =>
            new StandardsReport().Execute(SampleFiles.Kiln, operation, null));

        Assert.Contains("unpriced aisle", error.Message);
    }

    [Fact]
    public void The_case_pull_operation_locks_on_the_second_floor() => AssertCasePull(CasePull());
}
