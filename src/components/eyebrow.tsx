import type { ReactNode } from "react";
import { cn } from "cn";

/** The hexagon marker that sits before every label on opentrade.io. */
export function HexMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 18 18" fill="none" className={cn("size-3 shrink-0", className)} aria-hidden="true">
      <path
        d="M8.25 0.74c.46-.27 1.04-.27 1.5 0l6.02 3.48c.46.27.75.76.75 1.3v6.96c0 .54-.29 1.03-.75 1.3l-6.02 3.48c-.46.27-1.04.27-1.5 0l-6.02-3.48a1.5 1.5 0 0 1-.75-1.3V5.52c0-.54.29-1.03.75-1.3L8.25.74Z"
        fill="currentColor"
        fillOpacity="0.2"
        stroke="currentColor"
        strokeWidth="0.54"
      />
      <path
        d="M9 5.56l3.07 1.67v3.54L9 12.44 5.93 10.77V7.23L9 5.56Z"
        stroke="currentColor"
        strokeWidth="0.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M5.93 7.23L9 8.91l3.07-1.68"
        stroke="currentColor"
        strokeWidth="0.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M9 8.91v3.53"
        stroke="currentColor"
        strokeWidth="0.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Mono eyebrow with hex marker, in the opentrade.io pattern. */
export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <HexMark className="text-accent" />
      <p className="eyebrow">{children}</p>
    </div>
  );
}
