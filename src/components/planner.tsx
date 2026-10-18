"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { FloorMap } from "@/components/floor-map";
import { getOrder, ORDERS, type HouseOrder } from "@/lib/orders";
import {
  formatDuration,
  formatMetres,
  planWalk,
  viaPhrase,
  walkSeconds,
  WALK_MPS,
  type WalkPlan,
} from "@/lib/routing";
import { FACES, getFace, type Face } from "@/lib/warehouse";

interface CartLine {
  faceId: string;
  qty: number;
  sources: string[];
}

type Status = "idle" | "loading" | "ready" | "error";

function sortLines(lines: CartLine[]): CartLine[] {
  return [...lines].sort((a, b) => {
    const left = getFace(a.faceId);
    const right = getFace(b.faceId);
    if (!left || !right) return a.faceId.localeCompare(b.faceId);
    return (
      left.runIndex - right.runIndex ||
      left.bay - right.bay ||
      (left.side === right.side ? 0 : left.side === "W" ? -1 : 1)
    );
  });
}

function withAdded(lines: CartLine[], faceId: string, qty: number, source: string): CartLine[] {
  const next = lines.map((line) => ({ ...line, sources: [...line.sources] }));
  const found = next.find((line) => line.faceId === faceId);
  if (found) {
    found.qty = Math.min(99, found.qty + qty);
    if (!found.sources.includes(source)) found.sources.push(source);
  } else {
    next.push({ faceId, qty, sources: [source] });
  }
  return sortLines(next);
}

function orderIsOnCart(lines: CartLine[], order: HouseOrder): boolean {
  return order.lines.every((line) => lines.some((item) => item.faceId === line.faceId));
}

function parseQty(value: string): number | null {
  if (!/^\d+$/.test(value.trim())) return null;
  const qty = Number(value);
  if (qty < 1 || qty > 99) return null;
  return qty;
}

