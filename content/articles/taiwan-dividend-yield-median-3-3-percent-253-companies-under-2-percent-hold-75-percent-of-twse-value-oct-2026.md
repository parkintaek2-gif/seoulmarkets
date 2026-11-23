---
title: "Taiwan Exchange Dividend Yields: Median 3.3%, but the 253 Companies Under 2% Hold 75% of Market Value (8 October 2026)"
dek: "Of 836 Taiwan Stock Exchange companies with a published dividend yield, the median is 3.33%. The 253 yielding under 2% hold 75.2% of the exchange's market value; the 340 at 4% or more hold 6.8%. Prices are of 8 October. Not advice."
category: equities
pubDate: 2026-11-23
dataAsOf: 2026-10-08T13:30:00+08:00
author: Newsroom
tags: ["taiwan stock exchange", "twse", "taiwan dividend yield", "taiwan stocks 2026", "taiwan high dividend", "tsmc dividend yield", "taiwan listed companies", "taiwan concentration"]
sources:
  - org: "Taiwan Stock Exchange (TWSE) OpenAPI"
    api: "Daily valuation file (price-to-earnings, price-to-book and dividend yield per company) and closing price and share count, read for the 8 October 2026 trading day; plus second-quarter 2026 income statements (cumulative from January) and balance sheets, for 1,074 listed companies. Read on 11 October 2026. Published under the Taiwan Government Open Data License, version 1."
    url: "https://openapi.twse.com.tw"
  - org: "Government Open Data License, Taiwan, version 1.0"
    api: "Licence terms: commercial reuse allowed with attribution to the source."
    url: "https://data.gov.tw/license"
crossChecks:
  - "The five yield bands (under 2%, 2 to under 4%, 4 to under 6%, 6 to under 8%, 8% and above) hold 253, 243, 197, 102 and 41 companies. They add to 836, the number of companies with a yield value, so no company falls between bands."
  - "Market value is the 8 October closing price times shares in issue, from the same feed. Its total for the 1,069 companies that have one is NT$160.1 trillion, the same total as in our earlier piece on the exchange's concentration, where TSMC is 41.3%. The 834 companies that have both a yield and a market value hold 98.3% of it; the 235 companies with a market value but no yield hold the other 1.6%."
  - "The profit split matches the earlier piece: 841 companies with a net-profit line reported a profit for the first half and 220 reported a loss, and 13 filings have no net-profit line."
  - "Every figure here is this desk's arithmetic on one exchange feed. We did not compare the yields with company dividend announcements or with a second data vendor."
excluded:
  - "The 238 companies with no dividend-yield value in the feed. We do not know from the feed whether they paid no dividend, have not yet declared one, or simply have no figure, so we do not count them as zero-yield and we do not guess. The 235 of them with a market value are 1.6% of the total."
  - "Which year's dividend the yield rests on, and how the exchange computes it. The feed gives a percentage and no further definition, so we use it as published and make no claim about payout ratios."
  - "Companies traded on the Taipei Exchange (the over-the-counter board), which this feed does not cover."
  - "Any figure after 8 October 2026, and any yield after a later dividend announcement or price move."
  - "Foreign ownership, free float and index weights, which the feed does not carry. Weights here are full market value."
  - "Why any company's yield is high or low."
pages:
  - "/"
draft: false
---

Half of the Taiwan Stock Exchange's companies yield more than **3.33%**, on the dividend-yield figure the exchange publishes for each stock. But that is a count of companies. Weighted by what they are worth, almost the whole exchange sits at the low end. The **253** companies yielding under 2% account for **75.2%** of its market value, and the **340** yielding 4% or more account for only **6.8%**. Prices are the 8 October 2026 close.

## The yield bands, counted two ways

The exchange's daily valuation file carries a dividend yield for **836** of the 1,074 companies that filed second-quarter 2026 statements. The table puts each company in a band by its yield, then counts the companies and adds up their market value.

