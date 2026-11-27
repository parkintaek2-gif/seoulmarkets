---
title: "222 of 1,098 Taiwan-Listed Companies Have No P/E Ratio; the Median of the Other 876 Is 15.0"
dek: "On the 26 November close, 20.2% of Taiwan Stock Exchange companies carry no price-to-earnings figure, including 24 of 62 biotechnology firms. The 20-30 times band holds 15.5% of companies and 54.1% of market value. Not advice."
category: equities
pubDate: 2026-11-27
dataAsOf: 2026-11-26T00:00:00+09:00
author: Newsroom
tags: ["taiwan price to earnings", "twse pe ratio distribution", "taiwan stocks no pe ratio", "taiwan biotech loss makers", "tsmc pe ratio", "taiwan valuation november 2026"]
tickers: []
sources:
  - org: "Taiwan Stock Exchange (TWSE)"
    api: "TWSE OpenAPI: per-company daily valuation (price-to-earnings), income statements and daily closing prices, assembled in the SeoulMarkets Taiwan financials tape built 27 November 2026 (closing prices dated 26 November 2026)"
    url: "https://openapi.twse.com.tw"
  - org: "SeoulMarkets"
    api: "Taiwan financials tape, one row per company, most recent quarter (third quarter 2026) with the 26 November close"
    url: "https://seoulmarkets.com/v1/taiwan-financials"
crossChecks:
  - "The tape holds 1,098 Taiwan Stock Exchange companies. 876 carry a price-to-earnings ratio and 222 do not. 876 + 222 = 1,098."
  - "Of the 222 without a ratio: 189 reported a net loss or zero for the first nine months of 2026; 23 reported a positive nine-month net profit; 10 have no net profit figure in the tape. 189 + 23 + 10 = 222."
  - "Ratio bands among the 876 (lower bound included), companies, share of the 876, share of the combined market value of all 1,097 companies with a value: under 10, 182, 20.8%, 5.7%; 10 to under 15, 256, 29.2%, 15.7%; 15 to under 20, 147, 16.8%, 7.3%; 20 to under 30, 136, 15.5%, 54.1%; 30 to under 50, 70, 8.0%, 7.9%; 50 and above, 85, 9.7%, 8.0%. 182 + 256 + 147 + 136 + 70 + 85 = 876. The 222 companies without a ratio hold the remaining 1.3% of market value."
  - "Median ratio across the 876: 14.97. TSMC is at 21.83 and is 43.3% of combined market value, so it sits in the 20 to under 30 band."
  - "Highest ratios: HUA YU LIEN 3,155; Young Optics 1,103.75; ShunSin 1,005; GEMTEK 983.33; DrayTek 877.5."
  - "Industries with at least 25 companies, companies without a ratio and median ratio of the rest: Biotechnology and healthcare 24 of 62, median 14.6; Optoelectronics 21 of 68, 21.0; Automobiles 13 of 44, 12.8; Textiles 12 of 42, 15.5; Communications and networking 13 of 47, 21.2; Semiconductors 15 of 96, 20.1; Building materials and construction 7 of 55, 9.4; Shipping and transport 3 of 28, 9.3; Finance and insurance 0 of 26, 12.1."
  - "35 companies carry a ratio although their nine-month net profit is a loss."
excluded:
  - "How the exchange computes its ratio. The feed does not state whether it uses the latest four quarters or the latest annual earnings. We did not recompute it. That is why 35 companies show a ratio with a nine-month loss."
  - "Taiwan profit figures in the tape are cumulative from the start of the year (the third quarter is nine months), not single-quarter values."
  - "15 companies have no industry name in the feed. They are in the market-wide counts but not in the industry table."
  - "The Taipei Exchange (TPEx). This is the main-board exchange only."
  - "Any reading of a high or low ratio as dear or cheap, and any view on whether to buy or sell any share."
draft: false
---

A price-to-earnings ratio only exists where earnings are positive, and a count of ratios quietly leaves out the companies that lost money. On the 26 November 2026 close, 876 of the 1,098 Taiwan Stock Exchange companies in our tape carry a ratio, and 222 (20.2%) do not.

## Who has no ratio

189 of the 222 reported a net loss or zero for the first nine months of 2026. 23 reported a positive nine-month profit and still have no ratio in the feed, and 10 have no net profit figure in the tape. The ratio is the exchange's own and we did not recompute it. That also explains an oddity: 35 companies carry a ratio although their nine-month result is a loss, so the exchange's earnings base is not the nine-month figure.

By industry, among those with at least 25 companies, the share without a ratio ran from none to nearly two in five:

| Industry | Companies | No ratio | Median of the rest |
|---|---:|---:|---:|
| Biotechnology and healthcare | 62 | 24 (38.7%) | 14.6 |
| Optoelectronics | 68 | 21 (30.9%) | 21.0 |
| Automobiles | 44 | 13 (29.5%) | 12.8 |
| Textiles | 42 | 12 (28.6%) | 15.5 |
| Communications and networking | 47 | 13 (27.7%) | 21.2 |
| Semiconductors | 96 | 15 (15.6%) | 20.1 |
| Shipping and transport | 28 | 3 (10.7%) | 9.3 |
| Finance and insurance | 26 | 0 | 12.1 |

## The spread of the 876

| Price-to-earnings | Companies | Share of the 876 | Share of market value |
|---|---:|---:|---:|
| Under 10 | 182 | 20.8% | 5.7% |
| 10 to under 15 | 256 | 29.2% | 15.7% |
| 15 to under 20 | 147 | 16.8% | 7.3% |
| 20 to under 30 | 136 | 15.5% | 54.1% |
| 30 to under 50 | 70 | 8.0% | 7.9% |
| 50 and above | 85 | 9.7% | 8.0% |

The median is 15.0, and 403 of the 876 (46.0%) sit between 10 and 20. The band from 20 to 30 times is the odd one: only 15.5% of companies, but 54.1% of combined market value. TSMC, at 21.8 times, is 43.3% of combined value on its own and sits in that band. Without it, the other companies in the band hold 10.8% of the value.

The long tail is long. 85 companies are at 50 times or more, and the highest, HUA YU LIEN, is at 3,155 times; Young Optics, ShunSin and GEMTEK are all above 980. A ratio that high usually means very small earnings against the price; we do not read it further.

## Limits

The count is by company, not by size. The 222 companies without a ratio hold only 1.3% of market value, so for an index-style reading the missing ratios matter little; for a company-by-company reading they are one in five. Fifteen companies have no industry name and are not in the table. Profit figures are cumulative from the start of the year, and the exchange's ratio basis is not stated.

Every figure can be pulled again from the same tape: `https://seoulmarkets.com/v1/taiwan-financials` returns the ratio, close and market value for each company, and `https://seoulmarkets.com/v1/taiwan-financials?industry=Textiles` returns one industry.
