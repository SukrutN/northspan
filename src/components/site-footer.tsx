import Link from "next/link";
import { ArrowIcon } from "@/components/arrow-icon";
import { HexMark } from "@/components/eyebrow";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "cn";

const year = new Date().getFullYear();

const GROUPS: {
  title: string;
  links: { label: string; href: string; external?: boolean }[];
}[] = [
  {
    title: "Site",
    links: [
      { label: "Demo", href: "/plan" },
      { label: "Floor", href: "/your-floor" },
      { label: "Method", href: "/#method" },
      { label: "Standards", href: "/#standards" },
    ],
  },
  {
    title: "Project",
    links: [
      { label: "Source Code", href: "https://github.com/SukrutN/northspan", external: true },
      { label: "The engine", href: "https://github.com/SukrutN/northspan/tree/main/engine", external: true },
      {
        label: "Operation fixture",
        href: "https://github.com/SukrutN/northspan/blob/main/engine/fixtures/kiln-annex/operation.json",
        external: true,
      },
    ],
  },
];

const NOTES = [
  "Every figure comes from the engine.",
  "No account, no database, no external service.",
];

/**
 * Footer after opentrade.io: a sheen-lit call to action on the oxblood →
 * orange → cream gradient, link groups under hex markers, and the giant
 * wordmark across the bottom.
 */
export function SiteFooter() {
  return (
    <footer className="relative overflow-hidden text-[#efe4d7]">
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          background: "linear-gradient(122.74deg, #3a0d0a -2.72%, #ff5b2e 62.97%, #f4df99 100.8%)",
        }}
      />
      <div className="grain relative mx-auto max-w-[115rem] px-4 pt-20 pb-10 md:px-8 md:pt-28">
        <p className="eyebrow text-[#efe4d7]/70">Northspan</p>
        <h2 className="display mt-5">
          Make every
          <br />
          <span className="text-sheen">walk count.</span>
        </h2>
        <p className="mt-6 max-w-xl text-base leading-relaxed text-[#efe4d7]/85">
          Put the engine behind a pick list: mark the cart, walk the runs, and price the same tour in minutes per
          unit.
        </p>
        <Link
          href="/plan"
          className={cn(
            buttonVariants({
              size: "lg",
              className: "mt-8 h-11 bg-[#efe4d7] px-5 text-[#2f0705] hover:bg-[#faf7f5]",
            }),
          )}
        >
          Open the floor <ArrowIcon />
        </Link>

        <div className="mt-16 grid gap-10 border-t border-[#efe4d7]/25 pt-10 sm:grid-cols-2 lg:grid-cols-4">
          {GROUPS.map((group) => (
            <nav key={group.title} aria-label={group.title}>
              <div className="flex items-center gap-2">
                <HexMark className="text-accent" />
                <h3 className="text-sm font-medium tracking-[-0.02em]">{group.title}</h3>
              </div>
              <ul className="mt-4 space-y-2">
                {group.links.map((link) => (
                  <li key={link.label}>
                    {link.external ? (
                      <a
                        href={link.href}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sm text-[#efe4d7]/75 transition-colors hover:text-[#efe4d7]"
                      >
                        {link.label}
                      </a>
                    ) : (
                      <Link
                        href={link.href}
                        className="text-sm text-[#efe4d7]/75 transition-colors hover:text-[#efe4d7]"
                      >
                        {link.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </nav>
          ))}
          <div>
            <div className="flex items-center gap-2">
              <HexMark className="text-accent" />
              <h3 className="text-sm font-medium tracking-[-0.02em]">Notes</h3>
            </div>
            <ul className="mt-4 space-y-2">
              {NOTES.map((note) => (
                <li key={note} className="text-sm text-[#efe4d7]/75">
                  {note}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-2 border-t border-[#efe4d7]/25 pt-6 text-xs text-[#efe4d7]/70 sm:flex-row sm:items-center sm:justify-between">
          <p>© {year} Northspan</p>
          <p>Built by Sukrut Nadigotti</p>
        </div>

        <svg
          viewBox="0 0 840 140"
          preserveAspectRatio="xMinYMax meet"
          className="mt-10 block h-auto w-full"
          aria-hidden="true"
        >
          <text
            x="0"
            y="128"
            fill="#faf7f5"
            fontSize="132"
            fontWeight="500"
            textLength="840"
            lengthAdjust="spacingAndGlyphs"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            NORTHSPAN
          </text>
        </svg>
      </div>
    </footer>
  );
}
