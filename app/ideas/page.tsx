import type { Metadata } from "next";
import { loadInstruments } from "../data";
import { ASSUMPTIONS } from "../horizons";
import HorizonView from "./horizon-view";

export const revalidate = 900;
export const metadata: Metadata = { title: "Investment Recommendations" };

const idx = (i: number) => ({ "--i": i }) as React.CSSProperties;

export default async function Ideas() {
  const { instruments, failed } = await loadInstruments();

  return (
    <main>
      <div className="mx-auto max-w-[1400px] px-4 pt-10 pb-8 lg:px-8 lg:pt-14">
        <p className="eyebrow rise">Your watchlist · screened by time horizon</p>
        <h1 className="hero rise mt-3" style={idx(1)}>
          What fits <em>your timeline</em>
        </h1>
        <p className="rise mt-4 max-w-3xl text-[17px] leading-relaxed text-text-2 text-pretty" style={idx(2)}>
          When you need the money changes what makes sense. Pick a horizon to see which instruments on your watchlist
          fit its rules, why they fit, and what to weigh before investing.
        </p>
      </div>

      <div className="mx-auto max-w-[1400px] space-y-10 px-4 pb-10 lg:px-8">
        <HorizonView instruments={instruments} />
        {failed.length > 0 && <p className="meta">Couldn’t load: {failed.join(", ")}. They’ll retry on the next refresh.</p>}

        <footer className="meta space-y-1 border-t border-line pt-6">
          <p>
            These recommendations come from rule-based screens of past data on your watchlist. They aren’t personal advice: they don’t know your
            income, goals, taxes or other investments. Assumptions: inflation ~{ASSUMPTIONS.inflation}% a year, savings account
            ~{ASSUMPTIONS.savings}% a year. Past returns don’t predict future ones.
          </p>
          <p>For big decisions, consider a SEBI-registered investment adviser.</p>
        </footer>
      </div>
    </main>
  );
}
