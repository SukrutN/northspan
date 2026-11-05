import assert from "node:assert/strict";
import { ORDERS } from "./orders";
import { planWalk, formatDuration } from "./routing";
import { ZONE_STANDARDS, OPERATION, TASKS, SKILLS, sampleMix, zoneStandard } from "./standards";
import { RUNS } from "./warehouse";

/**
 * The same locks the engine holds on StandardsReport: every cell of the
 * printed table, the chain recombining, the band matrix, and the sample
 * ticket priced the same from the tour and from the standard.
 */
function near(actual: number, expected: number, tol: number): void {
  assert.ok(Math.abs(actual - expected) < tol, `expected ${expected}, got ${actual}`);
}

assert.equal(OPERATION.shiftSeconds, 28800);
assert.equal(OPERATION.cartStops, 10);
assert.equal(OPERATION.unitsPerLine, 2);
near(TASKS.grabPerLine, 3.0, 1e-12);
near(TASKS.packSplit, 6.0, 1e-12);
assert.equal(SKILLS.length, 3);

// The table covers the floor's runs in run order, in the locked names.
assert.deepEqual(
  ZONE_STANDARDS.map((row) => row.runCode),
  RUNS.map((run) => run.code),
);
assert.deepEqual(ZONE_STANDARDS[0].runName, "Cinder");

const LOCKS: Array<{
  run: string;
  velocity: string;
  stops: number;
  lines: number;
  units: number;
  metres: number;
  cart: number;
  seconds: number;
  mpu: number;
  mpl: number;
  uph: number;
  util: number;
}> = [
  { run: "CIN", velocity: "hot", stops: 2, lines: 2, units: 4, metres: 32.5, cart: 5, seconds: 43.652, mpu: 0.182, mpl: 0.364, uph: 329.9, util: 86.4 },
  { run: "LOA", velocity: "flow", stops: 1, lines: 1, units: 2, metres: 34.1, cart: 10, seconds: 24.965, mpu: 0.208, mpl: 0.416, uph: 288.4, util: 83.2 },
  { run: "FLI", velocity: "flow", stops: 1, lines: 1, units: 2, metres: 50.4, cart: 10, seconds: 26.383, mpu: 0.220, mpl: 0.440, uph: 272.9, util: 87.9 },
  { run: "REE", velocity: "flow", stops: 2, lines: 2, units: 4, metres: 61.8, cart: 5, seconds: 48.748, mpu: 0.203, mpl: 0.406, uph: 295.4, util: 81.2 },
  { run: "COB", velocity: "calm", stops: 1, lines: 1, units: 2, metres: 58.5, cart: 10, seconds: 27.087, mpu: 0.226, mpl: 0.451, uph: 265.8, util: 56.4 },
];

for (const lock of LOCKS) {
  const zone = ZONE_STANDARDS.find((row) => row.runCode === lock.run)!;
  assert.equal(zone.velocity, lock.velocity);
  assert.equal(zone.stops, lock.stops);
  assert.equal(zone.lines, lock.lines);
  assert.equal(zone.units, lock.units);
  assert.equal(zone.ticketsPerCart, lock.cart);
  near(zone.tourMetres, lock.metres, 0.05);
  near(zone.secondsPerTicket, lock.seconds, 5e-4);
  near(zone.mpuMinutes, lock.mpu, 5e-4);
  near(zone.mplMinutes, lock.mpl, 5e-4);
  near(zone.unitsPerHour, lock.uph, 5e-2);
  near(zone.utilPercent, lock.util, 5e-2);

  // The chain recomputes from the zone's own fields: shared walk, unshared hands.
  const recomputed =
    zone.travelSeconds / zone.ticketsPerCart +
    TASKS.grabPerLine * zone.lines +
    (TASKS.grabPerUnit + TASKS.countAndGive) * zone.units +
    TASKS.cartManeuver * zone.stops +
    TASKS.putAndVerify * zone.lines +
    TASKS.packSplit;
  near(recomputed, zone.secondsPerTicket, 1e-9);
  near(zone.mpuMinutes * 60 * zone.units, zone.secondsPerTicket, 1e-9);
  near(zone.unitsPerHour * zone.secondsPerTicket, 3600 * zone.units, 1e-6);
  near(
    ((zone.linesPerShift * zone.secondsPerTicket) / (zone.lines * OPERATION.shiftSeconds)) * 100,
    zone.utilPercent,
    1e-9,
  );
}

// Merrow Chandlery is the sample: the published 110 m walk.
const merrow = planWalk(ORDERS[0].lines.map((line) => line.faceId));
near(merrow.distanceM, 110.0, 0.05);

// Mr204 priced in the two directions agrees.
const sample = sampleMix();
assert.equal(sample.ticketId, "MR-204");
assert.equal(sample.stops, 5);
assert.equal(sample.lines, 5);
assert.equal(sample.units, 10);
near(sample.travelSeconds, 95.652, 5e-4);
near(sample.totalSeconds, 181.652, 5e-4);
assert.equal(sample.buckets.length, 7);
assert.deepEqual(
  sample.buckets.map((bucket) => bucket.kind),
  ["travel", "grabPerLine", "grabPerUnit", "countAndGive", "cartManeuver", "putAndVerify", "packSplit"],
);
const byKind = Object.fromEntries(sample.buckets.map((bucket) => [bucket.kind, bucket.seconds]));
near(byKind.grabPerLine, 15, 5e-4);
near(byKind.grabPerUnit, 20, 5e-4);
near(byKind.countAndGive, 15, 5e-4);
near(byKind.cartManeuver, 20, 5e-4);
near(byKind.putAndVerify, 10, 5e-4);
near(byKind.packSplit, 6, 5e-4);
assert.equal(formatDuration(sample.totalSeconds), "3 min 02 sec");

const tourFirst =
  sample.travelSeconds +
  TASKS.grabPerLine * sample.lines +
  (TASKS.grabPerUnit + TASKS.countAndGive) * sample.units +
  TASKS.cartManeuver * sample.stops +
  TASKS.putAndVerify * sample.lines +
  TASKS.packSplit;
near(tourFirst, sample.totalSeconds, 1e-9);

// The band matrix scales the zone standard by the rate factor.
const cinder = ZONE_STANDARDS.find((row) => row.runCode === "CIN")!;
for (const zone of ZONE_STANDARDS) {
  for (const band of zone.skills) {
    const source = SKILLS.find((entry) => entry.id === band.id)!;
    near(band.unitsPerHour, zone.unitsPerHour * source.factor, 1e-9);
  }
}
near(cinder.skills.find((band) => band.id === "day")!.unitsPerHour, 280.4, 5e-2);
near(cinder.skills.find((band) => band.id === "night")!.unitsPerHour, 230.9, 5e-2);

// The zone builder is a pure function of one zone spec: rebuilt alone, same price.
const solo = zoneStandard({ run: "COB", velocity: "calm", faces: ["COB-01-E"] });
near(solo.secondsPerTicket, 27.087, 5e-4);

for (const zone of ZONE_STANDARDS) {
  console.log(
    `${zone.runName.padEnd(7)} stops ${zone.stops}  lines ${zone.lines}  units ${zone.units}  ` +
      `${zone.tourMetres.toFixed(1)} m  cart ${zone.ticketsPerCart}  MPU ${zone.mpuMinutes.toFixed(3)}  ` +
      `MPL ${zone.mplMinutes.toFixed(3)}  UPH ${zone.unitsPerHour.toFixed(1)}  util ${zone.utilPercent.toFixed(1)}%`,
  );
}

console.log("standards tests passed");
