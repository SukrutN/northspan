# Northspan engine

A stateless pick-path planner. A warehouse system already has the order and the slot map. This service takes a floor, a list of location codes, and walking rules, and returns a cart walk plus the cost of a plain aisle sweep. Given the operation file for a floor it also prices labour: minutes per unit, minutes per line, and units per hour for every zone the operation covers.

The [Northspan website](https://github.com/SukrutN/northspan) is the showcase for this planner. It is a separate product. Kiln Annex is fixture data in this repository, not a set of constants inside the solver.

## Requirements

.NET 10 SDK.

## Test

```bash
dotnet test
```

The characterization tests lock the Kiln Annex ticket MR-204 (Merrow Chandlery) to the walk published on the site: 110.0 m planned, 150.8 m sweep, five stops, 1.15 m/s, 1 min 36 sec. SH-118, PD-077, and NB-012 (Night desk) are covered the same way. A second floor, Dry Store, is a different graph.

## Plan a walk

```bash
dotnet run --project src/Northspan.Cli -- walk \
  --floor fixtures/kiln-annex/floor.json \
  --ticket fixtures/kiln-annex/tickets/mr-204.json
```

Optional `--rules <file>`. When the flag is omitted the demo clock is used: 1.15 m/s, return to the gate, no dwell at the face.

```
Kiln Annex — MR-204 Merrow Chandlery
Counter refill, ship Friday

#   Location    Run         Metres  Via
1   LOA-01-E    Loam          12.2  apron
2   REE-01-W    Reed          16.1  apron
3   COB-06-W    Cobalt        22.6  apron
4   FLI-06-E    Flint         20.2  rear
5   CIN-06-W    Cinder        20.2  rear

5 stops
Planned   110.0 m   1 min 36 sec
Sweep     150.8 m   before improvement
Shorter   40.8 m   27%
```

Dry Store is the same command with `fixtures/dry-store/floor.json` and `fixtures/dry-store/tickets/ds-014.json`.

## Build the standards

```bash
dotnet run --project src/Northspan.Cli -- standards \
  --floor fixtures/kiln-annex/floor.json \
  --operation fixtures/kiln-annex/operation.json \
  --ticket fixtures/kiln-annex/tickets/mr-204.json
```

An operation is the second file a floor carries. It joins the task mix (grab per line, grab per unit, count-and-give, cart maneuver, put-and-verify, pack split), the shift, the cart's stop count, the units on a line, the lines per shift of each velocity class, the skill bands, and — for every run the operation covers — the slot faces that stand for its one-cart tour. The engine owns no labour constants: everything below is read from the files the same way the walk is.

For each zone of the floor: the planner plans one cart tour and prices it by the same clock that prices a walk. The tour's walking time is shared across the tickets the cart carries — `floor(cartStops / stops)` of them. The hands never share. From that,

- MPU is minutes per unit: the amortized ticket over its units.
- MPL is minutes per line.
- UPH is units one picker clears in an hour at the standard.
- Utilization is the zone's lines per shift at the standard over one picker's shift.

```text
Counter refill — Kiln Annex
The worked operation behind the standards table: a counter-refill ticket touches every run, each line is two small units, and the hands do as much work as the cart.

 # Zone       Stops Lines Units  Metres  Cart       MPU       MPL     UPH    Util
 1 Cinder         2     2     4    32.5     5     0.182     0.364   329.9   86.4%
 2 Loam           1     1     2    34.1    10     0.208     0.416   288.4   83.2%
 3 Flint          1     1     2    50.4    10     0.220     0.440   272.9   87.9%
 4 Reed           2     2     4    61.8     5     0.203     0.406   295.4   81.2%
 5 Cobalt         1     1     2    58.5    10     0.226     0.451   265.8   56.4%

Units per hour, zone by band:
  Cinder      Veteran       329.9  Day           280.4  Night         230.9
  Loam        Veteran       288.4  Day           245.1  Night         201.9
  Flint       Veteran       272.9  Day           232.0  Night         191.0
  Reed        Veteran       295.4  Day           251.1  Night         206.8
  Cobalt      Veteran       265.8  Day           225.9  Night         186.1

Sample MR-204 — 3 min 02 sec for the ticket
  travel         1 min 36 sec  52.7%
  grab/line            15 sec  8.3%
  grab/unit            20 sec  11.0%
  count/give           15 sec  8.3%
  maneuver             20 sec  11.0%
  put/verify           10 sec  5.5%
  pack split            6 sec  3.3%
```

`--ticket` names the sample: the report decomposes one real ticket into the same seven activities. The tour-first reading (price the walk, then the hands along it) and the standard-first reading (price a zone cycle, then amortize the walk) must agree, and the characterization tests hold them together to five decimals besides locking every cell of the table above. Dry Store's `fixtures/dry-store/operation.json` is a different operation — case pull, two units of six to the line — and is locked the same way.

The API serves the same report: `GET /v1/floors/{floorId}/standards`.

## Run the API

```bash
dotnet run --project src/Northspan.Api
```

The development profile listens on `http://127.0.0.1:47231`.

- `GET /health`
- `GET /v1/floors`
- `GET /v1/floors/{floorId}`
- `GET /v1/floors/{floorId}/tickets`
- `GET /v1/floors/{floorId}/standards`
- `POST /v1/walks`
- `GET /openapi/v1.json`

Plan the published walk from the named fixture:

```bash
curl -s -X POST http://127.0.0.1:47231/v1/walks \
  -H 'content-type: application/json' \
  -d '{"floorId":"kiln-annex","ticketId":"MR-204"}'
```

Send a floor inline instead of `floorId`, or `locations` instead of `ticketId`. An unknown location is HTTP 400 with problem details. The body names the code. The service does not invent a stop.

There is no authentication, database, or message bus. The caller brings the floor and the ticket.

## Layout

| Project | Responsibility |
| --- | --- |
| `src/Northspan.Domain` | Floor, aisle distance, nearest neighbour, two-opt, serpentine sweep, clock, task mix and standards math |
| `src/Northspan.Application` | Plan-a-walk and standards use cases, file formats, validation, walking time |
| `src/Northspan.Api` | HTTP API, OpenAPI, problem details, health |
| `src/Northspan.Cli` | `northspan walk`, `northspan standards` |
| `tests/Northspan.Domain.Tests` | Tour behaviour, the published tickets, and the standards tables |
| `tests/Northspan.Api.Tests` | The sample walk, the standards route, and a bad mark, through the HTTP pipeline |

`fixtures/kiln-annex` is the building the website draws. `fixtures/dry-store` is a smaller floor with different runs, so a passing test cannot be a table of the five Kiln Annex names.

See [docs/architecture.md](docs/architecture.md), [docs/customizing-a-floor.md](docs/customizing-a-floor.md), and [docs/adr/0001-heuristic-versus-exact.md](docs/adr/0001-heuristic-versus-exact.md).

## Sources

The standards work stands on the order-picking literature; the site's standards explainer carries the same scholarship:

- Bartholdi III, J. J., and Hackman, S. T., *Warehouse & Distribution Science*, edition 0.98.1. <https://www.warehouse-science.com/book/editions/wh-sci-0.98.1.pdf> — the chapters on order picking give this engine its vocabulary: travel is walking, pick is hands, and a tour is not a sweep.
- de Koster, M. B. M., Le-Duc, T., and Roodbergen, K. J., "Design and control of warehouse order picking: a literature review," *European Journal of Operational Research* 182(2), 2007, 481–501. <https://doi.org/10.1016/j.ejor.2006.07.009> — order picking is commonly estimated at about 55% of warehouse operating cost, which is why a walk time alone is not a labour standard.
- Ratliff, H. D., and Rosenthal, A. S., "Order-picking in a rectangular warehouse: a solvable case," *Operations Research* 31(3), 1983, 507–521 — the rectangular floor with cross aisles admits an exact optimal tour; the nearest-neighbour-and-two-opt in this engine is the honest heuristic cousin of that result.
