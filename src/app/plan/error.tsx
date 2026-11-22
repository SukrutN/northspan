"use client";

import { Button } from "@/components/ui/button";

export default function PlanError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto max-w-lg px-4 pt-24 pb-16">
      <p className="eyebrow text-muted-foreground">Could not open the demo</p>
      <h1 className="section-title mt-4">The demo did not load</h1>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
        {error.message || "Something on the floor failed to draw."}
      </p>
      <Button variant="accent" className="mt-6 h-10 px-4" onClick={reset}>
        Try the floor again
      </Button>
    </div>
  );
}
