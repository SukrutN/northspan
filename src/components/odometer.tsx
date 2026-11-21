"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { cn } from "cn";

const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

type Phase = "settled" | "armed" | "rolling";

/**
 * Rolling odometer after opentrade.io: digits sit still until the stat enters
 * the viewport, then each column rolls a full cycle forward to its figure.
 * Non-digit characters (points, colons) stay put; the suffix carries the
 * brand colour, like their orange "+".
 */
export function Odometer({
  value,
  suffix,
  className,
  suffixClassName,
}: {
  value: string;
  suffix?: string;
  className?: string;
  suffixClassName?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [phase, setPhase] = useState<Phase>("settled");

  useIsoLayoutEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    setPhase("armed");
  }, []);

  useEffect(() => {
    if (phase !== "armed") return;
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setPhase("rolling");
          io.disconnect();
        }
      },
      { threshold: 0.35 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [phase]);

  const figures = value.split("");
  const rolling = phase === "rolling";

  return (
    <span
      ref={ref}
      data-phase={phase}
      className={cn(
        "inline-flex items-end font-heading tracking-[-0.02em] [font-variant-numeric:tabular-nums]",
        className,
      )}
      aria-label={value + (suffix ?? "")}
    >
      <span aria-hidden="true" className="inline-flex items-end">
        {figures.map((ch, i) =>
          /\d/.test(ch) ? (
            <span key={i} className="odo-mask">
              <span
                className="odo-roller"
                style={{
                  transform: rolling
                    ? `translateY(${-(10 + Number(ch)) * 1.05}em)`
                      : phase === "armed"
                        ? "translateY(0em)"
                        : `translateY(-${Number(ch) * 1.05}em)`,
                  transitionDelay: `${(figures.length - 1 - i) * 40}ms`,
                }}
              >
                {Array.from({ length: 20 }, (_, j) => (
                  <span key={j}>{j % 10}</span>
                ))}
              </span>
            </span>
          ) : (
            <span key={i} className="inline-block h-[1.05em] leading-[1.05em]">
              {ch}
            </span>
          ),
        )}
      </span>
      {suffix ? (
        <span aria-hidden="true" className={cn("text-accent", suffixClassName)}>
          {suffix}
        </span>
      ) : null}
    </span>
  );
}
