<!-- RapidAPI listing copy, 2026-11-28. Three blocks, split by the marker lines. Numbers were read from the live API on 2026-11-28. -->
@@NAME
SeoulMarkets: Korea, Japan, Taiwan and UAE Company Filings Data
@@SHORT
Financials, valuation, 5% ownership filings and convertible bonds for 7,600+ listed companies in Korea, Japan, Taiwan and the UAE. Taken from regulator filings, returned in English JSON. Free tier, no card.
@@LONG
## Asian company filings, in English, in one schema

Four markets. 7,600+ listed companies. Every number comes from a filing the company made to its own regulator or exchange, and every response tells you which one.

| Market | Companies | What you get | Source |
|---|---|---|---|
| Korea | 2,709 | Annual financial statements (13,545 company-years), PER / PBR / ROE / debt-to-equity | DART (Financial Supervisory Service) |
| Japan | 3,709 | Latest annual accounts | EDINET (Financial Services Agency) |
| Taiwan | 1,098 | Latest quarterly accounts | TWSE OpenAPI |
| UAE | 94 | Revenue, net profit, EPS | ADX and DFM filings |

### Data you will not find in English elsewhere

- **Korea ownership filings**: 21,785 substantial-shareholding (5%+) filings, plus officer and major-shareholder trades. See who is building or cutting a stake.
- **Korea mezzanine book**: 5,084 convertible bond, bond-with-warrant and exchangeable bond filings, with conversion terms. Dilution risk before it reaches the share count.
- **Korea workforce panel**: headcount, tenure and pay by gender for 2,924 listed companies.
- **Korea trade**: exports, imports and balance by partner country and month, with an HS code dictionary in English.
- **Account dictionary**: Korean financial-statement account names mapped to standard English, so you can read a raw DART statement.

### Try it in one call

```
GET /valuation?limit=5
GET /japan-financials?limit=5
GET /ownership?limit=5
GET /mezzanine?limit=5
```

The BASIC plan is free: 500 calls a month, no card required. Start there and upgrade only if it is useful.

### Built for people who check

- Every response carries `source`, `built_at` and coverage counts.
- A value we could not measure is `null`, never zero and never an estimate. Coverage tells you how many companies have each field (for example PER is available for 1,578 of 2,709 Korean companies, because loss-making companies have none).
- Company names use each company's own English spelling (SK hynix, NCSOFT, AMOREPACIFIC), not a transliteration.
- Field names are a contract. Within v1 we add fields; we do not rename or remove them.
- The same MCP server is listed on the official MCP Registry as `com.seoulmarkets/market-data`, for AI agents.

### Honest limits

- Japan and Taiwan return the latest filed period only, not a multi-year history yet.
- UAE covers ADX-listed companies with an income statement; ETFs are excluded.
- Figures are as filed. We do not restate or adjust them.
- This is reference data from public filings, not investment advice.

### Plans

| Plan | Price | Calls per month |
|---|---|---|
| BASIC | $0 | 500 |
| PRO | $29 | 20,000 |
| ULTRA | $99 | 150,000 |
| MEGA | $399 | 1,000,000 |

All plans are hard-limited. You are never billed for overage.

Questions are answered in writing within one business day. Use the Discussions tab.
@@README
# SeoulMarkets Data API

Company filings from Korea, Japan, Taiwan and the UAE, in English JSON.

## Quick start

1. Subscribe to BASIC (free, 500 calls a month).
2. Call `GET /meta` to see what is covered and when each dataset was built.
3. Call a dataset with `?limit=5` to see its shape.

## Endpoints

| Endpoint | Returns |
|---|---|
| `/financials` | Korea: annual statements as filed to DART (2,709 companies, 13,545 company-years) |
| `/valuation` | Korea: PER, PBR, ROE, debt-to-equity for 2,709 companies |
| `/japan-financials` | Japan: latest annual accounts of 3,709 Tokyo-listed companies (EDINET) |
| `/taiwan-financials` | Taiwan: latest quarterly accounts of 1,098 TWSE-listed companies |
| `/uae-financials` | UAE: revenue, net profit and EPS for ADX and DFM filers |
| `/ownership` | Korea: 21,785 substantial-shareholding (5%+) filings and insider filings |
| `/mezzanine` | Korea: 5,084 convertible bond, warrant bond and exchangeable bond filings |
| `/people` | Korea: headcount, tenure and pay by gender, 2,924 companies |
| `/trade/exports` | Korea: exports, imports and balance by partner country and month |
| `/hs`, `/hs/{code}`, `/countries` | Trade classification dictionaries in English |
| `/account-dictionary` | Korean account names mapped to standard English |
| `/meta` | Coverage, schema policy and build dates |

## Reading a response

Every dataset response has three parts:

- `count` and `returned_of`: how many rows you received and how many exist.
- `coverage`: the source, the build time and, for each field, how many companies have a value.
- `data`: the rows.

A missing value is `null`. It is never filled with zero or an estimate.

## Paging

Use `limit` and `offset`. Paid plans return up to 1,000 rows per call.

## Three things people build with this

- **Cross-market screens**: the same fields for Korea, Japan and Taiwan, so one query logic covers three markets.
- **Stake-change alerts**: poll `/ownership` daily and flag new 5% filings in companies you follow.
- **Dilution checks**: join `/mezzanine` to `/valuation` to see outstanding convertibles against market value.

## Sources and licences

Korea: DART (Financial Supervisory Service) and the Korea Public Data Portal. Japan: EDINET, Public Data License 1.0. Taiwan: TWSE OpenAPI, Open Government Data License 1.0. UAE: ADX and DFM company filings. Each response repeats its own source.

## Support

Post in Discussions. We reply in writing within one business day.
