// Live data: mutual funds from mfapi.in (AMFI NAVs), stocks/ETFs from Yahoo Finance chart API.
// ponytail: Yahoo's endpoint is unofficial, swap for a broker API (Kite/Upstox) if it starts failing.
import { at, DAY, type Point } from "./analytics";

export type Kind = "Stock" | "Mutual Fund" | "ETF" | "Bond" | "Gold";
export type Risk = "Low" | "Medium" | "High";

export type Source = { name: string; kind: Kind; category: string; about: string } & ({ mf: number } | { yahoo: string });

// Your watchlist. Add any NSE symbol (".NS") or mfapi scheme code (search: api.mfapi.in/mf/search?q=...).
export const watchlist: Source[] = [
  { name: "HDFC Bank", kind: "Stock", category: "Banking", yahoo: "HDFCBANK.NS", about: "India’s largest private-sector bank, lending to households and businesses." },
  { name: "Infosys", kind: "Stock", category: "IT Services", yahoo: "INFY.NS", about: "One of India’s largest IT services companies; most revenue comes from North American and European clients." },
  { name: "Reliance Industries", kind: "Stock", category: "Conglomerate", yahoo: "RELIANCE.NS", about: "Conglomerate spanning oil refining and petrochemicals, Jio telecom and retail." },
  { name: "TCS", kind: "Stock", category: "IT Services", yahoo: "TCS.NS", about: "India’s largest IT services company by revenue, part of the Tata group." },
  { name: "ITC", kind: "Stock", category: "FMCG", yahoo: "ITC.NS", about: "India’s largest cigarette maker, with growing packaged-foods, personal-care, paperboard and agri businesses." },
  { name: "ICICI Bank", kind: "Stock", category: "Banking", yahoo: "ICICIBANK.NS", about: "India’s second-largest private-sector bank, with a large retail loan book." },
  { name: "State Bank of India", kind: "Stock", category: "Banking", yahoo: "SBIN.NS", about: "India’s largest bank, majority-owned by the government." },
  { name: "Kotak Mahindra Bank", kind: "Stock", category: "Banking", yahoo: "KOTAKBANK.NS", about: "Private-sector bank with businesses in lending, broking, insurance and asset management." },
  { name: "Axis Bank", kind: "Stock", category: "Banking", yahoo: "AXISBANK.NS", about: "One of India’s largest private-sector banks, serving retail and corporate customers." },
  { name: "Bajaj Finance", kind: "Stock", category: "Financial Services", yahoo: "BAJFINANCE.NS", about: "India’s largest non-bank lender, focused on consumer and small-business loans." },
  { name: "Bharti Airtel", kind: "Stock", category: "Telecom", yahoo: "BHARTIARTL.NS", about: "India’s second-largest mobile operator, also present in broadband and in Africa." },
  { name: "Larsen & Toubro", kind: "Stock", category: "Construction & Engineering", yahoo: "LT.NS", about: "India’s largest engineering and construction group, building infrastructure, plants and defence equipment." },
  { name: "Hindustan Unilever", kind: "Stock", category: "FMCG", yahoo: "HINDUNILVR.NS", about: "India’s largest consumer-goods company: soaps, detergents, foods and personal care." },
  { name: "HCL Technologies", kind: "Stock", category: "IT Services", yahoo: "HCLTECH.NS", about: "Large Indian IT services and software company." },
  { name: "Wipro", kind: "Stock", category: "IT Services", yahoo: "WIPRO.NS", about: "Indian IT services company serving clients mainly in the US and Europe." },
  { name: "Maruti Suzuki", kind: "Stock", category: "Automobiles", yahoo: "MARUTI.NS", about: "India’s largest carmaker, majority-owned by Japan’s Suzuki." },
  { name: "Mahindra & Mahindra", kind: "Stock", category: "Automobiles", yahoo: "M&M.NS", about: "Maker of SUVs, tractors and commercial vehicles; India’s largest tractor maker." },
  { name: "Tata Motors Passenger Vehicles", kind: "Stock", category: "Automobiles", yahoo: "TMPV.NS", about: "Tata group’s passenger-car and EV business, including Jaguar Land Rover." },
  { name: "Sun Pharmaceutical", kind: "Stock", category: "Pharma", yahoo: "SUNPHARMA.NS", about: "India’s largest drugmaker, selling generics and specialty medicines worldwide." },
  { name: "Titan Company", kind: "Stock", category: "Consumer", yahoo: "TITAN.NS", about: "Tata group company behind Tanishq jewellery, Titan watches and eyewear." },
  { name: "Asian Paints", kind: "Stock", category: "Consumer", yahoo: "ASIANPAINT.NS", about: "India’s largest paint company." },
  { name: "UltraTech Cement", kind: "Stock", category: "Cement", yahoo: "ULTRACEMCO.NS", about: "India’s largest cement maker, part of the Aditya Birla group." },
  { name: "NTPC", kind: "Stock", category: "Power", yahoo: "NTPC.NS", about: "India’s largest power producer, government-owned, expanding into renewables." },
  { name: "Power Grid", kind: "Stock", category: "Power", yahoo: "POWERGRID.NS", about: "Government-owned company that runs most of India’s power-transmission network." },
  { name: "ONGC", kind: "Stock", category: "Oil & Gas", yahoo: "ONGC.NS", about: "Government-owned company producing most of India’s crude oil and natural gas." },
  { name: "Coal India", kind: "Stock", category: "Mining", yahoo: "COALINDIA.NS", about: "Government-owned miner producing most of India’s coal; known for high dividends." },
  { name: "Tata Steel", kind: "Stock", category: "Metals", yahoo: "TATASTEEL.NS", about: "One of India’s largest steelmakers, with plants in India and Europe." },
  { name: "Adani Ports", kind: "Stock", category: "Infrastructure", yahoo: "ADANIPORTS.NS", about: "India’s largest private port operator, part of the Adani group." },
  { name: "Eternal", kind: "Stock", category: "Consumer Internet", yahoo: "ETERNAL.NS", about: "Parent of Zomato (food delivery) and Blinkit (quick commerce)." },
  { name: "Avenue Supermarts", kind: "Stock", category: "Retail", yahoo: "DMART.NS", about: "Runs the DMart chain of value supermarkets." },
  { name: "HDFC Flexi Cap", kind: "Mutual Fund", category: "Flexi Cap", mf: 118955, about: "Actively managed fund investing across large, mid and small companies." },
  { name: "SBI Large Cap", kind: "Mutual Fund", category: "Large Cap", mf: 119598, about: "Actively managed fund investing mainly in India’s 100 largest companies." },
  { name: "ICICI Pru Large Cap", kind: "Mutual Fund", category: "Large Cap", mf: 120586, about: "Actively managed large-company fund (formerly ICICI Prudential Bluechip)." },
  { name: "Mirae Asset Large & Midcap", kind: "Mutual Fund", category: "Large & Mid Cap", mf: 118834, about: "Invests in both large and mid-sized companies, at least 35% in each." },
  { name: "HDFC Mid Cap", kind: "Mutual Fund", category: "Mid Cap", mf: 118989, about: "Actively managed fund investing mainly in mid-sized companies." },
  { name: "Quant Small Cap", kind: "Mutual Fund", category: "Small Cap", mf: 120828, about: "Actively managed small-company fund known for frequent, momentum-driven trading." },
  { name: "ICICI Pru Value", kind: "Mutual Fund", category: "Value", mf: 120323, about: "Buys companies it considers cheap relative to their worth (formerly Value Discovery)." },
  { name: "Axis ELSS Tax Saver", kind: "Mutual Fund", category: "ELSS (tax saving)", mf: 120503, about: "Tax-saving equity fund with a three-year lock-in." },
  { name: "HDFC Balanced Advantage", kind: "Mutual Fund", category: "Balanced Advantage", mf: 118968, about: "Shifts between stocks and bonds depending on market valuations." },
  { name: "ICICI Pru Aggressive Hybrid", kind: "Mutual Fund", category: "Aggressive Hybrid", mf: 120251, about: "Mostly stocks (65–80%) with the rest in bonds for stability." },
  { name: "SBI Aggressive Hybrid", kind: "Mutual Fund", category: "Aggressive Hybrid", mf: 119609, about: "Mostly stocks with a bond cushion; one of the largest hybrid funds." },
  { name: "HDFC Nifty 50 Index", kind: "Mutual Fund", category: "Index", mf: 119063, about: "Low-cost index fund tracking the Nifty 50." },
  { name: "UTI Nifty Next 50 Index", kind: "Mutual Fund", category: "Index", mf: 143341, about: "Index fund tracking the Nifty Next 50, the large companies just below the Nifty 50." },
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
  { name: "SBI Nifty 50 ETF", kind: "ETF", category: "Index", yahoo: "SETFNIF50.NS", about: "Large, low-cost ETF tracking the Nifty 50." },
  { name: "Nippon Bank BeES", kind: "ETF", category: "Banking", yahoo: "BANKBEES.NS", about: "ETF tracking the Nifty Bank index of the largest listed banks." },
  { name: "Nippon PSU Bank BeES", kind: "ETF", category: "PSU Banks", yahoo: "PSUBNKBEES.NS", about: "ETF tracking government-owned banks." },
  { name: "Nippon IT BeES", kind: "ETF", category: "IT", yahoo: "ITBEES.NS", about: "ETF tracking the Nifty IT index of large IT services companies." },
  { name: "Nippon Pharma BeES", kind: "ETF", category: "Pharma", yahoo: "PHARMABEES.NS", about: "ETF tracking the Nifty Pharma index." },
  { name: "Nippon Auto BeES", kind: "ETF", category: "Auto", yahoo: "AUTOBEES.NS", about: "ETF tracking the Nifty Auto index of car, two-wheeler and parts makers." },
  { name: "Nippon Consumption BeES", kind: "ETF", category: "Consumption", yahoo: "CONSUMBEES.NS", about: "ETF tracking companies that benefit from Indian household spending." },
  { name: "Nippon Infra BeES", kind: "ETF", category: "Infrastructure", yahoo: "INFRABEES.NS", about: "ETF tracking infrastructure companies: power, telecom, construction and logistics." },
  { name: "CPSE ETF", kind: "ETF", category: "PSUs", yahoo: "CPSEETF.NS", about: "ETF holding large government-owned companies, mostly in energy and power." },
  { name: "Motilal Midcap 100 ETF", kind: "ETF", category: "Mid Cap", yahoo: "MOM100.NS", about: "ETF tracking the Nifty Midcap 100, India’s larger mid-sized companies." },
  { name: "HDFC Smallcap 250 ETF", kind: "ETF", category: "Small Cap", yahoo: "HDFCSML250.NS", about: "ETF tracking the Nifty Smallcap 250." },
  { name: "Motilal Nasdaq 100 ETF", kind: "ETF", category: "US tech", yahoo: "MON100.NS", about: "ETF tracking the US Nasdaq 100: Apple, Microsoft, Nvidia and other large US tech firms. Its price includes the rupee–dollar rate." },
  { name: "Mirae S&P 500 Top 50 ETF", kind: "ETF", category: "US large caps", yahoo: "MASPTOP50.NS", about: "ETF tracking the 50 largest companies in the US S&P 500." },
  { name: "Nippon Hang Seng BeES", kind: "ETF", category: "Hong Kong", yahoo: "HNGSNGBEES.NS", about: "ETF tracking Hong Kong’s Hang Seng index, largely Chinese companies." },
  { name: "Nippon Liquid BeES", kind: "ETF", category: "Liquid", yahoo: "LIQUIDBEES.NS", about: "Liquid ETF used to park cash in a demat account; the price stays near ₹1,000 and income is paid as units." },
  { name: "Nippon Silver BeES", kind: "ETF", category: "Silver", yahoo: "SILVERBEES.NS", about: "ETF backed by physical silver; its price follows silver in rupees." },
  { name: "Nippon Gold BeES", kind: "Gold", category: "Gold ETF", yahoo: "GOLDBEES.NS", about: "ETF backed by physical gold held in vaults; its price follows gold in rupees." },
  { name: "SBI Gold ETF", kind: "Gold", category: "Gold ETF", yahoo: "SETFGOLD.NS", about: "ETF backed by physical gold held in vaults." },
  { name: "HDFC Gold ETF", kind: "Gold", category: "Gold ETF", yahoo: "HDFCGOLD.NS", about: "ETF backed by physical gold held in vaults." },
  { name: "Nippon Gold Savings Fund", kind: "Gold", category: "Gold fund of funds", mf: 118663, about: "Mutual fund that invests in Nippon’s gold ETF, so you can buy gold by SIP without a demat account." },
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
  const j = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(s.yahoo)}?range=5y&interval=1d`, {
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
  // Too little history makes every return and risk figure meaningless; treat as unavailable.
  if (pts.length < 60) throw new Error(`${s.name}: only ${pts.length} days of history`);
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

// Same detail shape for any instrument in the market, on the watchlist or not.
export async function loadAny(s: Source) {
  const { pts, meta } = await load(s);
  if (pts.length < 30) throw new Error("Not enough price history");
  return { instrument: metrics(s, pts), about: s.about, pts, meta };
}
