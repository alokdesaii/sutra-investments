"use client";
import { useState } from "react";

const DAY = 86_400_000;
export const trendColor = (data: number[]) => (data[data.length - 1] >= data[0] ? "var(--up)" : "var(--down)");

function path(data: number[], w: number, h: number, pad = 2) {
  const min = Math.min(...data), max = Math.max(...data);
  const pts = data.map((v, i) => [(i / (data.length - 1)) * w, h - pad - ((v - min) / (max - min || 1)) * (h - pad * 2)] as const);
  return { pts, d: pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join("") };
}

// Small static trend line. Gradient area fades to transparent so it sits quietly on any surface.
export function Spark({ data, h = 28, area, id }: { data: number[]; h?: number; area?: boolean; id?: string }) {
  const w = 240;
  const { d } = path(data, w, h);
  const color = trendColor(data);
  const gid = `g-${id ?? "s"}`;
  return (
    <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" aria-hidden className="block overflow-visible">
      {area && (
        <>
          <defs>
            <linearGradient id={gid} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor={color} stopOpacity="0.22" />
              <stop offset="1" stopColor={color} stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={`${d}L${w},${h}L0,${h}Z`} fill={`url(#${gid})`} />
        </>
      )}
      <path d={d} fill="none" stroke={color} strokeWidth={1.5} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

// Weekly price chart with a hover/touch crosshair that reads out date, price and change since the start.
export function PriceChart({ data, asOf, fmt }: { data: number[]; asOf: string; fmt: (n: number) => string }) {
  const w = 600, h = 180;
  const { pts, d } = path(data, w, h, 8);
  const [hover, setHover] = useState<number | null>(null);
  const idx = hover ?? data.length - 1;
  const [x, y] = pts[idx];
  const end = Date.parse(asOf);
  const date = new Date(end - (data.length - 1 - idx) * 7 * DAY).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "2-digit" });
  const change = (data[idx] / data[0] - 1) * 100;
  const color = trendColor(data);

  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    setHover(Math.max(0, Math.min(data.length - 1, Math.round(((e.clientX - r.left) / r.width) * (data.length - 1)))));
  };

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3 text-xs">
        <span className="text-text-3">{hover == null ? "Today" : date}</span>
        <span>
          <span className="font-semibold text-text">{fmt(data[idx])}</span>
          <span className={`ml-2 ${change < 0 ? "text-down" : "text-up"}`}>{change > 0 ? "+" : ""}{change.toFixed(1)}% since {new Date(end - (data.length - 1) * 7 * DAY).toLocaleDateString("en-IN", { month: "short", year: "2-digit" })}</span>
        </span>
      </div>
      <div
        className="relative mt-2 h-44 cursor-crosshair touch-none"
        onPointerMove={onMove}
        onPointerDown={onMove}
        onPointerLeave={() => setHover(null)}
        role="img"
        aria-label={`Price over the last 52 weeks, from ${fmt(data[0])} to ${fmt(data[data.length - 1])}`}
      >
        <svg width="100%" height="100%" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="block">
          <defs>
            <linearGradient id="pc-fill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor={color} stopOpacity="0.2" />
              <stop offset="1" stopColor={color} stopOpacity="0" />
            </linearGradient>
          </defs>
          {[0.25, 0.5, 0.75].map((f) => (
            <line key={f} x1={0} x2={w} y1={h * f} y2={h * f} stroke="var(--line)" vectorEffect="non-scaling-stroke" />
          ))}
          <path d={`${d}L${w},${h}L0,${h}Z`} fill="url(#pc-fill)" />
          <path d={d} fill="none" stroke={color} strokeWidth={1.75} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        </svg>
        {/* Crosshair + point drawn in HTML so they don't stretch with the SVG. */}
        <div className="pointer-events-none absolute top-0 bottom-0 w-px bg-line-2" style={{ left: `${(x / w) * 100}%` }} />
        <div
          className="pointer-events-none absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-surface"
          style={{ left: `${(x / w) * 100}%`, top: `${(y / h) * 100}%`, background: hover == null ? "var(--amber)" : color }}
        />
      </div>
      <p className="meta mt-1">Hover or drag across the chart to read any week.</p>
    </div>
  );
}
