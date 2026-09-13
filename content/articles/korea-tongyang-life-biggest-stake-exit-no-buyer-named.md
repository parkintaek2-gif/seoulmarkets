---
title: "A 75-point stake vanished — and the filing didn't name who took over"
dek: "Tongyang Life's Chinese owner reported selling its entire stake in one filing, the largest exit in our ledger of Korean ownership disclosures. Of the nine biggest full sell-outs we found, only three say a controlling shareholder changed."
category: equities
pubDate: 2026-09-13
dataAsOf: 2026-09-13T12:59:00+09:00
author: Newsroom
tags: ["ownership", "governance", "dart", "korea", "debate"]
tickers: ["082640", "053350", "200470", "463480", "439090", "001250", "004870", "005320", "065650"]
sources:
  - org: "DART (Financial Supervisory Service electronic disclosure)"
    api: "Substantial shareholding (5%+) filings (majorstock), read from our Korea Ownership Ledger (21,785 filings, published as our licensed dataset — GET /v1/ownership?kind=filings). English company names are DART's own registered corp_name_eng field, not translated by us; holder names are printed exactly as filed."
crossChecks:
  - "120 filings in the ledger report a stake falling from 5%-plus to 1% or less through an ordinary sale (reason text matching 'sold'/'disposed'/'transferred', excluding spin-offs, mergers and representative-filer changes). 105 are distinct companies; the nine largest range from a 75.36-percentage-point drop (Tongyang Life Insurance) to a 40.72-point drop (Hyper Corporation)"
  - "Of these 105 filings, only 4 use the phrase 'controlling shareholder change' (최대주주 변경) in the reason field. Among the nine largest, three do: INITECH, MOTIVELINK and Manyo Factory"
  - "Tongyang Life Insurance's filing states the reason as 'disposal of shares following closing of a stock purchase agreement' — no buyer is named in the field we collect, and no controlling-shareholder language is used, despite the stake going from 75.36% to zero"
excluded:
  - "Filings where the reported reason was a corporate restructuring — a spin-off, merger, or a change in which affiliate does the reporting — rather than an ordinary sale. These can also make a holder's stake show as a large drop, but the shares did not necessarily leave the corporate group"
  - "Filings where the seller's resulting stake was still above 1% — a large disposal, but not an exit"
  - "Any claim about who bought the stake, why, or at what price — the filing field we collect (reason_raw_ko) does not require the seller to say, and we do not guess"
  - "Any view on whether these nine companies are worth owning or avoiding — this reports what was filed, not investment advice"
image: /charts/ownership-exit-ranking.svg
draft: false
---

Somewhere in the DART filing system on 7 July 2025, a Chinese-owned insurer reported that it no longer owned a single share of Tongyang Life Insurance. A week earlier its stake had been 75.36%. The reason field gives one line: the transaction closed under a stock purchase agreement. It does not say who bought the shares.

## The nine largest, ranked

![Bar chart ranking nine Korean listed companies by the size of a reported 5%-plus holder's stake drop to near zero through an ordinary sale, from Tongyang Life Insurance's 75.36-point exit down to Hyper Corporation's 40.72-point exit, colour-coded by whether the filing's reason field uses the words "controlling shareholder change."](/charts/ownership-exit-ranking.svg)

| Rank | Company | Holder that exited | Stake before → after | Names a control change? |
| --- | --- | --- | ---: | :--- |
| 1 | **Tongyang Life Insurance** | Dajia Life Insurance | 75.36% → 0% | No |
| 2 | INITECH | KTDS | 57.00% → 0% | **Yes** |
| 3 | APACT | Mutual Growth | 55.33% → 0% | No |
| 4 | MOTIVELINK | SDY | 53.50% → 0% | **Yes** |
| 5 | Manyo Factory | L&P Cosmetic | 51.87% → 0.77% | **Yes** |
| 6 | GS Global | GS Charge B | 50.86% → 0% | No |
| 7 | Tway Holdings | Yeorimdang | 46.91% → 0% | No |
| 8 | ONTIDE | Chris F&C | 45.12% → 0% | No |
| 9 | Hyper Corporation | Withwin Investment Partnership 87 | 40.72% → 0% | No |

*Source: Korea Ownership Ledger, DART substantial-shareholding filings. "Names a control change" means the filed reason text uses the phrase 최대주주 변경 (controlling-shareholder change), searched as text — not our judgement of what actually happened at the other six.*

## What "sold out" means in this ledger

Each row above is a single filing where a reporting holder's stake fell from above 5% to 1% or less, and the stated reason involves an ordinary sale — not a spin-off, not a merger, not a swap of which group company does the reporting. We built this filter specifically to exclude those structural moves, because they can make a stake number collapse without a single share leaving the corporate family. What is left is 105 companies where a real block, by the filing's own words, changed hands through a transaction.

## The gap: nine exits, three named causes

Line up the nine largest and a pattern shows up that has nothing to do with company size or industry: **six of the nine filings do not say whether the buyer became the new controlling shareholder.** INITECH, MOTIVELINK and Manyo Factory do — all three use the exact phrase 최대주주 변경 (controlling-shareholder change) in their reason field. The other six, including the single largest exit on the list, describe the mechanics of the sale ("stock purchase agreement," "over-the-counter transfer agreement," "sold in full") without saying whether control moved with the stock.

This is not a claim that control didn't change at those six companies — it may well have. It is a narrower, checkable fact: **the filing field designed to explain why a 5%-plus holder's position changed does not, in most of these cases, tell a reader whether the company now has a new controlling shareholder.** A reader who wants to know has to go elsewhere — a separate filing, a news report, or DART's own scanned disclosure document — because the structured field we and everyone else pull this data from often just describes the paperwork.

Tongyang Life Insurance is the sharpest example because the stake was the largest and the company is the most recognisable: an insurer's 75-point ownership block went from a single foreign holder to zero, and the machine-readable reason for the filing is nine words about a contract closing.

## What we left out, and why

Among filings that used sale-type wording ("sold," "disposed," "transferred") and dropped a holder to 1% or less, we excluded 43 because their reported reason also pointed to a restructuring — a spin-off creating a new reporting entity, a merger folding one filer into another, or a change in which group affiliate does the reporting — rather than shares actually leaving the group. Separately, hundreds more filings drop a holder to that same near-zero level for reasons that never mention a sale at all (a merger, a delisting, a bookkeeping reclassification) — those aren't in this ranking either, because "the stake disappeared" and "the stake was sold" are different questions. We also excluded any filing where the seller's resulting stake was still above 1%: a big reduction, but not an exit.

We do not report who bought any of these stakes. The field we collect (reason_raw_ko) is the reason as filed, and in every row on this list it stops short of naming a buyer. This is data, not investment advice — nothing here says whether any of these nine companies is worth owning or avoiding now that a major holder is gone.

## The debate

Korea's substantial-shareholding disclosure exists so the market knows who holds a company's stock. If a 5%-plus holder's entire stake changes hands and the required reason field doesn't have to say whether that came with a change of control, **is the filing doing the job it's meant to do?** This is a talking point, not a verdict — argue it out below.

*This ranking draws on the same Korea Ownership Ledger that powers [`/v1/ownership`](https://seoulmarkets.com/api) — the same DART substantial-shareholding filings, queryable by ticker, holder or filing kind.*