| Dividend yield | Companies | Share of companies with a yield | Share of exchange market value |
|---|---:|---:|---:|
| Under 2% | 253 | 30.3% | 75.2% |
| 2% to under 4% | 243 | 29.1% | 16.3% |
| 4% to under 6% | 197 | 23.6% | 4.6% |
| 6% to under 8% | 102 | 12.2% | 1.9% |
| 8% and above | 41 | 4.9% | 0.3% |
| No yield in the feed | 238 | not counted | 1.6% |

The market-value column is taken against the NT$160.1 trillion total for all 1,069 companies that have a market value, which is why the last row is there and why the five bands add to 98.3%, not 100%. One under-2% company and three of the 238 have no market value, so the company counts and the value shares are not on exactly the same footing.

The value-weighted yield of the 834 companies that have both figures is **1.54%**, less than half the median of 3.33%. The first quartile of yields is 1.64% and the third quartile is 5.28%; the 90th percentile is 6.89%; the lowest yield is 0.05% and the highest is 19.57%.

## The biggest companies yield the least

The ten largest companies by market value, all of which have a yield in the feed, are TSMC (0.86%), MediaTek (1.14%), Delta (0.59%), Hon Hai (2.88%), ASEH (0.88%), NPC (0.26%), EMC (0.42%), Fubon Financial (2.78%), Unimicron (0.16%) and UMC (1.77%). Weighted by market value, the ten together yield **0.96%**. Eight of the ten are below 2%. Only Hon Hai and Fubon Financial are above it.

Because TSMC alone is 41.3% of market value and yields 0.86%, one company decides much of the weighted figure. That is the reason the median and the weighted yield are so far apart: they answer different questions. The median describes a typical listed company. The weighted figure describes where the exchange's value sits.

## By industry

The feed groups companies into industries. Among the 19 groups with at least 20 yield values, the median yield runs from **5.88%** in building materials and construction (47 of 55 companies with a yield) to **1.46%** in semiconductors (78 of 96). Electronic components, with 82 yields among 104 companies, has a median of 1.81%, and optoelectronics, with 35 of 68, 2.10%. Finance and insurance, where all 21 companies have a yield, has a median of 3.58%.

The groups at the high end are mostly construction, food, automobiles, steel and a residual "other" group. The low end is electronics. This is a description of the table, not an explanation of it: the feed gives no dividend history.

## Profit, book value and yield

Yield is not the same thing as earnings, and the feed lets us put the two next to each other, with a caution on the profit side: net profit is cumulative for the first half, not a full year.

| Group | Companies with a yield | Median yield | At 4% or more |
|---|---:|---:|---:|
| Profit in the first half (841 firms) | 752 | 3.46% | 319 (42.4%) |
| Loss in the first half (220 firms) | 71 | 1.89% | 21 (29.6%) |
| Price below book value | 189 | 3.96% | 93 (49.2%) |
| Price at or above book value | 647 | 3.11% | 247 (38.2%) |

Of the 220 companies that reported a first-half net loss, 71 have a published yield, and 21 of those are at 4% or more. Among the 41 companies at 8% or more, **seven** reported a first-half loss: Taisun, Taroko, Kaulin, Delpha, HSC, G.V. and FWP. Kaulin's loss rounds to zero at NT$0.00 billion. The highest yields in the file are JEAN at 19.57%, Crowell at 16.13% and LD at 15.38%, each of which reported a first-half profit.

Companies trading below book value, 189 of those with a yield, have a higher median yield than those at or above it, 3.96% against 3.11%. The 13 filings with no net-profit line are in neither profit row, and all 13 have a yield.

## What a high yield here does and does not mean

A published yield is a dividend divided by a price. The feed does not say which dividend, so a high figure can come from a low price, a large payment, or a payment that has already been made and will not repeat. The data here cannot tell those apart, and this piece does not try to. Nor does it say that any band of yields is good or bad.

## What this does not say

These are counts and shares from one exchange feed on one price date. They do not cover the Taipei Exchange, free-float weights or foreign holdings, and they say nothing about what any dividend will be. A cumulative half-year profit is not a full-year profit, and a company below book value is not thereby cheap or dear. Nothing here is a reason to buy or sell any share. It is a statistic about a set of companies, not about any one investor.
