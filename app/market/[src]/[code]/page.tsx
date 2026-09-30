import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { loadAny, slugOf, typeOf, watchlist, type Source } from "../../../data";
import { Crumbs } from "../../../instruments/parts";
import InstrumentView from "../../../instruments/view";
import { loadHeadlines } from "../../../news";
import { loadUniverse, type Entry } from "../../../universe";

export const revalidate = 900;
export const generateStaticParams = () => []; // rendered on first visit, then cached

async function find(src: string, code: string) {
  if (src !== "mf" && src !== "nse") return null;
  const all = await loadUniverse();
  return all.find((e) => e.src === src && e.code === code) ?? null;
}

function sourceOf(e: Entry): Source {
  const about =
    e.src === "mf"
      ? `${e.sub} from ${e.house?.replace(/ Mutual Fund$/, "") ?? "its fund house"}: ${e.plan?.toLowerCase()} plan, ${e.option === "IDCW" ? "paying out income (IDCW). Payouts lower the NAV, so returns here understate what investors received" : "growth option"}.`
      : e.kind === "Stock"
        ? `${e.big ? `${e.sub} company in the Nifty 500` : "Company"} listed on the National Stock Exchange.`
        : `Exchange-traded fund tracking ${e.sub}, bought and sold on NSE like a share.`;
  const base = { name: e.src === "nse" && e.kind !== "Stock" ? e.code : e.name, kind: e.kind, category: e.sub, about };
  return e.src === "mf" ? { ...base, mf: Number(e.code) } : { ...base, yahoo: `${e.code}.NS` };
}

export async function generateMetadata({ params }: PageProps<"/market/[src]/[code]">): Promise<Metadata> {
  const { src, code } = await params;
  const e = await find(src, decodeURIComponent(code));
  return { title: e?.name ?? "Instrument" };
}

export default async function MarketInstrument({ params }: PageProps<"/market/[src]/[code]">) {
  const { src, code: raw } = await params;
  const code = decodeURIComponent(raw);

  // Already on the watchlist? Use its richer page (rank, hand-written description, theme links).
  const w = watchlist.find((x) => ("mf" in x ? src === "mf" && String(x.mf) === code : src === "nse" && x.yahoo === `${code}.NS`));
  if (w) redirect(`/instruments/${typeOf[w.kind]}/${slugOf(w.name)}`);

  const e = await find(src, code);
  if (!e) notFound();
  const crumbs = [{ href: "/instruments", label: "Instruments" }, { href: "/instruments/all", label: "Browse all" }, { label: e.name }];
  const [detail, headlines] = await Promise.all([loadAny(sourceOf(e)).catch(() => null), loadHeadlines()]);

  if (!detail) {
    return (
      <main className="mx-auto max-w-[1400px] px-4 py-10 lg:px-8">
        <Crumbs items={crumbs} />
        <h1 className="hero mt-4">{e.name}</h1>
        <p className="mt-3 max-w-2xl text-text-2">
          Price history for this {e.src === "mf" ? "fund" : "instrument"} isn’t available right now. It may be newly launched, thinly
          traded, or missing from the data source. Try again later.
        </p>
        {e.nav != null && <p className="meta mt-2">Latest NAV ₹{e.nav} on {e.navDate}.</p>}
        <Link href="/instruments/all" className="btn-ghost mt-6">Back to search</Link>
      </main>
    );
  }

  const d = e.src === "nse" && e.kind !== "Stock" ? { ...detail, instrument: { ...detail.instrument, name: e.name } } : detail;
  return <InstrumentView detail={d} headlines={headlines} rank={null} crumbs={crumbs} />;
}
