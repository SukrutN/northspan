# Customizing a floor

A building is a JSON file. The solver reads runs, cross-aisles, the gate, and slots. It does not know that Kiln Annex has a run called Cinder.

```bash
dotnet run --project src/Northspan.Cli -- walk --floor <floor.json> --ticket <ticket.json>
```

Rules are optional. Omitted, the clock is the demo clock: 1.15 metres per second, the tour returns to the gate, and dwell per stop is zero. Reach at the face is not in the time unless you set `dwellSecondsPerStop`.

## Floor

Coordinates are metres. North is +Y, east is +X. Runs are north-south lines. Cross-aisles are east-west lines. The cart travels along a run, and changes runs only on a cross-aisle. List the apron before the rear aisle when they should win a tie the way Kiln Annex does: the first shortest cross-aisle is the one the cart takes.

Slots that share a `stand` are one cart stop. On Kiln Annex the west and east faces of a bay share a stand, because the picker reaches both from the same point in the run. `alongM` is the position of that stand along the run. Landmarks, including pack, are drawn on the file and ignored by the walk.

Dry Store is the worked example. The file is `fixtures/dry-store/floor.json`.

```json
{
  "id": "dry-store",
  "name": "Dry Store",
  "widthM": 16,
  "heightM": 12,
  "crossAisles": [
    { "id": "apron", "name": "Apron aisle", "y": 2 },
    { "id": "rear", "name": "Rear aisle", "y": 10 }
  ],
  "gate": { "id": "GATE", "name": "Shed gate", "x": 1, "y": 2 },
  "runs": [
    { "code": "ASH", "name": "Ash", "x": 4 },
    { "code": "BIR", "name": "Birch", "x": 9 }
  ],
  "slots": [
    { "code": "ASH-A", "run": "ASH", "stand": "ASH-A", "alongM": 4, "item": "South bin" },
    { "code": "ASH-B", "run": "ASH", "stand": "ASH-B", "alongM": 8, "item": "North bin" },
    { "code": "BIR-A", "run": "BIR", "stand": "BIR-A", "alongM": 5, "item": "Low bin" },
    { "code": "BIR-B", "run": "BIR", "stand": "BIR-B", "alongM": 9, "item": "High bin" }
  ],
  "landmarks": [
    { "id": "pack", "name": "Pack", "x": 14, "y": 2 }
  ]
}
```

A slot whose `run` is not on the floor, a repeated location code, or a floor with no cross-aisle is rejected. The message says what is wrong. An unknown code on a ticket is rejected the same way. The planner does not drop a pin in the middle of a rack.

## Ticket

```json
{
  "id": "DS-014",
  "house": "Dry Store sample",
  "note": "Three bins. The middle leg is shorter on the rear aisle.",
  "locations": ["ASH-B", "BIR-A", "BIR-B"]
}
```

`house` and `note` are labels. `locations` are the stops. A repeated code is one visit. Two codes on the same stand are one visit.

## The 32 metre walk

Ticket DS-014, returning to the gate.

- Gate (1, 2) to Ash north (4, 8). The apron costs 3 m east and 6 m north, 9 m. The rear aisle costs 13 m. The cart takes the apron.
- Ash north (4, 8) to Birch high (9, 9). The rear aisle costs 2 m north, 5 m east, and 1 m south, 8 m. The apron costs 18 m. The cart takes the rear aisle.
- Birch high (9, 9) to Birch low (9, 5) stays on the run: 4 m.
- Birch low (9, 5) back to the gate. The apron costs 11 m.

9 + 8 + 4 + 11 = 32 m. The serpentine sweep, west to east, visits the same stands in the same order, so the sweep is 32 m as well. Moving Birch from x = 9 to x = 12 changes this walk to 38 m. The solver is reading the file.

## Rules

```json
{
  "speedMps": 1.15,
  "mustReturn": true,
  "dwellSecondsPerStop": 0
}
```

Walking time is distance divided by `speedMps`, plus dwell once per stop. `mustReturn: false` drops the leg back to the gate from both the plan and the sweep, so the comparison stays fair. The tour itself was still improved as a walk that could return.

## Operation

The rules price the cart. An operation prices the picker. It is a second file that shares the floor's id, and `standards` reads the two together:

```bash
dotnet run --project src/Northspan.Cli -- standards --floor <floor.json> --operation <operation.json>
```

The Dry Store operation is `fixtures/dry-store/operation.json`:

```json
{
  "id": "case-pull",
  "name": "Case pull",
  "note": "A different operation on the second floor: full cases off the bins, heavier grabs, a shorter cart.",
  "walk": {
    "speedMps": 1.15,
    "mustReturn": true,
    "dwellSecondsPerStop": 0
  },
  "shiftSeconds": 28800,
  "cartStops": 8,
  "unitsPerLine": 6,
  "tasks": {
    "grabPerLineSeconds": 4.0,
    "grabPerUnitSeconds": 4.0,
    "countAndGiveSeconds": 1.0,
    "cartManeuverSeconds": 5.0,
    "putAndVerifySeconds": 2.5,
    "packSplitSeconds": 8.0
  },
  "velocityClasses": [
    { "id": "hot", "name": "Hot", "linesPerShift": 420 },
    { "id": "flow", "name": "Flow", "linesPerShift": 360 }
  ],
  "zones": [
    { "run": "ASH", "velocity": "hot", "sampleStands": ["ASH-B"] },
    { "run": "BIR", "velocity": "flow", "sampleStands": ["BIR-A", "BIR-B"] }
  ],
  "skills": [
    { "id": "veteran", "name": "Veteran", "rateFactor": 1.0 },
    { "id": "crew", "name": "Crew", "rateFactor": 0.8 }
  ],
  "sample": { "ticketId": "DS-014" }
}
```

- `tasks` is the task mix in seconds: grab once per line, grab per unit, count-and-give per unit, cart maneuver per stop, put-and-verify per line, and one pack split per ticket. These are the hands' charges from the operation's own time studies; the engine carries no constants of its own.
- `shiftSeconds` is one picker's shift. `cartStops` is the cart's capacity in stops, so a zone tour of fewer stops shares its walking time across `floor(cartStops / stops)` tickets; the hands never share.
- `velocityClasses` is the demand side: the lines per shift each class is expected to pull. Every zone names its class.
- `sampleStands` are the faces whose stands make a zone's one-cart tour; they must be slots on the floor.
- `skills` are bands with a `rateFactor`, and the report turns zone standards into a zone-times-band matrix.
- `sample` names a ticket for the report's decomposition. The API resolves it from the floor's ticket fixtures; on the CLI, `--ticket <file>` charges the sample instead.
- `walk` is the same shape as the rules above and works the same way: omit it and the demo clock prices the tours; `--rules <file>` on the CLI overrides it here too.

The operation is checked before anything is printed: blank or repeated ids, a run the floor does not have, a face that is not a slot, a zone naming a velocity class the file never defined, or a run of the floor left out of `zones` are all rejected with the reason.

## Kiln Annex

`fixtures/kiln-annex/floor.json` is the same shape: 38 by 26 m, runs Cinder, Loam, Flint, Reed, and Cobalt, the rear aisle on the north, the apron on the south, the gate at the west end of the apron, pack at the east. Sixty slots. The four house tickets live under `fixtures/kiln-annex/tickets/`. MR-204 is the 110.0 m walk.
