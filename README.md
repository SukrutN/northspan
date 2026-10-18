# Northspan

Northspan plans a picker’s walk on a single warehouse floor. The worked example is Kiln Annex: five runs, an apron gate, and a cart that has to stay in the aisles.

Give it a pick list. It returns a short tour from the gate and back, drawn on the floor, with distance, walk time, stops, and a comparison against a serpentine aisle sweep.

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

`npm test` checks the aisle distance and the route solver. There is no account, database, or external service.

## What you can do

- Open **Floor** and add a house ticket, or mark faces on the plan.
- Change quantities, remove a line, or clear the cart.
- Walk the list. The oxide line is the tour. **Show the sweep** draws the naive aisle order in dashes.
- An empty cart stays empty: there is nothing to measure until a face is marked.

Kiln Annex is a model floor. The stock and the house names are a worked example, not a warehouse extract.
