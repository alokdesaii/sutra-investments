import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Spark } from "../../charts";
import { loadInstruments } from "../../data";
import Section from "../../section";
import { guideFor, guides } from "../../types";
import { Crumbs, idx, inr, pct, tone, TypeTabs } from "../parts";

export const revalidate = 900;
export const generateStaticParams = () => guides.map((g) => ({ type: g.slug }));

export async function generateMetadata({ params }: PageProps<"/instruments/[type]">): Promise<Metadata> {
  return { title: guideFor((await params).type)?.label ?? "Instruments" };
}

export default async function TypePage({ params }: PageProps<"/instruments/[type]">) {
  const g = guideFor((await params).type);
  if (!g) notFound();
  const { instruments } = await loadInstruments();
  const list = instruments.filter((i) => g.kinds.includes(i.kind)).sort((a, b) => b.score - a.score);

  const blocks = [
    { title: "What it is", body: <p>{g.what}</p> },
    { title: "How you make money", body: <p>{g.earn}</p> },
    { title: "What can go wrong", body: <ul className="list-disc space-y-1 pl-4">{g.risks.map((r) => <li key={r}>{r}</li>)}</ul> },
    { title: "What it costs", body: <p>{g.costs}</p> },
    { title: "Who it suits", body: <p>{g.suits}</p> },
    { title: `Before you buy a ${g.one}`, body: <ul className="list-disc space-y-1 pl-4">{g.check.map((c) => <li key={c}>{c}</li>)}</ul> },
  ];

  return (
    <main>
      <div className="mx-auto max-w-[1400px] px-4 pt-8 pb-8 lg:px-8 lg:pt-10">
        <Crumbs items={[{ href: "/instruments", label: "Instruments" }, { label: g.label }]} />
        <h1 className="hero rise mt-4">{g.label}</h1>
        <p className="rise mt-3 max-w-3xl text-[17px] leading-relaxed text-text-2" style={idx(1)}>{g.tagline}</p>
        <div className="rise mt-6" style={idx(2)}><TypeTabs current={g.slug} /></div>
      </div>

      <div className="mx-auto max-w-[1400px] space-y-12 px-4 pb-10 lg:px-8">
        <Section title={`On your watchlist · ${list.length}`} sub="Ranked by the same score as the Overview. Open any one for its full history, risk and SIP calculator.">
          {list.length === 0 ? (
            <p className="panel p-6 text-text-2">Nothing of this type on your watchlist yet. Add one in <code>app/data.ts</code>.</p>
          ) : (
            <div className="panel overflow-x-auto">
              <table className="w-full min-w-[720px]">
                <thead>
                  <tr className="text-left">
                    {["Instrument", "Price", "52 weeks", "1-year return", "3-year, per year", "Volatility", ""].map((h, c) => (
                      <th key={h || c} className={`meta px-4 py-2.5 font-medium ${c === 1 || (c > 2 && c < 6) ? "text-right" : ""}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {list.map((i, n) => (
                    <tr key={i.slug} className="row rise" style={idx(n)}>
                      <td className="px-4 py-3">
                        <Link href={`/instruments/${g.slug}/${i.slug}`} className="font-medium hover:text-accent">{i.name}</Link>
                        <div className="meta">{i.category} · {i.risk} risk</div>
                      </td>
                      <td className="px-4 py-3 text-right text-text-2">{inr(i.price)}</td>
                      <td className="w-32 px-4 py-3"><Spark data={i.spark} h={24} id={`tp-${n}`} /></td>
                      <td className={`px-4 py-3 text-right font-medium ${tone(i.ret1y)}`}>{pct(i.ret1y)}</td>
                      <td className={`px-4 py-3 text-right font-medium ${tone(i.ret3y)}`}>{pct(i.ret3y)}</td>
                      <td className="px-4 py-3 text-right text-text-2">{i.vol.toFixed(1)}%</td>
                      <td className="px-4 py-3 text-right">
                        <Link href={`/instruments/${g.slug}/${i.slug}`} className="text-sm font-medium text-accent hover:underline">Details →</Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Section>

        <Section title={`Understanding ${g.label.toLowerCase()}`} sub="The basics in plain language.">
          <div className="grid gap-px overflow-hidden rounded-[4px] border border-line bg-line sm:grid-cols-2 xl:grid-cols-3">
            {blocks.map((b) => (
              <div key={b.title} className="bg-surface p-5">
                <h3 className="h2 text-sm">{b.title}</h3>
                <div className="mt-2 text-[13.5px] leading-relaxed text-text-2">{b.body}</div>
              </div>
            ))}
          </div>
          <p className="meta">Taxes aren’t covered here because rates and holding periods change with each budget. Check the current rules before you invest.</p>
        </Section>
      </div>
    </main>
  );
}
