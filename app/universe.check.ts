// Self-check for whole-market parsing and search. Run: node app/universe.check.ts
import assert from "node:assert";
// @ts-expect-error: .ts extension needed for plain `node` execution
import { classifyFund, kindKey, parseAmfi, search, tidy } from "./universe.ts";

assert.deepEqual(classifyFund("Equity Scheme - Large Cap Fund", "X Bluechip"), { group: "Equity", kind: "Mutual Fund", sub: "Large Cap Fund" });
assert.equal(classifyFund("Debt Scheme - Liquid Fund", "X Liquid")!.kind, "Mutual Fund", "cash-like funds stay Mutual Fund, like the watchlist");
assert.equal(classifyFund("Income/Debt Oriented Schemes - Gilt Fund", "X Gilt")!.kind, "Bond", "old AMFI taxonomy maps to Debt too");
assert.equal(classifyFund("Hybrid Scheme - Arbitrage Fund", "X Arbitrage")!.group, "Hybrid");
assert.equal(classifyFund("Other Scheme - FoF Domestic", "X Gold Savings Fund")!.kind, "Gold");
assert.equal(classifyFund("Exchange Traded Funds (ETFs) - Equity ETF", "X Nifty ETF"), null, "ETFs come from NSE");

const raw = `Scheme Code;ISIN Div Payout/ ISIN Growth;ISIN Div Reinvestment;Scheme Name;Plan;Option;Net Asset Value;Date

Open Ended Schemes(Equity Scheme - Flexi Cap Fund)

Acme Mutual Fund

1;INF1;-;Acme Flexi Cap Fund;Direct Plan;Growth;88.5;29-Sep-2026
2;INF2;-;Acme Flexi Cap Fund;Regular Plan;IDCW;40.1;29-Sep-2026
3;INF3;-;Acme Old Merged Fund;Direct Plan;Growth;10.0;01-Jan-2019

Close Ended Schemes(Income)

Acme Mutual Fund

4;INF4;-;Acme FMP Series 9;Direct Plan;Growth;11.0;29-Sep-2026
`;
const funds = parseAmfi(raw);
assert.deepEqual(funds.map((f: { code: string }) => f.code), ["1", "2"], "drops stale NAVs and closed-ended schemes");
assert.equal(funds[0].house, "Acme Mutual Fund");
assert.equal(funds[1].plan, "Regular");
assert.equal(funds[1].option, "IDCW");

const stock = { id: "nse:INFY", src: "nse", code: "INFY", name: "Infosys", kind: "Stock", group: "Stocks", sub: "IT", big: true } as const;
const all = [...funds, stock];
assert.equal(search(all, { q: "infy" }).items[0].code, "INFY", "exact symbol match");
assert.equal(search(all, { q: "acme flexi", plan: "Direct" }).total, 1, "plan filter applies to funds");
assert.equal(search(all, { kind: "stocks" }).total, 1);
assert.equal(kindKey(funds[0]), "funds");

assert.equal(tidy("SBI GILT FUND"), "SBI Gilt Fund");
assert.equal(tidy("ETERNAL LIMITED"), "Eternal Limited");
assert.equal(tidy("ICICI PRUDENTIAL BANKING AND PSU DEBT FUND"), "ICICI Prudential Banking and PSU Debt Fund");
assert.equal(tidy("Parag Parikh Flexi Cap Fund"), "Parag Parikh Flexi Cap Fund", "mixed case untouched");

console.log("universe ok");
