"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ArrowIcon } from "@/components/arrow-icon";
import { HexEmblem } from "@/components/emblem";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "cn";

const LINKS = [
  { href: "/plan", label: "Demo" },
  { href: "/your-floor", label: "Floor" },
  { href: "/#method", label: "Method" },
  { href: "/#standards", label: "Standards" },
];

/**
 * Floating pill header after opentrade.io: the wordmark, the nav, and the
 * actions each carry their own surface, so the bar reads over any section.
 * It slides out of view on the way down and returns on the way up.
 */
export function SiteHeader() {
  const pathname = usePathname();
  const onFloor = pathname.startsWith("/plan");
  const [hidden, setHidden] = useState(false);
  const lastY = useRef(0);

  useEffect(() => {
    lastY.current = window.scrollY;
    function onScroll() {
      const y = window.scrollY;
      if (Math.abs(y - lastY.current) < 12) return;
      setHidden(y > lastY.current && y > 96);
      lastY.current = y;
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header data-nav-hidden={hidden ? "true" : "false"} className="fixed inset-x-0 top-0 z-40">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:rounded-lg focus:bg-background focus:px-4 focus:py-2 focus:text-sm"
      >
        Skip to main content
      </a>
      <div className="site-header-inner mx-auto flex max-w-[115rem] items-center gap-2 px-4 pt-4 md:gap-4 md:px-8">
        <Link
          href="/"
          aria-label="Northspan, back to the top"
          className="flex h-9 shrink-0 items-center gap-2.5 rounded-lg border border-border bg-background pr-4 pl-3 text-[15px] font-medium tracking-[-0.02em]"
        >
          <HexEmblem className="size-5 text-accent" />
          <span>Northspan</span>
        </Link>

        <nav aria-label="Main" className="hidden min-w-0 flex-1 justify-center md:flex">
          <div className="flex items-center gap-1 rounded-lg border border-border bg-background p-[3px]">
            {LINKS.map((link) => {
              const active = link.href === "/plan" ? onFloor : false;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-sm transition-colors",
                    active ? "text-accent" : "text-foreground/70 hover:text-foreground",
                  )}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>
        </nav>

        <div className="ml-auto flex items-center gap-2 md:ml-0">
          <a
            href="https://github.com/SukrutN/northspan"
            target="_blank"
            rel="noreferrer"
            className={cn(
              buttonVariants({ variant: "secondary", size: "lg", className: "hidden sm:inline-flex" }),
            )}
          >
            GitHub <ArrowIcon external />
          </a>
          <Link href="/plan" className={cn(buttonVariants({ variant: "accent", size: "lg" }))}>
            Open the floor <ArrowIcon />
          </Link>
        </div>
      </div>
    </header>
  );
}
