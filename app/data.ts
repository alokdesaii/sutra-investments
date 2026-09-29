// Live data: mutual funds from mfapi.in (AMFI NAVs), stocks/ETFs from Yahoo Finance chart API.
// ponytail: Yahoo's endpoint is unofficial, swap for a broker API (Kite/Upstox) if it starts failing.
import { at, DAY, type Point } from "./analytics";

export type Kind = "Stock" | "Mutual Fund" | "ETF" | "Bond" | "Gold";
export type Risk = "Low" | "Medium" | "High";

type Source = { name: string; kind: Kind; category: string; about: string } & ({ mf: number } | { yahoo: string });

// Your watchlist. Add any NSE symbol (".NS") or mfapi scheme code (search: api.mfapi.in/mf/search?q=...).
export const watchlist: Source[] = [
  { name: "HDFC Bank", kind: "Stock", category: "Banking", yahoo: "HDFCBANK.NS", about: "India’s largest private-sector bank, lending to households and businesses." },
  { name: "Infosys", kind: "Stock", category: "IT Services", yahoo: "INFY.NS", about: "One of India’s largest IT services companies; most revenue comes from North American and European clients." },
  { name: "Reliance Industries", kind: "Stock", category: "Conglomerate", yahoo: "RELIANCE.NS", about: "Conglomerate spanning oil refining and petrochemicals, Jio telecom and retail." },
  { name: "TCS", kind: "Stock", category: "IT Services", yahoo: "TCS.NS", about: "India’s largest IT services company by revenue, part of the Tata group." },
  { name: "ITC", kind: "Stock", category: "FMCG", yahoo: "ITC.NS", about: "India’s largest cigarette maker, with growing packaged-foods, personal-care, paperboard and agri businesses." },
  { name: "UTI Nifty 50 Index", kind: "Mutual Fund", category: "Index", mf: 120716, about: "Index fund holding the 50 Nifty companies in the same proportions, at low cost." },
  { name: "Parag Parikh Flexi Cap", kind: "Mutual Fund", category: "Flexi Cap", mf: 122639, about: "Actively managed fund investing across company sizes, with part of the money in overseas stocks." },
  { name: "Nippon India Small Cap", kind: "Mutual Fund", category: "Small Cap", mf: 118778, about: "Actively managed fund investing mainly in smaller listed companies: high growth potential, big swings." },
  { name: "Motilal Nifty Midcap 150", kind: "Mutual Fund", category: "Mid Cap Index", mf: 147622, about: "Index fund tracking the Nifty Midcap 150, India’s mid-sized listed companies." },
  { name: "HDFC Liquid", kind: "Mutual Fund", category: "Liquid", mf: 119091, about: "Invests in very short-term debt maturing within 91 days; a common place to park cash." },
  { name: "HDFC Corporate Bond", kind: "Bond", category: "Corporate Bond Fund", mf: 118987, about: "Invests mainly in highly rated (AA+ and above) corporate bonds." },
  { name: "SBI Overnight", kind: "Mutual Fund", category: "Overnight", mf: 119833, about: "Lends money for a single day at a time; about as low-risk as mutual funds get." },
  { name: "HDFC Money Market", kind: "Mutual Fund", category: "Money Market", mf: 119092, about: "Invests in money-market instruments that mature within a year." },
  { name: "ICICI Pru Short Term", kind: "Bond", category: "Short Duration Fund", mf: 120754, about: "Invests in bonds maturing in roughly one to three years." },
  { name: "ICICI Pru Banking & PSU Debt", kind: "Bond", category: "Banking & PSU Debt Fund", mf: 120256, about: "Invests in bonds issued by banks, public-sector companies and public financial institutions." },
  { name: "SBI Gilt", kind: "Bond", category: "Gilt Fund (government bonds)", mf: 119707, about: "Invests in government securities: no default risk, but its price moves with interest rates." },
  { name: "Nippon Nifty BeES", kind: "ETF", category: "Index", yahoo: "NIFTYBEES.NS", about: "Exchange-traded fund tracking the Nifty 50, bought and sold on the exchange like a share." },
  { name: "Nippon Junior BeES", kind: "ETF", category: "Next 50", yahoo: "JUNIORBEES.NS", about: "ETF tracking the Nifty Next 50, the 50 large companies just below the Nifty 50." },
  { name: "Nippon Gold BeES", kind: "Gold", category: "Gold ETF", yahoo: "GOLDBEES.NS", about: "ETF backed by physical gold held in vaults; its price follows gold in rupees." },
];

// URL segment per kind, and a URL slug per instrument.
export const typeOf: Record<Kind, string> = { Stock: "stocks", "Mutual Fund": "mutual-funds", ETF: "etfs", Gold: "gold", Bond: "bonds" };
export const slugOf = (name: string) => name.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export type Instrument = {
  name: string;
  slug: string;
  type: string; // URL segment, e.g. "mutual-funds"
  kind: Kind;
  category: string;
  price: number;
  asOf: string;
  ret1y: number;
  ret3y: number | null; // annualised; null if < 3y history
  vol: number; // annualised volatility from weekly returns, %
  risk: Risk;
  spark: number[]; // 52 weekly points
  score: number;
};

