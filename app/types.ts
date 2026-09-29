// Plain-language guides for each instrument type, shown on the type and detail pages.
// Tax specifics are deliberately left out: rates and holding periods change with budgets.
import type { Kind } from "./data";

export type TypeGuide = {
  slug: string;
  kinds: Kind[];
  label: string;
  one: string; // singular, lower case
  tagline: string;
  what: string;
  earn: string;
  risks: string[];
  costs: string;
  suits: string;
  check: string[];
};

export const guides: TypeGuide[] = [
  {
    slug: "stocks",
    kinds: ["Stock"],
    label: "Stocks",
    one: "stock",
    tagline: "Own a slice of a single company.",
    what: "A share makes you a part-owner of a listed company. Its price moves with the company’s profits, its prospects, and the market’s mood.",
    earn: "The share price rising over time, plus dividends when the company pays out part of its profit.",
    risks: [
      "One company’s bad news can cut the price sharply, and it may never recover.",
      "Prices swing more than funds because there’s no diversification.",
      "Good companies can still be bad buys if you pay too high a price.",
    ],
    costs: "Brokerage and exchange charges on each trade, a demat account fee, and tax on gains and dividends.",
    suits: "Money you won’t need for five years or more, and time to follow the companies you own.",
    check: ["What the business does and how it makes money", "Several years of revenue and profit growth", "Debt and cash flow", "Valuation (P/E) against similar companies", "Promoter holding and any pledged shares"],
  },
  {
    slug: "mutual-funds",
    kinds: ["Mutual Fund"],
    label: "Mutual funds",
    one: "mutual fund",
    tagline: "Pooled money, run by a professional or tracking an index.",
    what: "A mutual fund pools money from many investors and buys a basket of stocks, bonds or both. You own units, priced once a day at the NAV (net asset value).",
    earn: "The NAV rising as the fund’s holdings gain value. Growth plans reinvest everything, so there are no payouts along the way.",
    risks: [
      "Equity funds rise and fall with the stock market, sometimes 20–30% in a bad year.",
      "An actively managed fund can trail its benchmark for years.",
      "Debt funds carry interest-rate and credit risk, though far less than equity.",
    ],
    costs: "An annual expense ratio, taken daily from the NAV. Direct plans cost less than regular plans. Some funds charge an exit load if you sell early.",
    suits: "Almost everyone: small monthly SIPs, long-term goals (equity funds) or parking cash (liquid and overnight funds).",
    check: ["Category and what it actually holds", "Returns against its benchmark over 3–5 years, not just last year", "Expense ratio: direct plan, as low as possible", "Worst fall in the past and how long it took to recover", "Exit load and lock-in, if any"],
  },
  {
    slug: "etfs",
    kinds: ["ETF"],
    label: "ETFs",
    one: "ETF",
    tagline: "An index fund you trade like a share.",
    what: "An exchange-traded fund holds a basket that tracks an index, such as the Nifty 50, and trades on the stock exchange throughout the day.",
    earn: "The index rising. An ETF aims to match the index, not beat it.",
    risks: [
      "It falls whenever its index falls; there’s no manager to step aside.",
      "Thinly traded ETFs can trade away from their true value (NAV).",
      "Small tracking differences from the index add up over time.",
    ],
    costs: "A very low expense ratio, plus brokerage on each trade and a demat account.",
    suits: "Long-term investors who want cheap, broad market exposure and already have a demat account.",
    check: ["Which index it tracks", "Expense ratio and tracking error", "Daily trading volume, so you can buy and sell near NAV", "Price against its indicative NAV before you trade"],
  },
  {
    slug: "gold",
    kinds: ["Gold"],
    label: "Gold",
    one: "gold investment",
    tagline: "A hedge that often moves when stocks don’t.",
    what: "Gold ETFs and gold funds hold physical gold in vaults, so their price follows gold in rupees without the hassle of storing it or paying making charges.",
    earn: "The price of gold rising. Gold pays no interest or dividend, so returns come only from price.",
    risks: [
      "Gold can go years without rising, and it can fall 20% or more.",
      "The rupee–dollar rate moves the rupee price of gold too.",
      "It produces no income, so it’s a diversifier, not a growth engine.",
    ],
    costs: "A small expense ratio, plus brokerage for ETFs.",
    suits: "A slice of a long-term portfolio (often 5–15%) to cushion stock-market falls.",
    check: ["Expense ratio and tracking against the gold price", "Trading volume (for ETFs)", "How much of your total portfolio it would be"],
  },
  {
    slug: "bonds",
    kinds: ["Bond"],
    label: "Bonds & debt funds",
    one: "debt fund",
    tagline: "Steadier returns from lending money.",
    what: "Debt funds lend money to governments, banks and companies by buying their bonds, and collect interest. Their prices move far less than stocks.",
    earn: "Interest collected on the bonds, plus price gains when interest rates fall.",
    risks: [
      "Interest-rate risk: when rates rise, bond prices fall, more for longer-maturity bonds.",
      "Credit risk: a borrower can delay or default on payments.",
      "Returns usually only modestly beat inflation.",
    ],
    costs: "An annual expense ratio; some funds charge an exit load for early withdrawals.",
    suits: "Money needed in one to three years, emergency funds, and the stable part of a portfolio.",
    check: ["Credit quality of the holdings (AAA and government is safest)", "Average maturity: shorter means less rate risk", "Yield to maturity, a rough guide to future returns", "Expense ratio and exit load"],
  },
];

export const guideFor = (slug: string) => guides.find((g) => g.slug === slug);
