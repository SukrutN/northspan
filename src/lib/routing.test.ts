import assert from "node:assert/strict";
import { DOCK, FLOOR, getFace, runCenter, bayCentre } from "./warehouse";
import { ORDERS } from "./orders";
import {
  aisleSweep,
  legPoints,
  nearestNeighbour,
  planWalk,
  standsFor,
  tourLength,
  twoOpt,
  walkingDistance,
  type WalkPoint,
} from "./routing";

function point(partial: Pick<WalkPoint, "key" | "x" | "y" | "aisle">): WalkPoint {
  return { faceIds: [], ...partial };
}

const dock: WalkPoint = point({ key: "APRON", x: DOCK.x, y: DOCK.y, aisle: -1 });

const cinderSouth = point({
  key: "0:1",
  x: runCenter(0),
  y: bayCentre(1),
  aisle: 0,
});
const cinderNorth = point({
  key: "0:6",
  x: runCenter(0),
  y: bayCentre(6),
  aisle: 0,
});
const cobaltNorth = point({
  key: "4:6",
  x: runCenter(4),
  y: bayCentre(6),
  aisle: 4,
});

const sameAisle = walkingDistance(cinderSouth, cinderNorth);
assert.equal(sameAisle, Math.abs(cinderNorth.y - cinderSouth.y));

const cross = walkingDistance(cinderNorth, cobaltNorth);
const viaNorth =
  Math.abs(cinderNorth.y - FLOOR.north) +
  Math.abs(cinderNorth.x - cobaltNorth.x) +
  Math.abs(cobaltNorth.y - FLOOR.north);
assert.ok(Math.abs(cross - viaNorth) < 1e-9);

const fromDock = walkingDistance(dock, cinderSouth);
const expectedDock =
  Math.abs(dock.x - cinderSouth.x) + Math.abs(cinderSouth.y - FLOOR.south);
assert.ok(Math.abs(fromDock - expectedDock) < 1e-9);

function polyLength(points: { x: number; y: number }[]) {
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    total += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
  }
  return total;
}

const leg = legPoints(dock, cobaltNorth);
assert.ok(Math.abs(polyLength(leg) - walkingDistance(dock, cobaltNorth)) < 1e-6);

assert.throws(() => standsFor(["NO-SUCH"]));

const empty = planWalk([]);
assert.equal(empty.stops.length, 0);
assert.equal(empty.distanceM, 0);

const merrow = ORDERS[0].lines.map((line) => line.faceId);
for (const id of merrow) assert.ok(getFace(id), id);

const plan = planWalk(merrow);
assert.ok(plan.stops.length >= 1);
assert.equal(plan.polyline[0].x, DOCK.x);
assert.equal(plan.polyline.at(-1)?.x, DOCK.x);
assert.ok(plan.distanceM > 0);
assert.ok(plan.sweepDistanceM + 1e-6 >= plan.distanceM);
assert.ok(plan.savedM >= -1e-6);

const stops = standsFor(merrow);
const sweep = aisleSweep(stops, dock);
assert.equal(sweep[0].key, "APRON");
assert.equal(sweep.at(-1)?.key, "APRON");
const aisles = sweep.slice(1, -1).map((stop) => stop.aisle);
const sorted = [...aisles].sort((a, b) => a - b);
assert.deepEqual(aisles, sorted);

const nn = nearestNeighbour(stops, dock);
const improved = twoOpt(nn);
assert.ok(tourLength(improved) <= tourLength(nn) + 1e-6);

const reversed = [nn[0], ...nn.slice(1, -1).reverse(), nn[nn.length - 1]];
assert.ok(tourLength(twoOpt(reversed)) <= tourLength(reversed) + 1e-6);

let drawn = 0;
for (let i = 1; i < plan.polyline.length; i++) {
  drawn += Math.hypot(
    plan.polyline[i].x - plan.polyline[i - 1].x,
    plan.polyline[i].y - plan.polyline[i - 1].y,
  );
}
assert.ok(Math.abs(drawn - plan.distanceM) < 1e-4);

for (const order of ORDERS) {
  const result = planWalk(order.lines.map((line) => line.faceId));
  const saved = result.sweepDistanceM === 0 ? 0 : (result.savedM / result.sweepDistanceM) * 100;
  console.log(
    `${order.id}  stops ${result.stops.length}  walk ${result.distanceM.toFixed(1)} m  sweep ${result.sweepDistanceM.toFixed(1)} m  saved ${result.savedM.toFixed(1)} m (${saved.toFixed(1)}%)`,
  );
}

console.log("routing tests passed");
