"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "cn";

export function SiteHeader() {
  const pathname = usePathname();
  const onFloor = pathname.startsWith("/plan");

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background">
      <div className="mx-auto flex h-14 max-w-[1180px] items-center gap-4 px-4 md:gap-6 md:px-5">
        <Link href="/" className="text-[15px] font-medium tracking-[-0.03em]">
          Northspan
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link
            href="/plan"
            className={cn("transition-colors", onFloor ? "text-foreground" : "text-muted-foreground hover:text-foreground")}
          >
            Floor
          </Link>
          <Link href="/#method" className="text-muted-foreground transition-colors hover:text-foreground">
            Method
          </Link>
        </nav>
        <Link
          href="/plan"
          className={cn(buttonVariants({ className: "ml-auto h-9 px-3" }))}
        >
          <span className="sm:hidden">Annex</span>
          <span className="hidden sm:inline">Open the annex</span>
        </Link>
      </div>
    </header>
  );
}
