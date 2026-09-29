import Link from "next/link";
import { guides } from "../types";

export const idx = (i: number) => ({ "--i": i }) as React.CSSProperties;
export const pct = (n: number | null, digits = 1) => (n == null ? "—" : `${n > 0 ? "+" : ""}${n.toFixed(digits)}%`);
export const tone = (n: number | null) => (n == null ? "text-text-3" : n < 0 ? "text-down" : "text-up");
export const inr = (n: number | null) => (n == null ? "—" : `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`);

export function Crumbs({ items }: { items: { href?: string; label: string }[] }) {
  return (
    <nav aria-label="Breadcrumb" className="meta flex flex-wrap items-center gap-1.5">
      {items.map((c, i) => (
        <span key={c.label} className="flex items-center gap-1.5">
          {i > 0 && <span aria-hidden>/</span>}
          {c.href ? <Link href={c.href} className="hover:text-text">{c.label}</Link> : <span className="text-text-2" aria-current="page">{c.label}</span>}
        </span>
      ))}
    </nav>
  );
}

// Secondary navigation between instrument types.
export function TypeTabs({ current }: { current?: string }) {
  return (
    <div role="navigation" aria-label="Instrument types" className="seg max-w-full overflow-x-auto">
      <Link href="/instruments" aria-current={current ? undefined : "page"} className={`seg-link ${current ? "" : "is-on"}`}>All types</Link>
      {guides.map((g) => (
        <Link key={g.slug} href={`/instruments/${g.slug}`} aria-current={current === g.slug ? "page" : undefined} className={`seg-link ${current === g.slug ? "is-on" : ""}`}>
          {g.label}
        </Link>
      ))}
    </div>
  );
}
