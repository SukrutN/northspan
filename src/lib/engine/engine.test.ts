import assert from "node:assert/strict";

import floorJson from "../../../engine/fixtures/kiln-annex/floor.json";
import operationJson from "../../../engine/fixtures/kiln-annex/operation.json";
import mr204Json from "../../../engine/fixtures/kiln-annex/tickets/mr-204.json";
import sh118Json from "../../../engine/fixtures/kiln-annex/tickets/sh-118.json";
import pd077Json from "../../../engine/fixtures/kiln-annex/tickets/pd-077.json";
import nb012Json from "../../../engine/fixtures/kiln-annex/tickets/nb-012.json";

import dryFloorJson from "../../../engine/fixtures/dry-store/floor.json";
import dryOperationJson from "../../../engine/fixtures/dry-store/operation.json";
import ds014Json from "../../../engine/fixtures/dry-store/tickets/ds-014.json";

import {
  DEMO_RULES,
  floorFromDocument,
  formatClock,
  planTicket,
  planWalk,
  ticketFromDocument,
  type FloorDocument,
  type TicketDocument,
} from "./planner";
import {
  buildStandards,
  mixLabel,
  operationFromDocument,
  type OperationDocument,
} from "./standards";

const kiln = floorFromDocument(floorJson as FloorDocument);
const dry = floorFromDocument(dryFloorJson as FloorDocument);
const kilnOperation = operationFromDocument(operationJson as unknown as OperationDocument, kiln);
const dryOperation = operationFromDocument(dryOperationJson as unknown as OperationDocument, dry);

assert.equal(kiln.name, "Kiln Annex");
assert.equal(kiln.runs.length, 5);
assert.equal(dry.name, "Dry Store");
assert.equal(dry.runs.length, 2);

// The published walks, locked to the engine's own fixture bytes.

const mr204 = planTicket(kiln, ticketFromDocument(mr204Json as TicketDocument), DEMO_RULES);
assert.equal(mr204.walk.stops.length, 5);
assert.equal(mr204.walk.distanceM.toFixed(1), "110.0");
assert.equal(mr204.walk.sweepDistanceM.toFixed(1), "150.8");
assert.equal(mr204.walk.sweepDistanceM - mr204.walk.distanceM > 40.7, true);
assert.equal(
  mr204.walk.stops.map((stop) => stop.locations.join(",")).join("|"),
  "LOA-01-E|REE-01-W|COB-06-W|FLI-06-E|CIN-06-W",
);
assert.equal(mr204.walk.stops[0].metresFromPrevious.toFixed(1), "12.2");
assert.equal(mr204.walk.stops[0].via, "apron");
assert.equal(mr204.walk.stops[3].via, "rear");
assert.equal(formatClock(mr204.durationSeconds), "1 min 36 sec");
assert.equal(
  mr204.walk.polyline[0].x.toFixed(1),
  kiln.gate.x.toFixed(1),
);

const sh118 = planTicket(kiln, ticketFromDocument(sh118Json as TicketDocument), DEMO_RULES);
assert.equal(sh118.walk.distanceM.toFixed(1), "106.1");
assert.equal(sh118.walk.sweepDistanceM.toFixed(1), "106.1");

const pd077 = planTicket(kiln, ticketFromDocument(pd077Json as TicketDocument), DEMO_RULES);
assert.equal(pd077.walk.distanceM.toFixed(1), "88.4");
assert.equal(pd077.walk.sweepDistanceM.toFixed(1), "88.4");

const nb012 = planTicket(kiln, ticketFromDocument(nb012Json as TicketDocument), DEMO_RULES);
assert.equal(nb012.walk.stops.length, 1);
assert.equal(nb012.walk.distanceM.toFixed(1), "58.5");

// The plain failures, in the engine's own words.

assert.throws(() => planWalk(kiln, ["LOA-99-E"], true), /No slot is marked 'LOA-99-E' on Kiln Annex\./);
assert.throws(() => planWalk(kiln, [], true), /The ticket has no locations\./);

// The published standards for the counter-refill operation.

const kilnStandards = buildStandards(
  kiln,
  kilnOperation,
  ticketFromDocument(mr204Json as TicketDocument),
);
assert.equal(kilnStandards.rows.length, 5);

const expectedZones: [string, number, number, number, string, number, string, string, string, string][] = [
  ["Cinder", 2, 2, 4, "32.5", 5, "0.182", "0.364", "329.9", "86.4"],
  ["Loam", 1, 1, 2, "34.1", 10, "0.208", "0.416", "288.4", "83.2"],
  ["Flint", 1, 1, 2, "50.4", 10, "0.220", "0.440", "272.9", "87.9"],
  ["Reed", 2, 2, 4, "61.8", 5, "0.203", "0.406", "295.4", "81.2"],
  ["Cobalt", 1, 1, 2, "58.5", 10, "0.226", "0.451", "265.8", "56.4"],
];

