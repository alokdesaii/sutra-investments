# Sutra

Markets, threaded to your money. A personal market dashboard for Indian investors.

- **Overview**: benchmarks, a ranked and searchable watchlist with an interactive price chart, and the latest headlines.
- **Instruments**: a guide to each type (stocks, mutual funds, ETFs, gold, bonds and debt funds) and an in-depth page per instrument: history chart with ranges, returns by period and year, drawdown and risk, an SIP calculator on real prices, horizon fit and related news. **Browse all** searches the whole market: every NSE stock and ETF and every open mutual fund, each with the same in-depth page.
- **Investment Recommendations**: rule-based screens of the watchlist for short-term and long-term horizons, with the reasons behind each fit.
- **IPOs**: open, closed and recently listed IPOs from NSE with rule-based demand signals, pre-IPO filings news, and a before-you-apply checklist.
- **News impact**: India and global headlines grouped by market theme, with how each theme usually moves markets and where the watchlist is exposed.

For information only, not investment advice.

## Data

No API keys needed. Refreshed every 15 minutes.

- Mutual fund NAVs: AMFI via [mfapi.in](https://www.mfapi.in)
- NSE prices: Yahoo Finance chart API (unofficial)
- Headlines: Economic Times and Google News RSS
- IPOs: NSE public issue data (unofficial endpoints)
- Whole-market lists: AMFI NAVAll (all funds), NSE archive CSVs (listed equities, ETFs), Nifty Indices (Nifty 500 industries)

## Customise

- Watchlist: `app/data.ts` (`watchlist`)
- Ranking weights: `app/data.ts` (`WEIGHTS`)
- Horizon rules and assumptions: `app/horizons.ts`
- IPO data and demand-signal rules: `app/ipo.ts`
- News themes and keywords: `app/news.ts`
- Instrument-type guides: `app/types.ts`; return and risk maths: `app/analytics.ts`
- Design system: `.interface-design/system.md`

## Develop

```bash
npm install
npm run dev
node app/horizons.check.ts   # rules self-check
node app/ipo.check.ts        # IPO parsing and signal self-check
node app/analytics.check.ts  # returns, drawdown, SIP and XIRR self-check
node app/universe.check.ts   # market list parsing and search self-check
```
