# Northspan

Live site: https://sukrutn.github.io/northspan/

Northspan plans a picker’s walk on a single warehouse floor. The worked example is Kiln Annex: five runs, an apron gate, and a cart that has to stay in the aisles. The same floor carries a labour standard: with the counter-refill operation’s task mix — grab per line, grab per unit, count-and-give, cart maneuver, put-and-verify, pack split — every zone prices out in minutes per unit, minutes per line, units per hour, and utilization, with a zone-times-band matrix for the foreman.

Give it a pick list. It returns a short tour from the gate and back, drawn on the floor, with distance, walk time, stops, and a comparison against a serpentine aisle sweep. The standards section on the front page prices the same tours by the minute.

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

`npm test` checks the aisle distance, the route solver, and the standards table (every locked cell, the chain recombination, the band matrix, and ticket MR-204 priced two ways). There is no account, database, or external service.

## What you can do

- Open **Floor** and add a house ticket, or mark faces on the plan.
- Change quantities, remove a line, or clear the cart.
- Walk the list. The oxide line is the tour. **Show the sweep** draws the naive aisle order in dashes.
- An empty cart stays empty: there is nothing to measure until a face is marked.

Kiln Annex is a model floor. The stock and the house names are a worked example, not a warehouse extract.

## Sources

The standards work sits on the order-picking literature:

- Bartholdi III, J. J., and Hackman, S. T., *Warehouse & Distribution Science*, edition 0.98.1. <https://www.warehouse-science.com/book/editions/wh-sci-0.98.1.pdf> — the order-picking chapters give the vocabulary: travel is walking, pick is hands, and a tour is not a sweep.
- de Koster, M. B. M., Le-Duc, T., and Roodbergen, K. J., "Design and control of warehouse order picking: a literature review," *European Journal of Operational Research* 182(2), 2007, 481–501. <https://doi.org/10.1016/j.ejor.2006.07.009> — order picking is commonly estimated at about 55% of warehouse operating cost, which is why a walk time alone is not a labour standard.
- Ratliff, H. D., and Rosenthal, A. S., "Order-picking in a rectangular warehouse: a solvable case," *Operations Research* 31(3), 1983, 507–521.
