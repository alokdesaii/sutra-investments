// Sutra mark: one thread in a rising S through three beads (headline → theme → your holding).
// Reads as S, as a thread of beads, and as a line trending up. Same geometry as app/icon.svg.
export function SutraMark({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden className="shrink-0">
      <rect width="24" height="24" rx="5" fill="var(--accent)" />
      <path d="M6 17.5C10 17.5 12 15 12 12S14 6.5 18 6.5" fill="none" stroke="var(--on-accent)" strokeWidth="1.6" strokeLinecap="round" />
      {[[6, 17.5], [12, 12], [18, 6.5]].map(([cx, cy]) => <circle key={cx} cx={cx} cy={cy} r="2.1" fill="var(--on-accent)" />)}
    </svg>
  );
}

export default function Logo({ size = 24 }: { size?: number }) {
  return (
    <span className="inline-flex items-center gap-2">
      <SutraMark size={size} />
      <span className="text-[16px] font-semibold tracking-[-0.03em]">Sutra</span>
    </span>
  );
}
