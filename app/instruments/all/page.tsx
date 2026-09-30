import type { Metadata } from "next";
import { kindKey, loadUniverse } from "../../universe";
import { Crumbs, idx, TypeTabs } from "../parts";
import Browser from "./browser";

export const revalidate = 3600;
export const metadata: Metadata = { title: "Browse the market" };

export default async function BrowseAll() {
  const all = await loadUniverse();
  // Counts shown on the type switcher (fund counts are Direct + Growth, matching the default filter).
  const counts: Record<string, number> = { all: 0 };
  for (const e of all) {
    if (e.src === "mf" && (e.plan !== "Direct" || e.option !== "Growth")) continue;
    counts.all++;
    counts[kindKey(e)] = (counts[kindKey(e)] ?? 0) + 1;
  }

  return (
    <main>
      <div className="mx-auto max-w-[1100px] px-4 pt-8 pb-6 lg:px-8 lg:pt-10">
        <Crumbs items={[{ href: "/instruments", label: "Instruments" }, { label: "Browse all" }]} />
        <h1 className="hero rise mt-4">The whole market, <em>searchable</em></h1>
        <p className="rise mt-3 max-w-3xl text-[17px] leading-relaxed text-text-2 text-pretty" style={idx(1)}>
          Every NSE-listed stock and ETF and every open mutual fund. Open any result for its full price history, returns,
          risk, SIP calculator and timeline fit.
        </p>
        <div className="rise mt-6" style={idx(2)}><TypeTabs current="all" /></div>
      </div>
      <div className="mx-auto max-w-[1100px] space-y-6 px-4 pb-12 lg:px-8">
        {all.length ? <Browser counts={counts} /> : <p className="panel p-6 text-text-2">The market lists (AMFI and NSE) aren’t reachable right now. Try again shortly.</p>}
        <p className="meta">
          Sources: AMFI’s daily NAV file for mutual funds (open-ended schemes with a current NAV), NSE’s listed equity and ETF lists, and
          Nifty Indices for Nifty 500 industries. Lists refresh every 6 hours.
        </p>
      </div>
    </main>
  );
}
