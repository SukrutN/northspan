import type { Metadata } from "next";
import { Suspense } from "react";
import { PlanFromQuery } from "./plan-from-query";

export const metadata: Metadata = {
  title: "Demo floor",
  description: "Mark a pick list on the demo floor and walk it from the gate.",
};

export default function PlanPage() {
  return (
    <Suspense>
      <PlanFromQuery />
    </Suspense>
  );
}
