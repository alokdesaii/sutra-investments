"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { Entry } from "../../universe";

type Item = Entry & { href: string };
type Result = { total: number; items: Item[]; facets: { group: [string, number][]; house: [string, number][] } };

const kinds = [
  { key: "all", label: "Everything" },
  { key: "stocks", label: "Stocks" },
  { key: "etfs", label: "ETFs" },
  { key: "funds", label: "Mutual funds" },
  { key: "debt", label: "Debt funds" },
  { key: "gold", label: "Gold & silver" },
];
const isFund = (k: string) => k === "funds" || k === "debt";

export default function Browser({ counts }: { counts: Record<string, number> }) {
  const [q, setQ] = useState("");
  const [kind, setKind] = useState("all");
  const [group, setGroup] = useState("");
  const [house, setHouse] = useState("");
  const [plan, setPlan] = useState("Direct");
  const [option, setOption] = useState("Growth");
  const [data, setData] = useState<Result | null>(null);
  const [more, setMore] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  // Stays false until filters are restored from the URL, so the URL isn’t overwritten with defaults first.
  const [hydrated, setHydrated] = useState(false);

  // Restore filters from the URL once, so back/forward and shared links keep the search.
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    /* eslint-disable react-hooks/set-state-in-effect -- one-time hydration from the URL */
    setQ(p.get("q") ?? "");
    setKind(p.get("kind") ?? "all");
    setGroup(p.get("group") ?? "");
    setHouse(p.get("house") ?? "");
    setPlan(p.get("plan") ?? "Direct");
    setOption(p.get("option") ?? "Growth");
    setHydrated(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  const params = new URLSearchParams(Object.entries({ q, kind, group, house, plan, option }).filter(([, v]) => v) as [string, string][]);
  const key = params.toString();

  useEffect(() => {
    if (!hydrated) return;
    window.history.replaceState(null, "", `?${key}`);
    const ctl = new AbortController();
    const t = setTimeout(() => {
      setLoading(true);
      fetch(`/api/market?${key}`, { signal: ctl.signal })
        .then((r) => r.json())
        .then((j) => {
          if (j.error) throw new Error(j.error);
          setData(j); setMore([]); setError("");
        })
        .catch((e) => { if (e.name !== "AbortError") setError(e.message || "Search failed."); })
        .finally(() => setLoading(false));
    }, 180);
    return () => { clearTimeout(t); ctl.abort(); };
  }, [key, hydrated]);

  const items = [...(data?.items ?? []), ...more];
  const loadMore = () =>
    fetch(`/api/market?${key}&offset=${items.length}`).then((r) => r.json()).then((j) => setMore((m) => [...m, ...j.items]));
  const pickKind = (k: string) => { setKind(k); setGroup(""); setHouse(""); };

  return (
    <div className="space-y-4">
      <label className="relative block">
        <span className="sr-only">Search the market</span>
        <svg width="18" height="18" viewBox="0 0 24 24" className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-text-3" aria-hidden><circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" strokeWidth="2" /><path d="M20 20l-3.5-3.5" stroke="currentColor" strokeWidth="2" /></svg>
        <input
          autoFocus value={q} onChange={(e) => setQ(e.target.value)}
          placeholder="Search by name, NSE symbol or fund house, e.g. “hdfc bank”, “niftybees”, “parag parikh”"
          className="field h-12! w-full pl-11! text-[15px]!"
        />
      </label>

      <div role="group" aria-label="Instrument type" className="seg max-w-full overflow-x-auto">
        {kinds.map((k) => (
          <button key={k.key} aria-pressed={kind === k.key} onClick={() => pickKind(k.key)}>
            {k.label} <span className="ml-1 text-text-3">{(counts[k.key] ?? 0).toLocaleString("en-IN")}</span>
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {data && data.facets.group.length > 1 && (
          <select value={group} onChange={(e) => setGroup(e.target.value)} className="field pl-3!" aria-label="Category">
            <option value="">All categories</option>
            {data.facets.group.map(([g, n]) => <option key={g} value={g}>{g} ({n})</option>)}
          </select>
        )}
        {isFund(kind) && (
          <>
            <select value={house} onChange={(e) => setHouse(e.target.value)} className="field max-w-64 pl-3!" aria-label="Fund house">
              <option value="">All fund houses</option>
              {data?.facets.house.map(([h, n]) => <option key={h} value={h}>{h.replace(/ Mutual Fund$/, "")} ({n})</option>)}
            </select>
            <div role="group" aria-label="Plan" className="seg">
              {["Direct", "Regular"].map((p) => <button key={p} aria-pressed={plan === p} onClick={() => setPlan(p)}>{p}</button>)}
            </div>
            <div role="group" aria-label="Option" className="seg">
              {["Growth", "IDCW"].map((o) => <button key={o} aria-pressed={option === o} onClick={() => setOption(o)}>{o}</button>)}
            </div>
          </>
        )}
        <span className="meta ml-auto" aria-live="polite">
          {loading ? "Searching…" : data ? `${data.total.toLocaleString("en-IN")} result${data.total === 1 ? "" : "s"}` : ""}
        </span>
      </div>
      {isFund(kind) && <p className="meta">Direct plans skip distributor commission, so they cost less than Regular plans for the same fund. Growth reinvests gains; IDCW pays them out.</p>}

      {error && <p className="panel p-6 text-text-2">{error} Try again in a minute.</p>}
      <ul className={`panel divide-y divide-line transition-opacity ${loading ? "opacity-60" : ""}`}>
        {items.map((e) => (
          <li key={e.id}>
            <Link href={e.href} className="link-row flex items-center justify-between gap-4 px-5 py-3">
              <span className="min-w-0">
                <span className="block truncate font-medium">{e.name}</span>
                <span className="meta block truncate">
                  {e.src === "nse" ? `NSE: ${e.code} · ` : ""}{e.group === "Stocks" ? e.sub : `${e.group} · ${e.sub}`}{e.house ? ` · ${e.house.replace(/ Mutual Fund$/, "")}` : ""}{e.plan ? ` · ${e.plan} ${e.option}` : ""}
                </span>
              </span>
              <span className="shrink-0 text-right">
                {e.nav != null ? (
                  <>
                    <span className="block font-medium">₹{e.nav.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</span>
                    <span className="meta block">NAV · {e.navDate}</span>
                  </>
                ) : (
                  <span className="chip">{e.kind === "Stock" ? (e.big ? "Nifty 500" : "Stock") : e.kind === "Gold" ? "Gold" : "ETF"}</span>
                )}
              </span>
            </Link>
          </li>
        ))}
        {!loading && data && items.length === 0 && (
          <li className="px-5 py-12 text-center">
            <p className="font-medium">No matches</p>
            <p className="meta mt-1">Try fewer words, a symbol like “INFY”, or switch to “Everything”.</p>
          </li>
        )}
      </ul>
      {data && items.length < data.total && (
        <button onClick={loadMore} className="btn-ghost mx-auto flex">Show more ({(data.total - items.length).toLocaleString("en-IN")} left)</button>
      )}
    </div>
  );
}
