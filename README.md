# Northspan

Live site: https://sukrutn.github.io/northspan/

Northspan plans a picker's walk on a warehouse floor and prices the labor. The demo floor has five picking aisles, a gate, and a cart that stays in the aisles. With the operation's task mix (grab per line, grab per unit, count and give, cart maneuver, put and verify, pack split), every zone prices out in minutes per unit, minutes per line, units per hour, and utilization, with a zone-by-band matrix for the foreman.

Give it a pick list. It returns a short route from the gate and back, drawn on the floor, with distance, walk time, stops, and a comparison against walking every aisle in order. The standards section prices the same routes in minutes.

## Run it locally

```bash
npm install
npm run dev
```

The dev server listens on [http://127.0.0.1:4317](http://127.0.0.1:4317).

```bash
npm test
npm run lint
```

`npm test` checks the aisle distance, the route solver, and the standards table: every locked cell, the chain recombination, the band matrix, and ticket MR-204 priced two ways. There is no account, no database, and no external service.

## The engine

The planner lives in this repository at [`engine/`](engine/), the .NET build behind the site. The standards on the front page read the engine's published operation fixture (`engine/fixtures/kiln-annex/operation.json`) directly, and characterization tests on both sides lock the same tables, now in one CI run.

```bash
dotnet test engine/Northspan.slnx        # the engine's own tests
```

## What you can do

- Open **Demo** and add a ticket, or mark locations on the plan.
- Open **Floor** and load your own floor, operation, and ticket files, or run the built-in examples; the browser plans with the same math the engine's tests lock.
- Change quantities, remove a line, or clear the cart.
- Walk the list. The orange line is the route. **Show the sweep** draws the comparison in dashes.
- An empty cart stays empty: there is nothing to measure until a location is marked.

## Sources

The standards work sits on the order-picking literature:

- Bartholdi III, J. J., and Hackman, S. T., *Warehouse & Distribution Science*, edition 0.98.1. [Read the book](https://sukrutn.github.io/northspan/sources/warehouse-science.pdf). The order-picking chapters give this project its vocabulary: travel is walking, pick is hands, and the chapters keep the route and the sweep apart.
- de Koster, M. B. M., Le-Duc, T., and Roodbergen, K. J., "Design and control of warehouse order picking: a literature review," *European Journal of Operational Research* 182(2), 2007, 481-501. <https://doi.org/10.1016/j.ejor.2006.07.009> Order picking is commonly estimated at about 55% of warehouse operating cost, which is why a walk time alone falls short as a labor standard.
- Ratliff, H. D., and Rosenthal, A. S., "Order-picking in a rectangular warehouse: a solvable case," *Operations Research* 31(3), 1983, 507-521.
- Petersen, C. C., "An evaluation of order picking route policies," *International Journal of Operations & Production Management* 17(11), 1997, 1098-1111. The route-versus-sweep comparison the planner draws is this paper's argument: traversal-style sweeps against constructed routes.

## Media credits

The header video (`public/header-video.mp4`) and the hexagon-field
animation (`public/hex-field-colour.json`) originate from opentrade.io
and are included here for demonstration purposes; all rights remain
with their originator.

## License

MIT — see [LICENSE](LICENSE).
