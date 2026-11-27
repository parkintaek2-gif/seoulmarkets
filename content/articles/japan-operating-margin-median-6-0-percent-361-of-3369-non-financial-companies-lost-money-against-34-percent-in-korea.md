---
title: "Japan's Median Non-Financial Listed Company Kept 6.0% of Sales as Operating Profit; 361 of 3,369 Made a Loss"
dek: "That is 10.7% of Japanese companies at the operating line, against 34.1% in Korea's earlier count. Real estate had the highest median at 9.8%, pharmaceuticals the highest loss share at 38.3%. Not advice."
category: equities
pubDate: 2026-11-27
dataAsOf: 2026-11-27T10:53:00+09:00
author: Newsroom
tags: ["japan operating margin", "japanese listed companies profitability", "japan versus korea operating loss", "japan pharmaceutical operating loss", "edinet annual reports", "tse listed companies margin distribution"]
tickers: []
sources:
  - org: "Financial Services Agency (Japan), EDINET"
    api: "Annual securities reports, most recent filing per company: revenue and operating profit, consolidated where available"
    url: "https://disclosure.edinet-fsa.go.jp"
  - org: "SeoulMarkets"
    api: "Japan Financials Tape, one row per company, built 27 November 2026; Korean figures are from our earlier operating-margin count for fiscal 2025"
    url: "https://seoulmarkets.com/v1/japan-financials"
crossChecks:
  - "The Japan tape holds 3,708 companies. 172 are in the four financial groups (banks, securities and commodity futures, insurance, other financing) and are set aside; 3,536 remain."
  - "Of the 3,536, 3,369 have revenue above zero and an operating profit figure; 167 do not and are left out, not set to zero. 3,369 + 167 = 3,536."
  - "Operating margin = operating profit divided by revenue. Bands (lower bound included) and companies: loss 361 (10.7%); 0 to under 5% 1,070 (31.8%); 5 to under 10% 1,018 (30.2%); 10 to under 20% 639 (19.0%); 20% or more 281 (8.3%). 361 + 1,070 + 1,018 + 639 + 281 = 3,369."
  - "Share of the combined revenue of the 3,369, same order: 3.7%, 41.2%, 35.6%, 13.5%, 5.9%."
  - "Median margin 5.96%; 25th percentile 2.71%; 75th 10.69% (positions in the sorted list). Operating profit divided by revenue for the whole group: 7.38%."
  - "Companies with revenue of 1 trillion yen or more: 100, of which 3 made an operating loss."
  - "Industries with at least 40 companies, median margin and loss count: Real Estate 9.8% (117 companies, 5 losses); Precision Instruments 9.2% (49, 6); Machinery 8.2% (207, 20); Information and Communication 7.9% (566, 91); Services 7.3% (512, 57); Retail Trade 3.6% (310, 34); Wholesale Trade 3.2% (287, 17); Pharmaceutical 3.2% (60, 23)."
  - "Korea, from our earlier count of 2,349 non-financial companies with revenue (fiscal 2025): loss 34.1%; 0 to under 5% 30.3%; 5 to under 10% 17.6%; 10 to under 20% 12.7%; 20% or more 5.4%; median 2.72%."
excluded:
  - "Two rows show operating profit above revenue (Sony Group Corporation and EJ Holdings). The revenue line in those filings is probably not total sales. We did not check, and we did not remove them; they sit in the 20%-or-more band."
  - "Parent-only rows. The tape holds 780 Japanese companies on a parent-only basis; their margins are not group margins. We did not separate or adjust them."
  - "Filing dates differ. Most Japanese rows are for the year ended 31 March 2026; the Korean figures are fiscal 2025."
  - "Why any company lost money. One-off charges, start-up costs and accounting choices all show here as the same minus sign."
  - "Any forecast and any view on whether to buy or sell any share."
draft: false
---

Of 3,536 Japanese listed companies outside banking, securities, insurance and consumer finance, 3,369 reported both revenue and an operating profit figure on their latest annual filing. 361 of them, 10.7%, made an operating loss. In our earlier count of Korean non-financial companies for fiscal 2025, the share was 34.1%.

## The spread

| Operating margin | Companies | Share of companies | Share of combined revenue |
|---|---:|---:|---:|
| Loss | 361 | 10.7% | 3.7% |
| 0 to under 5% | 1,070 | 31.8% | 41.2% |
| 5 to under 10% | 1,018 | 30.2% | 35.6% |
| 10 to under 20% | 639 | 19.0% | 13.5% |
| 20% or more | 281 | 8.3% | 5.9% |

The median margin was 6.0%. The middle half of companies ran from 2.7% to 10.7%. The largest block of revenue, 41.2%, sits in the 0 to 5% band. For the whole group, operating profit was 7.4% of revenue.

Size did not protect against losses by much. Of the 100 companies with revenue of 1 trillion yen or more, 3 made an operating loss.

## Against Korea

| Margin | Japan (3,369) | Korea (2,349) |
|---|---:|---:|
| Loss | 10.7% | 34.1% |
| 0 to under 5% | 31.8% | 30.3% |
| 5 to under 10% | 30.2% | 17.6% |
| 10 to under 20% | 19.0% | 12.7% |
| 20% or more | 8.3% | 5.4% |
| Median | 6.0% | 2.7% |

The gap is almost all in the loss row. The 0 to 5% share is nearly the same in both countries, so the Japanese advantage is not that more companies earn fat margins; it is that fewer sit below zero. Korea's count has 1,626 KOSDAQ companies among its 2,349, and the Japanese tape does not say which market segment each company trades on, so the two are not a like-for-like test of the two economies.

## Industries

Among industries with at least 40 companies, real estate had the highest median at 9.8% and only 5 losses among 117 companies. Precision instruments followed at 9.2%, machinery at 8.2%, information and communication at 7.9% and services at 7.3%. The lowest medians were 3.2% in wholesale trade and in pharmaceuticals, but the two differ sharply in risk: 17 of 287 wholesalers lost money, against 23 of 60 pharmaceutical companies, or 38.3%. Information and communication, the largest group with 566 companies, had 91 losses (16.1%) and 86 firms at 20% or more.

## What to keep in mind

167 non-financial companies have no usable revenue or operating profit figure and are left out, not set to zero. Two rows have operating profit above revenue, probably because the revenue line is not total sales; they are in the data and we did not touch them. The 780 parent-only rows are not group results. Most Japanese rows are for the year to March 2026 and the Korean ones are fiscal 2025.

Every figure can be pulled again: `https://seoulmarkets.com/v1/japan-financials` returns revenue and operating profit for each company, and `https://seoulmarkets.com/v1/japan-financials?code=4502` returns one.
