# SeoulMarkets — GDPR and CCPA compliance pack

Prepared 28 November 2026. Owner: KLifeDesign InC. (Republic of Korea). Contact: admin@klifedesign.net.
This is a self-assessment written by the operating team. It is not a legal opinion.
Review it every January and whenever a feature that touches personal data is added.

Public documents this pack supports: https://seoulmarkets.com/privacy and https://seoulmarkets.com/terms .

---

## 1. What we do and where personal data sits

| # | Processing | Data subjects | Data | Purpose | Legal basis (GDPR) | Recipients | Retention |
|---|---|---|---|---|---|---|---|
| 1 | Customer accounts | Customers | Email, password hash, purchases | Deliver purchases | Art. 6(1)(b) | Cloudflare R2 (storage), Cloudtype (hosting) | Until deletion request |
| 2 | API keys | Customers | Hash of email, hash of key, plan, counts | Authentication, limits | Art. 6(1)(b) | Same | Until revoked or deletion request |
| 3 | Payments | Customers | PayPal order ID, amount, product, time, order email | Delivery, bookkeeping | Art. 6(1)(b), 6(1)(c) | PayPal (independent controller) | 5 years (Korean e-commerce record rule) |
| 4 | Trial requests and email | Enquirers | Email, organisation, role, message | Answer the enquiry | Art. 6(1)(b), 6(1)(f) | Google Workspace | 2 years after last message |
| 5 | Mailing list | Subscribers | Email, time, sign-up page | Send what was requested | Art. 6(1)(a) | Cloudflare R2 | Until unsubscribe |
| 6 | Comments and votes | Visitors | Display name, text | Show the comment | Art. 6(1)(f) | Cloudflare R2 | Until removal request |
| 7 | Visit counting, attack protection | Visitors | Daily-rotating one-way hash of IP; masked IP in server log on a block | Statistics, security | Art. 6(1)(f) | Cloudtype | Statistics kept; logs per host |
| 8 | Analytics and advertising tags | Visitors outside EEA/UK/CH without GPC | Cookie IDs, page, coarse location, device | Audience measurement, ads | Not loaded for EEA/UK/CH or GPC visitors | Google, Naver | Per provider |
| 9 | Datasets with names | Officers and filing shareholders of listed companies | Name, role, holdings, disclosed pay | English access to mandatory corporate disclosure | Art. 6(1)(f) | Dataset licensees | While the filing is public |

This table is our record of processing activities (Art. 30). The under-250-employee exemption does not apply because the processing is not occasional.

No special-category data, no data about children, no automated decisions, no profiling.

## 2. Does GDPR apply to us at all (Art. 3(2))

We have no establishment in the EU or UK.

- Website and customers: we accept customers worldwide and list on an EU marketplace, so we assume Art. 3(2)(a) can apply to EU individuals who deal with us and we meet the obligations below for them.
- Tracking: EDPB Guidelines 3/2018 name online tracking as an example of monitoring under Art. 3(2)(b). Since 28 November 2026 no analytics or advertising tag is loaded for visitors whose browser time zone is in the EEA, the UK or Switzerland (`src/components/PrivacyGate.astro`). We do not monitor behaviour in the EU.
- People named in datasets: almost all are residents of Korea, Japan, Taiwan or the UAE. EDPB Guidelines 3/2018 state that processing of EU residents' data in a third country does not trigger GDPR unless it relates to an offer directed at those individuals or to monitoring their behaviour in the EU. Recording a mandatory filing made to a foreign regulator is neither. We still give those people the Art. 14 notice and the right to object, because EU licensees are controllers of their copy and will ask for it.

The EU-Republic of Korea adequacy decision (17 December 2021; first review concluded 23 July 2026 with adequacy maintained) covers transfers from the EU to Korea. It neither exempts us from GDPR nor brings us under it.

## 3. Legitimate interests assessment for dataset names (Art. 6(1)(f))

- Purpose: make mandatory disclosures of listed companies readable in English for investors and researchers.
- Necessity: the identity of a 5% holder or an officer is the content of the disclosure. A dataset without it would not show who holds or runs the company. Where a product does not need names we ship it without them (company financials, valuation, convertible bond filings at company level).
- Balance: the data were made public by law for the purpose of market transparency. They concern professional roles and regulated holdings, not private life. We add nothing from other sources, hold no contact details or ID numbers, and build no profiles. The people concerned can reasonably expect the filing to be read and republished. Safeguards: a published notice, a contact address, objection honoured within one month, licence terms that forbid profiling private individuals.
- Outcome: the interest is not overridden. Reviewed 28 November 2026.

## 4. Information duty to people named (Art. 14)

Contacting each person individually would require collecting contact details we do not hold and would be disproportionate (Art. 14(5)(b)). The information is made public instead at https://seoulmarkets.com/privacy#named-in-data .

## 5. Screening decisions

- DPIA (Art. 35): not required. No large-scale special-category data, no systematic monitoring, no automated decisions with legal effect. Re-screen if we add consumer data or scoring of individuals.
- DPO (Art. 37): not required. Core activity is not large-scale monitoring or special-category processing. The privacy contact is admin@klifedesign.net.
- EU/UK representative (Art. 27): not appointed. Reasoning: (a) we do not monitor behaviour in the EU (tags are not loaded there); (b) in the EEA, UK and Switzerland we sell to businesses and professionals only (terms of use, 28 November 2026), so we do not target individuals there as data subjects; (c) processing of EU individuals' data is limited to the contact email of a business buyer. Weakness we accept and record: no EDPB text says expressly that business-only sales fall outside Art. 3(2)(a), and a sole trader in the EU is still an individual. Trigger to revisit: any paid customer in the EEA/UK who is an individual, or more than occasional EU customers. A representative service costs money, so that decision goes to the owner when the trigger is met.

