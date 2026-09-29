// Headlines from public RSS feeds, tagged with market themes by keyword rules.
// ponytail: keyword matching, not comprehension. Misses subtle stories and can mis-tag; upgrade to an LLM classifier if it gets noisy.

const feeds = [
  { region: "India", source: "Economic Times", url: "https://economictimes.indiatimes.com/markets/rssfeeds/1977021501.cms" },
  { region: "India", source: null, url: "https://news.google.com/rss/headlines/section/topic/BUSINESS?hl=en-IN&gl=IN&ceid=IN:en" },
  { region: "Global", source: null, url: "https://news.google.com/rss/headlines/section/topic/BUSINESS?hl=en-US&gl=US&ceid=US:en" },
] as const;

export type Theme = {
  id: string;
  label: string;
  match: RegExp;
  how: string; // the mechanism, in plain words
  sectors: string[];
  watch: string[]; // names from the watchlist in data.ts
};

export const themes: Theme[] = [
  {
    id: "rates", label: "RBI, rates & inflation",
    match: /\b(rbi|repo|monetary policy|rate (hike|cut)s?|inflation|cpi|bond yields?|g-?sec)\b/i,
    how: "Higher rates make loans dearer and push bond prices down; cuts do the reverse. Banks, lenders, real estate and autos feel it first; bond and liquid funds move with yields.",
    sectors: ["Banks", "NBFCs", "Real estate", "Autos", "Debt funds"],
    watch: ["HDFC Bank", "SBI Gilt", "HDFC Corporate Bond", "ICICI Pru Short Term", "HDFC Liquid"],
  },
  {
    id: "fed", label: "US Fed & global yields",
    match: /\b(fed|federal reserve|powell|treasur(y|ies)|us yields?|wall street|dow|nasdaq|s&p 500)\b/i,
    how: "When US yields rise, foreign money tends to leave emerging markets like India and the dollar strengthens. Gold usually weakens as yields rise and firms when they fall.",
    sectors: ["Broad market", "IT", "Gold"],
    watch: ["Nippon Nifty BeES", "Nippon Gold BeES", "Infosys", "TCS"],
  },
  {
    id: "crude", label: "Crude oil",
    match: /\b(crude|brent|opec|oil prices?|petrol|diesel)\b/i,
    how: "India imports most of its oil. Pricier crude hurts oil marketers, paints, airlines and tyres, widens the trade deficit and weakens the rupee; refiners and upstream producers can gain.",
    sectors: ["Oil & gas", "Paints", "Aviation", "Tyres", "Chemicals"],
    watch: ["Reliance Industries"],
  },
  {
    id: "rupee", label: "Rupee & dollar",
    match: /\b(rupee|dollar|usd|forex|currency)\b/i,
    how: "A weaker rupee lifts earnings of exporters paid in dollars (IT, pharma) and hurts importers. A stronger rupee does the opposite.",
    sectors: ["IT", "Pharma", "Importers"],
    watch: ["Infosys", "TCS"],
  },
  {
    id: "gold", label: "Gold",
    match: /\b(gold|bullion|precious metals?)\b/i,
    how: "Gold tends to rise in uncertain times, when real interest rates fall, or when the rupee weakens. It often moves against equities, which is why it's used as a hedge.",
    sectors: ["Gold ETFs", "Jewellery"],
    watch: ["Nippon Gold BeES"],
  },
  {
    id: "tech", label: "Tech, AI & US IT spending",
    match: /\b(ai|artificial intelligence|openai|anthropic|nvidia|h-?1b|visa|outsourcing|it services|tech (spending|stocks))\b/i,
    how: "Indian IT earns mostly from US and European clients. Their tech budgets, visa rules and shifts like AI automation change deal flow and margins.",
    sectors: ["IT services"],
    watch: ["Infosys", "TCS"],
  },
  {
    id: "flows", label: "Market mood & foreign flows",
    match: /\b(fii|fpi|dii|sensex|nifty|foreign investors?|market (rally|crash|selloff)|ipo)\b/i,
    how: "Big foreign or domestic buying and selling moves the whole market, and small and mid caps usually swing harder than large caps.",
    sectors: ["Broad market", "Mid caps", "Small caps"],
    watch: ["UTI Nifty 50 Index", "Nippon Nifty BeES", "Nippon Junior BeES", "Motilal Nifty Midcap 150", "Nippon India Small Cap"],
  },
  {
    id: "policy", label: "Budget, tax & regulation",
    match: /\b(budget|gst|tax(es)?|sebi|cess|disinvestment|government policy|pli)\b/i,
    how: "Tax changes and regulations shift costs sector by sector, e.g. excise on tobacco, GST rate changes on consumer goods, or SEBI rules on brokers and funds.",
    sectors: ["FMCG", "Tobacco", "Capital markets", "Infrastructure"],
    watch: ["ITC", "Parag Parikh Flexi Cap"],
  },
  {
    id: "geo", label: "Geopolitics & trade",
    match: /\b(war|tariffs?|sanctions?|trade (deal|war)|china|russia|middle east|israel|iran|ukraine|conflict)\b/i,
    how: "Conflicts and trade barriers raise uncertainty, usually lifting gold and crude and weighing on exporters and the broad market.",
    sectors: ["Exporters", "Defence", "Oil & gas", "Gold"],
    watch: ["Nippon Gold BeES", "Reliance Industries", "Nippon Nifty BeES"],
  },
  {
    id: "rural", label: "Monsoon & rural demand",
    match: /\b(monsoon|rainfall|kharif|rabi|rural|farm|crop)\b/i,
    how: "A good monsoon boosts farm incomes and rural spending on FMCG, two-wheelers and tractors; a weak one hurts them and can push food inflation up.",
    sectors: ["FMCG", "Two-wheelers", "Tractors", "Fertilisers"],
    watch: ["ITC"],
  },
  {
    id: "banking", label: "Banking & credit",
    match: /\b(banks?|banking|npa|loans?|credit growth|deposits?|lender)\b/i,
    how: "Loan growth, bad loans and deposit costs drive bank profits. Banks are also the largest weight in the Nifty, so they move the index.",
    sectors: ["Banks", "NBFCs"],
    watch: ["HDFC Bank", "UTI Nifty 50 Index"],
  },
];

