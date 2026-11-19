# Architecture

The planner is a function. A floor, a list of location codes, and a return rule go in. A route and a sweep distance come out. The same function runs in the API, the CLI, and the tests.

## Why the domain is separate

`Northspan.Domain` has no ASP.NET types and no file access. Distance, nearest neighbour, two-opt, and the serpentine sweep are pure and deterministic: the same floor and the same ticket always produce the same route.

That split gives the characterization tests their teeth. They call the planner directly and lock meters. They do not boot a host, and they cannot pass because a controller formatted a string. The application layer reads JSON, rejects a bad ticket, and turns meters into walking time. The API and the CLI are two callers of that use case.

## Why the solver is a heuristic

The cart stays in the aisles. Inside a run it travels along the run. Between runs it takes the cross-aisle that costs fewer meters. The distance follows the aisles. The figure a floor lead reads is the length of a serpentine sweep before improvement: west to east, direction alternating. It gives the floor lead a baseline. The solver makes no claim of optimality.

Nearest neighbour builds a closed route from the gate. Ties go to location code. Two-opt then reverses any stretch that saves meters, and the same improvement is tried on the sweep. The shorter improved route is the plan. The published number is the sweep before improvement.

The procedure is fixed, so the demo ticket MR-204 is 110.0 m against a 150.8 m sweep every time. [The ADR](adr/0001-heuristic-versus-exact.md) discusses an exact solver and why this service does not ship one.

## Why there is no database

The warehouse system already stores the order and the locations. This service keeps no copy. A plan is computed and returned. A local copy of floors or tickets would be a second source of truth for data the caller already owns, and a stateless walk gains nothing from it.

Fixtures let the sample building be planned without a warehouse attached. They are files, not a catalog service.
