// Pure price-history maths shared by server pages and client widgets. No imports, no I/O.
export type Point = { t: number; v: number }; // ascending by t (ms)
export const DAY = 86_400_000;
export const YEAR = 365 * DAY;

// Last value on or before time t (binary search).
export function at(pts: Point[], t: number) {
  if (!pts.length || pts[0].t > t) return null;
  let lo = 0, hi = pts.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (pts[mid].t <= t) lo = mid; else hi = mid - 1;
  }
  return pts[lo].v;
}

// Return over a lookback window, annualised when longer than a year. null when history is too short.
export function periodReturn(pts: Point[], days: number) {
  const last = pts[pts.length - 1];
  const from = last.t - days * DAY;
  if (pts[0].t > from + 7 * DAY) return null;
  const v0 = at(pts, from);
  if (!v0) return null;
  const r = last.v / v0;
  return (days > 366 ? r ** (365 / days) - 1 : r - 1) * 100;
}

// Calendar-year returns, oldest first. The current year is year-to-date.
export function calendarYears(pts: Point[], count = 5) {
  const last = pts[pts.length - 1];
  const thisYear = new Date(last.t).getUTCFullYear();
  const out: { year: number; ret: number; ytd: boolean }[] = [];
  for (let y = thisYear - count + 1; y <= thisYear; y++) {
    const start = Date.UTC(y, 0, 1) - 1;
    if (pts[0].t > start + 10 * DAY) continue;
    const v0 = at(pts, start), v1 = y === thisYear ? last.v : at(pts, Date.UTC(y + 1, 0, 1) - 1);
    if (v0 && v1) out.push({ year: y, ret: (v1 / v0 - 1) * 100, ytd: y === thisYear });
  }
  return out;
}

// Deepest peak-to-trough fall, when it happened, and whether the price has since regained the peak.
export function maxDrawdown(pts: Point[]) {
  let peak = pts[0], worst = { depth: 0, peak: pts[0], trough: pts[0] };
  for (const p of pts) {
    if (p.v > peak.v) peak = p;
    const depth = p.v / peak.v - 1;
    if (depth < worst.depth) worst = { depth, peak, trough: p };
  }
  const recovered = pts.find((p) => p.t > worst.trough.t && p.v >= worst.peak.v) ?? null;
  const high = Math.max(...pts.map((p) => p.v));
  return {
    depth: worst.depth * 100,
    peakAt: worst.peak.t,
    troughAt: worst.trough.t,
    recoveredAt: recovered?.t ?? null,
    fromHigh: (pts[pts.length - 1].v / high - 1) * 100, // today vs the highest point in the window
  };
}

// Month-by-month returns over the window, from month-end closes.
export function monthlyReturns(pts: Point[]) {
  const ends: Point[] = [];
  for (const p of pts) {
    const m = new Date(p.t).getUTCFullYear() * 12 + new Date(p.t).getUTCMonth();
    const lastM = ends.length ? new Date(ends[ends.length - 1].t).getUTCFullYear() * 12 + new Date(ends[ends.length - 1].t).getUTCMonth() : -1;
    if (m === lastM) ends[ends.length - 1] = p; else ends.push(p);
  }
  return ends.slice(1).map((p, i) => ({ t: p.t, ret: (p.v / ends[i].v - 1) * 100 }));
}

// Annualised internal rate of return for dated cash flows (negative = money in). Bisection: robust, no derivative.
export function xirr(flows: { t: number; amount: number }[]) {
  const t0 = flows[0].t;
  const npv = (r: number) => flows.reduce((s, f) => s + f.amount / (1 + r) ** ((f.t - t0) / YEAR), 0);
  let lo = -0.99, hi = 10;
  if (npv(lo) * npv(hi) > 0) return null;
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    if (npv(lo) * npv(mid) <= 0) hi = mid; else lo = mid;
  }
  return ((lo + hi) / 2) * 100;
}

// Monthly SIP on the first trading day of each month for the last `months` months, valued at the latest price.
export function sip(pts: Point[], amount: number, months: number) {
  const last = pts[pts.length - 1];
  const end = new Date(last.t);
  const buys: Point[] = [];
  for (let k = months; k >= 1; k--) {
    const monthStart = Date.UTC(end.getUTCFullYear(), end.getUTCMonth() - k + 1, 1);
    const p = pts.find((q) => q.t >= monthStart);
    if (!p || p.t > last.t || (buys.length && buys[buys.length - 1].t === p.t)) continue;
    if (monthStart < pts[0].t) continue;
    buys.push(p);
  }
  if (!buys.length) return null;
  const units = buys.reduce((u, b) => u + amount / b.v, 0);
  const invested = amount * buys.length;
  const value = units * last.v;
  const rate = xirr([...buys.map((b) => ({ t: b.t, amount: -amount })), { t: last.t, amount: value }]);
  return { installments: buys.length, invested, value, gain: value - invested, xirr: rate };
}
