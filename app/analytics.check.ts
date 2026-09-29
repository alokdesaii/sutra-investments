// Self-check for price-history maths. Run: node app/analytics.check.ts
import assert from "node:assert";
// @ts-expect-error: .ts extension needed for plain `node` execution
import { calendarYears, DAY, maxDrawdown, periodReturn, sip, xirr } from "./analytics.ts";

const t0 = Date.UTC(2021, 0, 1);
// Daily series growing exactly 10% a year for 5 years.
const grow = Array.from({ length: 5 * 365 + 1 }, (_, d) => ({ t: t0 + d * DAY, v: 100 * 1.1 ** (d / 365) }));
const near = (a: number | null, b: number, tol = 0.15) => assert.ok(a != null && Math.abs(a - b) < tol, `${a} ≉ ${b}`);

near(periodReturn(grow, 365), 10);
near(periodReturn(grow, 3 * 365), 10); // annualised
assert.equal(periodReturn(grow, 10 * 365), null, "history too short");
calendarYears(grow).forEach((y) => near(y.ret, y.ytd ? y.ret : 10, 0.3));

// Rise to 200, fall to 120 (-40%), recover to 210.
const path = [100, 150, 200, 160, 120, 180, 210].map((v, i) => ({ t: t0 + i * 30 * DAY, v }));
const dd = maxDrawdown(path);
near(dd.depth, -40, 0.01);
assert.equal(dd.peakAt, path[2].t);
assert.equal(dd.troughAt, path[4].t);
assert.equal(dd.recoveredAt, path[6].t);

// One year of flat prices: SIP gain is zero; XIRR of 100 → 110 in a year is 10%.
const flat = Array.from({ length: 400 }, (_, d) => ({ t: t0 + d * DAY, v: 50 }));
const s = sip(flat, 1000, 12)!;
assert.equal(s.installments, 12);
near(s.gain, 0, 0.001);
near(xirr([{ t: t0, amount: -100 }, { t: t0 + 365 * DAY, amount: 110 }]), 10, 0.01);

console.log("analytics ok");
