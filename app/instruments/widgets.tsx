"use client";
import { useState } from "react";
import { DAY, sip, type Point } from "../analytics";
import { path, trendColor } from "../charts";

const inr = (n: number) => `₹${n.toLocaleString("en-IN", { maximumFractionDigits: n < 100 ? 2 : 0 })}`;
const date = (t: number) => new Date(t).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const zip = (t: number[], v: number[]): Point[] => t.map((ti, i) => ({ t: ti, v: v[i] }));

const RANGES = [
  { label: "1M", days: 30 },
  { label: "6M", days: 182 },
  { label: "1Y", days: 365 },
  { label: "3Y", days: 3 * 365 },
  { label: "5Y", days: 5 * 365 },
  { label: "All", days: Infinity },
];

// Price history with range switcher and a crosshair readout (date, price, change since the range start).
export function HistoryChart({ t, v }: { t: number[]; v: number[] }) {
  const all = zip(t, v);
  const span = (t[t.length - 1] - t[0]) / DAY;
  const ranges = RANGES.filter((r) => (r.days === Infinity ? span > 5 * 365 + 30 : r.days <= span + 7));
  const [range, setRange] = useState(ranges.find((r) => r.label === "1Y")?.label ?? ranges[ranges.length - 1].label);
  const [hover, setHover] = useState<number | null>(null);

  const days = RANGES.find((r) => r.label === range)!.days;
  const inRange = days === Infinity ? all : all.filter((p) => p.t >= t[t.length - 1] - days * DAY);
  const step = Math.max(1, Math.ceil(inRange.length / 320)); // keep the SVG light
  const pts = inRange.filter((_, i) => i % step === 0 || i === inRange.length - 1);
  const values = pts.map((p) => p.v);
  const w = 800, h = 260;
  const { pts: xy, d } = path(values, w, h, 10);
  const i = hover ?? pts.length - 1;
  const change = (pts[i].v / pts[0].v - 1) * 100;
  const color = trendColor(values);
  const lo = Math.min(...values), hi = Math.max(...values);

  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    setHover(Math.max(0, Math.min(pts.length - 1, Math.round(((e.clientX - r.left) / r.width) * (pts.length - 1)))));
  };

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="meta">{hover == null ? "Latest" : date(pts[i].t)}</p>
          <p className="mt-0.5 flex items-baseline gap-3">
            <span className="figure">{inr(pts[i].v)}</span>
            <span className={`text-sm font-medium ${change < 0 ? "text-down" : "text-up"}`}>
              {change > 0 ? "+" : ""}{change.toFixed(1)}% since {date(pts[0].t)}
            </span>
          </p>
        </div>
        <div role="group" aria-label="Chart range" className="seg">
          {ranges.map((r) => (
            <button key={r.label} aria-pressed={range === r.label} onClick={() => { setRange(r.label); setHover(null); }}>{r.label}</button>
          ))}
        </div>
      </div>
      <div
        className="relative mt-4 h-64 cursor-crosshair touch-none"
        onPointerMove={onMove}
        onPointerDown={onMove}
        onPointerLeave={() => setHover(null)}
        role="img"
        aria-label={`Price over ${range}: from ${inr(pts[0].v)} to ${inr(pts[pts.length - 1].v)}`}
      >
        <svg width="100%" height="100%" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="block">
          <defs>
            <linearGradient id="hc-fill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor={color} stopOpacity="0.18" />
              <stop offset="1" stopColor={color} stopOpacity="0" />
            </linearGradient>
          </defs>
          {[0.25, 0.5, 0.75].map((f) => <line key={f} x1={0} x2={w} y1={h * f} y2={h * f} stroke="var(--line)" vectorEffect="non-scaling-stroke" />)}
          <path d={`${d}L${w},${h}L0,${h}Z`} fill="url(#hc-fill)" />
          <path d={d} fill="none" stroke={color} strokeWidth={1.75} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        </svg>
        <div className="pointer-events-none absolute top-0 bottom-0 w-px bg-line-2" style={{ left: `${(xy[i][0] / w) * 100}%` }} />
        <div
          className="pointer-events-none absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-surface"
          style={{ left: `${(xy[i][0] / w) * 100}%`, top: `${(xy[i][1] / h) * 100}%`, background: hover == null ? "var(--amber)" : color }}
        />
        <span className="meta pointer-events-none absolute top-0 right-0">High {inr(hi)}</span>
        <span className="meta pointer-events-none absolute right-0 bottom-0">Low {inr(lo)}</span>
      </div>
      <p className="meta mt-2">Hover or drag across the chart to read any day.</p>
    </div>
  );
}

// "What if I'd run a monthly SIP?" on the instrument's real price history.
export function SipCalculator({ t, v }: { t: number[]; v: number[] }) {
  const all = zip(t, v);
  const span = (t[t.length - 1] - t[0]) / DAY / 365;
  const options = [1, 3, 5, 10].filter((y) => y <= span + 0.05);
  const [amount, setAmount] = useState(5000);
  const [years, setYears] = useState(options.includes(3) ? 3 : options[options.length - 1] ?? 1);
  const r = amount > 0 ? sip(all, amount, years * 12) : null;

  return (
    <div className="grid gap-5 sm:grid-cols-[auto_1fr] sm:items-end">
      <div className="flex flex-wrap items-end gap-3">
        <label className="grid gap-1">
          <span className="meta">Every month</span>
          <span className="relative">
            <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-text-3">₹</span>
            <input
              type="number" inputMode="numeric" min={100} step={500} value={amount}
              onChange={(e) => setAmount(Math.max(0, Number(e.target.value)))}
              className="field w-32 pl-7!"
            />
          </span>
        </label>
        <div className="grid gap-1">
          <span className="meta">For the last</span>
          <div role="group" aria-label="SIP duration" className="seg">
            {options.map((y) => (
              <button key={y} aria-pressed={years === y} onClick={() => setYears(y)}>{y} yr{y > 1 ? "s" : ""}</button>
            ))}
          </div>
        </div>
      </div>
      {r ? (
        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4 sm:justify-self-end sm:text-right">
          <div><dt className="meta">You’d have put in</dt><dd className="mt-0.5 text-lg font-semibold">{inr(r.invested)}</dd></div>
          <div><dt className="meta">Worth today</dt><dd className="mt-0.5 text-lg font-semibold">{inr(r.value)}</dd></div>
          <div><dt className="meta">Gain</dt><dd className={`mt-0.5 text-lg font-semibold ${r.gain < 0 ? "text-down" : "text-up"}`}>{r.gain < 0 ? "−" : "+"}{inr(Math.abs(r.gain))}</dd></div>
          <div><dt className="meta">Yearly return (XIRR)</dt><dd className={`mt-0.5 text-lg font-semibold ${(r.xirr ?? 0) < 0 ? "text-down" : "text-up"}`}>{r.xirr == null ? "—" : `${r.xirr.toFixed(1)}%`}</dd></div>
        </dl>
      ) : (
        <p className="meta">Enter a monthly amount to see the result.</p>
      )}
      <p className="meta sm:col-span-2">
        Based on actual prices: {r?.installments ?? years * 12} monthly purchases on the first trading day of each month, valued at today’s price.
        Ignores costs and taxes. Past results don’t predict future ones.
      </p>
    </div>
  );
}
