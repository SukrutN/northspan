import Link from "next/link";
import { ArrowIcon } from "@/components/arrow-icon";
import { Eyebrow } from "@/components/eyebrow";
import { CyclingTickets } from "@/components/cycling-strip";
import { FloorMap } from "@/components/floor-map";
import { HexLottie } from "@/components/hex-lottie";
import { Odometer } from "@/components/odometer";
import { WaveText } from "@/components/wave-text";
import { buttonVariants } from "@/components/ui/button";
import { ORDERS } from "@/lib/orders";
import { formatDuration, formatMetres, planWalk, walkSeconds, WALK_MPS } from "@/lib/routing";
import { OPERATION, sampleMix, ZONE_STANDARDS } from "@/lib/standards";
import { BAY_COUNT, FLOOR, RUNS } from "@/lib/warehouse";
import { cn } from "cn";

const demoOrder = ORDERS[0];
const demo = planWalk(demoOrder.lines.map((line) => line.faceId));
const savedPct = Math.round((demo.savedM / demo.sweepDistanceM) * 100);
const walkMinutes = (walkSeconds(demo.distanceM) / 60).toFixed(1);
const sample = sampleMix();
const cinder = ZONE_STANDARDS[0];

const BUCKET_COLOR: Record<string, string> = {
  travel: "#ff5b2e",
  grabPerLine: "#c9b8ad",
  grabPerUnit: "#f4df99",
  countAndGive: "#bce2ff",
  cartManeuver: "#4d2523",
  putAndVerify: "#504414",
  packSplit: "#2f0705",
};

const SOURCES = [
  {
    meta: "Bartholdi III & Hackman",
    title: "Warehouse & Distribution Science",
    authors: "Bartholdi III & Hackman",
    note: "The order-picking chapters give this project its vocabulary: travel is walking, pick is hands, and the route stays apart from the sweep.",
    cta: "Read the book",
    href: "/sources/warehouse-science.pdf",
    local: true,
  },
  {
    meta: "EJOR 182(2), 2007",
    title: "Design and control of warehouse order picking",
    authors: "de Koster, Le-Duc & Roodbergen",
    note: "The review that puts order picking at about 55% of warehouse operating cost, which is why a walk time alone falls short as a labor standard.",
    cta: "View at publisher",
    href: "https://doi.org/10.1016/j.ejor.2006.07.009",
  },
  {
    meta: "Operations Research 31(3), 1983",
    title: "Order-picking in a rectangular warehouse",
    authors: "Ratliff & Rosenthal",
    note: "A rectangular floor with cross aisles admits an exact optimal route. Northspan's planner is a practical approximation of that result.",
    cta: "View at publisher",
    href: "https://doi.org/10.1287/opre.31.3.507",
  },
];

const demoFaces = demoOrder.lines.map((line) => line.faceId);

const STEPS = [
  {
    n: "01",
    title: "Mark the locations",
    body: "Load one of the tickets, or click a location on the floor to add it to the cart. Each line keeps its own count.",
    map: <FloorMap compact selectedIds={demoFaces} caption="The ticket marked on the floor" />,
  },
  {
    n: "02",
    title: "Stay in the aisles",
    body: "The cart travels along the aisle it is in. To change aisles it crosses on the apron or the rear cross-aisle, whichever is shorter.",
    map: (
      <FloorMap
        compact
        selectedIds={demoFaces}
        sweepPolyline={demo.sweepPolyline}
        showSweep
        caption="The sweep: every aisle, in order"
      />
    ),
  },
  {
    n: "03",
    title: "Keep the shorter route",
    body: "Northspan plans the route in two passes. First it always walks to the closest marked location it has not picked yet. Then it reverses any stretch of the route that shortens the walk, keeping every improvement. The sweep stays on the map so you can see the difference.",
    map: (
      <FloorMap
        compact
        selectedIds={demoFaces}
        polyline={demo.polyline}
        sweepPolyline={demo.sweepPolyline}
        showSweep
        stops={demo.stops.map((stop, index) => ({ x: stop.x, y: stop.y, n: index + 1 }))}
        caption="Northspan's route against the sweep"
      />
    ),
  },
];

