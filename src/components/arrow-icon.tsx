import { cn } from "cn";

/**
 * OpenTrade-style long-shaft arrow. `external` rotates it to point up-right,
 * the way opentrade.io marks outbound links.
 */
export function ArrowIcon({
  className,
  external = false,
}: {
  className?: string;
  external?: boolean;
}) {
  return (
    <svg
      viewBox="0 0 240 188"
      fill="none"
      className={cn("size-4 shrink-0", external && "-rotate-45", className)}
      aria-hidden="true"
    >
      <path
        d="M135 184.8 234 93.8 135 2.8"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
      <path
        d="M234 93.8H0"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