for (let i = 0; i < expectedZones.length; i++) {
  const [run, stops, lines, units, tour, cart, mpu, mpl, uph, util] = expectedZones[i];
  const zone = kilnStandards.rows[i].zone;
  assert.equal(zone.runName, run);
  assert.equal(zone.stopsPerTicket, stops);
  assert.equal(zone.linesPerTicket, lines);
  assert.equal(zone.unitsPerTicket, units);
  assert.equal(zone.tourMetres.toFixed(1), tour);
  assert.equal(zone.ticketsPerCart, cart);
  assert.equal(zone.mpuMinutes.toFixed(3), mpu);
  assert.equal(zone.mplMinutes.toFixed(3), mpl);
  assert.equal(zone.unitsPerHour.toFixed(1), uph);
  assert.equal(zone.utilPercent.toFixed(1), util);

  for (const rate of kilnStandards.rows[i].skills) {
    assert.ok(
      Math.abs(rate.unitsPerHour - zone.unitsPerHour * rate.rateFactor) < 1e-9,
      `${run} band ${rate.bandName}`,
    );
  }
}

assert.ok(kilnStandards.sample);
assert.equal(formatClock(kilnStandards.sample.totalSeconds), "3 min 02 sec");
const sampleSeconds = new Map(kilnStandards.sample.buckets.map((bucket) => [bucket.kind, bucket.seconds]));
assert.equal(sampleSeconds.get("travel"), 110.0 / 1.15);
assert.equal(sampleSeconds.get("grabPerLine"), 15);
assert.equal(sampleSeconds.get("grabPerUnit"), 20);
assert.equal(sampleSeconds.get("countAndGive"), 15);
assert.equal(sampleSeconds.get("cartManeuver"), 20);
assert.equal(sampleSeconds.get("putAndVerify"), 10);
assert.equal(sampleSeconds.get("packSplit"), 6);

// The second floor: a different graph, a different operation, the same laws.

const ds014 = planTicket(dry, ticketFromDocument(ds014Json as TicketDocument), DEMO_RULES);
assert.equal(ds014.walk.stops.length, 3);
assert.equal(ds014.walk.distanceM.toFixed(1), "32.0");
assert.equal(ds014.walk.sweepDistanceM.toFixed(1), "32.0");
assert.equal(
  ds014.walk.stops.map((stop) => stop.locations.join(",")).join("|"),
  "ASH-B|BIR-B|BIR-A",
);
assert.equal(ds014.walk.stops[0].metresFromPrevious.toFixed(1), "9.0");
assert.equal(ds014.walk.stops[0].via, "apron");
assert.equal(ds014.walk.stops[1].via, "rear");
assert.equal(ds014.walk.stops[2].via, "run");
assert.equal(formatClock(ds014.durationSeconds), "28 sec");

const dryStandards = buildStandards(
  dry,
  dryOperation,
  ticketFromDocument(ds014Json as TicketDocument),
);
assert.equal(dryStandards.rows.length, 2);

const expectedDry: [string, number, number, number, string, number, string, string, string, string][] = [
  ["Ash", 1, 1, 6, "18.0", 8, "0.143", "0.858", "419.8", "75.0"],
  ["Birch", 2, 2, 12, "30.0", 4, "0.135", "0.813", "443.0", "61.0"],
];

for (let i = 0; i < expectedDry.length; i++) {
  const [run, stops, lines, units, tour, cart, mpu, mpl, uph, util] = expectedDry[i];
  const zone = dryStandards.rows[i].zone;
  assert.equal(zone.runName, run);
  assert.equal(zone.stopsPerTicket, stops);
  assert.equal(zone.linesPerTicket, lines);
  assert.equal(zone.unitsPerTicket, units);
  assert.equal(zone.tourMetres.toFixed(1), tour);
  assert.equal(zone.ticketsPerCart, cart);
  assert.equal(zone.mpuMinutes.toFixed(3), mpu);
  assert.equal(zone.mplMinutes.toFixed(3), mpl);
  assert.equal(zone.unitsPerHour.toFixed(1), uph);
  assert.equal(zone.utilPercent.toFixed(1), util);
}

assert.ok(dryStandards.sample);
assert.equal(formatClock(dryStandards.sample.totalSeconds), "2 min 40 sec");
const drySeconds = new Map(dryStandards.sample.buckets.map((bucket) => [bucket.kind, bucket.seconds]));
assert.equal(drySeconds.get("travel"), 32.0 / 1.15);
assert.equal(mixLabel("grabPerUnit"), "Grab per unit");
assert.equal(drySeconds.get("grabPerUnit"), 72);

console.log("engine planner tests passed");
