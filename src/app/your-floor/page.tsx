import type { Metadata } from "next";
import { Eyebrow } from "@/components/eyebrow";
import { YourFloorForm } from "./your-floor-form";

const SAMPLE_BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export const metadata: Metadata = {
  title: "Your floor",
  description:
    "Load your own floor, operation, and ticket into the browser and read the walk and the standards from the same engine math.",
};

export default function YourFloorPage() {
  return (
    <section>
      <div className="mx-auto max-w-[115rem] px-4 pt-24 pb-14 md:px-8 md:pt-32">
        <Eyebrow>Your floor</Eyebrow>
        <h1 className="section-title mt-4">Floor</h1>
        <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground md:text-base">
          Load a floor file, an operation file when you have one, and a ticket file or a pasted list
          of location codes. The walk and the standards come from the same math the engine runs.
        </p>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          The files are plain JSON in the{" "}
          <a
            href="https://github.com/SukrutN/northspan/blob/main/engine/docs/customizing-a-floor.md"
            target="_blank"
            rel="noreferrer"
            className="underline underline-offset-4 transition-colors hover:text-foreground"
          >
            engine&rsquo;s fixture format
          </a>
          . Load an example to see the shape, or{" "}
          <a
            href={`${SAMPLE_BASE}/samples/kiln-annex/floor.json`}
            target="_blank"
            rel="noreferrer"
            className="underline underline-offset-4 transition-colors hover:text-foreground"
          >
            view a floor file
          </a>{" "}
          and{" "}
          <a
            href={`${SAMPLE_BASE}/samples/kiln-annex/operation.json`}
            target="_blank"
            rel="noreferrer"
            className="underline underline-offset-4 transition-colors hover:text-foreground"
          >
            an operation file
          </a>
          , or start from a{" "}
          <a
            href={`${SAMPLE_BASE}/samples/template-floor.json`}
            target="_blank"
            rel="noreferrer"
            className="underline underline-offset-4 transition-colors hover:text-foreground"
          >
            blank template
          </a>
          .
        </p>
      </div>
      <YourFloorForm />
    </section>
  );
}
