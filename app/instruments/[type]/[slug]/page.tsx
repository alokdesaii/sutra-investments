import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { loadDetail, loadInstruments, slugOf, typeOf, watchlist } from "../../../data";
import { loadHeadlines } from "../../../news";
import { guideFor } from "../../../types";
import InstrumentView from "../../view";

export const revalidate = 900;
export const generateStaticParams = () => watchlist.map((w) => ({ type: typeOf[w.kind], slug: slugOf(w.name) }));

export async function generateMetadata({ params }: PageProps<"/instruments/[type]/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const w = watchlist.find((x) => slugOf(x.name) === slug);
  return { title: w?.name ?? "Instrument", description: w?.about };
}

export default async function InstrumentPage({ params }: PageProps<"/instruments/[type]/[slug]">) {
  const { type, slug } = await params;
  const [detail, { instruments }, headlines] = await Promise.all([loadDetail(slug).catch(() => null), loadInstruments(), loadHeadlines()]);
  if (!detail || detail.instrument.type !== type) notFound();
  const ranked = [...instruments].sort((a, b) => b.score - a.score);
  const g = guideFor(type)!;
  return (
    <InstrumentView
      detail={detail}
      headlines={headlines}
      rank={{ n: ranked.findIndex((x) => x.slug === detail.instrument.slug) + 1, of: ranked.length }}
      crumbs={[{ href: "/instruments", label: "Instruments" }, { href: `/instruments/${g.slug}`, label: g.label }, { label: detail.instrument.name }]}
    />
  );
}