## 6. Processors and transfers

| Provider | Role | Location | Transfer basis | Contract status (28 Nov 2026) |
|---|---|---|---|---|
| Google (Analytics, AdSense) | Not used for EEA/UK/CH visitors | US/IE | n/a for the EEA | Google Ads Data Processing Terms: to be confirmed in the admin console |
| Google Workspace | Processor (email) | US/IE | Google Cloud DPA with SCCs | Cloud DPA is part of the Workspace agreement; confirm acceptance in the admin console |
| Cloudtype | Processor (hosting) | Korea | Adequacy decision | Standard terms; written processing terms to be requested |
| Cloudflare R2 | Processor (storage) | US | Cloudflare DPA with SCCs, DPF | DPA is incorporated in Cloudflare's self-serve terms |
| PayPal | Independent controller | — | — | Named in the privacy notice |
| Naver Analytics | Not used for EEA/UK/CH visitors | Korea | n/a | — |

Open items in this table are tracked in section 11.

## 7. Security measures (Art. 32)

- Passwords and API keys are stored as one-way hashes only; raw keys are shown once at issue.
- All traffic is served over TLS.
- Secrets are kept in the hosting provider's secret store, not in the repository.
- No raw IP addresses are stored; visit counting uses a salted hash that changes daily.
- Customer email addresses are never written to the repository or to logs (checked by `scripts/check-로그에-개인정보가-찍히나.mjs`).
- Access to production storage is limited to the operating team.
- An automated check runs every two hours on sign-in, payment and re-download paths.

## 8. Breach procedure (Art. 33, 34)

1. Whoever notices records the time and what is known in `docs/privacy/breach-log.md` (create on first use) and tells the owner.
2. Contain: revoke keys, rotate secrets, take the affected endpoint offline if needed.
3. Within 72 hours of becoming aware, where EU or UK individuals are affected and there is a risk to them, notify the competent supervisory authority. Tell the affected individuals without undue delay if the risk is high. Korean law (PIPA) notification duties are assessed in parallel.
4. Record the cause, the effect and the remedy in the breach log even when no notification is required.

## 9. Handling requests from individuals

- Channel: admin@klifedesign.net. No form, no fee.
- Log every request in `docs/privacy/request-log.tsv` (date received, type, law, date acknowledged, date answered, outcome). Do not write the person's email address or name in the log; use a reference number and keep the email in the mailbox.
- Deadlines: acknowledge within 10 business days; answer within one month (GDPR; extendable by two months with notice) and in any case within 45 days (CCPA). An opt-out or objection is applied within 15 business days.
- Verification: reply to the address the request concerns; for a person named in a dataset, ask only for enough to find the record (company, filing).
- Deleting an account: remove the account record, the API key records and the mailing-list entry; keep payment records for the statutory five years and say so in the answer.
- Objection by a person named in a dataset: remove the name from the next release of every dataset, add the removal to the corrections file shipped with the data, and notify licensees through the release notes.

## 10. CCPA position

- "Business" test (Civ. Code s.1798.140(d)), checked 28 November 2026: annual gross revenue is far below USD 26,625,000 (threshold as adjusted 1 January 2025); we do not buy, sell or share the personal information of 100,000 or more California consumers or households; we do not derive 50% or more of revenue from selling or sharing personal information. We are not a "business". Re-check each January (next adjustment 1 January 2027).
- We nevertheless give California residents the CCPA rights and publish the s.1798.130(a)(5) disclosures in the privacy notice. The accurate statement of our position is: "below the CCPA thresholds; equivalent rights honoured voluntarily".
- Sale or sharing: none. Analytics and advertising tags are not loaded when the browser sends a Global Privacy Control signal (regulations s.7025).
- Publicly available information (s.1798.140(v)(2)): names in our datasets come from mandatory regulatory filings that were lawfully made available to the general public. The statute's text names federal, state and local government records; foreign regulatory filings are covered, in our reading, by the limb on information lawfully made available to the general public. No regulator guidance on foreign filings was found.
- Data broker registration (Civ. Code s.1798.99.80 and following): a data broker is defined as a "business" that sells personal information of consumers it has no direct relationship with. We are not a "business", so we are not a data broker and have no registration, fee or DROP duty. Re-assess if revenue approaches the threshold. The same analysis applies, with their own definitions, to Vermont, Texas and Oregon, where we hold practically no residents' data.

## 11. Open items

| Item | Why it matters | Owner | Status |
|---|---|---|---|
| Confirm Google Ads/Analytics data processing terms are accepted in the GA4 account settings | Supports "no sale or sharing" | Operating team | Open. Google signals data collection was checked in the GA4 admin screen on 28 November 2026 and is not enabled; no Google Ads account is linked |
| Confirm Google Workspace Cloud DPA acceptance | Art. 28 | Operating team | Open |
| Ask Cloudtype for written processing terms | Art. 28 | Operating team | Open |
| Datarade Publishing Policy 4.1 requires valid consent for products containing personal data | Our ownership, officer and workforce datasets cannot rely on consent | Operating team | Decision: those datasets are not listed on Datarade. The three Datarade products contain company-level data only. A written question to Datarade is optional |
| Add "contains names of natural persons from statutory filings" to the documentation of the ownership, officer and workforce datasets | Transparency to licensees, FISD DDQ | Operating team | Open |
| Prepare answers to the FISD alternative data DDQ | Buyer due diligence | Operating team | Planned for the first week of December 2026 |
| KLifeMap and 100yearmap privacy notices | Same company, separate sites | Operating team | Not covered by this pack |

## 12. Change log

- 28 November 2026: first version. Privacy notice rewritten; tags gated by region and GPC; terms amended (names in data, business-only sales in EEA/UK/CH); this pack written.
