import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-[1180px] flex-col gap-3 px-5 py-8 text-sm text-muted-foreground sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-foreground">Northspan</p>
          <p className="mt-1 max-w-sm">
            Pick paths for one floor. Kiln Annex is a worked model, not a live warehouse.
          </p>
        </div>
        <div className="flex gap-5 font-mono text-[11px] tracking-[0.14em] uppercase">
          <Link href="/plan" className="hover:text-foreground">
            Floor
          </Link>
          <Link href="/#method" className="hover:text-foreground">
            Method
          </Link>
        </div>
      </div>
    </footer>
  );
}
