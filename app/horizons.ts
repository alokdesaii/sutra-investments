// Horizon screens: plain rules applied to the watchlist. Past data only; not advice.
import type { Instrument } from "./data";

// Assumptions shown to the user. Update when rates move.
export const ASSUMPTIONS = { inflation: 5, savings: 3 }; // % a year

export type Reason = { ok: boolean; text: string };
export type HorizonId = "short" | "long";

export type Horizon = {
  id: HorizonId;
  label: string;
  span: string;
  goal: string;
  principles: string[];
  metric: { label: string; value: (i: Instrument) => number | null };
  fits: (i: Instrument) => boolean;
  whyNot: (i: Instrument) => string; // shown for excluded instruments
  score: (i: Instrument) => number;
  reasons: (i: Instrument) => Reason[];
};

const { inflation, savings } = ASSUMPTIONS;
const f = (n: number) => `${n > 0 ? "+" : ""}${n.toFixed(1)}%`;

export const horizons: Record<HorizonId, Horizon> = {
  short: {
    id: "short",
    label: "Short term",
    span: "Money you need within a year",
    goal: "Keep it safe and easy to withdraw. Growth is a bonus.",
    principles: [
      "Low volatility matters most: the price shouldn’t drop just when you need the money.",
      `Aim to beat a savings account (about ${savings}% a year).`,
      "Stocks and equity funds are excluded: they can fall 20% or more in a single year.",
    ],
    metric: { label: "1-year return", value: (i) => i.ret1y },
    fits: (i) => i.vol < 6,
    whyNot: (i) => `Swings about ${i.vol.toFixed(0)}% a year, so it could be down when you need the money.`,
    // Steadiness first, then return.
    score: (i) => i.ret1y - i.vol * 1.5,
    reasons: (i) => [
      { ok: i.vol < 3, text: i.vol < 3 ? `Very steady: price swings about ${i.vol.toFixed(1)}% a year` : `Some price movement: swings about ${i.vol.toFixed(1)}% a year` },
      { ok: i.ret1y > savings, text: i.ret1y > savings ? `Earned ${f(i.ret1y)} last year, above a savings account (~${savings}%)` : `Earned ${f(i.ret1y)} last year, below a savings account (~${savings}%)` },
      ...(/Liquid|Overnight|Money Market/.test(i.category) ? [{ ok: true, text: `${i.category} fund: money is usually back in your bank within a day or two` }] : []),
      ...(i.category.startsWith("Gilt") ? [{ ok: false, text: "Gilt fund: no default risk, but its price moves more when interest rates change" }] : []),
      ...(i.kind === "Bond" && !i.category.startsWith("Gilt") ? [{ ok: true, text: "Bond fund: returns rise and fall a little with interest rates" }] : []),
    ],
  },
  long: {
    id: "long",
    label: "Long term",
    span: "Money you won’t touch for 5+ years",
    goal: "Grow it faster than inflation. Short-term dips matter less.",
    principles: [
      `The target is beating inflation (about ${inflation}% a year) by a clear margin.`,
      "A 3-year track record counts more than last year, which can be luck.",
      "Bigger swings are acceptable because there’s time to recover, but they’re still marked down a little.",
    ],
    metric: { label: "3-year, per year", value: (i) => i.ret3y },
    fits: (i) => i.ret3y != null && i.vol >= 6,
    whyNot: (i) =>
      i.ret3y == null
        ? "Less than 3 years of history to judge."
        : `Built for stability, not growth: ${f(i.ret3y)} a year barely beats inflation over the long run.`,
    // Long-run growth first, recent growth second, a light penalty for bumpiness.
    score: (i) => (i.ret3y ?? 0) * 0.8 + i.ret1y * 0.2 - i.vol * 0.1,
    reasons: (i) => {
      const r3 = i.ret3y ?? 0;
      return [
        { ok: r3 > inflation + 3, text: r3 > inflation ? `Grew ${f(r3)} a year over 3 years, vs ~${inflation}% inflation` : `Grew ${f(r3)} a year over 3 years, not beating ~${inflation}% inflation` },
        { ok: i.ret1y >= 0, text: i.ret1y >= 0 ? `Still up ${f(i.ret1y)} over the last year` : `Down ${f(i.ret1y)} over the last year, a dip or a warning sign` },
        { ok: i.vol < 20, text: i.vol < 20 ? `Moderate swings (${i.vol.toFixed(0)}% a year)` : `Large swings (${i.vol.toFixed(0)}% a year): expect some bad years` },
        ...(i.kind === "Stock" ? [{ ok: false, text: "Single company: more risk than a fund that holds many" }] : []),
        ...(i.kind === "Gold" ? [{ ok: true, text: "Gold often rises when stocks fall, so it balances a portfolio" }] : []),
        ...(i.category.includes("Index") || i.category === "Next 50" ? [{ ok: true, text: "Index tracker: low cost, owns the whole market segment" }] : []),
      ];
    },
  },
};

export function screen(h: Horizon, instruments: Instrument[]) {
  const fit = instruments.filter(h.fits).sort((a, b) => h.score(b) - h.score(a));
  const out = instruments.filter((i) => !h.fits(i));
  const byKind = new Map<string, Instrument[]>();
  for (const i of fit) byKind.set(i.kind, [...(byKind.get(i.kind) ?? []), i]);
  return { fit, out, byKind: [...byKind.entries()] };
}
