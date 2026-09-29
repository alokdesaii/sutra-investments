import type { Metadata } from "next";
import { ago } from "../news";
import { loadIpoNews, loadIpos, loadListings, type Ipo, type IpoNews, type Tone, type Verdict } from "../ipo";
import Section from "../section";

export const revalidate = 900;
export const metadata: Metadata = { title: "IPOs" };

const idx = (i: number) => ({ "--i": i }) as React.CSSProperties;
const inr = (n: number | null) => (n == null ? "—" : `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`);
const times = (n: number | null) => (n == null ? "—" : `${n >= 10 ? n.toFixed(0) : n.toFixed(2)}×`);
const day = (t: number) => new Date(t).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "UTC" });

const verdictStyle: Record<Verdict, string> = {
  "Strong demand": "bg-up/12 text-up",
  Mixed: "bg-amber/12 text-amber",
  "Weak demand": "bg-down/12 text-down",
  "Too early to tell": "bg-surface-2 text-text-2",
  "Higher risk (SME)": "bg-down/12 text-down",
};
const toneIcon: Record<Tone, [string, string, string]> = {
  good: ["✓", "bg-up/15 text-up", "Strength: "],
  caution: ["!", "bg-amber/15 text-amber", "Watch out: "],
  info: ["i", "bg-surface-2 text-text-3", ""],
};

function closes(i: Ipo) {
  if (i.status === "Closed" || i.daysLeft < 0) return "Closed";
  if (i.daysLeft === 0) return "Closes today";
  return `Closes in ${i.daysLeft} day${i.daysLeft === 1 ? "" : "s"}`;
}

// Log scale so 0.5× and 150× both read on one bar; 1× (fully subscribed) sits at a fixed tick.
const subWidth = (n: number) => Math.min(100, (Math.log10(Math.max(n, 0.05)) + 1.3) / 3.6 * 100);
const ONE_X = subWidth(1);

function SubBar({ label, value }: { label: string; value: number | null }) {
  if (value == null) return null;
  return (
    <div className="grid grid-cols-[4.5rem_1fr_3.5rem] items-center gap-3 text-[13px]">
      <span className="text-text-2">{label}</span>
      <span className="relative h-1.5 bg-surface-2">
        <span className={`bar-grow absolute inset-y-0 left-0 ${value >= 1 ? "bg-accent" : "bg-text-3"}`} style={{ width: `${subWidth(value)}%` }} />
        <span className="absolute -top-1 -bottom-1 w-px bg-line-2" style={{ left: `${ONE_X}%` }} title="1× = fully subscribed" />
      </span>
      <span className="text-right font-medium">{times(value)}</span>
    </div>
  );
}

