---
title: "423 of 1,098 Taiwan-Listed Companies Listed Since 2010 Hold 9.6% of Market Value; TSMC Alone Is 43.3%"
dek: "The median Taiwan Stock Exchange company was founded in 1988 and took 15 years to list. By decade, the 1990s listings hold 55.6% of value on 18.7% of companies. 25 of 27 green-energy firms listed since 2010. Not advice."
category: equities
pubDate: 2026-11-27
dataAsOf: 2026-11-26T00:00:00+09:00
author: Newsroom
tags: ["taiwan listing dates", "taiwan stock exchange listed since 2010", "taiwan ipo decades", "tsmc market value share", "taiwan biotech listings", "twse company age"]
tickers: []
sources:
  - org: "Taiwan Stock Exchange (TWSE)"
    api: "TWSE OpenAPI: company basic information (listing date, founding date), shares issued and daily closing prices, assembled in the SeoulMarkets Taiwan financials tape built 27 November 2026 (closing prices dated 26 November 2026)"
    url: "https://openapi.twse.com.tw"
  - org: "SeoulMarkets"
    api: "Taiwan financials tape, one row per company"
    url: "https://seoulmarkets.com/v1/taiwan-financials"
crossChecks:
  - "The tape holds 1,098 Taiwan Stock Exchange companies; all 1,098 carry both a listing date and a founding date. Market value (closing price times shares issued) is available for 1,097; one company, in the 1990s group, has none and is left out of the value column, not set to zero."
  - "Listed by decade, companies, share of companies, share of combined market value: 1960s 21, 1.9%, 2.6%; 1970s 31, 2.8%, 0.9%; 1980s 57, 5.2%, 4.8%; 1990s 205, 18.7%, 55.6%; 2000s 361, 32.9%, 26.5%; 2010s 240, 21.9%, 6.8%; 2020s 183, 16.7%, 2.9%. 21 + 31 + 57 + 205 + 361 + 240 + 183 = 1,098."
  - "Listed in 2010 or later: 423 (38.5%), holding 9.6% of combined market value. Listed before 1990: 109 (9.9%), holding 8.3%."
  - "TSMC listed on 5 September 1994 and is 43.3% of the combined market value of the 1,097 companies with a value on the 26 November close. TSMC was founded on 21 February 1987."
  - "Founding year: median 1988; 168 founded before 1970; 302 founded in 2000 or later. Years from founding year to listing year: median 15; 155 companies within 5 years; 143 at 30 years or more; none negative."
  - "Earliest listing date, 9 February 1962: TCC, Wei Chuan, Tatung and TTC. Latest in the tape: TLW (30 October 2026), ASRockInd (27 October), TAHO Pharma (20 October), SHIN HSIUNG (16 October). 65 companies in the tape listed in 2025 or 2026."
  - "Industries with at least 25 companies, share listed in 2010 or later: Green energy and environmental services 25 of 27; Biotechnology and healthcare 52 of 62; Automobiles 29 of 44; Semiconductors 48 of 96; Textiles 5 of 42; Iron and steel 4 of 31; Finance and insurance 4 of 26."
excluded:
  - "What the listing date means in each case. We read the date the exchange's basic-information feed gives. A company that moved to the main board from another market may show a different date from its first public trading; the feed does not say."
  - "The Taipei Exchange (TPEx). This is the main-board exchange only; companies listed on TPEx are not in these counts."
  - "Delisted companies. Only today's listed companies are in the tape, so decades of listing describe survivors."
  - "Any link between company age and returns, and any view on whether to buy or sell any share."
draft: false
---

The 1,098 companies in our Taiwan Stock Exchange tape carry two dates in the exchange's company file: when they were founded and when they listed. Counting them by decade shows a market that is young by count and old by value.

## By decade of listing

| Listed in | Companies | Share of companies | Share of market value |
|---|---:|---:|---:|
| 1960s | 21 | 1.9% | 2.6% |
| 1970s | 31 | 2.8% | 0.9% |
| 1980s | 57 | 5.2% | 4.8% |
| 1990s | 205 | 18.7% | 55.6% |
| 2000s | 361 | 32.9% | 26.5% |
| 2010s | 240 | 21.9% | 6.8% |
| 2020s | 183 | 16.7% | 2.9% |

The 423 companies listed since 2010 are 38.5% of the list and 9.6% of combined market value. The 109 listed before 1990 are 9.9% of the list and 8.3% of value. The 1990s decade stands out: 205 companies, but 55.6% of the value. TSMC listed on 5 September 1994 and, on the 26 November close, is 43.3% of the combined value by itself, which leaves 12.3% for the rest of its decade.

One company has no market value in the feed and is out of the right-hand column, not counted as zero.

## Old firms, long waits

The median company was founded in 1988. 168 were founded before 1970 and 302 in 2000 or later. From founding to listing the median wait was 15 years: 155 companies listed within 5 years and 143 waited 30 years or more. The earliest listings are four companies on 9 February 1962: TCC, Wei Chuan, Tatung and TTC. The most recent in the tape are TLW (30 October 2026), ASRockInd (27 October), TAHO Pharma (20 October) and SHIN HSIUNG (16 October). 65 companies listed in 2025 or 2026.

## Which industries are new

The industry split is wide. Among industries with at least 25 companies, the share listed since 2010 was:

| Industry | Companies | Listed 2010 or later | Share |
|---|---:|---:|---:|
| Green energy and environmental services | 27 | 25 | 92.6% |
| Biotechnology and healthcare | 62 | 52 | 83.9% |
| Automobiles | 44 | 29 | 65.9% |
| Semiconductors | 96 | 48 | 50.0% |
| Textiles | 42 | 5 | 11.9% |
| Iron and steel | 31 | 4 | 12.9% |
| Finance and insurance | 26 | 4 | 15.4% |

Green energy and biotechnology are almost entirely post-2010 lists. Textiles, steel and finance are almost entirely older. Semiconductors split evenly, 48 of 96.

## Limits

These are today's listed companies, so every decade describes survivors. We read the listing date the exchange feed gives and cannot tell, for a company that moved boards, whether it is the first trading date. The count covers the main-board exchange only. The Taipei Exchange is not in it.

Every figure can be pulled again from the same tape: `https://seoulmarkets.com/v1/taiwan-financials` returns each company's listing date, founding date and market value, and `https://seoulmarkets.com/v1/taiwan-financials?code=2330` returns one.
