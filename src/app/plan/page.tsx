import type { Metadata } from "next";
import { Planner } from "@/components/planner";

export const metadata: Metadata = {
  title: "Kiln Annex floor",
  description: "Mark a pick list on Kiln Annex and walk it from the apron gate.",
};

export default async function PlanPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string }>;
}) {
  const params = await searchParams;
  return <Planner initialOrderId={params.order ?? null} />;
}
