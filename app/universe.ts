// The whole market: every open-ended mutual fund (AMFI), every NSE-listed stock and ETF (NSE archives).
// Lists only; price history loads per instrument on its detail page.
// ponytail: in-memory cache per server instance, refreshed every 6h. Fine for one app; move to KV if cold starts hurt.
import type { Kind } from "./data";

export type Entry = {
  id: string; // "mf:122639" | "nse:INFY"
  src: "mf" | "nse";
  code: string; // AMFI scheme code or NSE symbol
  name: string;
  kind: Kind;
  group: string; // Equity, Debt, Hybrid, Index, … for funds; Stock / ETF asset class for NSE
  sub: string; // SEBI sub-category, industry, or ETF underlying
  house?: string; // fund house
  plan?: "Direct" | "Regular";
  option?: "Growth" | "IDCW";
  nav?: number;
  navDate?: string;
  big?: boolean; // Nifty 500 constituent
};

const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36";
const TTL = 6 * 3600_000;
const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
const dmy = (s: string) => {
  const [d, m, y] = s.trim().split("-");
  const mi = MONTHS.indexOf(m?.slice(0, 3).toLowerCase());
  return mi < 0 ? NaN : Date.UTC(+y < 100 ? 2000 + +y : +y, mi, +d);
};
const text = (url: string) => fetch(url, { headers: { "User-Agent": UA }, cache: "no-store" }).then((r) => {
  if (!r.ok) throw new Error(`${url} ${r.status}`);
  return r.text();
});

// "SBI GILT FUND" → "SBI Gilt Fund": title-case all-caps names, keeping short words (SBI, HDFC, ETF) as acronyms.
const ACRONYMS = new Set(["HDFC", "ICICI", "IDFC", "IDBI", "HSBC", "PPFAS", "ELSS", "IDCW"]);
const SMALL_WORDS = new Set(["AND", "THE", "OF", "FOR", "IN", "TO", "ON", "CUM"]);
export const tidy = (name: string) => {
  const n = name.replace(/\s+/g, " ").trim();
  if (/[a-z]/.test(n)) return n;
  return n.split(" ").map((w) =>
    ACRONYMS.has(w) || (w.length <= 3 && /^[A-Z&]+$/.test(w) && !SMALL_WORDS.has(w)) ? w : (SMALL_WORDS.has(w) ? w.toLowerCase() : w[0] + w.slice(1).toLowerCase()),
  ).join(" ");
};

// Minimal CSV splitter that respects quoted commas.
const csv = (line: string) => line.match(/("([^"]|"")*"|[^,]*)(,|$)/g)!.slice(0, -1).map((c) => c.replace(/,$/, "").replace(/^"|"$/g, "").replace(/""/g, '"').trim());

// AMFI category header → group, kind and sub-category. Returns null for schemes we skip (ETFs).
export function classifyFund(category: string, name: string): { group: string; kind: Kind; sub: string } | null {
  const sub = (category.split(" - ").slice(1).join(" - ") || category).replace(/\s+/g, " ").trim();
  const c = category.toLowerCase();
  if (/etf/.test(c)) return null;
  if (/gold|silver/i.test(name) && /fof|fund of funds|other scheme/.test(c)) return { group: "Gold & silver", kind: "Gold", sub };
  if (/liquid|overnight|money market/.test(c)) return { group: "Debt", kind: "Mutual Fund", sub };
  if (/debt|income|gilt|bond|credit|duration|floating|dynamic term|ultra short|short term|long term|medium term/.test(c) && !/hybrid/.test(c))
    return { group: "Debt", kind: "Bond", sub };
  if (/hybrid|arbitrage|equity savings|balanced|multi asset/.test(c)) return { group: "Hybrid", kind: "Mutual Fund", sub };
  if (/index/.test(c)) return { group: "Index", kind: "Mutual Fund", sub };
  if (/fof|fund of funds|overseas/.test(c)) return { group: "Fund of funds", kind: "Mutual Fund", sub };
  if (/solution|retirement|children/.test(c)) return { group: "Solution-oriented", kind: "Mutual Fund", sub };
  if (/equity|elss/.test(c)) return { group: "Equity", kind: "Mutual Fund", sub };
  return { group: "Other", kind: "Mutual Fund", sub };
}

export function parseAmfi(raw: string): Entry[] {
  const out: Entry[] = [];
  let category = "", open = false, house = "";
  for (const line of raw.split(/\r?\n/)) {
    const l = line.trim();
    if (!l) continue;
    if (!l.includes(";")) {
      const m = l.match(/^(Open Ended|Close Ended|Interval Fund)\s*Schemes?\s*\((.*)\)$/i);
      if (m) { open = /^open/i.test(m[1]); category = m[2]; } else house = l;
      continue;
    }
    const f = l.split(";");
    if (f[0] === "Scheme Code" || !open || f.length < 8) continue;
    const [code, , , name, planRaw, optionRaw, nav, date] = f;
    const cls = classifyFund(category, name);
    const navNum = parseFloat(nav);
    if (!cls || !Number.isFinite(navNum)) continue;
    const plan = /direct/i.test(planRaw || name) ? "Direct" : "Regular";
    const option = /idcw|dividend/i.test(optionRaw || name) ? "IDCW" : "Growth";
    out.push({ id: `mf:${code}`, src: "mf", code, name: tidy(name), house, plan, option, nav: navNum, navDate: date, ...cls });
  }
  // Keep schemes with a current NAV: within 15 days of the latest date in the file. Drops matured/merged leftovers.
  const latest = Math.max(...out.map((e) => dmy(e.navDate!)).filter(Number.isFinite));
  return out.filter((e) => latest - dmy(e.navDate!) <= 15 * 86_400_000);
}

