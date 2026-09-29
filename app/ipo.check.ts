// Self-check for IPO parsing and signal rules. Run: node app/ipo.check.ts
import assert from "node:assert";
// @ts-expect-error: .ts extension needed for plain `node` execution
import { assess, issueStructure, parseDate, stageOf } from "./ipo.ts";

assert.equal(parseDate("30-Sep-2026"), Date.UTC(2026, 8, 30));
assert.equal(parseDate("29-SEP-2026"), Date.UTC(2026, 8, 29));

// Fresh in lakhs, OFS in shares priced at the band top: 145 cr fresh vs 15L × 220 = 33 cr OFS → ~81% fresh.
const vnl = issueStructure("Initial Public Offering comprising fresh issue aggregating up to 14500 lakhs and offer for sale up to 15,00,000 Equity Shares", 220);
assert.ok(vnl != null && Math.abs(vnl - 145 / 178) < 0.01, `vnl ${vnl}`);
assert.equal(issueStructure("Fresh issue of up to 25,72,800 equity shares", 72), 1);
assert.equal(issueStructure("Offer for sale of up to 40,00,000 equity shares", 100), 0);
assert.equal(issueStructure("Book built issue", 100), null);

assert.equal(stageOf("Acme files DRHP with SEBI for Rs 500 crore IPO"), "Pre-IPO");
assert.equal(stageOf("A-One Steels IPO booked 3x so far on Day 3; GMP at 14%"), "Open");
assert.equal(stageOf("Hero Motors shares debut at 12% premium"), "Listing");

const base = {
  symbol: "T", name: "T", sme: false, status: "Open" as const, start: 0, end: 0, daysLeft: 0,
  priceLow: 100, priceHigh: 110, lot: 100, minInvest: 11000, sizeText: "", freshShare: 0.9, leadManager: "",
  subscription: { total: 20, qib: 40, nii: 30, retail: 8 }, links: { nse: "" },
};
assert.equal(assess(base).verdict, "Strong demand", "last day, heavy QIB, mostly fresh");
assert.equal(assess({ ...base, daysLeft: 3 }).verdict, "Too early to tell", "QIBs bid late");
assert.equal(assess({ ...base, subscription: { ...base.subscription, qib: 0.4 } }).verdict, "Weak demand");
assert.equal(assess({ ...base, freshShare: 0.1 }).verdict, "Mixed", "heavy QIB but mostly OFS");
assert.equal(assess({ ...base, sme: true }).verdict, "Higher risk (SME)");
assert.ok(assess(base).signals.some((s) => /1 in 8/.test(s.text)), "allotment odds");

assert.ok(assess({ ...base, subscription: { ...base.subscription, qib: 0.01 } }).signals.some((s) => /0\.01×/.test(s.text)), "tiny QIB not rounded to 0.0");

console.log("ipo ok");
