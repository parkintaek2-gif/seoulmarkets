/**
 * api-docs.mjs — src/pages/api.astro 가 보여 주는 「지금 되는 것」 목록을 **하나로** 둔다.
 *
 * ── 왜 (2026-09-19 · 2번) ────────────────────────────────────────────────
 * `live[]` 가 astro 파일 안에만 있으면 테스트가 import 할 수 없다(astro 는 JS 모듈이
 * 아니다). 그래서 여기로 뺐다 — api.astro 는 그리기만 하고, 검사는 여기를 직접
 * 불러 「예제 주소가 실제로 200 인가」를 잰다.
 *
 * ⛔ 예제 주소를 손으로 예쁘게 짓지 않는다 — handleApi() 로 200 을 실제로 확인한
 *   것만 여기 둔다(tests/api-docs-examples.test.mjs 가 되돌려서 지킨다).
 */

/** 상수(광고 문구)는 stats 를 받아서 만든다 — 매번 실물에서 읽으므로 손으로 안 고친다 */
export function buildLive(stats) {
  const N = (n) => n.toLocaleString('en-US');
  const 건수 = N(stats.records);
  const 첫해 = stats.first_day.slice(0, 4);

  return [
    {
      path: '/v1/research',
      what: `Every target price and rating issued by Korean brokerages, ${첫해}-${stats.latest_day.slice(0, 4)}. ${건수} records.`,
      example: '/v1/research?broker=Mirae%20Asset&limit=5',
    },
    {
      path: '/v1/institutions',
      what: `The ${stats.brokers} Korean research houses in English, grouped into 34 legal entities across renames.`,
      example: '/v1/institutions',
    },
    {
      path: '/v1/hs/{code}',
      what: 'Resolve any HS code — 2, 4, 6 or 10 digits — to its English description.',
      example: '/v1/hs/8542',
    },
    {
      path: '/v1/hs?q={keyword}',
      what: 'Search the classification in English when you do not know the code.',
      example: '/v1/hs?q=battery',
    },
    {
      path: '/v1/countries',
      what: 'Partner country codes with English names.',
      example: '/v1/countries',
    },
    {
      path: '/v1/meta',
      what: 'Coverage, dictionary size, and exactly what has been collected so far.',
      example: '/v1/meta',
    },
    /* ⭐ [2026-09-19 · 2번] 이 여덟이 src/lib/api.mjs 에는 이미 있었는데 이 지면에 없었다.
       예제 주소는 전부 handleApi() 로 실제 200 을 확인한 것만 쓴다. */
    {
      path: '/v1/financials',
      what: 'Filed annual financial statements (DART fnlttSinglAcntAll), as filed — not our estimate.',
      example: '/v1/financials?ticker=005930',
    },
    {
      path: '/v1/valuation',
      what: 'PER, PBR, ROE and debt-to-equity, with the price date and financial-statement vintage each multiple came from.',
      example: '/v1/valuation?ticker=005930',
    },
    {
      path: '/v1/index-tape',
      what: '168 KRX indices, in English, most recent snapshot.',
      example: '/v1/index-tape?name=KOSPI',
    },
    {
      path: '/v1/indices',
      what: 'The dated history behind index-tape — a time series, not a single snapshot.',
      example: '/v1/indices?name=KOSPI%20200',
    },
    {
      path: '/v1/consensus',
      what: 'Analyst target-price reports and analyst accuracy rankings. The source window is 30 days; our snapshots are the record beyond that.',
      example: '/v1/consensus?ticker=121600',
    },
    {
      path: '/v1/ownership',
      what: 'Substantial-shareholding (5%+) and officer/major-shareholder filings from DART.',
      example: '/v1/ownership?ticker=005930',
    },
    {
      path: '/v1/people',
      what: 'Workforce filings — headcount, tenure and pay by gender — joined to KRX price. One row per company-fiscal-year.',
      example: '/v1/people?ticker=005930',
    },
    {
      path: '/v1/mezzanine',
      what: 'Convertible bond, bond-with-warrant and exchangeable-bond issuance filings, as filed.',
      example: '/v1/mezzanine?limit=5',
    },
    {
      path: '/v1/account-dictionary',
      what: 'Korean financial-statement account names, hand-mapped to standard English (K-IFRS) — not machine translation.',
      example: '/v1/account-dictionary?type=account&limit=5',
    },
    {
      path: '/v1/japan-financials',
      what: 'Latest annual accounts of Tokyo-listed companies as filed with EDINET - revenue, profit, equity, EPS and the filed PER.',
      example: '/v1/japan-financials?code=7203',
    },
    {
      path: '/v1/taiwan-financials',
      what: 'Latest quarterly accounts of TWSE-listed companies - revenue, profit, balance sheet, price, PER, PBR and dividend yield.',
      example: '/v1/taiwan-financials?code=2330',
    },
    {
      path: '/v1/uae-financials',
      what: 'Revenue, net profit, EPS and (where reconciled) balance sheet for ADX and DFM filers.',
      example: '/v1/uae-financials?symbol=ALDAR',
    },
    /* ⭐ [2026-09-24 · 2번] src/lib/api.mjs 의 handleApi() 는 tradeExports() 를 실제로
       부르고 있었다(KOSIS 360 국가×월 통관통계, R2 없이 git 번들 데이터) — 그런데
       이 문서는 여전히 「soon」으로 적어 손님에게 「아직 없다」고 말하고 있었다.
       라이브에서 실제로 200·실 데이터 확인하고 옮긴다(국가별 필터는 --country=). */
    {
      path: '/v1/trade/exports',
      what: "Korea's monthly exports and imports, by partner country (Customs Service, via KOSIS) — national total or one of 243 partners.",
      example: '/v1/trade/exports?country=vietnam&limit=3',
    },
  ];
}

export const soon = [
  {
    path: '/v1/trade/flash',
    what: "Korea's 10-day provisional trade figures, by product. Released 1st, 11th and 21st at 09:00 KST.",
  },
];