export default function HomePage() {
  return (
    <>
      <section className="grain relative overflow-hidden bg-floor text-floor-ink">
        {/*
          Their hero runs a looping video, so Northspan does too: their own
          header file, muted and covered, scaled from the bottom edge under
          the veil that keeps the ink readable. The hexagon cascade moved
          behind the stats band below.
        */}
        <div className="relative">
          <div aria-hidden="true" className="absolute inset-0">
            <video
              src={`${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/header-video.mp4`}
              autoPlay
              muted
              loop
              playsInline
              className="hero-video h-full w-full origin-bottom scale-[1.2] object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-floor/85 via-floor/45 to-floor/70" />
          </div>
          <div className="relative mx-auto max-w-[115rem] px-4 pt-32 pb-14 md:px-8 md:pt-44 md:pb-16">
          <Eyebrow className="text-floor-ink/70">Northspan</Eyebrow>
          <h1 className="display mt-6 max-w-5xl">
            Walk the floor once. Keep the <span className="text-accent">shorter route.</span>
          </h1>
          <div className="mt-8 grid gap-8 lg:grid-cols-12 lg:items-end">
            <p className="max-w-xl text-base leading-relaxed text-floor-ink/80 lg:col-span-6">
              A picker spends about half their shift walking. Northspan takes the locations on an order,
              finds the shortest route through the aisles, and shows how much better it is than
              walking every aisle in order.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row lg:col-span-6 lg:justify-end">
              <Link
                href="/plan"
                className={cn(buttonVariants({ variant: "accent", size: "lg", className: "h-11 px-5" }))}
              >
                Try the demo <ArrowIcon />
              </Link>
              <Link
                href="#method"
                className={cn(
                  buttonVariants({
                    variant: "outline",
                    size: "lg",
                    className:
                      "h-11 border-floor-ink/25 px-5 text-floor-ink hover:border-floor-ink hover:bg-floor-ink hover:text-floor",
                  }),
                )}
              >
                Read the method
              </Link>
            </div>
            </div>
          </div>
        </div>
        <div className="relative border-t border-floor-ink/15">
          <div className="mx-auto max-w-[115rem] px-2 py-8 md:px-8 md:py-12">
            <div className="px-3 pb-4 md:px-1">
              <CyclingTickets />
            </div>
            <FloorMap
              selectedIds={demoOrder.lines.map((line) => line.faceId)}
              polyline={demo.polyline}
              sweepPolyline={demo.sweepPolyline}
              showSweep
              stops={demo.stops.map((stop, index) => ({ x: stop.x, y: stop.y, n: index + 1 }))}
              caption={`Fig. 01. ${demoOrder.house}, ${demoOrder.short}`}
            />
            <div className="mt-6 flex flex-col gap-3 px-3 pb-5 sm:flex-row sm:items-end sm:justify-between md:px-1">
              <p className="max-w-lg text-sm leading-relaxed text-floor-ink/75">
                {demoOrder.ticket} The orange line is the route Northspan planned through the aisles, gate to gate,{" "}
                {formatMetres(demo.distanceM)}. The dashed line is the sweep: every aisle walked in order, whether
                there is a pick there or not, which comes to {formatMetres(demo.sweepDistanceM)} on this floor.
              </p>
              <Link
                href={`/plan?order=${demoOrder.id}`}
                className="font-mono text-[11px] tracking-[0.14em] text-route uppercase"
              >
                Open this ticket
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/*
        The stats band: their hex section carries the numbers beside the
        animation; with the field moved into the hero as a background, the
        figures stand alone on the dark band, four odometers and the note.
      */}
      <section className="grain relative overflow-hidden border-t border-floor-ink/15 bg-floor text-floor-ink">
        <div aria-hidden="true" className="absolute inset-0 opacity-40">
          <HexLottie />
        </div>
        <div className="relative mx-auto max-w-[115rem] px-4 py-16 md:px-8 md:py-24">
          <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-4">
            <StatBlock
              value={String(savedPct)}
              suffix="%"
              label="Shorter than the sweep"
              detail={`Northspan's route walks ${formatMetres(demo.savedM)} less than the sweep does.`}
            />
            <StatBlock
              value={demo.distanceM.toFixed(1)}
              suffix=" m"
              label="Planned walk"
              detail="The whole route, from the gate and back to it."
            />
            <StatBlock
              value={walkMinutes}
              suffix=" min"
              label="On the clock"
              detail={`The clock runs at ${WALK_MPS} m/s with a loaded cart. It counts only walking, not time at the racks.`}
            />
            <StatBlock
              value={String(demo.stops.length)}
              label="Cart stops"
              detail={`${demoOrder.lines.length} lines on ${demoOrder.house}. Both sides of one bay count as one stop.`}
            />
          </div>
          <p className="mt-14 max-w-2xl text-sm leading-relaxed text-floor-ink/70">
            Every number here comes from the engine&rsquo;s published walk for the demo order. The same floor carries
            a labor standard, priced further down this page.
          </p>
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto max-w-[115rem] px-4 py-16 md:px-8 md:py-24">
          <Eyebrow>On the floor</Eyebrow>
          <h2 className="section-title mt-4 max-w-3xl">
            <WaveText text="From ticket to route." />
          </h2>
          <div className="mt-16 flex flex-col gap-6">
            {STEPS.map((step) => (
              <article
                key={step.n}
                className="step-card grid gap-8 rounded-lg border border-border bg-white p-6 lg:grid-cols-12 lg:items-center lg:gap-12 lg:p-10"
              >
                <div className="lg:col-span-5">
                  <p className="font-mono text-xs tracking-[0.14em] text-accent uppercase">{step.n}</p>
                  <h3 className="mt-3 font-heading text-2xl font-medium tracking-[-0.02em]">{step.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground md:text-base">{step.body}</p>
                </div>
                <div className="overflow-hidden rounded-lg border border-border lg:col-span-7">{step.map}</div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="method" className="scroll-mt-24">
        <div className="mx-auto grid max-w-[115rem] gap-12 px-4 py-16 md:px-8 md:py-24 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <Eyebrow>Method</Eyebrow>
            <h2 className="section-title mt-4">
              <WaveText text="How the meters are counted." />
            </h2>
            <div className="mt-6 space-y-4 text-base leading-relaxed text-muted-foreground">
              <p>
                The demo floor is a single floor, {FLOOR.width} by {FLOOR.height} meters, with {RUNS.length} picking
                aisles and {BAY_COUNT} bays a side. The gate sits on the south cross-aisle, and every route starts
                and ends there.
              </p>
              <p>
                The planner starts at the gate and always walks to the closest marked location it has not picked
                yet, measuring distance along the aisles, never through the racks. When two locations are equally
                close it takes them in code order, so the same list always plans the same route. A second pass
                then reverses any stretch of the route that shortens the walk, keeping every change that helps.
                The sweep gets the same second pass, and whichever of the two routes is shorter after both is the
                one drawn on the map.
              </p>
              <p>
                The sweep is the old way of walking a pick list: go down each aisle top to bottom, move to the
                next, and never look ahead. When a ticket happens to lie in aisle order already, the two routes
                come out the same.
              </p>
            </div>
          </div>
          <dl className="rounded-lg bg-floor p-5 text-floor-ink lg:col-span-5 lg:mt-16">
            <Spec dark term="Floor" value={`${FLOOR.width} × ${FLOOR.height} m`} />
            <Spec dark term="Aisles" value={RUNS.map((run) => run.name).join(", ")} />
            <Spec dark term="Cross-aisles" value="Apron south, rear north" />
            <Spec dark term="Speed" value={`${WALK_MPS} m/s loaded`} />
            <Spec dark term="Route" value="Gate to gate" />
            <Spec dark term="Sweep" value="Every aisle, in order" />
          </dl>
        </div>
      </section>

      <section id="standards" className="scroll-mt-24 bg-secondary">
        <div className="mx-auto max-w-[115rem] px-4 py-16 md:px-8 md:py-24">
          <Eyebrow>Standards</Eyebrow>
          <h2 className="section-title mt-4 max-w-3xl">
            <WaveText text="The cost in minutes." />
          </h2>

          <div className="mt-10 grid gap-12 lg:grid-cols-12">
            <div className="space-y-4 text-base leading-relaxed text-muted-foreground lg:col-span-7">
              <p>
                Walking is only part of the cost. The operation file prices every task a picker
                performs at the rack: grabbing a unit (2 seconds), counting and handing it over (1.5
                seconds), swinging the cart (4 seconds), placing and verifying (2 seconds), and the
                pack split at the end (6 seconds per ticket).
              </p>
              <p>
                The cart shares its walking time across the tickets it carries; the hands-on work at
                each rack is charged in full, every time. For Cinder, one ticket takes{" "}
                {cinder.secondsPerTicket.toFixed(1)} seconds total,{" "}
                {cinder.unitsPerHour.toFixed(1)} units per hour, and{" "}
                {cinder.utilPercent.toFixed(1)} percent of one picker&rsquo;s shift.
              </p>
              <p>
                Utilization compares demand against capacity: how many lines the zone expects per
                shift, priced at the standard, against one picker&rsquo;s available time. Skill bands
                adjust the rate: a day shift is expected at 85 percent of a veteran&rsquo;s pace,
                the night desk at 70 percent.
              </p>
            </div>
            <dl className="rounded-lg bg-floor p-5 text-floor-ink lg:col-span-5">
              <Spec dark term="Operation" value="Weekly restock" />
              <Spec dark term="Sample" value={`${sample.house}, ${demoOrder.short}`} />
              <Spec dark term="Shift" value={`${OPERATION.shiftSeconds / 3600} h at ${WALK_MPS} m/s`} />
              <Spec dark term="Cart" value={`${OPERATION.cartStops} stops`} />
              <Spec dark term="Units a line" value={String(OPERATION.unitsPerLine)} />
              <Spec dark term="Bands" value="Veteran, day, night" />
            </dl>
          </div>

          <div className="mt-14 overflow-x-auto rounded-lg border border-border bg-card">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-border">
                  {["Zone", "Stops", "Lines", "Units", "Route", "Cart", "MPU", "MPL", "UPH", "Util"].map(
                    (head, index) => (
                      <th
                        key={head}
                        className={cn(
                          "px-3 py-3 font-mono text-[11px] font-medium tracking-[0.14em] uppercase",
                          index === 0 ? "text-left" : "text-right",
                        )}
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
                      <span className="ml-2 font-mono text-[11px] tracking-[0.14em] text-muted-foreground uppercase">
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
            Every row is priced for the demo operation&rsquo;s ticket. A cart of {OPERATION.cartStops} stops carries
            that many tickets at once, so they share one walk, while the time at each rack is charged in full every
            time. Route is the zone&rsquo;s planned walk, gate to gate. Cart is the number of tickets that share it.
            MPU is minutes per unit, MPL is minutes per line, UPH is the units one picker clears in an hour at this
            standard, and Util is how much of one picker&rsquo;s shift the zone&rsquo;s demand fills.
          </p>

          <div className="mt-14 grid gap-12 lg:grid-cols-12">
            <figure className="lg:col-span-7">
              <div className="flex h-12 w-full overflow-hidden rounded-lg border border-border bg-card">
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
              <figcaption className="mt-3 font-mono text-[11px] tracking-[0.14em] text-muted-foreground uppercase">
                Fig. 02. {sample.house}, {demoOrder.short}
              </figcaption>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
                The {demoOrder.short} carries {sample.lines} lines and {sample.units} units over a{" "}
                {formatMetres(110)} walk at {WALK_MPS} m/s. The bar shows the whole ticket,{" "}
                {formatDuration(sample.totalSeconds)}, about half walking and the rest picking.
              </p>
            </figure>
            <div className="lg:col-span-5">
              <p className="font-mono text-[11px] font-medium tracking-[0.14em] text-muted-foreground uppercase">
                Units per hour, zone by band
              </p>
              <div className="mt-4 overflow-x-auto rounded-lg border border-border bg-card">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="px-3 py-3 text-left font-mono text-[11px] font-medium tracking-[0.14em] uppercase">
                        Zone
                      </th>
                      {ZONE_STANDARDS[0].skills.map((band) => (
                        <th
                          key={band.id}
                          className="px-3 py-3 text-right font-mono text-[11px] font-medium tracking-[0.14em] uppercase"
                        >
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
              </div>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                A day shift is expected at 85 percent of a veteran&rsquo;s pace, the night desk at 70
                percent.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="grain bg-[#504414] text-[#efe4d7]">
        <div className="mx-auto max-w-[115rem] px-4 py-16 md:px-8 md:py-24">
          <Eyebrow className="text-[#efe4d7]/70">Sources</Eyebrow>
          <h2 className="section-title mt-4 max-w-2xl">
            <WaveText text="The scholarship under the standards." />
          </h2>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {SOURCES.map((source) => (
              <a
                key={source.title}
                href={source.href}
                target="_blank"
                rel="noreferrer"
                className="group flex flex-col rounded-lg bg-floor p-6 transition-colors hover:bg-[#210a07]"
              >
                <p className="font-mono text-[11px] tracking-[0.14em] text-[#f4df99] uppercase">{source.meta}</p>
                <h3 className="mt-4 font-heading text-xl leading-snug font-medium tracking-[-0.02em]">
                  {source.title}
                </h3>
                <p className="mt-1 text-sm text-[#efe4d7]/60">{source.authors}</p>
                <p className="mt-4 text-sm leading-relaxed text-[#efe4d7]/75">{source.note}</p>
                <p className="mt-6 inline-flex items-center gap-2 font-mono text-[11px] tracking-[0.14em] text-accent uppercase">
                  {source.cta} <ArrowIcon className="transition-transform group-hover:translate-x-1" />
                </p>
              </a>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

function StatBlock({
  value,
  suffix,
  label,
  detail,
}: {
  value: string;
  suffix?: string;
  label: string;
  detail: string;
}) {
  return (
    <div>
      <Odometer value={value} suffix={suffix} className="text-[clamp(3.25rem,5vw,6.5rem)]" />
      <p className="mt-4 font-heading text-[clamp(1.5rem,1.75vw,1.75rem)] font-medium tracking-[-0.02em]">{label}</p>
      <p className="mt-2 max-w-xs text-sm leading-relaxed text-floor-ink/70">{detail}</p>
    </div>
  );
}

function Spec({ term, value, dark = false }: { term: string; value: string; dark?: boolean }) {
  return (
    <div
      className={cn(
        "grid grid-cols-[7rem_1fr] gap-3 border-b py-3 last:border-b-0",
        dark ? "border-floor-ink/15" : "border-border",
      )}
    >
      <dt className={cn("eyebrow", dark ? "text-floor-ink/60" : "text-muted-foreground")}>{term}</dt>
      <dd className={cn("text-sm", dark ? "text-floor-ink" : undefined)}>{value}</dd>
    </div>
  );
}
