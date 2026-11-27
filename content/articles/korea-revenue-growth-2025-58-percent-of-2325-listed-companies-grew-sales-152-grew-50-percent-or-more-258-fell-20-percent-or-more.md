---
title: "58% of 2,325 Korean Listed Companies Grew Sales in 2025; 152 Grew 50% or More, 258 Fell 20% or More"
dek: "The median company's revenue rose 2.7%, but the spread was wide: 258 fell by a fifth or more while 152 grew by half or more. Metal and electrical-equipment makers fell most often; construction had a median fall of 10.2%. Not advice."
category: equities
pubDate: 2026-11-27
dataAsOf: 2026-09-16T00:00:00+09:00
author: Newsroom
tags: ["korea revenue growth 2025", "korean listed companies sales growth", "kospi kosdaq revenue change", "korea sales decline by industry", "dart annual reports", "korea construction revenue"]
tickers: []
sources:
  - org: "Financial Supervisory Service (Korea, Open DART)"
    api: "Annual financial statements (report code 11011), fiscal years 2024 and 2025: revenue, same reporting basis in both years"
    url: "https://opendart.fss.or.kr"
  - org: "SeoulMarkets"
    api: "Korea Financials Tape, one row per company per fiscal year"
    url: "https://seoulmarkets.com/v1/financials"
crossChecks:
  - "Companies with a measured fiscal-2025 annual report: 2,577. Left out: 66 with no fiscal-2024 report on file, 93 whose reporting basis changed between the two years (consolidated in one, separate in the other), 93 with revenue missing or not above zero in one of the years. 2,577 - 66 - 93 - 93 = 2,325."
  - "Change in revenue, 2025 over 2024, bands (lower bound included) and companies: fell 20% or more 258; fell 5% to under 20% 450; within 5% either way 594; rose 5% to under 20% 582; rose 20% to under 50% 289; rose 50% or more 152. 258 + 450 + 594 + 582 + 289 + 152 = 2,325."
  - "Share of the combined 2025 revenue of the 2,325 held by each band, same order: 1.6%, 11.4%, 29.3%, 42.6%, 11.9%, 3.2%."
  - "Rose 1,350, fell 975, unchanged 0. Median change +2.72%. The 2,325 companies' combined revenue grew 7.0%, on the same pairs."
  - "By market: KOSPI 752 companies, median +2.5%, 38 fell 20% or more, 26 grew 50% or more; KOSDAQ 1,563 companies, median +2.9%, 217 fell 20% or more, 125 grew 50% or more; KONEX 10 not discussed."
  - "Industries with at least 40 companies, share that fell: Fabricated Metal Products 26 of 43; Primary Metals 42 of 81; Electrical Equipment 41 of 81; Rubber and Plastic Products 25 of 50; Motor Vehicles and Trailers 24 of 102; Medicinal Substances and Pharmaceuticals 53 of 170."
  - "General Construction, 37 companies: 26 fell, median -10.2%. Research and Development, 49 companies: 17 fell, median +13.6%."
excluded:
  - "Why any company's revenue moved. Mergers, spin-offs, disposals, currency effects and one-off contracts all change revenue and the tape cannot separate them."
  - "The 93 companies with no usable revenue line. Many are financial companies, which report income differently. They are left out, not set to zero."
  - "Revenue is the revenue line the filing carries. For some companies it may not be total sales; we did not test each one."
  - "Any forecast for 2026, and any view on whether to buy or sell any share."
draft: false
---

Of the 2,577 Korean listed companies with a fiscal-2025 annual report on file, 2,325 can be compared with their own 2024 report on the same basis. Of those, 1,350 (58.1%) reported higher revenue and 975 (41.9%) reported lower. None was unchanged.

The middle looks calm. The median company's revenue rose 2.7%. The two ends are not calm at all.

## How the 2,325 spread

| Revenue, 2025 against 2024 | Companies | Share of companies | Share of combined revenue |
|---|---:|---:|---:|
| Fell 20% or more | 258 | 11.1% | 1.6% |
| Fell 5% to under 20% | 450 | 19.4% | 11.4% |
| Within 5% either way | 594 | 25.5% | 29.3% |
| Rose 5% to under 20% | 582 | 25.0% | 42.6% |
| Rose 20% to under 50% | 289 | 12.4% | 11.9% |
| Rose 50% or more | 152 | 6.5% | 3.2% |

One company in nine lost a fifth of its sales or more, and one in sixteen grew by half or more. Those two groups together are 410 companies, about 18% of the list, but only 4.8% of combined revenue. The 1,176 companies between a 5% fall and a 20% rise hold 71.9% of it. The combined revenue of the 2,325 grew 7.0%, and that figure is pulled by a few very large filers. SK hynix grew 46.8%, Samsung Electronics 10.9%, Hyundai Motor 6.3%.

## KOSPI and KOSDAQ

The medians are close: +2.5% for the 752 KOSPI companies and +2.9% for the 1,563 KOSDAQ companies. The tails are not. On KOSDAQ, 217 companies (13.9%) fell 20% or more and 125 (8.0%) grew 50% or more. On KOSPI the matching counts are 38 (5.1%) and 26 (3.5%). The smaller board moves more in both directions.

## Where falls clustered

Among industries with at least 40 companies, the share with lower revenue was highest in metal and electrical makers:

| Industry | Companies | Fell | Share that fell |
|---|---:|---:|---:|
| Fabricated Metal Products | 43 | 26 | 60.5% |
| Primary Metals | 81 | 42 | 51.9% |
| Electrical Equipment | 81 | 41 | 50.6% |
| Rubber and Plastic Products | 50 | 25 | 50.0% |
| Medicinal Substances and Pharmaceuticals | 170 | 53 | 31.2% |
| Motor Vehicles and Trailers | 102 | 24 | 23.5% |

General Construction has 37 companies, under the 40 cut-off, but is worth reading: 26 fell and the median change was -10.2%, the lowest among industries with at least 25 companies. At the other end, the 49 companies classed as Research and Development had a median rise of 13.6%, and 17 of them still fell.

## What is not here

Revenue moves for reasons the tape does not carry: a merger, a disposal, a stronger or weaker won, one large contract. We did not test any of them. 66 companies have no 2024 report on file, 93 changed reporting basis between the years, and 93 have no usable revenue line, so those 252 are left out, not counted as zero. For some filers the revenue line may not be total sales.

Every row can be pulled again: `https://seoulmarkets.com/v1/financials` returns the full filed tape, and `https://seoulmarkets.com/v1/financials?ticker=005930` returns one company.
