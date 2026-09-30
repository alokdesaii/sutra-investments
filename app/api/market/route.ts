import { hrefOf, loadUniverse, search } from "../../universe";

// GET /api/market?q=&kind=&group=&house=&plan=&option=&offset=
export async function GET(req: Request) {
  const p = new URL(req.url).searchParams;
  const get = (k: string) => p.get(k) || undefined;
  const all = await loadUniverse();
  if (!all.length) return Response.json({ error: "Market lists are unavailable right now." }, { status: 503 });
  const r = search(all, { q: get("q"), kind: get("kind"), group: get("group"), house: get("house"), plan: get("plan"), option: get("option") }, Number(p.get("offset") ?? 0));
  return Response.json(
    { total: r.total, facets: r.facets, items: r.items.map((e) => ({ ...e, href: hrefOf(e) })) },
    { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600" } },
  );
}
