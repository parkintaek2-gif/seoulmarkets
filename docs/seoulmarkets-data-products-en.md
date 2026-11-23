# SeoulMarkets — data products

One-page description for listing on third-party distribution platforms
(data scouts, data marketplaces, cloud marketplaces, developer registries).

Measured 2026-11-23. Every figure below is a row count taken from the files themselves,
not an estimate. Where a field is not collected, we say so rather than filling it with zero.

---

## What we are

We build structured datasets from **public regulatory filings in Asia and the Gulf**
and publish them **in English**. Korea first, then Japan, Taiwan and the UAE.

The gap we fill: the primary sources are public but they are in Korean, Japanese,
Chinese and Arabic, with inconsistent identifiers and no cross-market schema.
We normalise them into one schema so a single query spans four markets.

---

## Datasets

| Dataset | Market | Source | Size (2026-11-23) | Update |
|---|---|---|---|---|
| Listed company master | Korea | KRX | 3,986 companies | Monthly |
| Officers and directors | Korea | DART | per-ticker tape, 1.1 MB | Quarterly |
| Ownership / governance snapshot | Korea | DART 5% and major-holder filings | 777 of 830 KOSPI companies | Quarterly |
| Analyst consensus tape | Korea | Broker reports | 2,438 reports · 747 analysts · 825 target-price changes | Daily |
| Company financials | Japan | EDINET | 3,706 companies | Quarterly |
| Material disclosures feed | Japan | TDnet / EDINET | 2,299 items · 1,635 companies · 19 categories | Daily |
| Company financials | Taiwan | TWSE | 1,065 companies | Quarterly |
| Company financials | UAE | ADX + DFM | 467 rows · ADX 94 + DFM 49 companies | Quarterly |
| Company facts | UAE | ADX + DFM | 111 companies | Quarterly |

Coverage in build: Shanghai, Hong Kong, India, Saudi Arabia.
Same schema, same licence — a new market is not a new contract.

---

## What makes it different

**1. We count things nobody else counts.**
Examples now live: the share of TWSE market value held by one company (41%),
the number of KOSDAQ CEO-change filings answered within the deadline (28 of 29),
the median gold-bar premium between 100 g and 1 kg bars over 66 sessions (0.06%).
These come from the filings, not from a vendor feed we resell.

**2. We publish what we could not measure.**
Each dataset carries the rows we could not fill and why. Example: in the Japan
financials tape, revenue is present for 91.8% of companies because banks and insurers
report ordinary income rather than net sales — that is stated in the file, not hidden.

**3. Every number has a path back to a filing.**
Each row carries the source document identifier. A buyer can check any cell.

---

## Delivery

```
Today        CSV and JSON files, downloadable from the market pages
On request   SFTP drop · S3 bucket · REST endpoint
In build     Cloud marketplace shares (Snowflake, AWS Data Exchange)
             Developer registry package (PyPI / MCP server)
```

File format is UTF-8, one row per entity-period, ISO dates, stable identifiers
(ticker + exchange code + fiscal period).

---

## Licence and terms

```
Underlying data   Public regulatory filings. We add structure, identifiers and English labels
Grant             Internal use and derived research; redistribution of the raw file is not granted
Attribution       "SeoulMarkets" with the dataset name and the build date
History           Point-in-time snapshots kept from the first build of each dataset
Trial             A dated sample of any dataset, free, no call required
```

---

## Contact

```
Site      https://seoulmarkets.com
Data      https://seoulmarkets.com/data
Pricing   https://seoulmarkets.com/pricing
Operator  KLifeDesign Inc. (Seoul, Republic of Korea)
```

---

## Notes for whoever files the listing

Platforms ask for the same seven things. They are all above:
name · coverage · history depth · update frequency · delivery method · licence · sample.

Two answers we must keep straight, because getting them wrong ends a trial:

- **History depth.** Point-in-time history starts at each dataset's first build, not at
  the first filing date. Do not claim a longer history than the snapshots we hold.
- **Update frequency.** Daily for the two feeds, quarterly for the financial tapes,
  monthly for the company master. Do not round these up.
