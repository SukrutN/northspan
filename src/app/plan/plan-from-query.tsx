"use client";

import { useSearchParams } from "next/navigation";
import { Planner } from "@/components/planner";

export function PlanFromQuery() {
  const params = useSearchParams();
  return <Planner initialOrderId={params.get("order")} />;
}
