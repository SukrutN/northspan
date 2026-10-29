using Northspan.Application;
using Northspan.Domain;

namespace Northspan.Domain.Tests;

internal static class SampleFiles
{
    public static FixtureLibrary Library { get; } = new(FixtureLibrary.Discover());

    public static Floor Kiln { get; } = Library.LoadFloor("kiln-annex");

    public static Floor DryStore { get; } = Library.LoadFloor("dry-store");

    public static Operation KilnOperation { get; } = Library.LoadOperation("kiln-annex");

    public static Operation DryStoreOperation { get; } = Library.LoadOperation("dry-store");

    public static Ticket Ticket(string floorId, string ticketId) => Library.LoadTicket(floorId, ticketId);

    public static void EqualTenths(double expected, double actual) =>
        Assert.Equal(expected, MetresText.Tenths(actual));

    public static void EqualThousandths(double expected, double actual) =>
        Assert.Equal(expected, Math.Round(actual, 3, MidpointRounding.AwayFromZero));

    public static void EqualTenthsOfAPercent(double expected, double actual) =>
        Assert.Equal(expected, Math.Round(actual, 1, MidpointRounding.AwayFromZero));
}
