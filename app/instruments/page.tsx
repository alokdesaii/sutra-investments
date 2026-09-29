import type { Metadata } from "next";
import Link from "next/link";
import { Spark } from "../charts";
import { loadInstruments } from "../data";
import Section from "../section";
import { guides } from "../types";
import { idx, pct, tone, TypeTabs } from "./parts";

export const revalidate = 900;
export const metadata: Metadata = { title: "Instruments" };

const compare = [
  ["Stocks", "High", "5+ years", "Growth from companies you pick yourself"],
  ["Mutual funds", "Low to high", "Depends on the fund", "Hands-off investing, SIPs, any goal"],
  ["ETFs", "Medium to high", "5+ years", "Cheap, broad market exposure"],
  ["Gold", "Medium", "5+ years", "Cushioning stock-market falls"],
  ["Bonds & debt funds", "Low", "1–3 years", "Stability and near-term money"],
];

export default async function Instruments() {
  const { instruments } = await loadInstruments();

  return (
    <main>
      <div className="mx-auto max-w-[1400px] px-4 pt-10 pb-8 lg:px-8 lg:pt-14">
        <p className="eyebrow rise">{instruments.length} instruments on your watchlist</p>
        <h1 className="hero rise mt-3" style={idx(1)}>Know what <em>you’re buying</em></h1>
        <p className="rise mt-4 max-w-3xl text-[17px] leading-relaxed text-text-2 text-pretty" style={idx(2)}>
          Each type of investment works differently: how it makes money, what can go wrong, and what it costs. Start with a
          type, then open any instrument for its full history, risk, returns and an SIP calculator.
        </p>
        <div className="rise mt-6" style={idx(3)}><TypeTabs /></div>
      </div>

      <div className="mx-auto max-w-[1400px] space-y-12 px-4 pb-10 lg:px-8">
        <Section title="Instrument types" sub="What’s on your watchlist in each, and the strongest performer over the last year.">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {guides.map((g, n) => {
              const list = instruments.filter((i) => g.kinds.includes(i.kind));
              const best = [...list].sort((a, b) => b.ret1y - a.ret1y)[0];
              return (
                <Link key={g.slug} href={`/instruments/${g.slug}`} className="panel link-row rise group flex flex-col p-5" style={idx(n)}>
                  <div className="flex items-baseline justify-between gap-3">
                    <h3 className="text-lg font-semibold tracking-tight">{g.label}</h3>
                    <span className="meta">{list.length} on watchlist</span>
                  </div>
                  <p className="mt-1 text-text-2">{g.tagline}</p>
                  {best ? (
                    <div className="mt-5 grid grid-cols-[1fr_7rem] items-end gap-4">
                      <div className="min-w-0">
                        <p className="meta">Best last year</p>
                        <p className="truncate font-medium">{best.name}</p>
                        <p className={`text-sm font-semibold ${tone(best.ret1y)}`}>{pct(best.ret1y)}</p>
                      </div>
                      <Spark data={best.spark} h={32} id={`hub-${g.slug}`} />
                    </div>
                  ) : (
                    <p className="meta mt-5">Nothing of this type on your watchlist yet.</p>
                  )}
                  <span className="mt-5 text-sm font-medium text-accent">Explore {g.label.toLowerCase()} <span aria-hidden className="inline-block transition-transform group-hover:translate-x-0.5">→</span></span>
                </Link>
              );
            })}
          </div>
        </Section>

        <Section title="Which type for which job" sub="A rough guide. Individual instruments within a type can differ a lot.">
          <div className="panel overflow-x-auto">
            <table className="w-full min-w-[640px]">
              <thead>
                <tr className="text-left">
                  {["Type", "Typical risk", "Typical horizon", "Good for"].map((h) => <th key={h} className="meta px-5 py-2.5 font-medium">{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {compare.map(([type, risk, horizon, use]) => (
                  <tr key={type} className="border-t border-line">
                    <td className="px-5 py-3 font-medium">{type}</td>
                    <td className="px-5 py-3 text-text-2">{risk}</td>
                    <td className="px-5 py-3 text-text-2">{horizon}</td>
                    <td className="px-5 py-3 text-text-2">{use}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      </div>
    </main>
  );
}
