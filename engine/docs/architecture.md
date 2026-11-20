# Architecture

The planner is a function. A floor, a list of location codes, and a return rule go in. A tour and a sweep distance come out. The same function runs in the API, the CLI, and the tests.

## Why the domain is separate

`Northspan.Domain` has no ASP.NET types and no file access. Distance, nearest neighbour, two-opt, and the serpentine sweep are pure and deterministic: the same floor and the same ticket always produce the same tour.

That split is what makes the characterization tests meaningful. They call the planner directly and lock metres. They do not boot a host, and they cannot pass because a controller formatted a string. The application layer is the part that reads JSON, rejects a bad ticket, and turns metres into a walking time. The API and the CLI are two callers of that use case.

## Why the solver is a heuristic

The cart stays in the aisles. Inside a run it travels along the run. Between runs it takes the cross-aisle that costs fewer metres. That distance is not Euclidean, and the comparison the floor lead reads is not a proof of optimality. It is the length of a serpentine sweep before improvement: west to east, direction alternating.

Nearest neighbour builds a closed tour from the gate. Ties break by location code. Two-opt then reverses any stretch that saves metres, and the same improvement is tried on the sweep. The shorter improved tour is the plan. The published number is the sweep before improvement.

The procedure is fixed, so Kiln Annex MR-204 is 110.0 m against a 150.8 m sweep every time. An exact solver is discussed in [the ADR](adr/0001-heuristic-versus-exact.md). It is the wrong tool for the ticket this service is for.

## Why there is no database

The warehouse system already stores the order and the locations. This service does not. A plan is computed and returned. Keeping a copy of floors or tickets here would be a second source of truth for data the caller already owns, and it would add nothing to a stateless walk.

Fixtures exist so the sample building can be planned without a warehouse attached. They are files. They are not a catalog service.
