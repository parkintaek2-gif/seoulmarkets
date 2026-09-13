/**
 * OpenAPI 3.0.3 명세 — `/v1/openapi.json`
 * (3.1 이 아닌 이유는 아래 openapi 필드의 주석에 있다)
 *
 * ── 왜 필요한가 ────────────────────────────────────────────────
 * RapidAPI·AWS·Snowflake 는 명세를 주면 엔드포인트·파라미터·응답을 **자동으로 읽어**
 * 리스팅과 클라이언트 SDK 를 만들어 준다. 손으로 입력할 것이 없어진다.
 *
 * 그리고 앞뒤가 맞아야 한다 — klifemap 세션에 「B2B API 를 파는데 사려는 사람이
 * 명세를 못 읽는다」고 지적해 놓고 우리가 없으면 같은 말을 우리가 듣는다.
 *
 * ── 왜 파일이 아니라 코드로 만드는가 ───────────────────────────
 * 정적 JSON 파일로 두면 **코드가 바뀔 때 같이 안 바뀐다.** 오늘만 해도
 * `/api` 페이지의 예제가 실제 응답과 어긋난 적이 있고, 없는 npm 패키지를
 * 설치하라고 적은 적이 있다. 문서와 실물이 갈라지는 것이 이 프로젝트의
 * 반복되는 실패 방식이다.
 * 여기서는 사전 통계(DICT_STATS)를 실제 사전에서 읽어 넣는다 — 사전을 늘리면
 * 명세의 설명도 같이 늘어난다.
 */

import { DICT_STATS } from './trade-dict.mjs';
import stats from '../data/research-stats.json' with { type: 'json' };

const ERROR_SCHEMA = {
  type: 'object',
  properties: {
    error: {
      type: 'object',
      properties: {
        code: {
          type: 'string',
          description:
            'Machine-readable reason. Branch on this, not on message — messages are written for people and may be reworded.',
          examples: ['collection_not_started', 'invalid_hs_code', 'unknown_endpoint'],
        },
        message: { type: 'string' },
        hint: { type: 'string' },
      },
      required: ['code', 'message'],
    },
  },
};

const SOURCE_SCHEMA = {
  type: 'object',
  description: 'Every response names where its facts come from.',
  properties: { agency: { type: 'string' }, system: { type: 'string' } },
};

