// Self-check for horizon rules. Run: node app/horizons.check.ts
import assert from "node:assert";
import type { Instrument } from "./data";
// @ts-expect-error: .ts extension needed for plain `node` execution
import { horizons, screen } from "./horizons.ts";

const mk = (name: string, kind: Instrument["kind"], category: string, ret1y: number, ret3y: number | null, vol: number) =>
  ({ name, kind, category, ret1y, ret3y, vol, price: 1, asOf: "2026-01-01", risk: "Low", spark: [1, 2], score: 0 }) as Instrument;

const list = [
  mk("Liquid", "Mutual Fund", "Liquid", 6.5, 6.9, 0.2),
  mk("Bond", "Bond", "Corporate Bond Fund", 4.2, 6.9, 2.1),
  mk("Index", "Mutual Fund", "Index", -6.8, 6.1, 12.9),
  mk("Gold", "Gold", "Gold ETF", 25.8, 34.8, 27.1),
  mk("New", "Stock", "IT", 10, null, 30),
];

const short = screen(horizons.short, list);
assert.deepEqual(short.fit.map((i) => i.name), ["Liquid", "Bond"], "short term keeps only steady instruments, steadiest first");
assert.ok(short.out.some((i) => i.name === "Gold"), "volatile gold is excluded short term");

const long = screen(horizons.long, list);
assert.deepEqual(long.fit.map((i) => i.name), ["Gold", "Index"], "long term ranks growth, needs 3y history, skips cash-like funds");
assert.match(horizons.long.whyNot(list[4]), /3 years/, "explains missing history");

console.log("horizons ok");
