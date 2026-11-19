import type { Metadata } from "next";
import { Suspense } from "react";
import { PlanFromQuery } from "./plan-from-query";

export const metadata: Metadata = {
  title: "Kiln Annex floor",
  description: "Mark a pick list on Kiln Annex and walk it from the apron gate.",
};

export default function PlanPage() {
  return (
    <Suspense>
      <PlanFromQuery />
    </Suspense>
  );
}
