# Sutra

Markets, threaded to your money. A personal market dashboard for Indian investors.

- **Overview**: benchmarks, a ranked and searchable watchlist with an interactive price chart, and the latest headlines.
- **Investment Recommendations**: rule-based screens of the watchlist for short-term and long-term horizons, with the reasons behind each fit.
- **News impact**: India and global headlines grouped by market theme, with how each theme usually moves markets and where the watchlist is exposed.

For information only, not investment advice.

## Data

No API keys needed. Refreshed every 15 minutes.

- Mutual fund NAVs: AMFI via [mfapi.in](https://www.mfapi.in)
- NSE prices: Yahoo Finance chart API (unofficial)
- Headlines: Economic Times and Google News RSS

## Customise

- Watchlist: `app/data.ts` (`watchlist`)
- Ranking weights: `app/data.ts` (`WEIGHTS`)
- Horizon rules and assumptions: `app/horizons.ts`
- News themes and keywords: `app/news.ts`
- Design system: `.interface-design/system.md`

## Develop

```bash
npm install
npm run dev
node app/horizons.check.ts   # rules self-check
```