export function openapi(baseUrl) {
  return {
    /*
     * ⚠ 2026-08-03 KST — **3.1 이 아니라 3.0.3 이다. 일부러 낮췄다.**
     *
     *   RapidAPI 에 이 명세를 올렸더니 임포터가 통째로 실패했다.
     *     [GraphQL error] Path: createApisFromSpecs — "An unknown internal error occured"
     *
     *   원인은 3.1 전용 문법이었다 — `type: ["string","null"]` 과 `info.summary`.
     *   3.1 이 더 정확한 규격이지만, **이 파일이 존재하는 이유는 마켓플레이스가 읽는 것**이다.
     *   읽히지 않는 정확함은 쓸모가 없다. 3.0.3 으로 쓰고 null 은 nullable 로 표현한다.
     *
     *   RapidAPI 가 3.1 을 지원하면 되돌린다. 그전에 올리지 말 것.
     */
    openapi: '3.0.3',
    info: {
      title: 'SeoulMarkets Data API',
      version: '1.0.0',
      description: [
        'Korean official statistics, normalised to English. JSON only.',
        '',
        'Korea publishes monthly trade figures the day after the month ends, and provisional',
        'figures three times a month. Bloomberg counts Korean trade among its twelve key global',
        'economic indicators. The headline number is reported everywhere; the product-level',
        'detail is not, because the official feed returns XML with Korean-language product and',
        'country names and no English classification attached.',
        '',
        'This API is that missing layer.',
        '',
        `The classification endpoints (${DICT_STATS.chapters} HS chapters, ${DICT_STATS.headings} headings,`,
        `${DICT_STATS.countries} countries) are live and free. The trade series open when collection`,
        'begins — until then they return 404 with a machine-readable reason rather than an empty',
        'array, because "not collected yet" and "no trade occurred" are different answers.',
        '',
        'We do not guess. A code outside our dictionary returns null for its description with',
        '`resolved: false`, never a plausible-sounding label.',
      ].join('\n'),
      contact: { name: 'SeoulMarkets', email: 'sibcheongan@gmail.com', url: `${baseUrl}/api` },
      license: {
        name: 'Source data published by Korean agencies under an unrestricted-use licence',
        url: `${baseUrl}/about`,
      },
    },
    servers: [{ url: `${baseUrl}/v1`, description: 'Production' }],
    tags: [
      { name: 'Classification', description: 'Resolve HS codes and country codes to English. Free, no key.' },
      {
        name: 'Reference',
        description:
          'Dictionaries that make the data readable outside Korea. Built while counting 20 years of reports; no public equivalent exists.',
      },
      {
        name: 'Research',
        description:
          `Every target price and rating issued by Korean brokerages, ${stats.first_day.slice(0, 4)}-${stats.latest_day.slice(0, 4)}. ${stats.records.toLocaleString('en-US')} records. This is the only place the series exists in English.`,
      },
      { name: 'Trade', description: "Korea's customs trade series." },
      {
        name: 'Markets',
        description:
          'PER, PBR, ROE and debt-to-equity for listed Korean companies, with the price date and financial-statement vintage each multiple was computed from — so it can be recomputed against any other price date.',
      },
      { name: 'Meta', description: 'Coverage, schema policy and collection status.' },
    ],
    paths: {
      '/hs/{code}': {
        get: {
          tags: ['Classification'],
          operationId: 'getHsCode',
          summary: 'Resolve an HS code to its English description',
          description:
            'Accepts 2, 4, 6 or 10 digits. Chapter names follow the WCO Harmonized System; headings cover the products that dominate Korean trade.',
          parameters: [
            {
              name: 'code',
              in: 'path',
              required: true,
              schema: { type: 'string', pattern: '^[0-9]{2,10}$' },
              examples: {
                semiconductors: { value: '8542', summary: 'Electronic integrated circuits' },
                batteries: { value: '8507', summary: 'Electric accumulators' },
                albums: { value: '8523', summary: 'Discs, tapes and solid-state storage' },
              },
            },
          ],
          responses: {
            200: {
              description: 'Resolved code. Check `resolved` before displaying `label`.',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      code: { type: 'string' },
                      digits: { type: 'integer', enum: [2, 4, 6, 10] },
                      chapter: {
                        type: 'object',
                        properties: { code: { type: 'string' }, name: { type: 'string', nullable: true } },
                      },
                      heading: {
                        type: 'object', nullable: true,
                        properties: { code: { type: 'string' }, name: { type: 'string', nullable: true } },
                      },
                      label: {
                        type: 'string', nullable: true,
                        description: 'Null when the code is not in our dictionary. We do not guess.',
                      },
                      resolved: { type: 'boolean' },
                      source: SOURCE_SCHEMA,
                    },
                  },
                  example: {
                    code: '8542',
                    digits: 4,
                    chapter: { code: '85', name: 'Electrical machinery and equipment and parts thereof' },
                    heading: { code: '8542', name: 'Electronic integrated circuits' },
                    label: 'Electronic integrated circuits',
                    resolved: true,
                    source: { agency: 'World Customs Organization', system: 'Harmonized System' },
                  },
                },
              },
            },
            400: { description: 'Malformed code', content: { 'application/json': { schema: ERROR_SCHEMA } } },
          },
        },
      },
      '/hs': {
        get: {
          tags: ['Classification'],
          operationId: 'searchHs',
          summary: 'Search the classification in English',
          description: 'Singular and plural both work — `battery` finds `batteries`.',
          parameters: [
            {
              name: 'q',
              in: 'query',
              required: true,
              schema: { type: 'string', minLength: 2 },
              examples: {
                battery: { value: 'battery' },
                semiconductor: { value: 'semiconductor' },
                cosmetics: { value: 'cosmetic' },
              },
            },
          ],
          responses: {
            200: {
              description: 'Matches, chapters first',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      query: { type: 'string' },
                      count: { type: 'integer' },
                      results: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            code: { type: 'string' },
                            level: { type: 'integer', enum: [2, 4] },
                            name: { type: 'string' },
                          },
                        },
                      },
                      source: SOURCE_SCHEMA,
                    },
                  },
                },
              },
            },
            400: { description: 'Query too short', content: { 'application/json': { schema: ERROR_SCHEMA } } },
          },
        },
      },
      /* ⚠ 2026-08-03 KST — 이게 명세에서 통째로 빠져 있었다.
         66,071건짜리 간판 엔드포인트인데 스펙만 읽는 개발자에게는 **없는 기능**이었다.
         RapidAPI 는 명세로 리스팅을 만든다 — 안 적힌 것은 팔리지 않는다. */
      '/research': {
        get: {
          tags: ['Research'],
          operationId: 'listResearch',
          summary: 'Brokerage target prices and ratings, 2007-2026',
          description: [
            'Every target price and investment rating issued by Korean brokerages that we have',
            `collected: ${stats.records.toLocaleString('en-US')} records across 20 years, normalised to English.`,
            '',
            'Three normalisations matter, and each is exposed as an added field beside the raw one:',
            '',
            '- `brokerEntity` — a stable id per legal entity. Korean brokerages rename often, and one',
            '  firm appears under up to four Korean names in the archive. Group by this, not by `broker`.',
            '- `ratingNormalised` — 22 source spellings (Korean, English, mixed case, one typo, one',
            '  truncation) folded into 8 levels. `Outperform` is deliberately kept below `Buy`;',
            '  in Korea it is one notch down, not a synonym.',
            '- `subjectEn` — official English company name. A company sets its own spelling',
            '  (SK hynix, NCSOFT, AMOREPACIFIC), so this cannot be derived by rule.',
            '',
            'Fields that are unknown are `null`. We never fill a gap with a plausible-looking value.',
            'Report text and PDFs are not collected, so nothing copyrighted is redistributed —',
            'these are facts about what was published, not the publications.',
          ].join('\n'),
          parameters: [
            {
              name: 'broker',
              in: 'query',
              schema: { type: 'string' },
              description:
                'Korean name, English name, or entity id. All three resolve to the same firm, and a match returns every historical name of that entity — querying "Mirae Asset" also returns its Daewoo Securities-era reports.',
              examples: {
                english: { value: 'Mirae Asset' },
                entity: { value: 'mirae-asset' },
                korean: { value: '미래에셋' },
              },
            },
            {
              name: 'subject',
              in: 'query',
              schema: { type: 'string' },
              description: 'Company covered by the report. Korean name as filed.',
            },
            {
              name: 'since',
              in: 'query',
              schema: { type: 'string', format: 'date' },
              description:
                'Earliest report date, YYYY-MM-DD. Note the archive is sparse before 2014 — see GET /meta.',
            },
            {
              name: 'rating',
              in: 'query',
              schema: {
                type: 'string',
                enum: ['buy', 'outperform', 'hold', 'neutral', 'marketperform', 'underperform', 'sell', 'unknown'],
              },
              description: 'Filter on the normalised level, not the broker wording. Unknown values return 400 with the valid list.',
            },
            {
              name: 'stance',
              in: 'query',
              schema: { type: 'string', enum: ['positive', 'neutral', 'negative'] },
              description:
                'Coarser than rating. Useful context: 94.1% of rated reports are positive and 0.16% negative — 89 negative records in 20 years.',
            },
            {
              name: 'limit',
              in: 'query',
              schema: { type: 'integer', default: 50, maximum: 200 },
              description: 'Newest first.',
            },
          ],
          responses: {
            200: {
              description: 'Matching reports. A filter that matches nothing is 200 with count 0 — not an error.',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      count: { type: 'integer' },
                      as_of: { type: 'string' },
                      results: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            date: { type: 'string', format: 'date' },
                            broker: { type: 'string', description: 'Korean name exactly as filed.' },
                            brokerEn: { type: 'string', nullable: true },
                            brokerEntity: {
                              type: 'string', nullable: true,
                              description: 'Stable across renames. Group by this.',
                            },
                            brokerType: {
                              type: 'string', nullable: true,
                              enum: ['brokerage', 'credit-rating', 'ir-service'],
                              description:
                                'Explains a null target price: credit-rating and IR bodies publish analysis without one (4,164 records).',
                            },
                            subject: { type: 'string' },
                            subjectEn: { type: 'string', nullable: true, description: 'null when not yet in the dictionary.' },
                            targetPrice: {
                              type: 'integer', nullable: true,
                              description: 'KRW. null means no target was published — not zero.',
                            },
                            rating: { type: 'string', nullable: true, description: 'The broker’s own wording.' },
                            ratingNormalised: {
                              type: 'object',
                              properties: {
                                code: { type: 'string' },
                                label: { type: 'string' },
                                score: {
                                  type: 'integer',
                                  description: 'Our ordering for aggregation. Not a number the broker assigned.',
                                },
                                stance: { type: 'string', enum: ['positive', 'neutral', 'negative'] },
                                raw: { type: 'string', nullable: true },
                              },
                            },
                            analyst: { type: 'string', nullable: true },
                            detailFetched: {
                              type: 'boolean',
                              description: 'false means the target price was never fetched, not that none exists.',
                            },
                            source: SOURCE_SCHEMA,
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
            400: {
              description: 'Unknown rating or stance. The hint lists the valid values.',
              content: { 'application/json': { schema: ERROR_SCHEMA } },
            },
            404: {
              description: 'Index not available. Distinct from "your filter matched nothing".',
              content: { 'application/json': { schema: ERROR_SCHEMA } },
            },
          },
        },
      },
      '/institutions': {
        get: {
          tags: ['Reference'],
          operationId: 'getInstitutions',
          summary: 'Korean research institutions, in English',
          description:
            'Official English names, rename history and institution type. Korean brokerages rename often and our archive spans 2007-2026, so one firm appears under several names — group by `entity`, which is stable across renames. Not every institution is a brokerage: credit-rating and IR bodies publish company analysis without target prices, which is why some records have a null target price.',
          parameters: [
            {
              name: 'type',
              in: 'query',
              schema: { type: 'string', enum: ['brokerage', 'credit-rating', 'ir-service'] },
              description: 'Filter by institution type',
            },
          ],
          responses: { 200: { description: 'Institution dictionary' } },
        },
      },
      '/countries': {
        get: {
          tags: ['Classification'],
          operationId: 'listCountries',
          summary: 'Partner country codes with English names',
          responses: {
            200: {
              description: 'ISO 3166-1 alpha-2 codes',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      count: { type: 'integer' },
                      results: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: { code: { type: 'string' }, name: { type: 'string' } },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      '/meta': {
        get: {
          tags: ['Meta'],
          operationId: 'getMeta',
          summary: 'Coverage, schema policy and what has actually been collected',
          description:
            'Check `datasets[name].collected` before relying on a series. `contract` states the schema stability promise.',
          responses: { 200: { description: 'Service metadata' } },
        },
      },
      '/trade/flash': {
        get: {
          tags: ['Trade'],
          operationId: 'getTradeFlash',
          summary: "Korea's 10-day provisional trade figures",
          description:
            'Released on the 1st, 11th and 21st at 09:00 KST. Provisional figures are preserved alongside their revisions rather than overwritten.',
          responses: {
            200: { description: 'Provisional trade figures' },
            404: {
              description:
                'Collection has not started. Deliberate — an empty array would be indistinguishable from "no trade occurred".',
              content: { 'application/json': { schema: ERROR_SCHEMA } },
            },
          },
        },
      },
      '/trade/exports': {
        get: {
          tags: ['Trade'],
          operationId: 'getTradeExports',
          summary: 'Exports, imports and balance by partner country and month',
          description:
            'Monthly customs figures (thousand USD). National totals by default; `country` returns one partner, `since` (YYYY-MM) trims the window. Source: Korea Customs Service via KOSIS (table DT_1R11006). HS-code (product) granularity arrives when the direct customs item-trade feed is live; country totals here are authoritative.',
          parameters: [
            { name: 'country', in: 'query', required: false, schema: { type: 'string' }, description: 'English partner name, e.g. "vietnam", "u.s.a", "china". Substring match.' },
            { name: 'since', in: 'query', required: false, schema: { type: 'string', pattern: '^\\d{4}-\\d{2}$' }, description: 'Return months on or after this YYYY-MM.' },
            { name: 'limit', in: 'query', required: false, schema: { type: 'integer' }, description: 'Max rows; capped by plan.' },
          ],
          responses: {
            200: { description: 'Monthly trade series with source, window and caveats' },
          },
        },
      },
      '/valuation': {
        get: {
          tags: ['Markets'],
          operationId: 'getValuation',
          summary: 'PER, PBR, ROE and debt-to-equity for listed Korean companies',
          description:
            'One row per listed company. Consolidated (CFS) financials are used when available, otherwise separate (OFS) — the `basis` field says which. PER is null when net income is not positive; PBR and ROE are null when total equity is not positive. No sector averages are computed. `?ticker=` returns one company by its 6-digit KRX short code; otherwise a filtered, paginated list.',
          parameters: [
            { name: 'ticker', in: 'query', required: false, schema: { type: 'string', pattern: '^\\d{6}$' }, description: '6-digit KRX short code, e.g. 005930.' },
            { name: 'industry', in: 'query', required: false, schema: { type: 'string' }, description: 'English or Korean industry name. Substring match.' },
            { name: 'measured', in: 'query', required: false, schema: { type: 'boolean' }, description: 'true drops rows with no usable multiple (see `not_measured`).' },
            { name: 'limit', in: 'query', required: false, schema: { type: 'integer' }, description: 'Max rows; capped by plan.' },
          ],
          responses: {
            200: { description: 'Valuation rows with source, price date and financial-statement vintage' },
            404: {
              description: 'ticker did not match any listed company.',
              content: { 'application/json': { schema: ERROR_SCHEMA } },
            },
          },
        },
      },
      '/index-tape': {
        get: {
          tags: ['Markets'],
          operationId: 'getIndexTape',
          summary: 'Daily levels for 168 KRX indices, in English',
          description:
            'One row per index (KOSPI, KOSDAQ, KRX and theme series) for the most recent snapshot date. `yearLow` and `yearLowDate` are null when the source reported a 0 paired with an impossible future date — a source placeholder, not a real annual low of zero; see `yearLowNotMeasured`. `?name=` returns one index by its exact English or Korean name; otherwise a filtered, paginated list.',
          parameters: [
            { name: 'name', in: 'query', required: false, schema: { type: 'string' }, description: 'Exact English or Korean index name, e.g. "KOSPI 200".' },
            { name: 'family', in: 'query', required: false, schema: { type: 'string' }, description: 'English or Korean series name (e.g. "KOSPI Series"). Substring match.' },
            { name: 'limit', in: 'query', required: false, schema: { type: 'integer' }, description: 'Max rows; capped by plan.' },
          ],
          responses: {
            200: { description: 'Index rows with source and snapshot date' },
            404: {
              description: 'name did not match any index.',
              content: { 'application/json': { schema: ERROR_SCHEMA } },
            },
          },
        },
      },
      '/account-dictionary': {
        get: {
          tags: ['Markets'],
          operationId: 'getAccountDictionary',
          summary: 'Korean financial-statement account names mapped to standard English',
          description:
            'Hand-mapped from real DART fnlttSinglAcntAll filings to standard K-IFRS English terms — not machine translation. `?type=account` (default) returns line-item names; `?type=statement` returns the five financial-statement names. Account names not yet in this dictionary are not covered by this endpoint at all (there is no guessed entry) — resolve them client-side as `unmapped:<original>`.',
          parameters: [
            { name: 'type', in: 'query', required: false, schema: { type: 'string', enum: ['account', 'statement'] }, description: 'Which dictionary to return. Default: account.' },
            { name: 'q', in: 'query', required: false, schema: { type: 'string' }, description: 'Search the Korean or English text. Substring match.' },
            { name: 'limit', in: 'query', required: false, schema: { type: 'integer' }, description: 'Max entries; capped by plan.' },
          ],
          responses: {
            200: { description: 'Dictionary entries with source and coverage notes' },
            400: {
              description: 'type was neither "account" nor "statement".',
              content: { 'application/json': { schema: ERROR_SCHEMA } },
            },
          },
        },
      },
      '/people': {
        get: {
          tags: ['Markets'],
          operationId: 'getPeople',
          summary: 'Workforce filings for listed Korean companies, by gender',
          description:
            'Headcount, tenure and pay by gender, as filed with the Financial Supervisory Service, joined to KRX closing price. One row per company. Ratio fields (`women_share_ratio`, `tenure_ratio_women_to_men`, `pay_ratio_women_to_men`) are raw 0-1 figures, not percentages. `pay_ratio_women_to_men` is null when a filing did not carry the figure — `pay_ratio_withheld_reason` distinguishes a filed reason (not applicable) from an unmeasured gap (also null). This is not a discrimination claim, a benchmark or a company ranking — see the coverage `not_this` notes. `?ticker=` returns one company by its exact KRX code; otherwise a filtered, paginated list.',
          parameters: [
            { name: 'ticker', in: 'query', required: false, schema: { type: 'string' }, description: 'Exact KRX ticker (6 characters; some are alphanumeric), e.g. "005930".' },
            { name: 'market', in: 'query', required: false, schema: { type: 'string' }, description: 'Exact market name, e.g. "KOSPI" or "KOSDAQ".' },
            { name: 'name', in: 'query', required: false, schema: { type: 'string' }, description: 'English or Korean company name. Substring match.' },
            { name: 'limit', in: 'query', required: false, schema: { type: 'integer' }, description: 'Max rows; capped by plan.' },
          ],
          responses: {
            200: { description: 'People rows with source and coverage notes' },
            404: {
              description: 'ticker did not match any filed company.',
              content: { 'application/json': { schema: ERROR_SCHEMA } },
            },
          },
        },
      },
      '/mezzanine': {
        get: {
          tags: ['Markets'],
          operationId: 'getMezzanine',
          summary: 'Convertible bond, bond-with-warrant and exchangeable bond filings',
          description:
            'DART filings for CB, BW and EB — coupon, maturity, strike and refixing-floor terms as filed. One row per filing. `refix_floor_price_krw` is null for EB by design (exchangeable bonds have no refixing floor) — `refix_floor_note` carries the filed reason when one exists; both null means we could not measure it. Not a dilution forecast or a signal — terms as filed only. `?filing_id=` returns one filing by its exact DART receipt number; otherwise a filtered, paginated list.',
          parameters: [
            { name: 'filing_id', in: 'query', required: false, schema: { type: 'string' }, description: 'Exact DART filing id (rcept_no), e.g. "20200601000239".' },
            { name: 'ticker', in: 'query', required: false, schema: { type: 'string' }, description: 'Exact KRX ticker (6 characters; some are alphanumeric).' },
            { name: 'type', in: 'query', required: false, schema: { type: 'string', enum: ['CB', 'BW', 'EB'] }, description: 'Instrument type.' },
            { name: 'name', in: 'query', required: false, schema: { type: 'string' }, description: 'English or Korean company name. Substring match.' },
            { name: 'limit', in: 'query', required: false, schema: { type: 'integer' }, description: 'Max rows; capped by plan.' },
          ],
          responses: {
            200: { description: 'Mezzanine filing rows with source and coverage notes' },
            400: {
              description: 'type was not one of CB, BW or EB.',
              content: { 'application/json': { schema: ERROR_SCHEMA } },
            },
            404: {
              description: 'filing_id did not match any filed instrument.',
              content: { 'application/json': { schema: ERROR_SCHEMA } },
            },
          },
        },
      },
      '/ownership': {
        get: {
          tags: ['Markets'],
          operationId: 'getOwnership',
          summary: 'Substantial-shareholding and officer/major-shareholder ownership filings',
          description:
            'DART ownership disclosures for Korean listed companies, as two filing types selected by `kind`. `kind=filings` (default) is substantial-shareholding (5%+) reports (majorstock) — one row per filing, with `holder_name` exactly as filed. `kind=executives` is officer/major-shareholder ownership status (elestock) — one row per filing, with `person_name` exactly as filed and `is_registered_officer` null when the filer is a major shareholder rather than an officer. Names are never romanized or translated; `reason_raw_ko` (filings only) is the original Korean filing reason, not summarized. Not a full float table — only holders required to file. `?filing_id=` returns one filing by its exact DART receipt number; otherwise a filtered, paginated list.',
          parameters: [
            { name: 'kind', in: 'query', required: false, schema: { type: 'string', enum: ['filings', 'executives'] }, description: 'Which table: filings (substantial shareholding, default) or executives (officer/major-shareholder ownership).' },
            { name: 'filing_id', in: 'query', required: false, schema: { type: 'string' }, description: 'Exact DART filing id (rcept_no), e.g. "20250416000481".' },
            { name: 'ticker', in: 'query', required: false, schema: { type: 'string' }, description: 'Exact KRX ticker (6 characters; some are alphanumeric).' },
            { name: 'name', in: 'query', required: false, schema: { type: 'string' }, description: 'English or Korean company name. Substring match.' },
            { name: 'limit', in: 'query', required: false, schema: { type: 'integer' }, description: 'Max rows; capped by plan.' },
          ],
          responses: {
            200: { description: 'Ownership filing rows with source and coverage notes' },
            400: {
              description: 'kind was neither "filings" nor "executives".',
              content: { 'application/json': { schema: ERROR_SCHEMA } },
            },
            404: {
              description: 'filing_id did not match any filed record for the given kind.',
              content: { 'application/json': { schema: ERROR_SCHEMA } },
            },
          },
        },
      },
    },
  };
}
