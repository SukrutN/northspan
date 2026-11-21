"use client";

import { useEffect, useLayoutEffect, useRef } from "react";

const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

/**
 * Gradient-wave heading, after opentrade.io: characters sit in a muted taupe
 * until the heading crosses the viewport, then wash through brand orange into
 * the section's own text colour as you scroll. Without scripting, the heading
 * simply renders in its final colour.
 */
export function WaveText({ text, className }: { text: string; className?: string }) {
  const wrapRef = useRef<HTMLSpanElement>(null);
  const words = text.split(" ");

  useIsoLayoutEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const chars = Array.from(wrap.querySelectorAll<HTMLElement>("[data-wave-char]"));
    if (chars.length === 0) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    // Scripting owns the idle colour: set it before first paint.
    chars.forEach((el) => el.setAttribute("data-active", "false"));

    let active = 0;
    let ticking = false;

    function update() {
      ticking = false;
      const rect = wrap?.getBoundingClientRect();
      if (!rect) return;
      const vh = window.innerHeight || 1;
      const startY = vh * 0.9;
      const span = Math.max(1, startY - vh * 0.4 + rect.height * 0.5);
      const progress = Math.min(1, Math.max(0, (startY - rect.top) / span));
      const count = Math.round(progress * chars.length);
      if (count === active) return;
      for (let i = Math.min(active, count); i < Math.max(active, count); i++) {
        const el = chars[i];
        if (i < count) {
          el.setAttribute("data-active", "true");
          el.setAttribute("data-flash", "true");
          window.setTimeout(() => el.removeAttribute("data-flash"), 520);
        } else {
          el.setAttribute("data-active", "false");
        }
      }
      active = count;
    }

    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(update);
    }

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [text]);

  return (
    <span ref={wrapRef} className={className}>
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">
        {words.map((word, wi) => (
          <span key={wi}>
            <span className="inline-block whitespace-nowrap">
              {word.split("").map((ch, ci) => (
                <span key={ci} data-wave-char className="wave-char">
                  {ch}
                </span>
              ))}
            </span>
            {wi < words.length - 1 ? "\u00A0" : null}
          </span>
        ))}
      </span>
    </span>
  );
}