export type Headline = {
  title: string;
  source: string;
  link: string;
  time: number;
  region: "India" | "Global";
  themes: string[]; // theme ids
};

const decode = (s: string) =>
  s.replace(/<!\[CDATA\[|\]\]>/g, "").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").trim();
const tag = (xml: string, t: string) => decode(xml.match(new RegExp(`<${t}>([\\s\\S]*?)</${t}>`))?.[1] ?? "");

export async function loadHeadlines(): Promise<Headline[]> {
  const settled = await Promise.allSettled(
    feeds.map(async (f) => {
      const xml = await fetch(f.url, { headers: { "User-Agent": "Mozilla/5.0" } }).then((r) => r.text());
      return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map(([, item]): Headline => {
        let title = tag(item, "title");
        let source: string = f.source ?? "";
        const dash = title.lastIndexOf(" - "); // Google News appends " - Publisher"
        if (!f.source && dash > 0) [title, source] = [title.slice(0, dash), title.slice(dash + 3)];
        return {
          title, source, link: tag(item, "link"), time: Date.parse(tag(item, "pubDate")) || 0, region: f.region,
          themes: themes.filter((t) => t.match.test(title)).map((t) => t.id),
        };
      });
    }),
  );
  const seen = new Set<string>();
  return settled
    .flatMap((r) => (r.status === "fulfilled" ? r.value : []))
    .filter((h) => h.title && !seen.has(h.title.toLowerCase()) && seen.add(h.title.toLowerCase()))
    .sort((a, b) => b.time - a.time);
}

export const ago = (t: number) => {
  const m = Math.round((Date.now() - t) / 60_000);
  return m < 60 ? `${Math.max(m, 1)}m ago` : m < 1440 ? `${Math.round(m / 60)}h ago` : `${Math.round(m / 1440)}d ago`;
};