export function Planner({ initialOrderId }: { initialOrderId: string | null }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [plan, setPlan] = useState<WalkPlan | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [showSweep, setShowSweep] = useState(false);
  const request = useRef(0);

  useEffect(() => {
    if (!initialOrderId) return;
    const order = getOrder(initialOrderId);
    if (!order) {
      setError(`Ticket ${initialOrderId} is not on the Kiln Annex board.`);
      return;
    }
    setLines(sortLines(order.lines.map((line) => ({ faceId: line.faceId, qty: line.qty, sources: [order.house] }))));
    setNote(`${order.house} is on the cart. Walk it when the list looks right.`);
  }, [initialOrderId]);

  function commit(next: CartLine[], note?: string | null) {
    const hadWalk = Boolean(plan) || status === "loading";
    request.current += 1;
    setLines(next);
    setPlan(null);
    setStatus("idle");
    setError(null);
    if (note === undefined) setNote(hadWalk ? "The list changed. The walk was cleared." : null);
    else setNote(note);
  }

  function toggleFace(faceId: string) {
    if (lines.some((line) => line.faceId === faceId)) {
      commit(lines.filter((line) => line.faceId !== faceId));
      return;
    }
    commit(withAdded(lines, faceId, 1, "Marked on the floor"));
  }

  function addOrder(order: HouseOrder) {
    let next = lines;
    for (const line of order.lines) next = withAdded(next, line.faceId, line.qty, order.house);
    commit(next);
  }

  function setQty(faceId: string, qty: number) {
    if (qty <= 0) {
      commit(lines.filter((line) => line.faceId !== faceId));
      return;
    }
    commit(lines.map((line) => (line.faceId === faceId ? { ...line, qty } : line)));
  }

  async function walk() {
    if (lines.length === 0) return;
    const id = ++request.current;
    const faceIds = lines.map((line) => line.faceId);
    setStatus("loading");
    setError(null);
    setNote(null);
    setPlan(null);
    await new Promise((resolve) => setTimeout(resolve, 480));
    if (id !== request.current) return;
    try {
      const next = planWalk(faceIds);
      if (id !== request.current) return;
      if (next.stops.length === 0) {
        setStatus("idle");
        return;
      }
      setPlan(next);
      setStatus("ready");
      setShowSweep(false);
    } catch (caught) {
      if (id !== request.current) return;
      setStatus("error");
      setPlan(null);
      setError(caught instanceof Error ? caught.message : "The walk could not be measured.");
    }
  }

  const pieces = lines.reduce((sum, line) => sum + line.qty, 0);
  const selectedIds = lines.map((line) => line.faceId);
  const stops = plan?.stops.map((stop, index) => ({ x: stop.x, y: stop.y, n: index + 1 })) ?? [];

  return (
    <div className="mx-auto max-w-[1180px] px-4 py-8 md:px-5 md:py-10">
      <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="eyebrow">Kiln Annex · dry goods</p>
          <h1 className="mt-3 text-[2rem] leading-none font-medium tracking-[-0.04em] md:text-5xl">
            Mark the cart. Walk the runs.
          </h1>
          <p className="mt-3 max-w-xl text-sm text-muted-foreground md:text-base">
            Choose a house ticket or tap a face. The walk leaves the apron gate, stays in the aisles, and comes back.
          </p>
        </div>
        <Button
          className="h-11 px-4 md:min-w-40"
          disabled={lines.length === 0 || status === "loading"}
          onClick={walk}
        >
          {status === "loading" ? "Measuring…" : "Walk this list"}
        </Button>
      </div>

      {error ? (
        <p role="alert" className="mt-6 border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}
      {note && !error ? (
        <p className="mt-6 border border-border px-4 py-3 text-sm text-muted-foreground">{note}</p>
      ) : null}

      <Metrics status={status} plan={plan} lines={lines.length} showSweep={showSweep} onToggleSweep={() => setShowSweep((value) => !value)} />

        <div className="mt-6 grid min-w-0 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22.5rem]">
        <div className="min-w-0">
        <FloorMap
          selectedIds={selectedIds}
          polyline={plan?.polyline ?? []}
          sweepPolyline={plan?.sweepPolyline ?? []}
          showSweep={Boolean(plan && showSweep && !plan.sameAsSweep)}
          stops={stops}
          interactive
          pending={status === "loading"}
          caption="Fig. 02 — Kiln Annex, looking north"
          onToggle={toggleFace}
        />
        </div>

        <aside className="min-w-0 border border-border bg-card">
          <div className="flex items-baseline justify-between gap-3 px-4 py-4">
            <h2 className="text-lg font-medium tracking-[-0.03em]">House tickets</h2>
            <AddFaceDialog
              onAdd={(face, qty) => commit(withAdded(lines, face.id, qty, "Typed mark"))}
            />
          </div>
          <ul className="divide-y divide-border border-t border-border">
            {ORDERS.map((order) => {
              const onCart = orderIsOnCart(lines, order);
              return (
                <li key={order.id} className="px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className="rounded-sm font-mono tracking-wide">
                          {order.id}
                        </Badge>
                        <span className="text-sm font-medium">{order.house}</span>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">{order.ticket}</p>
                      <p className="mt-1 font-mono text-[11px] tracking-wide text-muted-foreground">
                        {order.lines.length} {order.lines.length === 1 ? "face" : "faces"}
                      </p>
                    </div>
                    <Button
                      variant={onCart ? "secondary" : "outline"}
                      className="h-8 shrink-0 px-2.5"
                      disabled={onCart}
                      onClick={() => addOrder(order)}
                    >
                      {onCart ? "On the cart" : "Add"}
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>

          <Separator />

          <div className="flex items-baseline justify-between px-4 py-4">
            <h2 className="text-lg font-medium tracking-[-0.03em]">Cart</h2>
            <p className="font-mono text-[11px] tracking-[0.12em] text-muted-foreground uppercase">
              {lines.length === 0 ? "Empty" : `${lines.length} lines · ${pieces} pcs`}
            </p>
          </div>

          {lines.length === 0 ? (
            <p className="px-4 pb-5 text-sm text-muted-foreground">
              Nothing on the cart. Add a ticket, or mark a face on the floor. The walk waits until there is a stop.
            </p>
          ) : (
            <ul className="divide-y divide-border border-t border-border">
              {lines.map((line) => {
                const face = getFace(line.faceId);
                return (
                  <li key={line.faceId} className="flex items-center gap-3 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-mono text-xs tracking-wide">{line.faceId}</p>
                      <p className="truncate text-sm">{face?.item ?? "Open face"}</p>
                      <p className="truncate text-xs text-muted-foreground">{line.sources.join(" · ")}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="icon-sm"
                        aria-label={`Fewer ${line.faceId}`}
                        onClick={() => setQty(line.faceId, line.qty - 1)}
                      >
                        −
                      </Button>
                      <span className="w-6 text-center font-mono text-sm">{line.qty}</span>
                      <Button
                        variant="outline"
                        size="icon-sm"
                        aria-label={`More ${line.faceId}`}
                        onClick={() => setQty(line.faceId, line.qty + 1)}
                      >
                        +
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          {lines.length > 0 ? (
            <div className="px-4 py-3">
              <Button variant="ghost" className="h-8 px-2 text-muted-foreground" onClick={() => commit([], null)}>
                Clear the cart
              </Button>
            </div>
          ) : null}

          {plan && plan.stops.length > 0 ? (
            <div className="border-t border-border px-4 py-4">
              <h2 className="text-lg font-medium tracking-[-0.03em]">Walk order</h2>
              <ol className="mt-3 space-y-3">
                {plan.stops.map((stop, index) => (
                  <li key={stop.key} className="grid grid-cols-[1.5rem_1fr] gap-2 text-sm">
                    <span className="font-mono text-xs text-muted-foreground">{index + 1}</span>
                    <span>
                      <span className="font-medium">{stop.label}</span>
                      <span className="mt-0.5 block text-muted-foreground">
                        {formatMetres(stop.metresFromPrev)} {viaPhrase(stop.via)}
                      </span>
                    </span>
                  </li>
                ))}
                <li className="grid grid-cols-[1.5rem_1fr] gap-2 text-sm">
                  <span className="font-mono text-xs text-muted-foreground">↩</span>
                  <span>
                    <span className="font-medium">Apron gate</span>
                    <span className="mt-0.5 block text-muted-foreground">
                      {formatMetres(plan.returnM)} back to the gate
                    </span>
                  </span>
                </li>
              </ol>
            </div>
          ) : null}
        </aside>
      </div>
    </div>
  );
}

function Metrics({
  status,
  plan,
  lines,
  showSweep,
  onToggleSweep,
}: {
  status: Status;
  plan: WalkPlan | null;
  lines: number;
  showSweep: boolean;
  onToggleSweep: () => void;
}) {
  const loading = status === "loading";
  const readyPlan = status === "ready" && plan && plan.stops.length > 0 ? plan : null;
  const saved = readyPlan ? comparisonCopy(readyPlan) : null;

  return (
    <section className="mt-8 border border-border" aria-live="polite">
      <div className="grid grid-cols-2 lg:grid-cols-4">
        <Metric label="Distance" value={loading ? "…" : readyPlan ? formatMetres(readyPlan.distanceM) : "—"} hint={readyPlan ? "Gate to gate" : "No walk yet"} />
        <Metric
          label="Walk time"
          value={loading ? "…" : readyPlan ? formatDuration(walkSeconds(readyPlan.distanceM)) : "—"}
          hint={readyPlan ? `${WALK_MPS} m/s, loaded cart` : "Reach at the face not included"}
        />
        <Metric
          label="Stops"
          value={loading ? "…" : readyPlan ? String(readyPlan.stops.length) : "—"}
          hint={lines === 0 ? "Cart is empty" : `${lines} line${lines === 1 ? "" : "s"} on the cart`}
        />
        <Metric
          label="Versus sweep"
          value={loading ? "…" : saved ? saved.headline : "—"}
          hint={loading ? "Comparing with the serpentine" : saved ? saved.detail : "Aisle sweep, west to east"}
        />
      </div>
      <div className="flex flex-col gap-2 border-t border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          {lines === 0
            ? "Add a face before asking for a walk."
            : loading
              ? "Checking nearest neighbour, then untangling it."
              : readyPlan
                ? readyPlan.sameAsSweep
                  ? "This list already follows the sweep. Two-opt had nothing to shorten."
                  : "The oxide line is the shorter tour. The sweep is the naive order, left unimproved."
                : "The list is marked. Walk it when you are ready."}
        </p>
        <Button
          variant="outline"
          className="h-8 px-3"
          disabled={!readyPlan || readyPlan.sameAsSweep}
          aria-pressed={showSweep}
          onClick={onToggleSweep}
        >
          {showSweep ? "Hide the sweep" : "Show the sweep"}
        </Button>
      </div>
    </section>
  );
}

function Metric({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="border-b border-border px-4 py-4 odd:border-r lg:border-r lg:border-b-0 lg:last:border-r-0">
      <p className="eyebrow">{label}</p>
      <p className="mt-2 text-2xl font-medium tracking-[-0.04em]">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}

function comparisonCopy(plan: WalkPlan): { headline: string; detail: string } {
  if (Math.abs(plan.savedM) < 0.5) {
    return { headline: "Matches", detail: `Sweep also walks ${formatMetres(plan.sweepDistanceM)}` };
  }
  const pct = (plan.savedM / plan.sweepDistanceM) * 100;
  if (plan.savedM > 0) {
    return {
      headline: `${plan.savedM.toFixed(0)} m shorter`,
      detail: `${pct.toFixed(0)}% under ${formatMetres(plan.sweepDistanceM)}`,
    };
  }
  return {
    headline: `${Math.abs(plan.savedM).toFixed(0)} m longer`,
    detail: `Sweep walks ${formatMetres(plan.sweepDistanceM)}`,
  };
}

function AddFaceDialog({ onAdd }: { onAdd: (face: Face, qty: number) => void }) {
  const [open, setOpen] = useState(false);
  const [mark, setMark] = useState("");
  const [qtyText, setQtyText] = useState("1");
  const [formError, setFormError] = useState<string | null>(null);
  const [added, setAdded] = useState<string | null>(null);

  const stocked = useMemo(() => FACES.filter((face) => face.item), []);
  const query = mark.trim().toUpperCase();
  const filtered = stocked.filter((face) => {
    if (!query) return true;
    return (
      face.id.includes(query) ||
      face.item!.toUpperCase().includes(query) ||
      face.runName.toUpperCase().includes(query)
    );
  });

  function submit(face: Face | undefined, qtyRaw: string) {
    const qty = parseQty(qtyRaw);
    if (!face) {
      setFormError(
        query
          ? `Kiln Annex has no face marked ${query}.`
          : "Type a face mark, such as CIN-06-W.",
      );
      setAdded(null);
      return;
    }
    if (qty === null) {
      setFormError("Pieces must be a whole number from 1 to 99.");
      setAdded(null);
      return;
    }
    setFormError(null);
    onAdd(face, qty);
    setAdded(`${face.id} added`);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" className="h-8 px-2.5" />}>
        Add a face
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add a face to the cart</DialogTitle>
          <DialogDescription>
            Stocked marks are listed. Open faces accept a full mark, such as REE-06-W.
          </DialogDescription>
        </DialogHeader>
        <form
          className="grid gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            submit(getFace(mark), qtyText);
          }}
        >
          <div className="grid gap-1.5">
            <Label htmlFor="face-mark">Face mark or item</Label>
            <Input
              id="face-mark"
              value={mark}
              onValueChange={(value) => {
                setMark(value);
                setFormError(null);
              }}
              placeholder="CIN-06-W"
              aria-invalid={Boolean(formError)}
              autoComplete="off"
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="face-qty">Pieces</Label>
            <Input
              id="face-qty"
              inputMode="numeric"
              value={qtyText}
              onValueChange={setQtyText}
              aria-invalid={Boolean(formError)}
            />
          </div>
          {formError ? (
            <p role="alert" className="text-sm text-destructive">
              {formError}
            </p>
          ) : null}
          {added && !formError ? <p className="text-sm text-muted-foreground">{added}</p> : null}
          <DialogFooter>
            <Button type="submit">Add to the cart</Button>
          </DialogFooter>
        </form>
        <ScrollArea className="h-56 border border-border">
          {filtered.length === 0 ? (
            <p className="px-3 py-6 text-sm text-muted-foreground">
              No stocked face matches “{mark.trim()}”. Open faces still answer to a full mark.
            </p>
          ) : (
            <ul>
              {filtered.map((face) => (
                <li key={face.id} className="border-b border-border last:border-b-0">
                  <button
                    type="button"
                    className="flex w-full cursor-pointer items-baseline justify-between gap-3 px-3 py-2 text-left hover:bg-muted"
                    onClick={() => submit(face, qtyText)}
                  >
                    <span>
                      <span className="font-mono text-xs">{face.id}</span>
                      <span className="mt-0.5 block text-sm">{face.item}</span>
                    </span>
                    <span className="font-mono text-[10px] tracking-[0.12em] text-muted-foreground uppercase">
                      {face.runName}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