function IpoCard({ i, news, n }: { i: Ipo; news: IpoNews[]; n: number }) {
  const key = i.name.split(/\s+/)[0].toLowerCase();
  const related = key.length > 3 ? news.filter((h) => h.title.toLowerCase().includes(key)).slice(0, 3) : [];
  const { qib, nii, retail, total } = i.subscription;
  return (
    <article className="panel rise flex flex-col" style={idx(n)}>
      <div className="flex flex-wrap items-start justify-between gap-3 px-5 pt-5">
        <div className="min-w-0">
          <p className="eyebrow">{i.sme ? "SME" : "Mainboard"} · {i.symbol}</p>
          <h3 className="mt-1 text-lg font-semibold tracking-tight">{i.name}</h3>
        </div>
        <span className={`rounded-[3px] px-2 py-1 text-xs font-semibold ${verdictStyle[i.verdict]}`}>{i.verdict}</span>
      </div>

      <dl className="mt-4 grid grid-cols-2 border-y border-line sm:grid-cols-4">
        {[
          ["Price band", i.priceLow && i.priceHigh && i.priceLow !== i.priceHigh ? `₹${i.priceLow}–${i.priceHigh}` : inr(i.priceHigh)],
          ["Min. investment", inr(i.minInvest)],
          ["Dates", `${day(i.start)} – ${day(i.end)}`],
          ["Status", closes(i)],
        ].map(([k, v], c) => (
          <div key={k} className={`px-5 py-3 ${c % 2 ? "border-l border-line" : ""} ${c > 1 ? "border-t border-line sm:border-t-0" : ""} ${c === 2 ? "sm:border-l" : ""}`}>
            <dt className="meta">{k}</dt>
            <dd className={`mt-0.5 font-semibold ${k === "Status" && i.daysLeft === 0 && i.status === "Open" ? "text-amber" : ""}`}>{v}</dd>
          </div>
        ))}
      </dl>

      <div className="grid gap-5 p-5">
        {(qib ?? nii ?? retail ?? total) != null && (
          <div>
            <p className="meta mb-2">Subscription so far (times the shares on offer; the tick marks 1×)</p>
            <div className="space-y-2">
              <SubBar label="Institutions" value={qib} />
              <SubBar label="HNIs" value={nii} />
              <SubBar label="Retail" value={retail} />
              <SubBar label="Overall" value={total} />
            </div>
          </div>
        )}

        {i.freshShare != null && (
          <div>
            <p className="meta mb-2">Where the money goes</p>
            <div className="flex h-2 overflow-hidden">
              <span className="bar-grow bg-accent" style={{ width: `${i.freshShare * 100}%` }} />
              <span className="flex-1 bg-accent/30" />
            </div>
            <p className="meta mt-1.5 flex justify-between">
              <span>Company (fresh issue) {Math.round(i.freshShare * 100)}%</span>
              <span>Selling shareholders {100 - Math.round(i.freshShare * 100)}%</span>
            </p>
          </div>
        )}

        <ul className="space-y-1.5">
          {i.signals.map((s) => {
            const [icon, cls, sr] = toneIcon[s.tone];
            return (
              <li key={s.text} className="flex gap-2 text-[13px] leading-snug">
                <span aria-hidden className={`mt-[2px] grid h-4 w-4 shrink-0 place-items-center rounded-full text-[9px] font-bold ${cls}`}>{icon}</span>
                <span className="text-text-2"><span className="sr-only">{sr}</span>{s.text}</span>
              </li>
            );
          })}
        </ul>

        {related.length > 0 && (
          <div>
            <p className="meta mb-1">In the news</p>
            <ul className="-mx-2">
              {related.map((h) => (
                <li key={h.link}>
                  <a href={h.link} target="_blank" rel="noreferrer" className="link-row block rounded-[3px] px-2 py-1.5 text-[13px] leading-snug">
                    {h.title} <span className="meta">· {h.source}</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="mt-auto flex flex-wrap items-center gap-2 border-t border-line px-5 py-3">
        {i.links.rhp && <a className="btn-ghost" href={i.links.rhp} target="_blank" rel="noreferrer">Prospectus (RHP) ↗</a>}
        {i.links.ratios && <a className="btn-ghost" href={i.links.ratios} target="_blank" rel="noreferrer">Valuation basis ↗</a>}
        <a className="btn-ghost" href={i.links.nse} target="_blank" rel="noreferrer">NSE page ↗</a>
        {i.leadManager && <span className="meta ml-auto truncate">Lead manager: {i.leadManager}</span>}
      </div>
    </article>
  );
}

const checklist = [
  ["Understand the business", "Read the ‘Our Business’ and ‘Risk Factors’ sections of the prospectus. If you can’t explain how it makes money, skip it."],
  ["Check three years of numbers", "Revenue and profit should be growing steadily. Watch for losses, falling margins, or a sudden jump just before the IPO."],
  ["Look at debt and cash flow", "Heavy borrowing or cash flow that lags profit are warning signs."],
  ["Compare the price with listed peers", "The ‘Basis for Issue Price’ document lists the P/E of similar listed companies. A much higher multiple needs a good reason."],
  ["See who is selling", "A large offer for sale by promoters or private-equity investors means insiders are cashing out."],
  ["Check promoters and litigation", "Look for past regulatory action, pending cases, pledged shares, and heavy related-party dealings."],
  ["Treat the grey-market premium (GMP) with caution", "It’s an unofficial, unregulated number that can swing daily and is easy to manipulate."],
  ["Only use money you can lock away", "Listing-day prices can fall below the issue price, and SME shares can be hard to sell."],
] as const;

export default async function IpoPage() {
  const [{ ipos, ok }, listings, news] = await Promise.all([loadIpos(), loadListings(), loadIpoNews()]);
  const open = ipos.filter((i) => i.status === "Open" && i.daysLeft >= 0);
  const closed = ipos.filter((i) => !open.includes(i));
  const preIpo = news.filter((h) => h.stage === "Pre-IPO").slice(0, 8);
  const otherNews = news.filter((h) => h.stage !== "Pre-IPO").slice(0, 8);

  return (
    <main>
      <div className="mx-auto max-w-[1400px] px-4 pt-10 pb-8 lg:px-8 lg:pt-14">
        <p className="eyebrow rise">{open.length} open now · {closed.length} closed, awaiting listing</p>
        <h1 className="hero rise mt-3" style={idx(1)}>IPOs, <em>before you apply</em></h1>
        <p className="rise mt-4 max-w-3xl text-[17px] leading-relaxed text-text-2 text-pretty" style={idx(2)}>
          Live issues from NSE with the signals that matter: who is bidding, where the money goes, and your odds of an
          allotment. Sutra doesn’t tell you whether to apply; it shows you what to weigh and where to check.
        </p>
      </div>

      <div className="mx-auto max-w-[1400px] space-y-12 px-4 pb-10 lg:px-8">
        <Section title="Open now" sub="Mainboard and SME issues accepting bids. Demand labels come from simple rules on NSE’s live subscription data, updated every 15 minutes.">
          {!ok && <p className="panel p-6 text-text-2">NSE’s IPO data isn’t reachable right now. It will retry on the next refresh.</p>}
          {ok && open.length === 0 && <p className="panel p-6 text-text-2">No IPOs are open for bidding today.</p>}
          <div className="grid gap-4 lg:grid-cols-2">
            {open.map((i, n) => <IpoCard key={i.symbol} i={i} news={news} n={n} />)}
          </div>
          <details className="panel group">
            <summary className="flex items-center justify-between px-5 py-3.5">
              <span className="h2 text-sm">How the demand label works</span>
              <svg width="12" height="12" viewBox="0 0 24 24" className="text-text-3 transition-transform group-open:rotate-180" aria-hidden><path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" strokeWidth="2" /></svg>
            </summary>
            <ul className="meta space-y-1 border-t border-line px-5 py-4 text-[13px]">
              <li><b className="text-text">Strong demand</b>: bidding has closed or it’s the last day, institutions bid 10× or more their quota, and at least 30% of the money goes to the company.</li>
              <li><b className="text-text">Weak demand</b>: institutions didn’t fill their quota by the last day.</li>
              <li><b className="text-text">Mixed</b>: anything in between.</li>
              <li><b className="text-text">Too early to tell</b>: before the last day. Institutions usually bid at the end, so early numbers mislead.</li>
              <li><b className="text-text">Higher risk (SME)</b>: always shown for SME issues, whatever the demand.</li>
              <li className="pt-1">Demand shows what other investors think, not whether the company is good or the price fair. Use the checklist below for that.</li>
            </ul>
          </details>
        </Section>

        {closed.length > 0 && (
          <Section title="Closed, awaiting listing" sub="Final subscription for issues that have stopped taking bids.">
            <div className="panel overflow-x-auto">
              <table className="w-full min-w-[640px]">
                <thead>
                  <tr className="text-left">
                    {["Company", "Price band", "Institutions", "Retail", "Overall", "Demand"].map((h, c) => (
                      <th key={h} className={`meta px-4 py-2.5 font-medium ${c > 1 && c < 5 ? "text-right" : ""}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {closed.map((i) => (
                    <tr key={i.symbol} className="border-t border-line">
                      <td className="px-4 py-3"><a href={i.links.nse} target="_blank" rel="noreferrer" className="font-medium hover:text-accent">{i.name}</a><div className="meta">{i.sme ? "SME" : "Mainboard"} · closed {day(i.end)}</div></td>
                      <td className="px-4 py-3 text-text-2">{i.priceHigh ? `₹${i.priceLow}–${i.priceHigh}` : "—"}</td>
                      <td className="px-4 py-3 text-right">{times(i.subscription.qib)}</td>
                      <td className="px-4 py-3 text-right">{times(i.subscription.retail)}</td>
                      <td className="px-4 py-3 text-right font-medium">{times(i.subscription.total)}</td>
                      <td className="px-4 py-3"><span className={`rounded-[3px] px-2 py-1 text-xs font-semibold ${verdictStyle[i.verdict]}`}>{i.verdict}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>
        )}

        <Section title="Pre-IPO pipeline and IPO news" sub="Companies filing or getting approval to go public, and coverage of live and recent issues.">
          <div className="grid gap-4 lg:grid-cols-2">
            {[
              { title: "Pre-IPO: filings and approvals", items: preIpo, empty: "No filings in the news in the last two weeks." },
              { title: "Live issues and listings", items: otherNews, empty: "No IPO news right now." },
            ].map((col) => (
              <div key={col.title} className="panel">
                <div className="panel-head"><h3 className="h2 text-sm">{col.title}</h3></div>
                <ul className="p-2">
                  {col.items.map((h) => (
                    <li key={h.link}>
                      <a href={h.link} target="_blank" rel="noreferrer" className="link-row block rounded-[3px] px-3 py-2.5">
                        <span className="font-medium leading-snug">{h.title}</span>
                        <span className="meta mt-1 flex items-center gap-2">
                          <span className="chip h-5">{h.stage}</span>{h.source} · {ago(h.time)}
                        </span>
                      </a>
                    </li>
                  ))}
                  {col.items.length === 0 && <li className="meta px-3 py-6 text-center">{col.empty}</li>}
                </ul>
              </div>
            ))}
          </div>
        </Section>

        {listings.length > 0 && (
          <Section title="How recent IPOs have done" sub="Mainboard listings from the last four months: today’s price against the issue price. A rough read on the IPO market’s mood.">
            <div className="panel overflow-x-auto">
              <table className="w-full min-w-[560px]">
                <thead>
                  <tr className="text-left">
                    {["Company", "Listed", "Issue price", "Price now", "Since issue"].map((h, c) => (
                      <th key={h} className={`meta px-4 py-2.5 font-medium ${c > 1 ? "text-right" : ""}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {listings.map((l) => (
                    <tr key={l.symbol} className="border-t border-line">
                      <td className="px-4 py-3 font-medium">{l.name}</td>
                      <td className="px-4 py-3 text-text-2">{day(l.listed)}</td>
                      <td className="px-4 py-3 text-right text-text-2">{inr(l.issuePrice)}</td>
                      <td className="px-4 py-3 text-right">{inr(l.price)}</td>
                      <td className={`px-4 py-3 text-right font-semibold ${l.change == null ? "text-text-3" : l.change < 0 ? "text-down" : "text-up"}`}>
                        {l.change == null ? "—" : `${l.change > 0 ? "+" : ""}${l.change.toFixed(1)}%`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>
        )}

        <Section title="Before you apply: what to check" sub="Demand tells you what others think. These checks tell you whether the company and the price make sense. Most answers are in the prospectus (RHP) linked on each card.">
          <ol className="grid gap-px overflow-hidden rounded-[4px] border border-line bg-line sm:grid-cols-2 xl:grid-cols-4">
            {checklist.map(([title, body], n) => (
              <li key={title} className="bg-surface p-5">
                <span className="text-xs font-semibold text-accent">{String(n + 1).padStart(2, "0")}</span>
                <p className="mt-1 font-medium">{title}</p>
                <p className="meta mt-1 text-[13px]">{body}</p>
              </li>
            ))}
          </ol>
        </Section>

        <footer className="meta border-t border-line pt-6">
          IPO data from NSE’s public issue pages; listing prices via Yahoo Finance; news via Google News. Demand labels are rule-based
          summaries of subscription data, not recommendations to apply. For big decisions, consider a SEBI-registered investment adviser.
        </footer>
      </div>
    </main>
  );
}
