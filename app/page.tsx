import Link from "next/link";
import { Spark } from "./charts";
import { loadInstruments } from "./data";
import { ago, loadHeadlines, themes } from "./news";
import Screener, { type NewsItem } from "./screener";
import Section from "./section";
import { kindKey, loadUniverse } from "./universe";

export const revalidate = 900; // refetch prices and news at most every 15 minutes

const pct = (n: number | null) => (n == null ? "—" : `${n > 0 ? "+" : ""}${n.toFixed(1)}%`);
const inr = (n: number) => `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
const Move = ({ n }: { n: number }) => (
  <span className={n < 0 ? "text-down" : "text-up"}>{n < 0 ? "down" : "up"} {Math.abs(n).toFixed(1)}%</span>
);

// Benchmarks, each tracked through a low-cost fund on the watchlist.
const benchmarks = [
  { title: "Nifty 50", what: "India’s 50 largest companies", via: "UTI Nifty 50 Index" },
  { title: "Nifty Next 50", what: "The next 50 large companies", via: "Nippon Junior BeES" },
  { title: "Midcap 150", what: "Mid-sized companies", via: "Motilal Nifty Midcap 150" },
  { title: "Gold", what: "Gold price in rupees", via: "Nippon Gold BeES" },
];

export default async function Overview() {
  const [{ instruments, failed }, headlines, universe] = await Promise.all([loadInstruments(), loadHeadlines(), loadUniverse().catch(() => [])]);
  const marketCounts: Record<string, number> = {};
  for (const e of universe) {
    if (e.src === "mf" && (e.plan !== "Direct" || e.option !== "Growth")) continue;
    marketCounts.all = (marketCounts.all ?? 0) + 1;
    marketCounts[kindKey(e)] = (marketCounts[kindKey(e)] ?? 0) + 1;
  }
  const asOf = instruments.map((i) => i.asOf).sort().at(-1) ?? "";
  const themeLabels = Object.fromEntries(themes.map((t) => [t.id, t.label]));
  const exposure: Record<string, string[]> = {};
  for (const t of themes) for (const name of t.watch) (exposure[name] ??= []).push(t.id);
  const news: NewsItem[] = headlines
    .filter((h) => h.themes.length)
    .map((h) => ({ title: h.title, link: h.link, source: h.source, when: ago(h.time), themes: h.themes }));

  const find = (name: string) => instruments.find((i) => i.name === name);
  const nifty = find("UTI Nifty 50 Index"), gold = find("Nippon Gold BeES");
  const top = themes
    .map((t) => ({ label: t.label, n: headlines.filter((h) => h.themes.includes(t.id)).length }))
    .sort((a, b) => b.n - a.n)[0];
  const today = new Date(asOf).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" });

  return (
    <main>
      {/* Hero: the day in one sentence. */}
      <div className="mx-auto max-w-[1400px] px-4 pt-10 pb-8 lg:px-8 lg:pt-14">
        <p className="eyebrow rise">{today}</p>
        <h1 className="hero rise mt-3" style={{ "--i": 1 } as React.CSSProperties}>
          Markets, <em>at a glance</em>
        </h1>
        {nifty && gold && (
          <p className="rise mt-4 max-w-3xl text-[17px] leading-relaxed text-text-2 text-pretty" style={{ "--i": 2 } as React.CSSProperties}>
            Over the past year the Nifty 50 is <Move n={nifty.ret1y} />, while gold is <Move n={gold.ret1y} />.
            {top && top.n > 0 && (
              <> The biggest story today is <Link href="/news" className="text-text underline decoration-line-2 underline-offset-4 hover:decoration-accent">{top.label}</Link>, with {top.n} headlines.</>
            )}
          </p>
        )}
      </div>

      {/* Ticker: every watchlist price and its 1-year move. Pauses on hover. */}
      <div className="ticker border-y border-line bg-surface/60 py-2.5" aria-label="Watchlist prices">
        <div className="ticker-track">
          {[0, 1].map((copy) => (
            <ul key={copy} className="flex shrink-0" aria-hidden={copy === 1}>
              {instruments.map((i) => (
                <li key={i.name} className="flex items-center gap-2 border-r border-line px-5 text-[13px] whitespace-nowrap">
                  <span className="text-text-2">{i.name}</span>
                  <span className="font-medium">{inr(i.price)}</span>
                  <span className={i.ret1y < 0 ? "text-down" : "text-up"}>{i.ret1y < 0 ? "▾" : "▴"} {Math.abs(i.ret1y).toFixed(1)}%</span>
                </li>
              ))}
            </ul>
          ))}
        </div>
      </div>

      <div className="mx-auto max-w-[1400px] space-y-12 px-4 py-10 lg:px-8">
        <Section title="Benchmarks" sub="How the broad market did over the last year. Each is tracked through a low-cost fund.">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {benchmarks.map((b, n) => {
              const i = find(b.via);
              return (
                <div key={b.title} className="panel rise flex flex-col p-5" style={{ "--i": n } as React.CSSProperties}>
                  <div className="flex items-baseline justify-between gap-2">
                    <h3 className="font-medium">{b.title}</h3>
                    <span className="meta">1 year</span>
                  </div>
                  <p className="meta">{b.what}</p>
                  {i ? (
                    <>
                      <p className={`figure mt-5 ${i.ret1y < 0 ? "text-down" : "text-up"}`}>{pct(i.ret1y)}</p>
                      <p className="meta mt-2">3 years <span className="font-medium text-text-2">{pct(i.ret3y)}</span> per year</p>
                      <div className="mt-5"><Spark data={i.spark} h={44} area id={`bm-${n}`} /></div>
                    </>
                  ) : (
                    <p className="meta mt-5">Data unavailable right now.</p>
                  )}
                </div>
              );
            })}
          </div>
        </Section>

        <Section title="Your watchlist" sub="Ranked by a simple score of long-run return, recent return and how bumpy the ride was.">
          <Screener instruments={instruments} news={news} themeLabels={themeLabels} exposure={exposure} marketCounts={marketCounts} />
          {failed.length > 0 && <p className="meta">Couldn’t load: {failed.join(", ")}. They’ll retry on the next refresh.</p>}
        </Section>

        <Section
          title="Latest headlines"
          sub="Each tagged with the market force it relates to."
          action={<Link href="/news" className="btn-ghost">See what they could move <span aria-hidden>→</span></Link>}
        >
          <ul className="grid gap-px overflow-hidden rounded-[4px] border border-line bg-line sm:grid-cols-2 xl:grid-cols-3">
            {news.slice(0, 6).map((h) => (
              <li key={h.link} className="bg-surface">
                <a href={h.link} target="_blank" rel="noreferrer" className="link-row flex h-full flex-col p-5">
                  <span className="eyebrow text-accent">{themeLabels[h.themes[0]]}</span>
                  <span className="mt-2 line-clamp-3 font-medium leading-snug">{h.title}</span>
                  <span className="meta mt-auto pt-3">{h.source} · {h.when}</span>
                </a>
              </li>
            ))}
          </ul>
          {news.length === 0 && <p className="meta">Couldn’t load headlines right now.</p>}
        </Section>

        <footer className="meta border-t border-line pt-6">
          Prices via AMFI (mfapi.in) and NSE (Yahoo Finance); headlines via Economic Times and Google News. Refreshed every 15 minutes.
          Past returns don’t predict future ones. For information only, not investment advice.
        </footer>
      </div>
    </main>
  );
}
