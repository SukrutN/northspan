import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { FloorMap } from "@/components/floor-map";
import { ORDERS } from "@/lib/orders";
import { formatDuration, formatMetres, planWalk, walkSeconds, WALK_MPS } from "@/lib/routing";
import { BAY_COUNT, FLOOR, RUNS } from "@/lib/warehouse";
import { cn } from "cn";

const demoOrder = ORDERS[0];
const demo = planWalk(demoOrder.lines.map((line) => line.faceId));
const savedPct = Math.round((demo.savedM / demo.sweepDistanceM) * 100);

export default function HomePage() {
  return (
    <>
      <section className="border-b border-border">
        <div className="mx-auto max-w-[1180px] px-5 pt-14 pb-12 md:pt-24 md:pb-16">
          <p className="eyebrow">01 — Pick paths</p>
          <div className="mt-6 grid items-end gap-8 lg:grid-cols-12">
            <h1 className="display lg:col-span-8">Walk the floor once.</h1>
            <div className="flex flex-col gap-4 text-[15px] leading-snug lg:col-span-4">
              <p>Out from the apron gate.</p>
              <p>Along the runs a cart can use.</p>
              <p>Back before the next ticket.</p>
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
            caption={`Fig. 01 — ${demoOrder.house}, ticket ${demoOrder.id}`}
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
          <p className="eyebrow">02 — On the floor</p>
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
            <p className="eyebrow">03 — Method</p>
            <h2 className="section-title mt-4">How the metres are counted.</h2>
            <div className="mt-6 space-y-4 text-base text-muted-foreground">
              <p>
                Kiln Annex is a single floor, {FLOOR.width} by {FLOOR.height} metres, with {RUNS.length} runs and {BAY_COUNT} bays a side. The apron gate sits on the south cross-aisle. Every tour starts there and returns there, because the cart does not stay in the aisle.
              </p>
              <p>
                A nearest-neighbour pass chooses the closest remaining stop under that aisle distance, with ties broken by location so the same list always draws the same walk. Two-opt then tries reversing stretches of the tour. If a reversal is shorter, it stays. The same untangling is tried on a serpentine sweep — runs from west to east, direction alternating — and the shorter of the two improved tours is the one drawn in oxide.
              </p>
              <p>
                The comparison number is the sweep before any improvement. That is the naive walk: finish a run, step to the next, do not look ahead. On a list that already snakes cleanly, the two match, and the floor says so.
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
