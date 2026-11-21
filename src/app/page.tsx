import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { FloorMap } from "@/components/floor-map";
import { ORDERS } from "@/lib/orders";
import { formatDuration, formatMetres, planWalk, walkSeconds, WALK_MPS } from "@/lib/routing";
import { OPERATION, sampleMix, ZONE_STANDARDS } from "@/lib/standards";
import { BAY_COUNT, FLOOR, RUNS } from "@/lib/warehouse";
import { cn } from "cn";

const demoOrder = ORDERS[0];
const demo = planWalk(demoOrder.lines.map((line) => line.faceId));
const savedPct = Math.round((demo.savedM / demo.sweepDistanceM) * 100);
const sample = sampleMix();
const cinder = ZONE_STANDARDS[0];
const cinderSharedWalk = cinder.travelSeconds / cinder.ticketsPerCart;
const cinderHands = cinder.secondsPerTicket - cinderSharedWalk;

const BUCKET_COLOR: Record<string, string> = {
  travel: "#e39a62",
  grabPerLine: "#a8b9a4",
  grabPerUnit: "#d6c3a1",
  countAndGive: "#8f9e8b",
  cartManeuver: "#b3a68b",
  putAndVerify: "#c07d54",
  packSplit: "#5c645c",
};

export default function HomePage() {
  return (
    <>
      <section className="border-b border-border">
        <div className="mx-auto max-w-[1180px] px-5 pt-14 pb-12 md:pt-24 md:pb-16">
          <p className="eyebrow">01. Pick paths</p>
          <div className="mt-6 grid items-end gap-8 lg:grid-cols-12">
            <h1 className="display lg:col-span-8">Walk the floor once.</h1>
            <div className="flex flex-col gap-4 text-[15px] leading-snug lg:col-span-4">
              <p>Every tour starts at the apron gate, stays in the aisles, and is back before the next ticket.</p>
            </div>
          </div>
          <p className="mt-8 max-w-xl text-base text-muted-foreground md:text-[1.05rem]">
            Most of a picker’s hour is spent between the faces, not at them. Northspan takes the marks on a
            ticket and returns a walk that stays in the aisles, then shows what a plain sweep would have cost.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/plan" className={cn(buttonVariants({ className: "h-11 px-4" }))}>
              Open Kiln Annex
            </Link>
            <Link
              href="#method"
              className={cn(buttonVariants({ variant: "outline", className: "h-11 px-4" }))}
            >
              Read the method
            </Link>
          </div>
        </div>
      </section>

      <section className="bg-floor text-floor-ink">
        <div className="mx-auto max-w-[1180px] px-2 py-8 md:px-5 md:py-12">
          <FloorMap
            selectedIds={demoOrder.lines.map((line) => line.faceId)}
            polyline={demo.polyline}
            sweepPolyline={demo.sweepPolyline}
            showSweep
            stops={demo.stops.map((stop, index) => ({ x: stop.x, y: stop.y, n: index + 1 }))}
            caption={`Fig. 01. ${demoOrder.house}, ticket ${demoOrder.id}`}
          />
          <div className="mt-2 flex flex-col gap-3 px-3 pb-2 sm:flex-row sm:items-end sm:justify-between md:px-1">
            <p className="max-w-lg text-sm text-floor-ink/75">
              {demoOrder.ticket}. The oxide line is {formatMetres(demo.distanceM)}. The dashed line is the
              sweep, {formatMetres(demo.sweepDistanceM)}, left in aisle order.
            </p>
            <Link
              href={`/plan?order=${demoOrder.id}`}
              className="font-mono text-[11px] tracking-[0.14em] text-route uppercase"
            >
              Open this ticket
            </Link>
          </div>
        </div>
      </section>

      <section className="border-b border-border">
        <div className="mx-auto grid max-w-[1180px] sm:grid-cols-3">
          <Stat
            value={`${savedPct}%`}
            label="Shorter than the sweep"
            detail={`On ${demoOrder.id}, ${formatMetres(demo.savedM)} stays off the walk.`}
          />
          <Stat
            value={formatDuration(walkSeconds(demo.distanceM))}
            label="Estimated walk"
            detail={`${WALK_MPS} m/s with a loaded cart. The reach at each face is not in the clock.`}
          />
          <Stat
            value={String(demo.stops.length)}
            label="Stops, then the gate"
            detail={`${demoOrder.lines.length} lines on ${demoOrder.house}. West and east of one bay share a stop.`}
          />
        </div>
      </section>

      <section className="border-b border-border">
        <div className="mx-auto max-w-[1180px] px-5 py-16 md:py-24">
          <p className="eyebrow">02. On the floor</p>
          <h2 className="section-title mt-4 max-w-3xl">Three moves, and the cart is committed.</h2>
          <ol className="mt-12 grid gap-10 md:grid-cols-3">
            <li>
              <p className="eyebrow">01</p>
              <h3 className="mt-3 text-xl font-medium tracking-[-0.03em]">Mark the faces</h3>
              <p className="mt-2 text-sm text-muted-foreground md:text-base">
                Put a house ticket on the cart, or tap a cell. Quantity lives on the line. Clearing a face takes it off the walk.
              </p>
            </li>
            <li>
              <p className="eyebrow">02</p>
              <h3 className="mt-3 text-xl font-medium tracking-[-0.03em]">Stay in the aisles</h3>
              <p className="mt-2 text-sm text-muted-foreground md:text-base">
                Same run: the cart rolls along the aisle. A new run: it leaves by the apron aisle or the rear aisle, whichever is shorter. Racks are not a shortcut.
              </p>
            </li>
            <li>
              <p className="eyebrow">03</p>
              <h3 className="mt-3 text-xl font-medium tracking-[-0.03em]">Keep the shorter tour</h3>
              <p className="mt-2 text-sm text-muted-foreground md:text-base">
                Nearest neighbour drafts a route from the gate. Two-opt reverses any stretch that saves metres. You still see the serpentine sweep, unimproved, beside it.
              </p>
            </li>
          </ol>
        </div>
      </section>

      <section id="method" className="scroll-mt-16">
        <div className="mx-auto grid max-w-[1180px] gap-12 px-5 py-16 md:py-24 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <p className="eyebrow">03. Method</p>
            <h2 className="section-title mt-4">How the metres are counted.</h2>
            <div className="mt-6 space-y-4 text-base text-muted-foreground">
              <p>
                Kiln Annex is a single floor, {FLOOR.width} by {FLOOR.height} metres, with {RUNS.length} runs and {BAY_COUNT} bays a side. The apron gate sits on the south cross-aisle. Every tour starts there and returns there, because the cart does not stay in the aisle.
              </p>
              <p>
                A nearest-neighbour pass chooses the closest remaining stop under that aisle distance, with ties broken by location so the same list always draws the same walk. Two-opt then tries reversing stretches of the tour. If a reversal is shorter, it stays. The same untangling is tried on a serpentine sweep, runs from west to east, direction alternating, and the shorter of the two improved tours is the one drawn in oxide.
              </p>
              <p>
                The comparison number is the sweep before any improvement. That is the naive walk: finish a run, step to the next, do not look ahead. On a ticket that already snakes cleanly, the two come out equal.
              </p>
            </div>
          </div>
          <dl className="border border-border lg:col-span-5 lg:mt-16">
            <Spec term="Floor" value={`${FLOOR.width} × ${FLOOR.height} m`} />
            <Spec term="Runs" value={RUNS.map((run) => run.name).join(", ")} />
            <Spec term="Cross-aisles" value="Apron south, rear north" />
            <Spec term="Speed" value={`${WALK_MPS} m/s loaded`} />
            <Spec term="Tour" value="Gate to gate" />
            <Spec term="Baseline" value="Serpentine aisle sweep" />
          </dl>
        </div>
      </section>

      <section id="standards" className="scroll-mt-16 border-t border-border">
        <div className="mx-auto max-w-[1180px] px-5 py-16 md:py-24">
          <p className="eyebrow">04. Standards</p>
          <h2 className="section-title mt-4 max-w-3xl">The minutes behind the metres.</h2>

          <div className="mt-10 grid gap-12 lg:grid-cols-12">
            <div className="space-y-4 text-base text-muted-foreground lg:col-span-7">
              <p>
                The metres determine where the cart goes. The minutes determine what the picker does when the
                cart is standing still. A counter-refill ticket pays seconds for every visit: hold the line,
                3; take down a unit, 2; count and hand it over, 1.5; swing the cart into the bay, 4;
                place and verify the line, 2; and the split at the pack bench, 6 once a ticket. Those
                coefficients are fixture data, an operation file joined to the floor, the same way
                the rules price the walk, not constants buried in the solver.
              </p>
              <p>
                The tour is shared across the tickets it carries; the hands are charged in full. Walking Cinder end to end costs{" "}
                {formatDuration(cinder.travelSeconds)}, but the cart carries {OPERATION.cartStops}{" "}
                stops, and a ticket that touches two of them owes a fifth:{" "}
                {cinderSharedWalk.toFixed(1)} seconds of walking. The hands owe all of theirs, grab,
                count, swing the cart, put and verify, and the pack split. {cinderHands.toFixed(0)}{" "}
                seconds. One ticket is {cinder.secondsPerTicket.toFixed(1)} seconds all in,{" "}
                {(cinder.mpuMinutes * 60).toFixed(1)} seconds a unit,{" "}
                {cinder.unitsPerHour.toFixed(1)} units an hour, and {cinder.utilPercent.toFixed(1)}
                percent of one picker&rsquo;s shift at Cinder&rsquo;s hot velocity.
              </p>
              <p>
                Utilization is demand against capacity: the zone&rsquo;s lines per shift priced at the
                standard, set against one picker&rsquo;s shift. Nothing here is learned from actuals;
                the report is a pure function of the floor and the operation. Bands are a rate factor
                on the zone&rsquo;s own number, the same walk, priced for a day shift or the night
                desk, which is the card a foreman needs before anyone talks headcount.
              </p>
            </div>
            <dl className="border border-border lg:col-span-5 lg:mt-16">
              <Spec term="Operation" value={`${OPERATION.name}. ${OPERATION.id}`} />
              <Spec term="Sample" value={`${sample.ticketId} ${sample.house}`} />
              <Spec term="Shift" value={`${OPERATION.shiftSeconds / 3600} h at ${WALK_MPS} m/s`} />
              <Spec term="Cart" value={`${OPERATION.cartStops} stops`} />
              <Spec term="Units a line" value={String(OPERATION.unitsPerLine)} />
              <Spec term="Bands" value="Veteran, day, night" />
            </dl>
          </div>

          <div className="mt-14 overflow-x-auto border border-border">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-border">
                  {["Zone", "Stops", "Lines", "Units", "Tour", "Cart", "MPU", "MPL", "UPH", "Util"].map(
                    (head, index) => (
                      <th
                        key={head}
                        className={cn("eyebrow px-3 py-3", index === 0 ? "text-left" : "text-right")}
                      >
                        {head}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {ZONE_STANDARDS.map((zone) => (
                  <tr key={zone.runCode} className="border-b border-border last:border-b-0">
                    <td className="px-3 py-3">
                      <span className="font-medium">{zone.runName}</span>
                      <span className="ml-2 font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                        {zone.velocity}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right font-mono text-[13px]">{zone.stops}</td>
                    <td className="px-3 py-3 text-right font-mono text-[13px]">{zone.lines}</td>
                    <td className="px-3 py-3 text-right font-mono text-[13px]">{zone.units}</td>
                    <td className="px-3 py-3 text-right font-mono text-[13px]">{zone.tourMetres.toFixed(1)}</td>
                    <td className="px-3 py-3 text-right font-mono text-[13px]">{zone.ticketsPerCart}</td>
                    <td className="px-3 py-3 text-right font-mono text-[13px]">{zone.mpuMinutes.toFixed(3)}</td>
                    <td className="px-3 py-3 text-right font-mono text-[13px]">{zone.mplMinutes.toFixed(3)}</td>
                    <td className="px-3 py-3 text-right font-mono text-[13px]">{zone.unitsPerHour.toFixed(1)}</td>
                    <td className="px-3 py-3 text-right font-mono text-[13px]">{zone.utilPercent.toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Minutes per unit and per line for one ticket of the counter-refill operation, one cart tour
            of {OPERATION.cartStops} stops shared across the tickets, the hands charged in full. Tour is
            the planned gate-to-gate metres for the zone&rsquo;s own faces; cart is how many tickets the
            walking splits across.
          </p>

          <div className="mt-14 grid gap-12 lg:grid-cols-12">
            <figure className="lg:col-span-7">
              <div className="flex h-10 w-full overflow-hidden border border-border">
                {sample.buckets.map((bucket) => (
                  <div
                    key={bucket.kind}
                    style={{
                      flexGrow: bucket.seconds,
                      flexBasis: 0,
                      backgroundColor: BUCKET_COLOR[bucket.kind],
                    }}
                    title={`${bucket.label}. ${formatDuration(bucket.seconds)}`}
                  />
                ))}
              </div>
              <figcaption className="eyebrow mt-3">
                Fig. 02. Ticket {sample.ticketId}, {sample.house}, priced by the operation
              </figcaption>
              <p className="mt-2 max-w-xl text-sm text-muted-foreground">
                {sample.ticketId} is a real ticket: five lines, ten units, a published{" "}
                {formatMetres(110)} walk at {WALK_MPS} m/s. The bar is the whole ticket,{" "}
                {formatDuration(sample.totalSeconds)}: the walk{" "}
                {(100 * (sample.travelSeconds / sample.totalSeconds)).toFixed(0)} percent, the hands the
                rest. Half the ticket was never at a face at all.
              </p>
            </figure>
            <div className="lg:col-span-5">
              <p className="eyebrow">Units per hour, zone by band</p>
              <table className="mt-4 w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="eyebrow px-3 py-3 text-left">Zone</th>
                    {ZONE_STANDARDS[0].skills.map((band) => (
                      <th key={band.id} className="eyebrow px-3 py-3 text-right">
                        {band.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ZONE_STANDARDS.map((zone) => (
                    <tr key={zone.runCode} className="border-b border-border last:border-b-0">
                      <td className="px-3 py-3 font-medium">{zone.runName}</td>
                      {zone.skills.map((band) => (
                        <td key={band.id} className="px-3 py-3 text-right font-mono text-[13px]">
                          {band.unitsPerHour.toFixed(1)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-3 text-sm text-muted-foreground">
                The same zone standard scaled by band. Day works at a factor of 0.85 on a veteran,
                night at 0.7.
              </p>
            </div>
          </div>

          <div className="mt-14 border-t border-border pt-6">
            <p className="max-w-3xl text-sm text-muted-foreground">
              Where the numbers come from: the operating-cost case for picking standards is made in
              de Koster, Le-Duc, and Roodbergen, &ldquo;Design and control of warehouse order
              picking,&rdquo; <em>European Journal of Operational Research</em> 182(2), 2007, order
              picking is commonly priced at about 55 percent of warehouse operating cost. The
              vocabulary of travel and pick, and the tour-vs-sweep framing, are Bartholdi and
              Hackman&rsquo;s <em>Warehouse &amp; Distribution Science</em>. The exact tour through a
              rectangular warehouse is Ratliff and Rosenthal, <em>Operations Research</em> 31(3),
              1983. The walk in this engine is a simpler version of that result. The coefficients live in the{" "}
              <a
                href="https://github.com/SukrutN/northspan/blob/main/engine/fixtures/kiln-annex/operation.json"
                className="underline underline-offset-4"
              >
                engine&rsquo;s operation fixture
              </a>{" "}
              and are locked by tests on both sides.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}

function Stat({ value, label, detail }: { value: string; label: string; detail: string }) {
  return (
    <div className="border-b border-border px-5 py-8 sm:border-r sm:border-b-0 sm:last:border-r-0">
      <p className="text-4xl font-medium tracking-[-0.045em] md:text-5xl">{value}</p>
      <p className="mt-3 text-sm font-medium">{label}</p>
      <p className="mt-1 text-sm text-muted-foreground">{detail}</p>
    </div>
  );
}

function Spec({ term, value }: { term: string; value: string }) {
  return (
    <div className="grid grid-cols-[7rem_1fr] gap-3 border-b border-border px-4 py-3 last:border-b-0">
      <dt className="eyebrow pt-0.5">{term}</dt>
      <dd className="text-sm">{value}</dd>
    </div>
  );
}