// Ranking rule, shown to the user on the Overview page. Tune freely.
export const WEIGHTS = { long: 0.7, recent: 0.3, swing: 0.25 };

// Extra facts that come with the history: fund details for mutual funds, quote details for Yahoo symbols.
export type Meta =
  | { source: "mf"; fundHouse: string; schemeName: string; schemeType: string; schemeCategory: string; isin: string | null; code: number }
  | { source: "nse"; symbol: string; longName: string; high52: number | null; low52: number | null; volume: number | null };

// Shared fetch cache: pages that need the same history reuse one response for 15 minutes.
const cached = { next: { revalidate: 900 } };

async function load(s: Source): Promise<{ pts: Point[]; meta: Meta }> {
  if ("mf" in s) {
    const j = await fetch(`https://api.mfapi.in/mf/${s.mf}`, cached).then((r) => r.json());
    const pts = (j.data as { date: string; nav: string }[])
      .map(({ date, nav }) => {
        const [d, m, y] = date.split("-").map(Number);
        return { t: Date.UTC(y, m - 1, d), v: +nav };
      })
      .reverse();
    const m = j.meta;
    return {
      pts,
      meta: { source: "mf", fundHouse: m.fund_house, schemeName: m.scheme_name, schemeType: m.scheme_type, schemeCategory: m.scheme_category, isin: m.isin_growth, code: s.mf },
    };
  }
  const j = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${s.yahoo}?range=5y&interval=1d`, {
    ...cached,
    headers: { "User-Agent": "Mozilla/5.0" },
  }).then((r) => r.json());
  const r = j.chart.result[0];
  const close: (number | null)[] = r.indicators.quote[0].close;
  const m = r.meta;
  return {
    pts: (r.timestamp as number[]).map((t, i) => ({ t: t * 1000, v: close[i] as number })).filter((p) => p.v != null),
    meta: {
      source: "nse",
      symbol: s.yahoo.replace(/\.NS$/, ""),
      longName: m.longName ?? s.name,
      high52: m.fiftyTwoWeekHigh ?? null,
      low52: m.fiftyTwoWeekLow ?? null,
      volume: m.regularMarketVolume ?? null,
    },
  };
}

function metrics(s: Source, pts: Point[]): Instrument {
  const last = pts[pts.length - 1];
  const weekly = Array.from({ length: 53 }, (_, i) => at(pts, last.t - (52 - i) * 7 * DAY) ?? pts[0].v);
  const rets = weekly.slice(1).map((v, i) => Math.log(v / weekly[i]));
  const mean = rets.reduce((a, b) => a + b, 0) / rets.length;
  const vol = Math.sqrt(rets.reduce((a, r) => a + (r - mean) ** 2, 0) / (rets.length - 1)) * Math.sqrt(52) * 100;

  const y1 = at(pts, last.t - 365 * DAY);
  const y3 = pts[0].t <= last.t - 3 * 365 * DAY + 7 * DAY ? at(pts, last.t - 3 * 365 * DAY) : null;
  const ret1y = y1 ? (last.v / y1 - 1) * 100 : 0;
  const ret3y = y3 ? ((last.v / y3) ** (1 / 3) - 1) * 100 : null;

  const risk: Risk = vol < 5 ? "Low" : vol < 18 ? "Medium" : "High";
  // Transparent rule: long-run return weighted over recent, penalised for bumpiness. Tune freely.
  const score = (ret3y ?? ret1y) * WEIGHTS.long + ret1y * WEIGHTS.recent - vol * WEIGHTS.swing;

  return {
    name: s.name, slug: slugOf(s.name), type: typeOf[s.kind], kind: s.kind, category: s.category,
    price: last.v, asOf: new Date(last.t).toISOString().slice(0, 10),
    ret1y, ret3y, vol, risk, spark: weekly.slice(1), score,
  };
}

export async function loadInstruments() {
  const settled = await Promise.allSettled(watchlist.map(async (s) => metrics(s, (await load(s)).pts)));
  return {
    instruments: settled.flatMap((r) => (r.status === "fulfilled" ? [r.value] : [])),
    failed: watchlist.filter((_, i) => settled[i].status === "rejected").map((s) => s.name),
  };
}

// Full history + facts for one instrument's detail page. Mutual funds keep their entire NAV history.
export async function loadDetail(slug: string) {
  const s = watchlist.find((w) => slugOf(w.name) === slug);
  if (!s) return null;
  const { pts, meta } = await load(s);
  return { instrument: metrics(s, pts), about: s.about, pts, meta };
}
