"use client";

import { useEffect, useRef } from "react";

type Lottie = typeof import("lottie-web")["default"];
type Anim = ReturnType<Lottie["loadAnimation"]>;

/**
 * The colour cascade opentrade.io plays through its hexagon field, used as
 * Northspan's answer to their looping hero video: the sixteen hexes fill
 * with brand orange, empty again, and fill again, waving in and out behind
 * the headline. Loaded from their own lottie file; reduced motion gets the
 * final all-orange frame, held still.
 */
export function HexLottie() {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let destroyed = false;
    let started = false;
    let poll = 0;
    let anim: Anim | null = null;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const nearView = () => {
      const rect = host.getBoundingClientRect();
      return rect.top < window.innerHeight * 1.2 && rect.bottom > 0;
    };

    const start = () => {
      if (started || destroyed) return;
      started = true;
      window.clearInterval(poll);
      window.removeEventListener("scroll", maybeStart);
      const base = (process.env.NEXT_PUBLIC_BASE_PATH as string | undefined) ?? "";
      import("lottie-web")
        .then((mod) => {
          if (destroyed) return;
          const item = mod.default.loadAnimation({
            container: host,
            renderer: "svg",
            loop: false,
            autoplay: false,
            path: `${base}/hex-field-colour.json`,
          });
          anim = item;
          if (reduced) {
            item.goToAndStop(150, true);
            return;
          }
          item.addEventListener("complete", () => {
            item.setDirection(item.playDirection === 1 ? -1 : 1);
            item.play();
          });
          item.play();
        })
        .catch((error) => console.error("the hex lottie did not load", error));
    };

    const maybeStart = () => {
      if (!started && !destroyed && nearView()) start();
    };

    window.addEventListener("scroll", maybeStart, { passive: true });
    if (nearView()) start();
    else poll = window.setInterval(maybeStart, 400);

    return () => {
      destroyed = true;
      window.clearInterval(poll);
      window.removeEventListener("scroll", maybeStart);
      anim?.destroy();
    };
  }, []);

  return <div ref={hostRef} className="h-full w-full" aria-hidden="true" />;
}