function parseStocks(raw: string, industries: Map<string, string>): Entry[] {
  return raw.split(/\r?\n/).slice(1).map(csv).filter((r) => r.length >= 3 && ["EQ", "BE"].includes(r[2])).map(([symbol, name]) => ({
    id: `nse:${symbol}`, src: "nse" as const, code: symbol, name: tidy(name).replace(/\s+Limited$/i, "").replace(/\s+Ltd\.?$/i, ""),
    kind: "Stock" as Kind, group: "Stocks", sub: industries.get(symbol) ?? "Listed on NSE", big: industries.has(symbol),
  }));
}

function parseEtfs(raw: string): Entry[] {
  return raw.split(/\r?\n/).slice(1).map(csv).filter((r) => r[0]).map(([symbol, underlying, , , , , , assetClass]) => {
    const cls = (assetClass || "").toUpperCase();
    const gold = cls.includes("GOLD") || /gold/i.test(underlying);
    const silver = cls.includes("SILVER") || /silver/i.test(underlying);
    const debt = /DEBT|LIQUID|G-SEC|GILT|BOND/.test(cls) || /liquid|bond|g-sec|gilt|sdl/i.test(underlying);
    return {
      id: `nse:${symbol}`, src: "nse" as const, code: symbol, name: underlying ? `${symbol} · ${underlying}` : symbol,
      kind: (gold ? "Gold" : "ETF") as Kind, group: gold ? "Gold & silver" : silver ? "Gold & silver" : debt ? "Debt ETF" : "Equity ETF",
      sub: underlying || cls || "ETF",
    };
  });
}

let cache: { at: number; entries: Entry[] } | null = null;
let inflight: Promise<Entry[]> | null = null;

export async function loadUniverse(): Promise<Entry[]> {
  if (cache && Date.now() - cache.at < TTL) return cache.entries;
  inflight ??= (async () => {
    const [amfi, eq, etf, n500] = await Promise.allSettled([
      text("https://www.amfiindia.com/spages/NAVAll.txt"),
      text("https://nsearchives.nseindia.com/content/equities/EQUITY_L.csv"),
      text("https://nsearchives.nseindia.com/content/equities/eq_etfseclist.csv"),
      text("https://niftyindices.com/IndexConstituent/ind_nifty500list.csv"),
    ]);
    const industries = new Map<string, string>();
    if (n500.status === "fulfilled") for (const r of n500.value.split(/\r?\n/).slice(1).map(csv)) if (r[2]) industries.set(r[2], r[1]);
    const entries = [
      ...(eq.status === "fulfilled" ? parseStocks(eq.value, industries) : []),
      ...(etf.status === "fulfilled" ? parseEtfs(etf.value) : []),
      ...(amfi.status === "fulfilled" ? parseAmfi(amfi.value) : []),
    ];
    if (entries.length) cache = { at: Date.now(), entries };
    return entries.length ? entries : (cache?.entries ?? []);
  })().finally(() => { inflight = null; });
  return inflight;
}

export type Filters = { q?: string; kind?: string; group?: string; house?: string; plan?: string; option?: string };

// Token search over name, symbol, fund house and category. Bigger / more common instruments rank first on ties.
export function search(entries: Entry[], f: Filters, offset = 0, limit = 40) {
  const tokens = (f.q ?? "").toLowerCase().split(/\s+/).filter(Boolean);
  const q = tokens.join(" ");
  const base = entries.filter((e) =>
    (!f.kind || f.kind === "all" || kindKey(e) === f.kind) &&
    (!f.group || e.group === f.group) &&
    (!f.house || e.house === f.house) &&
    (!f.plan || e.src !== "mf" || e.plan === f.plan) &&
    (!f.option || e.src !== "mf" || e.option === f.option));
  const scored = base
    .map((e) => {
      const hay = `${e.name} ${e.code} ${e.house ?? ""} ${e.sub}`.toLowerCase();
      if (tokens.some((t) => !hay.includes(t))) return null;
      const name = e.name.toLowerCase();
      let s = 0;
      if (q && e.code.toLowerCase() === q) s += 10;
      if (q && name.startsWith(q)) s += 5;
      if (q && name.includes(q)) s += 2;
      if (e.big) s += 1.5;
      if (e.plan === "Direct" && e.option === "Growth") s += 0.5;
      return { e, s };
    })
    .filter((x): x is { e: Entry; s: number } => x != null)
    .sort((a, b) => b.s - a.s || a.e.name.localeCompare(b.e.name));

  const count = (key: (e: Entry) => string | undefined) => {
    const m = new Map<string, number>();
    for (const { e } of scored) { const k = key(e); if (k) m.set(k, (m.get(k) ?? 0) + 1); }
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  };
  return {
    total: scored.length,
    items: scored.slice(offset, offset + limit).map(({ e }) => e),
    facets: { group: count((e) => e.group), house: count((e) => e.house).slice(0, 60) },
  };
}

// Filter key for the type switcher: stocks, etfs, mutual funds, gold, debt.
export function kindKey(e: Entry) {
  if (e.kind === "Stock") return "stocks";
  if (e.kind === "Gold") return "gold";
  if (e.src === "nse") return "etfs";
  if (e.group === "Debt") return "debt";
  return "funds";
}

export const hrefOf = (e: Pick<Entry, "src" | "code">) => `/market/${e.src}/${encodeURIComponent(e.code)}`;
