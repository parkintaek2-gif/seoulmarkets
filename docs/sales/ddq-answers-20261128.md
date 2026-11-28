# SeoulMarkets — due diligence answers (provider DDQ)

Version 28 November 2026. Prepared by the operating team of KLifeDesign InC. for data buyers and marketplaces
(Neudata, Datarade, Eagle Alpha, Nasdaq Data Link). Structured after the FISD Alternative Data Council DDQ.
Every figure below was read from the live API or the published sample files on 28 November 2026.
Where we do not know or do not have something, the answer says so.

## 1. Company

| Question | Answer |
|---|---|
| Legal entity | KLifeDesign InC. (주식회사 케이라이프디자인), Republic of Korea. Corporate registration no. 164711-0015700, business registration no. 456-87-03384 |
| Address | Unit 101, Commercial Bldg. 1, 441 Namsejong-ro, Boram-dong, Sejong, Republic of Korea |
| Brand | SeoulMarkets (https://seoulmarkets.com) |
| Contact | admin@klifedesign.net. We work in writing (email); answers within one business day |
| Size | Micro-company, fewer than 10 people |
| Clients | No institutional client references yet. We do not list references we do not have |
| Regulatory status | Not a regulated financial entity. We publish data, not investment advice |
| Litigation or regulatory action concerning the data | None |

## 2. What the data is

| Dataset | Coverage (28 Nov 2026) | History | Update | Contains names of natural persons |
|---|---|---|---|---|
| Korea financial statements | 2,709 listed companies, 13,545 company-years | Fiscal years 2021 to 2025 (companies with a filed statement: 2,094 / 2,187 / 2,395 / 2,528 / 2,577) | After each annual filing season; rebuilt on corrections | No |
| Korea valuation | 2,709 companies; PER available for 1,578, PBR 2,539, ROE 2,562 | Latest snapshot; earlier releases are kept | Daily price date, annual statements | No |
| Korea mezzanine filings (CB, BW, EB) | 5,084 filings | As filed in DART; start date differs by company | Rebuilt periodically | No (company-level terms) |
| Korea ownership ledger | 21,785 substantial-shareholding (5%+) filings, plus officer and major-shareholder filings | As filed in DART | Rebuilt periodically | **Yes**: holder and officer names as publicly filed |
| Korea people panel | 2,924 companies: headcount, tenure, pay by gender | Latest annual report | Annual | Company-level figures; the officer table contains **names as publicly filed** |
| Japan financials | 3,709 Tokyo-listed companies | Latest filed annual period only | After EDINET filings | No |
| Taiwan financials | 1,098 TWSE-listed companies | Latest filed quarter only | Quarterly | No |
| UAE financials | 94 ADX-listed companies, 467 rows | As collected since 2026 | Periodic | No |
| Korea trade | Exports, imports, balance by partner country and month; HS dictionary | Monthly series | Monthly | No |

Known limits, stated up front:
- Japan and Taiwan are single-period snapshots today, not multi-year panels.
- "Rebuilt periodically" means there is no contractual update SLA yet. The build date is in every response and file header.
- A value we could not obtain is null, never zero or an estimate. Each dataset reports how many companies have each field.
- Figures are as filed. No restatement, no adjustment for later amendments beyond re-collecting the amended filing.

## 3. Identifiers and mapping

- Korea: six-digit KRX ticker and the DART filing ID on each filing-level record. English and Korean company names.
- Japan: securities code and EDINET code.
- Taiwan: TWSE code. UAE: ADX/DFM symbol.
- ISIN, FIGI and LEI are **not** provided today. Ticker-to-ISIN mapping can be added on request for Korea.

## 4. Point-in-time and revisions

- Each release is a dated file. Earlier releases are not deleted, so a past version can be reproduced.
- Filing-level datasets (ownership, mezzanine) carry the date the filing was made (`filed_on`), which is the date the information became public.
- Statement-level datasets carry the fiscal year and the date we pulled the filing. They do not carry an exact first-publication timestamp per figure, so they are not strict point-in-time for backtests that need the publication day.
- Corrections we make are logged in a corrections file shipped with the data.

## 5. Sourcing

| Question | Answer |
|---|---|
| Sources | Regulator and exchange disclosure systems only: DART (Financial Supervisory Service, Korea), Korea Public Data Portal, Korea Customs Service statistics, EDINET (Financial Services Agency, Japan), TWSE OpenAPI (Taiwan), ADX and DFM disclosures (UAE) |
| How obtained | Official APIs and open-data endpoints. EDINET under Public Data License 1.0; TWSE under Taiwan's Open Government Data License 1.0; Korean open data under the portal's terms, with attribution |
| Web scraping | The products listed on marketplaces are built from official APIs and published disclosure files, not from scraping third-party websites. We do not use proxies, logins or any technical circumvention |
| Third-party vendor data | None resold |
| Exchange-originated market data | Daily closing prices used in valuation ratios come from the Korea Public Data Portal. We do not sell a price feed, index levels or index constituents; KRX-originated data is kept out of the licensed products pending written confirmation from the exchange |
| Material non-public information | None. Every input is already public on the regulator's or exchange's system at the time we collect it. We have no relationship with issuers and receive nothing from them |
| Copyrighted documents | Not collected. We take figures and facts from filings, not report text, PDFs or charts |

## 6. Personal data

| Question | Answer |
|---|---|
| Does the data contain personal data | The financial, valuation, mezzanine, Japan, Taiwan, UAE and trade datasets: no. The ownership ledger and the officer table of the people panel: yes, names of shareholders and officers exactly as they appear in mandatory public filings, with role, holdings and, for some officers, disclosed pay |
| Sensitive or special-category data, contact details, ID numbers | None |
| Consumer data | None |
| Was consent obtained | No. The legal basis is legitimate interest in the transparency of listed companies (GDPR Art. 6(1)(f)); in California terms the information is publicly available |
| Notice to individuals | Published at https://seoulmarkets.com/privacy#named-in-data (GDPR Art. 14(5)(b)) |
| Objection and removal | Handled within one month; removed names are listed in the corrections file of the next release so licensees can apply them |
| Licence conditions on personal data | Use for research on listed companies only; no profiling of private individuals; apply notified removals (https://seoulmarkets.com/terms) |
| GDPR | No establishment in the EU or UK. Privacy notice follows Art. 13 and 14; no tracking of EEA/UK/Swiss visitors; no EU representative appointed (reasoning recorded internally); Korea holds an EU adequacy decision |
| CCPA | Below the "business" thresholds and not a data broker; equivalent rights honoured voluntarily; no sale or sharing; Global Privacy Control honoured |
| Marketplace products | Products listed on Datarade contain company-level data only and no personal data |

## 7. Licence and permitted use

- Internal use and derived research by the licensee's organisation. No redistribution of the raw files.
- Citation of SeoulMarkets when figures derived from the data are published.
- Use of the data to train machine-learning models is not covered by the published terms; we agree it in writing case by case.
- Public prices: one file 29 USD; single dataset 99 USD per month or 990 USD per year; all datasets 299 USD per month or 2,990 USD per year. Custom terms in writing on request.

## 8. Delivery and operations

| Question | Answer |
|---|---|
| Delivery | REST API (JSON, OpenAPI 3.0 description), CSV and Parquet files, MCP server (listed on the official MCP Registry as com.seoulmarkets/market-data), RapidAPI |
| Not offered | SFTP, Snowflake share, AWS Data Exchange. We are a Korean entity and cannot list on those two cloud marketplaces today |
| Documentation | Data dictionary, coverage table and free sample for each dataset, published on the site |
| Uptime SLA | None contractual. Sign-in, payment and download paths are checked automatically around the clock |
| Support | Email in writing, one business day |
| Security | Passwords and API keys stored as one-way hashes; TLS everywhere; secrets in the host's secret store; no raw IP addresses stored |
| Business continuity | Source archives and builds are kept in object storage separate from the hosting provider |

## 9. Trial

- Free tier on the API and free dated samples for every dataset, without a call or a contract.
- A full-file trial can be requested at https://seoulmarkets.com/trial ; we answer in writing.

## 10. What we would not claim

- We do not claim history we do not have (Japan and Taiwan are one period).
- We do not claim client references.
- We do not claim compliance certifications (SOC 2, ISO 27001): we have none.
