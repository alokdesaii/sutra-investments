import type { Metadata } from "next";
import { loadInstruments } from "../data";
import { ago, loadHeadlines, themes } from "../news";
import Section from "../section";

export const revalidate = 900;
export const metadata: Metadata = { title: "News impact" };

const pct = (n: number) => `${n > 0 ? "+" : ""}${n.toFixed(1)}%`;
const idx = (i: number) => ({ "--i": i }) as React.CSSProperties;

export default async function News() {
  const [headlines, { instruments }] = await Promise.all([loadHeadlines(), loadInstruments()]);
  const byName = new Map(instruments.map((i) => [i.name, i]));

  const active = themes
    .map((t) => ({ ...t, stories: headlines.filter((h) => h.themes.includes(t.id)) }))
    .sort((a, b) => b.stories.length - a.stories.length);
  const live = active.filter((t) => t.stories.length);
  const quiet = active.filter((t) => !t.stories.length);
  const max = Math.max(1, ...live.map((t) => t.stories.length));

  return (
    <main>
      <div className="mx-auto max-w-[1400px] px-4 pt-10 pb-8 lg:px-8 lg:pt-14">
        <p className="eyebrow rise">{headlines.length} headlines · India and global</p>
        <h1 className="hero rise mt-3" style={idx(1)}>
          What the news <em>could move</em>
        </h1>
        <p className="rise mt-4 max-w-3xl text-[17px] leading-relaxed text-text-2 text-pretty" style={idx(2)}>
          Today’s headlines grouped by the force behind them. For each: why it matters, which sectors it usually moves,
          and where your watchlist is exposed.
        </p>
      </div>

      <div className="mx-auto max-w-[1400px] space-y-12 px-4 pb-10 lg:px-8">
        <Section
          title="Where the attention is"
          sub="Headlines per theme right now. Select a theme to jump to it."
          action={
            <div className="flex gap-4 text-xs text-text-2">
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 bg-accent" />India</span>
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 bg-accent/35" />Global</span>
            </div>
          }
        >
          <div className="panel p-3">
            <ul>
              {live.map((t, n) => {
                const india = t.stories.filter((h) => h.region === "India").length;
                return (
                  <li key={t.id}>
                    <a href={`#${t.id}`} className="link-row group grid grid-cols-[minmax(0,12rem)_1fr_2.5rem] items-center gap-4 rounded-[3px] px-3 py-2">
                      <span className="truncate text-[13px] text-text-2 group-hover:text-text">{t.label}</span>
                      <span className="bar-grow flex h-2" style={{ ...idx(n), width: `${(t.stories.length / max) * 100}%` }}>
                        <span className="h-full bg-accent" style={{ width: `${(india / t.stories.length) * 100}%` }} />
                        <span className="h-full flex-1 bg-accent/35" />
                      </span>
                      <span className="text-right text-[13px] font-medium">{t.stories.length}</span>
                    </a>
                  </li>
                );
              })}
            </ul>
            {quiet.length > 0 && <p className="meta px-3 pt-2 pb-1">Quiet right now: {quiet.map((t) => t.label).join(", ")}.</p>}
          </div>
        </Section>

        <Section title="By theme" sub="Grouping is keyword-based, so a story can land in the wrong theme or more than one. Read the story before acting on it.">
          <div className="space-y-4">
            {live.map((t) => (
              <section key={t.id} id={t.id} className="panel scroll-mt-20 overflow-hidden">
                <div className="panel-head">
                  <h3 className="h2">{t.label}</h3>
                  <span className="meta">{t.stories.length} {t.stories.length === 1 ? "story" : "stories"}</span>
                </div>
                <div className="grid lg:grid-cols-12">
                  <div className="space-y-6 border-b border-line bg-surface-2/50 p-5 lg:col-span-5 lg:border-r lg:border-b-0">
                    <div>
                      <p className="eyebrow">Why it matters</p>
                      <p className="mt-2 leading-relaxed text-text-2 text-pretty">{t.how}</p>
                    </div>
                    <div>
                      <p className="eyebrow">Sectors usually affected</p>
                      <div className="mt-2 flex flex-wrap gap-1.5">{t.sectors.map((s) => <span key={s} className="chip">{s}</span>)}</div>
                    </div>
                    <div>
                      <p className="eyebrow">Your watchlist exposure</p>
                      <ul className="mt-1.5">
                        {t.watch.map((name) => {
                          const i = byName.get(name);
                          return (
                            <li key={name} className="flex items-baseline justify-between gap-3 border-b border-line py-2 last:border-b-0">
                              <span>{name}</span>
                              {i && (
                                <span className="meta">
                                  1 year <span className={`text-sm font-medium ${i.ret1y < 0 ? "text-down" : "text-up"}`}>{pct(i.ret1y)}</span>
                                </span>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  </div>

                  <ul className="p-2 lg:col-span-7">
                    {t.stories.slice(0, 6).map((h) => (
                      <li key={h.link}>
                        <a href={h.link} target="_blank" rel="noreferrer" className="link-row block rounded-[3px] px-3 py-3">
                          <span className="font-medium leading-snug">{h.title}</span>
                          <span className="meta mt-1 block">{h.region} · {h.source} · {ago(h.time)}</span>
                        </a>
                      </li>
                    ))}
                    {t.stories.length > 6 && <li className="meta px-3 py-2">+{t.stories.length - 6} more on this theme</li>}
                  </ul>
                </div>
              </section>
            ))}
            {live.length === 0 && <p className="panel p-8 text-text-3">Couldn’t load headlines right now. They’ll retry on the next refresh.</p>}
          </div>
        </Section>

        <footer className="meta border-t border-line pt-6">
          “Why it matters” notes describe how markets usually react, not predictions. For information only, not investment advice.
        </footer>
      </div>
    </main>
  );
}
