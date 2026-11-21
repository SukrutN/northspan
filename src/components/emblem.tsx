import { cn } from "cn";

/** Northspan mark: a hex ring, cut from the same geometry as the eyebrow markers. */
export function HexEmblem({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 34 37" fill="none" className={cn("size-6 shrink-0", className)} aria-hidden="true">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M17 1.5 31.7 10v17L17 35.5 2.3 27V10L17 1.5Zm0 9 6.9 4v8l-6.9 4-6.9-4v-8l6.9-4Z"
        fill="currentColor"
      />
    </svg>
  );
}
