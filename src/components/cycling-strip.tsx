"use client";

import { useEffect, useState } from "react";
import { ORDERS } from "@/lib/orders";

/**
 * The cycling "Trusted by" wall from the opentrade.io hero, retold for a
 * floor with no clients: the tickets on the demo floor take a
 * turn in the slot, one every 2.5 seconds.
 */
export function CyclingTickets() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(() => {
      setIndex((current) => (current + 1) % ORDERS.length);
    }, 2500);
    return () => window.clearInterval(id);
  }, []);

  const order = ORDERS[index];

  return (
    <div className="flex items-center gap-3">
      <p className="shrink-0 font-mono text-[11px] tracking-[0.16em] text-floor-ink/60 uppercase">Active orders</p>
      <div className="relative h-6 overflow-hidden">
        <span
          key={index}
          className="cycle-in absolute inset-y-0 left-0 flex items-center font-mono text-[11px] tracking-[0.16em] whitespace-nowrap text-floor-ink/80 uppercase"
        >
          {order.house}
        </span>
      </div>
    </div>
  );
}
