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
    <div className="mx-auto max-w-lg px-5 py-24">
      <p className="eyebrow">Could not open the floor</p>
      <h1 className="mt-3 text-3xl font-medium tracking-[-0.04em]">The annex plan did not load.</h1>
      <p className="mt-3 text-sm text-muted-foreground">{error.message || "Something on the floor failed to draw."}</p>
      <Button className="mt-6 h-10 px-4" onClick={reset}>
        Try the floor again
      </Button>
    </div>
  );
}
