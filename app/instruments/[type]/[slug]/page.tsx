import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { calendarYears, DAY, maxDrawdown, monthlyReturns, periodReturn } from "../../../analytics";
import { loadDetail, loadInstruments, slugOf, typeOf, watchlist, WEIGHTS } from "../../../data";
import { horizons } from "../../../horizons";
import { ago, loadHeadlines, themes } from "../../../news";
import Section from "../../../section";
import { guideFor } from "../../../types";
import { HistoryChart, SipCalculator } from "../../widgets";
import { Crumbs, idx, inr, pct, tone } from "../../parts";

export const revalidate = 900;
export const generateStaticParams = () => watchlist.map((w) => ({ type: typeOf[w.kind], slug: slugOf(w.name) }));

export async function generateMetadata({ params }: PageProps<"/instruments/[type]/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const w = watchlist.find((x) => slugOf(x.name) === slug);
  return { title: w?.name ?? "Instrument", description: w?.about };
}

const date = (t: number) => new Date(t).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const monthsBetween = (a: number, b: number) => Math.max(1, Math.round((b - a) / (30.44 * DAY)));

export default async function InstrumentPage({ params }: PageProps<"/instruments/[type]/[slug]">) {
  const { type, slug } = await params;
  const [detail, { instruments }, headlines] = await Promise.all([loadDetail(slug).catch(() => null), loadInstruments(), loadHeadlines()]);
  if (!detail || detail.instrument.type !== type) notFound();
  const { instrument: i, about, pts, meta } = detail;
  const g = guideFor(type)!;

  const last = pts[pts.length - 1], prev = pts[pts.length - 2];
  const dayChange = prev ? (last.v / prev.v - 1) * 100 : null;
  const ranked = [...instruments].sort((a, b) => b.score - a.score);
  const rank = ranked.findIndex((x) => x.slug === i.slug) + 1;

  // Risk stats over the last five years (or the whole history if shorter).
  const window5 = pts.filter((p) => p.t >= last.t - 5 * 365 * DAY);
  const dd = maxDrawdown(window5);
  const months = monthlyReturns(window5);
  const upMonths = months.filter((m) => m.ret > 0).length;
  const best = months.reduce((a, b) => (b.ret > a.ret ? b : a), months[0]);
  const worst = months.reduce((a, b) => (b.ret < a.ret ? b : a), months[0]);
  const years = calendarYears(pts, 6);
  const yearScale = Math.max(...years.map((y) => Math.abs(y.ret)), 1);

  const returns = [
    ["1 month", periodReturn(pts, 30)],
    ["3 months", periodReturn(pts, 91)],
    ["6 months", periodReturn(pts, 182)],
    ["1 year", periodReturn(pts, 365)],
    ["3 years, per year", periodReturn(pts, 3 * 365)],
    ["5 years, per year", periodReturn(pts, 5 * 365)],
  ] as const;

  const exposure = themes.filter((t) => t.watch.includes(i.name));
  const nameKey = i.name.split(/\s+/)[0].toLowerCase();
  const related = headlines
    .filter((h) => h.themes.some((t) => exposure.some((e) => e.id === t)) || (nameKey.length > 3 && h.title.toLowerCase().includes(nameKey)))
    .slice(0, 6);
  const label = Object.fromEntries(themes.map((t) => [t.id, t.label]));

  const facts: [string, React.ReactNode][] =
    meta.source === "mf"
      ? [
          ["Fund house", meta.fundHouse],
          ["Category", meta.schemeCategory.replace(/^.*? - /, "")],
          ["Plan", /direct/i.test(meta.schemeName) ? "Direct · Growth" : "Regular · Growth"],
          ["ISIN", meta.isin ?? "—"],
          ["AMFI code", String(meta.code)],
        ]
      : [
          ["NSE symbol", meta.symbol],
          ["Previous close", inr(prev?.v ?? null)],
          ["Volume (latest day)", meta.volume == null ? "—" : meta.volume.toLocaleString("en-IN")],
          ["52-week low", inr(meta.low52)],
          ["52-week high", inr(meta.high52)],
        ];
  const hi52 = meta.source === "nse" ? meta.high52 : Math.max(...pts.filter((p) => p.t >= last.t - 365 * DAY).map((p) => p.v));
  const lo52 = meta.source === "nse" ? meta.low52 : Math.min(...pts.filter((p) => p.t >= last.t - 365 * DAY).map((p) => p.v));
  const pos52 = hi52 && lo52 && hi52 > lo52 ? ((last.v - lo52) / (hi52 - lo52)) * 100 : null;

  return (
    <main>
      <div className="mx-auto max-w-[1400px] px-4 pt-8 pb-6 lg:px-8 lg:pt-10">
        <Crumbs items={[{ href: "/instruments", label: "Instruments" }, { href: `/instruments/${g.slug}`, label: g.label }, { label: i.name }]} />
        <div className="mt-4 grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <p className="eyebrow rise">{i.kind} · {i.category}</p>
            <h1 className="hero rise mt-2" style={idx(1)}>{i.name}</h1>
            <p className="rise mt-3 max-w-2xl text-[16px] leading-relaxed text-text-2" style={idx(2)}>{about}</p>
            <div className="rise mt-4 flex flex-wrap gap-2" style={idx(3)}>
              <span className="chip">{i.risk} risk</span>
              <span className="chip">Rank {rank} of {ranked.length} on your watchlist</span>
              <span className="chip">Score {i.score.toFixed(1)}</span>
            </div>
          </div>
          <div className="rise lg:text-right" style={idx(2)}>
            <p className="meta">{meta.source === "mf" ? "NAV" : "Price"} · {date(last.t)}</p>
            <p className="figure mt-1 text-[40px]!">{inr(last.v)}</p>
            {dayChange != null && (
              <p className={`mt-1 font-medium ${tone(dayChange)}`}>{pct(dayChange, 2)} on the day</p>
            )}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1400px] space-y-12 px-4 pb-10 lg:px-8">
        <div className="grid gap-4 xl:grid-cols-12">
          <section className="panel p-5 xl:col-span-8" aria-label="Price history"><HistoryChart t={pts.map((p) => p.t)} v={pts.map((p) => p.v)} /></section>
          <section className="panel xl:col-span-4" aria-label="Key facts">
            <div className="panel-head"><h2 className="h2 text-sm">Key facts</h2></div>
            <dl>
              {facts.map(([k, v]) => (
                <div key={k} className="flex items-baseline justify-between gap-4 border-b border-line px-5 py-3">
                  <dt className="meta">{k}</dt>
                  <dd className="text-right font-medium">{v}</dd>
                </div>
              ))}
            </dl>
            {pos52 != null && (
              <div className="px-5 py-4">
                <p className="meta">Where today’s price sits in its 52-week range</p>
                <div className="relative mt-3 h-1.5 bg-surface-2">
                  <span className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-surface bg-amber" style={{ left: `${pos52}%` }} />
                </div>
                <p className="meta mt-2 flex justify-between"><span>{inr(lo52)}</span><span>{inr(hi52)}</span></p>
              </div>
            )}
          </section>
        </div>

        <Section title="Returns" sub="Past performance over different periods. Longer periods are shown per year (compounded).">
          <div className="grid gap-4 lg:grid-cols-12">
            <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-[4px] border border-line bg-line sm:grid-cols-3 lg:col-span-7">
              {returns.map(([k, v]) => (
                <div key={k} className="bg-surface p-5">
                  <dt className="meta">{k}</dt>
                  <dd className={`mt-1 text-2xl font-semibold tracking-tight ${tone(v)}`}>{v == null ? "—" : pct(v)}</dd>
                </div>
              ))}
            </dl>
            <div className="panel p-5 lg:col-span-5">
              <p className="h2 text-sm">Year by year</p>
              <ul className="mt-3 space-y-2">
                {years.map((y, n) => (
                  <li key={y.year} className="grid grid-cols-[3.5rem_1fr_4rem] items-center gap-3 text-[13px]">
                    <span className="text-text-2">{y.year}{y.ytd ? "*" : ""}</span>
                    <span className="relative h-2">
                      <span className="absolute inset-y-0 left-1/2 w-px bg-line-2" />
                      <span
                        className={`bar-grow absolute inset-y-0 ${y.ret < 0 ? "right-1/2 origin-right bg-down" : "left-1/2 bg-up"}`}
                        style={{ ...idx(n), width: `${(Math.abs(y.ret) / yearScale) * 50}%` }}
                      />
                    </span>
                    <span className={`text-right font-medium ${tone(y.ret)}`}>{pct(y.ret)}</span>
                  </li>
                ))}
              </ul>
              {years.some((y) => y.ytd) && <p className="meta mt-3">* This year so far.</p>}
            </div>
          </div>
        </Section>

        <Section title="Risk" sub="How bumpy the ride has been over the last five years (or since launch, if shorter).">
          <div className="grid gap-px overflow-hidden rounded-[4px] border border-line bg-line sm:grid-cols-2 xl:grid-cols-4">
            <div className="bg-surface p-5">
              <p className="meta">Volatility</p>
              <p className="mt-1 text-2xl font-semibold tracking-tight">{i.vol.toFixed(1)}%</p>
              <p className="meta mt-1">How much the price typically swings in a year. Under 5% is steady; over 18% is a rough ride.</p>
            </div>
            <div className="bg-surface p-5">
              <p className="meta">Worst fall from a peak</p>
              <p className={`mt-1 text-2xl font-semibold tracking-tight ${dd.depth < -0.5 ? "text-down" : ""}`}>{dd.depth.toFixed(1)}%</p>
              <p className="meta mt-1">
                {date(dd.peakAt)} to {date(dd.troughAt)}.{" "}
                {dd.recoveredAt ? `Recovered ${monthsBetween(dd.troughAt, dd.recoveredAt)} months after the low.` : "Hasn’t regained that peak yet."}
              </p>
            </div>
            <div className="bg-surface p-5">
              <p className="meta">Months that went up</p>
              <p className="mt-1 text-2xl font-semibold tracking-tight">{months.length ? Math.round((upMonths / months.length) * 100) : 0}%</p>
              <p className="meta mt-1">{upMonths} of the last {months.length} months ended higher.</p>
            </div>
            <div className="bg-surface p-5">
              <p className="meta">Best and worst month</p>
              <p className="mt-1 text-2xl font-semibold tracking-tight">
                <span className="text-up">{pct(best?.ret ?? null)}</span> <span className="text-text-3">/</span> <span className="text-down">{pct(worst?.ret ?? null)}</span>
              </p>
              <p className="meta mt-1">{best && worst ? `${new Date(best.t).toLocaleDateString("en-IN", { month: "short", year: "numeric", timeZone: "UTC" })} and ${new Date(worst.t).toLocaleDateString("en-IN", { month: "short", year: "numeric", timeZone: "UTC" })}.` : ""} {dd.fromHigh < -1 ? `Today it’s ${Math.abs(dd.fromHigh).toFixed(1)}% below its 5-year high.` : "It’s at or near its 5-year high."}</p>
            </div>
          </div>
        </Section>

        <Section title="What a monthly SIP would have done" sub="Pick an amount and a period to see how regular investing in this would have worked out.">
          <div className="panel p-5"><SipCalculator t={pts.map((p) => p.t)} v={pts.map((p) => p.v)} /></div>
        </Section>

        <Section
          title="Does it fit your timeline?"
          sub="The same rules as Investment Recommendations, applied to this instrument."
          action={<Link href="/ideas" className="btn-ghost">All recommendations <span aria-hidden>→</span></Link>}
        >
          <div className="grid gap-4 lg:grid-cols-2">
            {Object.values(horizons).map((h) => {
              const fits = h.fits(i);
              return (
                <div key={h.id} className="panel p-5">
                  <div className="flex items-baseline justify-between gap-3">
                    <h3 className="h2">{h.label} <span className="meta font-normal">· {h.span.toLowerCase()}</span></h3>
                    <span className={`rounded-[3px] px-2 py-1 text-xs font-semibold ${fits ? "bg-up/12 text-up" : "bg-surface-2 text-text-2"}`}>{fits ? "Fits the rules" : "Doesn’t fit"}</span>
                  </div>
                  {fits ? (
                    <ul className="mt-3 space-y-1.5">
                      {h.reasons(i).map((r) => (
                        <li key={r.text} className="flex gap-2 text-[13px] leading-snug">
                          <span aria-hidden className={`mt-[2px] grid h-4 w-4 shrink-0 place-items-center rounded-full text-[9px] font-bold ${r.ok ? "bg-up/15 text-up" : "bg-amber/15 text-amber"}`}>{r.ok ? "✓" : "!"}</span>
                          <span className="text-text-2">{r.text}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-3 text-[13px] text-text-2">{h.whyNot(i)}</p>
                  )}
                </div>
              );
            })}
          </div>
          <p className="meta">
            Its score of {i.score.toFixed(1)} = {i.ret3y == null ? "1-year" : "3-year"} return × {WEIGHTS.long} + 1-year return × {WEIGHTS.recent} − volatility × {WEIGHTS.swing}. Rule-based screens of past data, not personal advice.
          </p>
        </Section>

        <Section
          title="News that could affect it"
          sub={exposure.length ? `Linked through: ${exposure.map((e) => e.label).join(", ")}.` : "Headlines that mention it by name."}
          action={<Link href="/news" className="btn-ghost">News impact <span aria-hidden>→</span></Link>}
        >
          {related.length ? (
            <ul className="grid gap-px overflow-hidden rounded-[4px] border border-line bg-line sm:grid-cols-2 xl:grid-cols-3">
              {related.map((h) => (
                <li key={h.link} className="bg-surface">
                  <a href={h.link} target="_blank" rel="noreferrer" className="link-row flex h-full flex-col p-5">
                    <span className="eyebrow text-accent">{label[h.themes.find((t) => exposure.some((e) => e.id === t)) ?? h.themes[0]] ?? "In the news"}</span>
                    <span className="mt-2 line-clamp-3 font-medium leading-snug">{h.title}</span>
                    <span className="meta mt-auto pt-3">{h.source} · {ago(h.time)}</span>
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <p className="panel p-6 text-text-2">No related headlines right now.</p>
          )}
        </Section>

        <Section title={`Before you buy a ${g.one}`} sub={`General checks for ${g.label.toLowerCase()}. More in the guide.`} action={<Link href={`/instruments/${g.slug}`} className="btn-ghost">{g.label} guide <span aria-hidden>→</span></Link>}>
          <ol className="grid gap-px overflow-hidden rounded-[4px] border border-line bg-line sm:grid-cols-2 xl:grid-cols-5">
            {g.check.map((c, n) => (
              <li key={c} className="bg-surface p-5">
                <span className="text-xs font-semibold text-accent">{String(n + 1).padStart(2, "0")}</span>
                <p className="mt-1 text-[13.5px] text-text-2">{c}</p>
              </li>
            ))}
          </ol>
        </Section>

        <footer className="meta border-t border-line pt-6">
          {meta.source === "mf" ? "NAV history from AMFI via mfapi.in." : "Price history and quote details from Yahoo Finance."} Refreshed every 15 minutes. Past returns don’t predict future ones. For information only, not investment advice.
        </footer>
      </div>
    </main>
  );
}
