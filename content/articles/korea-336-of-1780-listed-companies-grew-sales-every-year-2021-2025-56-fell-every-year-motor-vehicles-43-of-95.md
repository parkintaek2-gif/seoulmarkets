---
title: "336 of 1,780 Korean Listed Companies Grew Sales Four Years Running to 2025; 56 Fell Every Year"
dek: "Across 2021 to 2025, only 18.9% of companies raised revenue in all four yearly steps, and 3.1% lowered it in all four. Carmakers did it most often, 43 of 95; primary metals least, 2 of 60. Not advice."
category: equities
pubDate: 2026-11-27
dataAsOf: 2026-09-16T00:00:00+09:00
author: Newsroom
tags: ["korea revenue streak", "korean listed companies sales growth five years", "korea consecutive revenue growth", "kospi kosdaq revenue 2021 2025", "korea motor vehicles revenue", "dart annual reports"]
tickers: []
sources:
  - org: "Financial Supervisory Service (Korea, Open DART)"
    api: "Annual financial statements (report code 11011), fiscal years 2021 to 2025: revenue, same reporting basis in all five years"
    url: "https://opendart.fss.or.kr"
  - org: "SeoulMarkets"
    api: "Korea Financials Tape, one row per company per fiscal year; industry names from the Korea Valuation Tape"
    url: "https://seoulmarkets.com/v1/financials"
crossChecks:
  - "Companies with a measured annual report in all five fiscal years 2021 to 2025: 2,049. Left out: 244 whose reporting basis (consolidated or separate) changed at least once, 25 with revenue missing or not above zero in at least one year. 2,049 - 244 - 25 = 1,780."
  - "Count of the four yearly steps (2021 to 2022, 2022 to 2023, 2023 to 2024, 2024 to 2025) in which revenue rose, companies: 0 rises 56; 1 rise 283; 2 rises 573; 3 rises 532; 4 rises 336. 56 + 283 + 573 + 532 + 336 = 1,780. A step with equal revenue would not count as a rise; the 56 companies with no rise also all fell in every step, so none had one."
  - "Share of the 1,780 companies, same order: 3.1%, 15.9%, 32.2%, 29.9%, 18.9%. Share of their combined fiscal-2025 revenue: 0.9%, 7.7%, 21.0%, 33.0%, 37.3%."
  - "Revenue in 2025 divided by revenue in 2021: median 1.18 across all 1,780; median 1.65 across the 336 that rose four times; 90 of the 336 at 2.0 or above."
  - "By market, companies and those that rose in all four steps: KOSDAQ 1,143 and 187 (16.4%); KOSPI 633 and 148 (23.4%); KONEX 4 and 1. Fell in all four steps: KOSDAQ 40, KOSPI 16."
  - "Industries with at least 30 companies, share that rose four times: Motor Vehicles and Trailers 43 of 95 (45.3%); Medicinal Substances and Pharmaceuticals 43 of 126 (34.1%); Food Products Manufacturing 20 of 59 (33.9%); Wholesale Trade 12 of 99 (12.1%); Electronic Components, Computers, and Communication Equipment 16 of 213 (7.5%); Primary Metals 2 of 60 (3.3%); Non-Metallic Mineral Products 2 of 30 (6.7%); General Construction 0 of 30."
excluded:
  - "Why revenue moved. Mergers, disposals, new listings that restated history, and currency effects all change revenue and the tape cannot separate them."
  - "The 244 companies that changed reporting basis and the 25 with no usable revenue line. They are left out, not counted as zero."
  - "Companies not on file for all five years: 660 of the 2,709 tape companies are not in the 2,049 because at least one year has no measured report. We did not check why."
  - "Revenue is the revenue line the filing carries. For some filers it may not be total sales; we did not test each one."
  - "Any forecast and any view on whether to buy or sell any share."
draft: false
---

One year of revenue growth is easy to find. A run is rarer. We took the 1,780 Korean listed companies that filed annual reports for each of 2021 to 2025 on the same reporting basis and counted, for each, how many of the four yearly steps ended higher.

## The count

| Years in which revenue rose (of 4) | Companies | Share of companies | Share of combined 2025 revenue |
|---|---:|---:|---:|
| 0 | 56 | 3.1% | 0.9% |
| 1 | 283 | 15.9% | 7.7% |
| 2 | 573 | 32.2% | 21.0% |
| 3 | 532 | 29.9% | 33.0% |
| 4 | 336 | 18.9% | 37.3% |

The most common result was two rises in four years, not four. 336 companies rose in every step, and they are about one in five by count but 37.3% of combined revenue, so the steady growers are disproportionately large. At the other end, 56 companies lowered revenue in every step, and together they are under 1% of combined revenue.

For the 336 that rose four times, the median company ended 2025 with 1.65 times its 2021 revenue, and 90 of them at least doubled. Across all 1,780 the median was 1.18 times. Among the largest of the 336, Hyundai Motor ended at 1.58 times, Kia 1.63, Korea Electric Power 1.61, HD Hyundai 2.53 and LS Corp 2.43. The very largest multiples are small companies, with Keeps Biopharma at 39.9 times and KoBioLabs at 23.9.

## Which board, which industry

On KOSPI 148 of 633 companies (23.4%) rose in all four steps. On KOSDAQ it was 187 of 1,143 (16.4%). KOSDAQ also had more companies falling every year: 40 against 16.

By industry, among those with at least 30 companies:

| Industry | Companies | Rose four times | Share |
|---|---:|---:|---:|
| Motor Vehicles and Trailers | 95 | 43 | 45.3% |
| Medicinal Substances and Pharmaceuticals | 126 | 43 | 34.1% |
| Food Products Manufacturing | 59 | 20 | 33.9% |
| Wholesale Trade | 99 | 12 | 12.1% |
| Electronic Components, Computers and Communication Equipment | 213 | 16 | 7.5% |
| Primary Metals | 60 | 2 | 3.3% |
| General Construction | 30 | 0 | 0.0% |

The electronics group is a useful reminder of what a streak does not measure. It is the largest industry in the sample, and only 16 of its 213 companies rose in every step. A cycle that goes up, down and up again is not a streak, even if the five-year total is higher.

## Limits

Revenue is the line the filing carries, and for some companies it may not be total sales. A merger or disposal changes it. We left out 244 companies that switched between consolidated and separate accounts, and 25 with no usable revenue figure, and 660 tape companies have no measured report in at least one of the five years, so they are not in this count at all.

Every row can be pulled again from the same tape: `https://seoulmarkets.com/v1/financials` returns all five years, and `https://seoulmarkets.com/v1/financials?ticker=005380` returns one company.
