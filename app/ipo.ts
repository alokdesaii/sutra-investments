// IPO data from NSE's public JSON endpoints, plus rule-based signals.
// Signals describe demand and structure; they are not a recommendation to apply.
// ponytail: NSE endpoints are unofficial and can block cloud IPs; every loader degrades to empty lists.

const NSE = "https://www.nseindia.com/api";
const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36",
  Accept: "application/json",
  Referer: "https://www.nseindia.com/",
};
const DAY = 86_400_000;
const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

async function nse<T>(path: string): Promise<T> {
  const r = await fetch(`${NSE}/${path}`, { headers: HEADERS });
  if (!r.ok) throw new Error(`NSE ${r.status}`);
  return r.json();
}

// "30-Sep-2026" → UTC midnight ms
export function parseDate(s: string) {
  const [d, m, y] = s.split("-");
  const mi = MONTHS.indexOf((m ?? "").toLowerCase());
  return mi < 0 ? NaN : Date.UTC(+y, mi, +d);
}
const todayIST = () => {
  const n = new Date(Date.now() + 330 * 60_000);
  return Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate());
};
const num = (s: string | undefined) => {
  const n = parseFloat((s ?? "").replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
};

export type Tone = "good" | "caution" | "info";
export type Signal = { tone: Tone; text: string };
export type Verdict = "Strong demand" | "Mixed" | "Weak demand" | "Too early to tell" | "Higher risk (SME)";

export type Ipo = {
  symbol: string;
  name: string;
  sme: boolean;
  status: "Open" | "Closed";
  start: number;
  end: number;
  daysLeft: number; // 0 = closes today
  priceLow: number | null;
  priceHigh: number | null;
  lot: number | null;
  minInvest: number | null;
  sizeText: string;
  freshShare: number | null; // 0..1 of the issue that goes to the company
  leadManager: string;
  subscription: { total: number | null; qib: number | null; nii: number | null; retail: number | null };
  links: { rhp?: string; ratios?: string; nse: string };
  signals: Signal[];
  verdict: Verdict;
};

// Rupee value of the first "N lakhs / crores / shares" amount in a text segment.
function amount(seg: string, price: number | null) {
  const m = seg.match(/([\d,]+(?:\.\d+)?)\s*(lakhs?|crores?|cr\b|equity shares|shares)/i);
  if (!m) return null;
  const n = num(m[1]);
  if (n == null) return null;
  const unit = m[2].toLowerCase();
  if (unit.startsWith("lakh")) return n * 1e5;
  if (unit.startsWith("cr")) return n * 1e7;
  return price ? n * price : null;
}

export function issueStructure(text: string, price: number | null) {
  const t = text.toLowerCase();
  const fi = t.indexOf("fresh issue"), oi = t.indexOf("offer for sale");
  if (fi < 0 && oi < 0) return null;
  if (oi < 0) return 1;
  if (fi < 0) return 0;
  const fresh = amount(t.slice(fi, oi > fi ? oi : undefined), price);
  const ofs = amount(t.slice(oi, fi > oi ? fi : undefined), price);
  return fresh != null && ofs != null && fresh + ofs > 0 ? fresh / (fresh + ofs) : null;
}

const x = (n: number) => `${n >= 10 ? n.toFixed(0) : n >= 1 ? n.toFixed(1) : n.toFixed(2)}×`;
const inr = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;

export function assess(i: Omit<Ipo, "signals" | "verdict">): { signals: Signal[]; verdict: Verdict } {
  const s: Signal[] = [];
  const { qib, retail, total } = i.subscription;
  const lastDay = i.status === "Closed" || i.daysLeft <= 0;

  if (i.sme) s.push({ tone: "caution", text: "SME issue: smaller company, lighter disclosure rules, large minimum lots and thin trading after listing" });

  if (qib != null) {
    if (!lastDay) s.push({ tone: "info", text: `Institutions have bid ${x(qib)} their quota so far. They usually bid on the last day, so this can change a lot` });
    else if (qib >= 10) s.push({ tone: "good", text: `Institutions bid ${x(qib)} their quota: strong demand from professional investors` });
    else if (qib >= 1) s.push({ tone: "info", text: `Institutions bid ${x(qib)} their quota: filled, but not heavily` });
    else s.push({ tone: "caution", text: `Institutions bid only ${x(qib)} their quota: professional investors are lukewarm` });
  } else if (total != null) {
    s.push({ tone: total >= 1 ? "info" : "caution", text: `Subscribed ${x(total)} overall so far` });
  }

  if (i.freshShare != null) {
    const pct = Math.round(i.freshShare * 100);
    if (pct >= 70) s.push({ tone: "good", text: `${pct}% of the money raised goes into the company (fresh issue), to fund growth or cut debt` });
    else if (pct <= 30) s.push({ tone: "caution", text: `${100 - pct}% is an offer for sale: most of the money goes to existing shareholders cashing out, not the business` });
    else s.push({ tone: "info", text: `Mix of new money for the company (${pct}%) and existing shareholders selling (${100 - pct}%)` });
  }

  if (retail != null && retail > 1 && !i.sme) {
    s.push({ tone: "info", text: `Retail is ${x(retail)} subscribed: shares are allotted by lottery, so the chance of getting one lot is roughly 1 in ${Math.ceil(retail)}` });
  }
  if (i.minInvest != null) s.push({ tone: "info", text: `Minimum investment is ${inr(i.minInvest)} (${i.lot} shares at the top of the price band)` });

  let verdict: Verdict;
  if (i.sme) verdict = "Higher risk (SME)";
  else if (!lastDay || qib == null) verdict = "Too early to tell";
  else if (qib >= 10 && (i.freshShare == null || i.freshShare > 0.3)) verdict = "Strong demand";
  else if (qib < 1) verdict = "Weak demand";
  else verdict = "Mixed";
  return { signals: s, verdict };
}

type Current = { symbol: string; companyName: string; series: string; status: string; issueStartDate: string; issueEndDate: string; issuePrice?: string; noOfTime?: string };
type Detail = { bidDetails?: { category: string; noOfTime: string }[]; issueInfo?: { dataList: { title: string | null; value: string }[] } };

async function build(c: Current): Promise<Ipo> {
  const sme = c.series !== "EQ";
  const d = await nse<Detail>(`ipo-detail?symbol=${encodeURIComponent(c.symbol)}&series=${sme ? "SME" : "EQ"}`).catch(() => ({}) as Detail);
  const info = Object.fromEntries((d.issueInfo?.dataList ?? []).filter((r) => r.title).map((r) => [r.title!.trim(), r.value.replace(/^"|"$/g, "")]));
  const band = (info["Price Range"] ?? c.issuePrice ?? "").match(/\d+(?:\.\d+)?/g)?.map(Number) ?? [];
  const priceLow = band[0] ?? null, priceHigh = band[1] ?? band[0] ?? null;
  const lot = num((info["Bid Lot"] ?? info["Market Lot"] ?? "").match(/[\d,]+/)?.[0]);
  const bid = (prefix: string) => num(d.bidDetails?.find((b) => b.category.startsWith(prefix))?.noOfTime);
  const end = parseDate(c.issueEndDate);
  const base = {
    symbol: c.symbol,
    name: c.companyName.replace(/\s+Limited$/i, ""),
    sme,
    status: c.status === "Active" ? ("Open" as const) : ("Closed" as const),
    start: parseDate(c.issueStartDate),
    end,
    daysLeft: Math.round((end - todayIST()) / DAY),
    priceLow,
    priceHigh,
    lot,
    minInvest: lot && priceHigh ? lot * priceHigh : null,
    sizeText: info["Issue Size"] ?? "",
    freshShare: issueStructure(info["Issue Size"] ?? "", priceHigh),
    leadManager: info["Book Running Lead Managers"] ?? "",
    subscription: {
      total: bid("Total") ?? num(c.noOfTime),
      qib: bid("Qualified Institutional"),
      nii: num(d.bidDetails?.find((b) => b.category === "Non Institutional Investors")?.noOfTime),
      retail: bid("Retail Individual"),
    },
    links: {
      rhp: info["Red Herring Prospectus"]?.startsWith("http") ? info["Red Herring Prospectus"] : undefined,
      ratios: info["Ratios / Basis of Issue Price"]?.startsWith("http") ? info["Ratios / Basis of Issue Price"] : undefined,
      nse: `https://www.nseindia.com/market-data/issue-information?symbol=${c.symbol}&series=${sme ? "SME" : "EQ"}&type=Active`,
    },
  };
  return { ...base, ...assess(base) };
}

export async function loadIpos(): Promise<{ ipos: Ipo[]; ok: boolean }> {
  try {
    const [current, upcoming] = await Promise.all([
      nse<Current[]>("ipo-current-issue").catch(() => [] as Current[]),
      nse<Current[]>("all-upcoming-issues?category=ipo").catch(() => [] as Current[]),
    ]);
    const bySymbol = new Map<string, Current>();
    for (const c of [...upcoming, ...current]) bySymbol.set(c.symbol, { ...bySymbol.get(c.symbol), ...c });
    const ipos = await Promise.all([...bySymbol.values()].map(build));
    return { ipos: ipos.sort((a, b) => a.end - b.end), ok: bySymbol.size > 0 };
  } catch {
    return { ipos: [], ok: false };
  }
}

// Recent mainboard listings and how they've done since, priced via Yahoo like the rest of the app.
export type Listing = { name: string; symbol: string; listed: number; issuePrice: number; price: number | null; change: number | null };

export async function loadListings(limit = 8): Promise<Listing[]> {
  try {
    const past = await nse<{ company: string; symbol: string; securityType: string; issuePrice: string; listingDate: string }[]>("public-past-issues");
    const recent = past
      .filter((p) => p.securityType === "EQ" && num(p.issuePrice) && Number.isFinite(parseDate(p.listingDate)))
      .filter((p) => todayIST() - parseDate(p.listingDate) < 120 * DAY)
      .slice(0, limit);
    return Promise.all(recent.map(async (p) => {
      const issuePrice = num(p.issuePrice)!;
      const price = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${p.symbol}.NS?range=5d&interval=1d`, { headers: { "User-Agent": "Mozilla/5.0" } })
        .then((r) => r.json())
        .then((j) => (j.chart.result?.[0]?.meta?.regularMarketPrice as number) ?? null)
        .catch(() => null);
      return {
        name: p.company.replace(/\s+Limited$/i, ""),
        symbol: p.symbol,
        listed: parseDate(p.listingDate),
        issuePrice,
        price,
        change: price ? (price / issuePrice - 1) * 100 : null,
      };
    }));
  } catch {
    return [];
  }
}

// IPO and pre-IPO headlines from Google News search feeds.
export type IpoNews = { title: string; source: string; link: string; time: number; stage: "Pre-IPO" | "Open" | "Listing" | "IPO" };

const feeds = [
  "https://news.google.com/rss/search?q=IPO+India+when:7d&hl=en-IN&gl=IN&ceid=IN:en",
  "https://news.google.com/rss/search?q=(DRHP+OR+%22SEBI+nod%22+OR+%22files+for+IPO%22+OR+%22pre-IPO%22)+when:14d&hl=en-IN&gl=IN&ceid=IN:en",
];
const decode = (s: string) => s.replace(/<!\[CDATA\[|\]\]>/g, "").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").trim();
const tag = (xml: string, t: string) => decode(xml.match(new RegExp(`<${t}>([\\s\\S]*?)</${t}>`))?.[1] ?? "");

export function stageOf(title: string): IpoNews["stage"] {
  if (/\b(drhp|draft|files? (for|papers)|sebi (nod|approval|clears?|approves?)|confidential|pre-ipo|plans? (an? )?ipo|to raise)\b/i.test(title)) return "Pre-IPO";
  if (/\b(list(s|ing|ed)?|debut|shares? (jump|surge|fall|slump|zoom))\b/i.test(title)) return "Listing";
  if (/\b(subscribed|subscription|gmp|bidding|price band|opens?|day \d|anchor)\b/i.test(title)) return "Open";
  return "IPO";
}

export async function loadIpoNews(): Promise<IpoNews[]> {
  const settled = await Promise.allSettled(feeds.map((u) => fetch(u, { headers: { "User-Agent": "Mozilla/5.0" } }).then((r) => r.text())));
  const seen = new Set<string>();
  return settled
    .flatMap((r) => (r.status === "fulfilled" ? [...r.value.matchAll(/<item>([\s\S]*?)<\/item>/g)].map(([, it]) => it) : []))
    .map((it) => {
      const raw = tag(it, "title"), dash = raw.lastIndexOf(" - ");
      const title = dash > 0 ? raw.slice(0, dash) : raw;
      return { title, source: dash > 0 ? raw.slice(dash + 3) : "", link: tag(it, "link"), time: Date.parse(tag(it, "pubDate")) || 0, stage: stageOf(title) };
    })
    .filter((n) => n.title && !seen.has(n.title.toLowerCase()) && seen.add(n.title.toLowerCase()))
    .sort((a, b) => b.time - a.time);
}
