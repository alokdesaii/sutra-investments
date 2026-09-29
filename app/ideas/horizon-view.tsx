"use client";
import { useState } from "react";
import { Spark } from "../charts";
import type { Instrument } from "../data";
import { horizons, screen, type HorizonId, type Reason } from "../horizons";

const pct = (n: number | null) => (n == null ? "—" : `${n > 0 ? "+" : ""}${n.toFixed(1)}%`);
const idx = (i: number) => ({ "--i": i }) as React.CSSProperties;
const plural: Record<string, string> = { Stock: "Stocks", "Mutual Fund": "Mutual funds", ETF: "ETFs", Bond: "Bonds", Gold: "Gold" };

function Reasons({ items }: { items: Reason[] }) {
  return (
    <ul className="space-y-1.5">
      {items.map((r) => (
        <li key={r.text} className="flex gap-2 text-[13px] leading-snug">
          <span aria-hidden className={`mt-[3px] grid h-3.5 w-3.5 shrink-0 place-items-center rounded-full text-[9px] font-bold ${r.ok ? "bg-up/15 text-up" : "bg-amber/15 text-amber"}`}>
            {r.ok ? "✓" : "!"}
          </span>
          <span className="text-text-2"><span className="sr-only">{r.ok ? "Strength: " : "Watch out: "}</span>{r.text}</span>
        </li>
      ))}
    </ul>
  );
}

export default function HorizonView({ instruments }: { instruments: Instrument[] }) {
  const [id, setId] = useState<HorizonId>("long");
  const h = horizons[id];
  const { fit, out, byKind } = screen(h, instruments);
  const value = h.metric.value;

  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-center gap-4">
        <div role="group" aria-label="Time horizon" className="seg">
          {Object.values(horizons).map((x) => (
            <button key={x.id} aria-pressed={id === x.id} onClick={() => setId(x.id)} className="h-9! px-4! text-[13.5px]!">
              {x.label}
            </button>
          ))}
        </div>
        <p className="text-text-2">{h.span}</p>
      </div>

      {/* The rules for this horizon, stated up front. */}
      <section key={`p-${id}`} className="panel grid gap-6 p-6 lg:grid-cols-12">
        <div className="rise lg:col-span-4">
          <p className="eyebrow">The goal</p>
          <p className="mt-2 text-xl font-semibold tracking-tight text-balance">{h.goal}</p>
          <p className="meta mt-2">{fit.length} of {instruments.length} watchlist instruments fit these rules.</p>
        </div>
        <ol className="grid gap-4 sm:grid-cols-3 lg:col-span-8">
          {h.principles.map((p, n) => (
            <li key={p} className="rise border-t border-line pt-3" style={idx(n + 1)}>
              <span className="text-xs font-semibold text-accent">0{n + 1}</span>
              <p className="mt-1 text-[13.5px] leading-relaxed text-text-2">{p}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="h2">Best fits, by type of instrument</h2>
          <p className="meta mt-0.5 text-[13px]">The first in each group ranks highest on these rules. Green ticks are strengths; amber marks are things to weigh.</p>
        </div>
        {byKind.length === 0 && <p className="panel p-8 text-center text-text-3">Nothing on your watchlist fits this horizon yet.</p>}
        <div key={`k-${id}`} className="grid gap-4 lg:grid-cols-2">
          {byKind.map(([kind, list], k) => {
            const [lead, ...rest] = list;
            return (
              <article key={kind} className="panel rise flex flex-col" style={idx(k)}>
                <div className="panel-head">
                  <h3 className="h2">{plural[kind] ?? kind}</h3>
                  <span className="meta">{list.length} {list.length === 1 ? "match" : "matches"}</span>
                </div>
                <div className="grid gap-5 p-5 sm:grid-cols-[1fr_auto]">
                  <div>
                    <p className="eyebrow text-accent">Top fit</p>
                    <p className="mt-1 text-lg font-semibold tracking-tight">{lead.name}</p>
                    <p className="meta">{lead.category}</p>
                  </div>
                  <div className="sm:text-right">
                    <p className={`figure ${(value(lead) ?? 0) < 0 ? "text-down" : "text-up"}`}>{pct(value(lead))}</p>
                    <p className="meta mt-1">{h.metric.label}</p>
                  </div>
                  <div className="sm:col-span-2"><Spark data={lead.spark} h={40} area id={`hz-${id}-${k}`} /></div>
                  <div className="sm:col-span-2"><Reasons items={h.reasons(lead)} /></div>
                </div>
                {rest.length > 0 && (
                  <ul className="mt-auto border-t border-line">
                    {rest.map((i) => (
                      <li key={i.name} className="flex items-center justify-between gap-4 border-b border-line px-5 py-3 last:border-b-0">
                        <div className="min-w-0">
                          <p className="truncate font-medium">{i.name}</p>
                          <p className="meta truncate">{h.reasons(i)[0].text}</p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className={`font-medium ${(value(i) ?? 0) < 0 ? "text-down" : "text-up"}`}>{pct(value(i))}</p>
                          <p className="meta">{h.metric.label}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </article>
            );
          })}
        </div>
      </section>

      {out.length > 0 && (
        <details className="group panel">
          <summary className="flex items-center justify-between px-5 py-4">
            <span>
              <span className="h2">Not suited to this horizon</span>
              <span className="meta ml-2">{out.length} instruments</span>
            </span>
            <svg width="12" height="12" viewBox="0 0 24 24" className="text-text-3 transition-transform group-open:rotate-180" aria-hidden><path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" strokeWidth="2" /></svg>
          </summary>
          <ul className="border-t border-line">
            {out.map((i) => (
              <li key={i.name} className="grid gap-1 border-b border-line px-5 py-3 last:border-b-0 sm:grid-cols-[14rem_1fr]">
                <span className="font-medium">{i.name} <span className="meta">· {i.kind}</span></span>
                <span className="text-[13px] text-text-2">{h.whyNot(i)}</span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
