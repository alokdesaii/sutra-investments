"use client";
import Link from "next/link";
import { useState } from "react";
import { PriceChart, Spark } from "./charts";
import { WEIGHTS, type Instrument, type Kind, type Risk } from "./data";

export type NewsItem = { title: string; link: string; source: string; when: string; themes: string[] };

const kinds: ("All" | Kind)[] = ["All", "Stock", "Mutual Fund", "ETF", "Bond", "Gold"];
const risks: ("All" | Risk)[] = ["All", "Low", "Medium", "High"];
const riskNote: Record<Risk, string> = {
  Low: "Price rarely moves much. Typical for liquid and bond funds.",
  Medium: "Moves like the broad market. Expect some down years.",
  High: "Big swings both ways. Can fall 20–30% in a bad year.",
};

type SortKey = "score" | "ret1y" | "ret3y" | "vol";
const columns: { key: SortKey; label: string }[] = [
  { key: "ret1y", label: "1-year return" },
  { key: "ret3y", label: "3-year, per year" },
  { key: "vol", label: "Volatility" },
  { key: "score", label: "Score" },
];

const pct = (n: number | null) => (n == null ? "—" : `${n > 0 ? "+" : ""}${n.toFixed(1)}%`);
const tone = (n: number | null) => (n == null ? "text-text-3" : n < 0 ? "text-down" : "text-up");
const inr = (n: number) => `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

function RiskMeter({ risk }: { risk: Risk }) {
  const n = { Low: 1, Medium: 2, High: 3 }[risk];
  return (
    <span className="inline-flex items-center gap-2 text-text-2" title={riskNote[risk]}>
      <span className="flex items-end gap-[2px]" aria-hidden>
        {[1, 2, 3].map((i) => <span key={i} className={`w-[4px] ${i <= n ? "bg-text-2" : "bg-line-2"}`} style={{ height: 4 + i * 3 }} />)}
      </span>
      {risk}
    </span>
  );
}

function Seg<T extends string>({ label, options, value, onChange }: { label: string; options: T[]; value: T; onChange: (v: T) => void }) {
  return (
    <div role="group" aria-label={label} className="seg max-w-full overflow-x-auto">
      {options.map((o) => (
        <button key={o} aria-pressed={value === o} onClick={() => onChange(o)} className="whitespace-nowrap">{o}</button>
      ))}
    </div>
  );
}

function Detail({ i, rank, total, news, themeLabels, exposure }: { i: Instrument; rank: number; total: number; news: NewsItem[]; themeLabels: Record<string, string>; exposure: string[] }) {
  const long = i.ret3y ?? i.ret1y;
  const related = news.filter((h) => h.themes.some((t) => exposure.includes(t))).slice(0, 4);
  const parts = [
    { label: `${i.ret3y == null ? "1-year" : "3-year"} return ${pct(long)} × ${WEIGHTS.long}`, v: long * WEIGHTS.long },
    { label: `1-year return ${pct(i.ret1y)} × ${WEIGHTS.recent}`, v: i.ret1y * WEIGHTS.recent },
    { label: `Volatility ${i.vol.toFixed(1)}% × ${WEIGHTS.swing}`, v: -i.vol * WEIGHTS.swing },
  ];
  const scale = Math.max(...parts.map((p) => Math.abs(p.v)), 1);

  return (
    <aside id="detail" key={i.name} className="panel rise scroll-mt-20 xl:sticky xl:top-20" aria-label={`${i.name} details`}>
      <div className="px-5 pt-5">
        <p className="eyebrow">Rank {rank} of {total} · {i.kind}</p>
        <h3 className="mt-1.5 text-xl font-semibold tracking-tight">{i.name}</h3>
        <p className="meta">{i.category}</p>
        <Link href={`/instruments/${i.type}/${i.slug}`} className="btn-ghost mt-3">Full details, returns and SIP calculator <span aria-hidden>→</span></Link>
      </div>

      <div className="px-5 pt-4 pb-5">
        <PriceChart data={i.spark} asOf={i.asOf} fmt={inr} />
      </div>

      <dl className="grid grid-cols-2 border-t border-line">
        {[
          ["1-year return", pct(i.ret1y), tone(i.ret1y), "What ₹100 became over 12 months."],
          ["3-year, per year", pct(i.ret3y), tone(i.ret3y), i.ret3y == null ? "Under 3 years of history." : "Average yearly growth, compounded."],
          ["Volatility", `${i.vol.toFixed(1)}%`, "text-text", "How much the price typically swings in a year."],
          ["Risk", i.risk, "text-text", riskNote[i.risk]],
        ].map(([k, v, c, h], n) => (
          <div key={k} className={`px-5 py-3.5 ${n % 2 ? "border-l border-line" : ""} ${n > 1 ? "border-t border-line" : ""}`}>
            <dt className="meta">{k}</dt>
            <dd className={`mt-0.5 text-lg font-semibold tracking-tight ${c}`}>{v}</dd>
            <dd className="meta mt-0.5">{h}</dd>
          </div>
        ))}
      </dl>

      <details className="group border-t border-line px-5 py-4" open>
        <summary className="flex items-center justify-between">
          <span className="h2 text-sm">How its score of {i.score.toFixed(1)} is built</span>
          <svg width="12" height="12" viewBox="0 0 24 24" className="text-text-3 transition-transform group-open:rotate-180" aria-hidden><path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" strokeWidth="2" /></svg>
        </summary>
        <ul className="mt-3 space-y-2.5">
          {parts.map((p) => (
            <li key={p.label} className="grid grid-cols-[1fr_auto] items-center gap-x-3 text-[13px]">
              <span className="text-text-2">{p.label}</span>
              <span className={`font-medium ${p.v < 0 ? "text-down" : "text-text"}`}>{p.v > 0 ? "+" : ""}{p.v.toFixed(1)}</span>
              <span className="col-span-2 mt-1 flex h-1 bg-surface-2">
                <span className={`bar-grow h-full ${p.v < 0 ? "bg-down" : "bg-accent"}`} style={{ width: `${(Math.abs(p.v) / scale) * 100}%` }} />
              </span>
            </li>
          ))}
        </ul>
        <p className="meta mt-3">Rewards steady long-run growth, then recent growth, and marks down bumpy rides. It describes the past, not the future.</p>
      </details>

      <div className="border-t border-line px-5 py-4">
        <p className="h2 text-sm">News that could affect it</p>
        {related.length ? (
          <ul className="-mx-2 mt-2">
            {related.map((h) => (
              <li key={h.link}>
                <a href={h.link} target="_blank" rel="noreferrer" className="link-row block rounded-[3px] px-2 py-2">
                  <span className="line-clamp-2 leading-snug">{h.title}</span>
                  <span className="meta mt-0.5 block">{themeLabels[h.themes.find((t) => exposure.includes(t)) ?? ""]} · {h.source} · {h.when}</span>
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <p className="meta mt-2">No matching headlines right now.</p>
        )}
      </div>
    </aside>
  );
}

// Watchlist type filter → whole-market browser type (see universe.kindKey).
const marketKind: Record<string, { key: string; label: string }> = {
  All: { key: "all", label: "instruments" },
  Stock: { key: "stocks", label: "stocks" },
  "Mutual Fund": { key: "funds", label: "mutual funds" },
  ETF: { key: "etfs", label: "ETFs" },
  Bond: { key: "debt", label: "debt funds" },
  Gold: { key: "gold", label: "gold and silver" },
};
const PAGE = 20;

export default function Screener(props: { instruments: Instrument[]; news: NewsItem[]; themeLabels: Record<string, string>; exposure: Record<string, string[]>; marketCounts: Record<string, number> }) {
  const [showAll, setShowAll] = useState(false);
  const [kind, setKind] = useState<(typeof kinds)[number]>("All");
  const [risk, setRisk] = useState<(typeof risks)[number]>("All");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<{ key: SortKey; desc: boolean }>({ key: "score", desc: true });
  const ranked = [...props.instruments].sort((a, b) => b.score - a.score);
  const [selected, setSelected] = useState(ranked[0]?.name);

  // Below xl the detail panel sits under the table, so bring it into view on select.
  const select = (name: string) => {
    setSelected(name);
    if (window.innerWidth < 1280) requestAnimationFrame(() => document.getElementById("detail")?.scrollIntoView({ behavior: "smooth" }));
  };
  const toggleSort = (key: SortKey) => setSort((s) => ({ key, desc: s.key === key ? !s.desc : true }));

  const q = query.trim().toLowerCase();
  const rows = ranked
    .filter((i) => (kind === "All" || i.kind === kind) && (risk === "All" || i.risk === risk))
    .filter((i) => !q || `${i.name} ${i.category} ${i.kind}`.toLowerCase().includes(q))
    .sort((a, b) => ((a[sort.key] ?? -Infinity) - (b[sort.key] ?? -Infinity)) * (sort.desc ? -1 : 1));
  const current = ranked.find((i) => i.name === selected) ?? ranked[0];

  return (
    <div className="grid items-start gap-4 xl:grid-cols-12">
      <section className="panel overflow-hidden xl:col-span-8">
        <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-3">
          <label className="relative">
            <span className="sr-only">Search watchlist</span>
            <svg width="14" height="14" viewBox="0 0 24 24" className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-text-3" aria-hidden><circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" strokeWidth="2" /><path d="M20 20l-3.5-3.5" stroke="currentColor" strokeWidth="2" /></svg>
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search" className="field w-40" />
          </label>
          <Seg label="Type" options={kinds} value={kind} onChange={setKind} />
          <Seg label="Risk" options={risks} value={risk} onChange={setRisk} />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px]" aria-label="Watchlist">
            <thead>
              <tr className="text-left">
                <th className="meta px-4 py-2.5 font-medium">#</th>
                <th className="meta px-3 py-2.5 font-medium">Instrument</th>
                <th className="meta px-3 py-2.5 font-medium">Risk</th>
                <th className="meta w-28 px-3 py-2.5 font-medium">52 weeks</th>
                {columns.map((c) => (
                  <th key={c.key} className="px-3 py-2.5 text-right last:pr-4" aria-sort={sort.key === c.key ? (sort.desc ? "descending" : "ascending") : "none"}>
                    <button onClick={() => toggleSort(c.key)} className={`meta inline-flex items-center gap-1 font-medium whitespace-nowrap hover:text-text ${sort.key === c.key ? "text-text" : ""}`}>
                      {c.label}
                      <span aria-hidden className={sort.key === c.key ? "" : "opacity-0"}>{sort.desc ? "↓" : "↑"}</span>
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(showAll ? rows : rows.slice(0, PAGE)).map((i, n) => (
                <tr key={i.name} className="row rise" style={{ "--i": n } as React.CSSProperties} aria-selected={current?.name === i.name} onClick={() => select(i.name)}>
                  <td className="px-4 py-3 text-text-3">{ranked.indexOf(i) + 1}</td>
                  <td className="px-3 py-3">
                    <button className="text-left font-medium" onClick={(e) => { e.stopPropagation(); select(i.name); }}>{i.name}</button>
                    <div className="meta">{i.kind} · {i.category}</div>
                  </td>
                  <td className="px-3 py-3"><RiskMeter risk={i.risk} /></td>
                  <td className="px-3 py-3"><Spark data={i.spark} h={24} id={`row-${n}`} /></td>
                  <td className={`px-3 py-3 text-right font-medium ${tone(i.ret1y)}`}>{pct(i.ret1y)}</td>
                  <td className={`px-3 py-3 text-right font-medium ${tone(i.ret3y)}`}>{pct(i.ret3y)}</td>
                  <td className="px-3 py-3 text-right text-text-2">{i.vol.toFixed(1)}%</td>
                  <td className="px-4 py-3 text-right font-semibold">{i.score.toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {rows.length === 0 && (
          <div className="px-4 py-12 text-center">
            <p className="font-medium">Nothing matches</p>
            <p className="meta mt-1">Try clearing the search or choosing “All”.</p>
          </div>
        )}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-2.5">
          <p className="meta">Select a row for its chart, score breakdown and related news. Click a column heading to sort.</p>
          <div className="flex flex-wrap items-center gap-2">
            {rows.length > PAGE && (
              <button onClick={() => setShowAll((v) => !v)} className="btn-ghost">
                {showAll ? "Show top 20" : `Show all ${rows.length}`}
              </button>
            )}
            {(() => {
              const m = marketKind[kind];
              const total = props.marketCounts[m.key];
              return total ? (
                <Link href={`/instruments/all?kind=${m.key}${query ? `&q=${encodeURIComponent(query)}` : ""}`} className="btn-ghost">
                  Browse all {total.toLocaleString("en-IN")} {m.label} in the market <span aria-hidden>→</span>
                </Link>
              ) : null;
            })()}
          </div>
        </div>
      </section>

      <div className="xl:col-span-4">
        {current && (
          <Detail
            i={current}
            rank={ranked.indexOf(current) + 1}
            total={ranked.length}
            news={props.news}
            themeLabels={props.themeLabels}
            exposure={props.exposure[current.name] ?? []}
          />
        )}
      </div>
    </div>
  );
}
