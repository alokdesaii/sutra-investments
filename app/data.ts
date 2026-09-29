// Live data: mutual funds from mfapi.in (AMFI NAVs), stocks/ETFs from Yahoo Finance chart API.
// ponytail: Yahoo's endpoint is unofficial, swap for a broker API (Kite/Upstox) if it starts failing.
export type Kind = "Stock" | "Mutual Fund" | "ETF" | "Bond" | "Gold";
export type Risk = "Low" | "Medium" | "High";

type Source = { name: string; kind: Kind; category: string } & ({ mf: number } | { yahoo: string });

// Your watchlist. Add any NSE symbol (".NS") or mfapi scheme code (search: api.mfapi.in/mf/search?q=...).
const watchlist: Source[] = [
  { name: "HDFC Bank", kind: "Stock", category: "Banking", yahoo: "HDFCBANK.NS" },
  { name: "Infosys", kind: "Stock", category: "IT Services", yahoo: "INFY.NS" },
  { name: "Reliance Industries", kind: "Stock", category: "Conglomerate", yahoo: "RELIANCE.NS" },
  { name: "TCS", kind: "Stock", category: "IT Services", yahoo: "TCS.NS" },
  { name: "ITC", kind: "Stock", category: "FMCG", yahoo: "ITC.NS" },
  { name: "UTI Nifty 50 Index", kind: "Mutual Fund", category: "Index", mf: 120716 },
  { name: "Parag Parikh Flexi Cap", kind: "Mutual Fund", category: "Flexi Cap", mf: 122639 },
  { name: "Nippon India Small Cap", kind: "Mutual Fund", category: "Small Cap", mf: 118778 },
  { name: "Motilal Nifty Midcap 150", kind: "Mutual Fund", category: "Mid Cap Index", mf: 147622 },
  { name: "HDFC Liquid", kind: "Mutual Fund", category: "Liquid", mf: 119091 },
  { name: "HDFC Corporate Bond", kind: "Bond", category: "Corporate Bond Fund", mf: 118987 },
  { name: "SBI Overnight", kind: "Mutual Fund", category: "Overnight", mf: 119833 },
  { name: "HDFC Money Market", kind: "Mutual Fund", category: "Money Market", mf: 119092 },
  { name: "ICICI Pru Short Term", kind: "Bond", category: "Short Duration Fund", mf: 120754 },
  { name: "ICICI Pru Banking & PSU Debt", kind: "Bond", category: "Banking & PSU Debt Fund", mf: 120256 },
  { name: "SBI Gilt", kind: "Bond", category: "Gilt Fund (government bonds)", mf: 119707 },
  { name: "Nippon Nifty BeES", kind: "ETF", category: "Index", yahoo: "NIFTYBEES.NS" },
  { name: "Nippon Junior BeES", kind: "ETF", category: "Next 50", yahoo: "JUNIORBEES.NS" },
  { name: "Nippon Gold BeES", kind: "Gold", category: "Gold ETF", yahoo: "GOLDBEES.NS" },
];

export type Instrument = {
  name: string;
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

type Point = { t: number; v: number }; // ascending by t (ms)
const DAY = 86_400_000;

async function series(s: Source): Promise<Point[]> {
  if ("mf" in s) {
    const j = await fetch(`https://api.mfapi.in/mf/${s.mf}`).then((r) => r.json());
    return (j.data as { date: string; nav: string }[])
      .map(({ date, nav }) => {
        const [d, m, y] = date.split("-").map(Number);
        return { t: Date.UTC(y, m - 1, d), v: +nav };
      })
      .reverse();
  }
  const j = await fetch(
    `https://query1.finance.yahoo.com/v8/finance/chart/${s.yahoo}?range=3y&interval=1d`,
    { headers: { "User-Agent": "Mozilla/5.0" } },
  ).then((r) => r.json());
  const r = j.chart.result[0];
  const close: (number | null)[] = r.indicators.quote[0].close;
  return (r.timestamp as number[])
    .map((t, i) => ({ t: t * 1000, v: close[i] as number }))
    .filter((p) => p.v != null);
}

// Last value on or before time t.
function at(pts: Point[], t: number) {
  let lo = 0, hi = pts.length - 1;
  if (pts[0].t > t) return null;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (pts[mid].t <= t) lo = mid; else hi = mid - 1;
  }
  return pts[lo].v;
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
    name: s.name, kind: s.kind, category: s.category,
    price: last.v, asOf: new Date(last.t).toISOString().slice(0, 10),
    ret1y, ret3y, vol, risk, spark: weekly.slice(1), score,
  };
}

export async function loadInstruments() {
  const settled = await Promise.allSettled(watchlist.map(async (s) => metrics(s, await series(s))));
  return {
    instruments: settled.flatMap((r) => (r.status === "fulfilled" ? [r.value] : [])),
    failed: watchlist.filter((_, i) => settled[i].status === "rejected").map((s) => s.name),
  };
}
