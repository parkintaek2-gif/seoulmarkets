/**
 * 데이터 API — `/v1/*`.
 *
 * ── 왜 여기 있는가 ──────────────────────────────────────────────
 * 매출 목표 300억원의 3분의 2가 데이터에서 나온다(docs/사업전략-데이터제공업.md §6).
 * 그러면 API 는 「2단계」가 아니라 본체다. 미디어가 API 의 마케팅이지 그 반대가 아니다.
 *
 * 별도 서버를 띄우지 않고 `server.mjs` 에 붙였다. Cloudtype 메모리가 0.25GB 로
 * 묶여 있고 여유가 0 인데, 정적 서버는 실측 47.6MB 밖에 안 쓴다. **인프라 추가 0원.**
 *
 * ── 설계 원칙 ──────────────────────────────────────────────────
 * 1. **모든 응답에 `as_of` 와 `source` 를 넣는다.** 미디어에서 지키던 규칙 그대로다.
 *    출처 없는 숫자를 내보내지 않는 것이 이 회사의 유일한 자산이다.
 * 2. **모르는 것을 지어내지 않는다.** 사전에 없는 HS 코드는 `null` 로 둔다.
 *    그럴듯한 이름으로 채우는 순간 데이터 상품으로서 끝난다.
 * 3. **아직 없는 데이터는 사실대로 말한다.** 빈 배열을 200 으로 주면
 *    이용자는 「데이터가 없다」와 「우리가 아직 안 받았다」를 구분할 수 없다.
 *
 *    ⚠ 2026-08-02 KST 정정 — 이 원칙은 원래 **503** 으로 구현돼 있었는데,
 *      **운영에서 정반대로 작동하고 있었다.** Cloudtype 프록시가 5xx 응답의 본문을
 *      통째로 자기 에러 페이지(HTML)로 갈아치운다. 실측:
 *
 *        /v1/nosuchthing  404 → 우리 JSON 도착 ✅
 *        /v1/hs/zzz       400 → 우리 JSON 도착 ✅
 *        /v1/research     503 → files.cloudtype.io 회색 화면 ✕
 *
 *      즉 이유를 담아 보낸 503 이 개발자에게는 **이유 없는 회색 화면**으로 갔다.
 *      「정직하게 말한다」는 말이 도착해야 성립한다. 그래서 **404** 로 바꿨다 —
 *      「아직 존재하지 않는 자원」이라는 뜻이 맞고, 무엇보다 **본문이 실제로 간다.**
 *      (조용한 실패의 변종이다. 옆 세션에도 알렸다 — docs/세션간-메모.md)
 *
 *    그리고 **「질의에 안 걸림」과 「아직 안 모음」을 가른다.** 모은 데이터에
 *    조건을 걸어 0건인 것은 정상 응답이므로 200·count 0 이다. 이걸 404 로 주면
 *    이용자가 우리 수집이 멈춘 줄 안다.
 * 4. JSON only. XML 안 준다. 공공데이터포털이 XML 을 주는 게 바로 그들의 문제다.
 * ──────────────────────────────────────────────────────────────
 */

import { readdir } from 'node:fs/promises';
import { gunzip } from 'node:zlib';
import { promisify } from 'node:util';
import path from 'node:path';
import {
  HS_CHAPTERS,
  HS_HEADINGS,
  COUNTRIES,
  describeHs,
  describeCountry,
  DICT_STATS,
} from './trade-dict.mjs';
import { storeStatus, get as storeGet } from './store.mjs';
import {
  INSTITUTIONS,
  INSTITUTION_TYPES,
  INSTITUTION_STATS,
  ENTITY_CURRENT_NAME,
  describeInstitution,
} from './institutions.mjs';
import { RATING_SCALE, RATING_STATS, normaliseRating } from './ratings.mjs';
import { SUBJECT_STATS, describeSubject } from './subjects.mjs';
import { TRADE } from './trade-data.mjs';
/*
 * 🔴 [2026-09-10 · 6번] F2(Korea Valuation Tape)를 /v1 에 붙인다.
 * openapi.mjs 가 이미 이 꼴(JSON 모듈 import, `with { type: 'json' }`)로 research-stats.json 을
 * 읽고 있어 이 서버 환경에서 실제로 도는 것을 확인하고 그대로 따른다 — trade-data.mjs 처럼
 * .mjs 래퍼를 새로 만들지 않는다. 자료 자체가 `scripts/build-korea-valuation-tape.mjs` 의
 * 최종 산출물이라 한 번 더 감쌀 계산이 없다.
 */
import VALUATION_TAPE from '../data/korea-valuation-tape.json' with { type: 'json' };
/*
 * 🔴 [2026-09-10 · 2번] F3·F4 를 /v1 에 붙인다. 5번 실측(18:25) — 새 서버·새 열쇠를
 * 만들지 않는다. 6번의 valuation 과 같은 꼴(JSON 모듈 import)로 자기가 만든 자료를
 * 자기가 붙인다.
 */
import INDEX_TAPE from '../data/korea-index-tape.json' with { type: 'json' };
import ACCOUNT_DICTIONARY from '../data/korea-financial-account-english.json' with { type: 'json' };
/*
 * 🔴 [2026-09-13 · 6번] F7 첫 갈래 — Korea People Tape. 5번 감수(23:29)로 보류를 풀었다
 * (docs/세션간-메모.md) — 「원자료가 없다」가 아니라 집계본만 보고 못 찾은 것이었다.
 * 순서는 people → mezzanine → ownership. 원자료가 508KB 라 index-tape 와 같은 꼴로
 * (JSON 모듈 import, 번들에 통째로 실림) 그대로 따른다.
 */
import PEOPLE_TAPE from '../data/korea-people-tape.json' with { type: 'json' };
/* 🔴 [2026-09-13 · 6번] F7 두 번째 갈래 — Korea Mezzanine Tape. people 과 같은 순서·같은 꼴. */
import MEZZANINE_TAPE from '../data/korea-mezzanine-tape.json' with { type: 'json' };
/* 🔴 [2026-09-13 · 6번] F7 세 번째(마지막) 갈래 — Korea Ownership Ledger.
 * ⛔ 대량보유(filings)·임원주주(executives)는 원자료 모양이 달라 한 표로 합치지 않는다
 *   (build-seoulmarkets-ownership-ledger.mjs 가 이미 정한 것) — 표 둘, ?kind= 로 고른다. */
import OWNERSHIP_FILINGS_TAPE from '../data/korea-ownership-filings-tape.json' with { type: 'json' };
import OWNERSHIP_EXECUTIVES_TAPE from '../data/korea-ownership-executives-tape.json' with { type: 'json' };
import { tierOf, rateCheck, LIMITS, ENFORCE_FROM, TIER_NOTE, TIER_CATALOG } from './tiers.mjs';
import { openapi } from './openapi.mjs';
import { subscribe } from './subscribe.mjs';
import { 발급 as 열쇠발급 } from './apikeys.mjs';

const gunzipAsync = promisify(gunzip);

/** 명세에 박히는 공개 주소. 환경변수로 덮을 수 있게 둔다(스테이징 대비). */
const PUBLIC_BASE = process.env.PUBLIC_BASE_URL ?? 'https://seoulmarkets.com';

const ARCHIVE = path.resolve(process.env.ARCHIVE_DIR ?? 'archive');

/** 수집기가 쓰는 데이터셋 id 와 사람이 읽을 설명. collect.mjs 의 등록부와 짝이다. */
const DATASETS = {
  nitemtrade: {
    label: 'Exports and imports by HS code and partner country',
    agency: 'Korea Customs Service',
    licence: 'Unrestricted (Korea Public Data Portal)',
  },
  'import-flash-item': {
    label: 'Imports by major product, 10-day provisional',
    agency: 'Korea Customs Service',
    licence: 'Unrestricted (Korea Public Data Portal)',
  },
  'export-flash-item': {
    label: 'Exports by major product, 10-day provisional',
    agency: 'Korea Customs Service',
    licence: 'Unrestricted (Korea Public Data Portal)',
  },
};

const json = (status, body, extra = {}) => ({
  status,
  headers: {
    'Content-Type': 'application/json; charset=utf-8',
    // 개발자가 브라우저에서 바로 찔러볼 수 있어야 채택된다. 공개 데이터라 위험이 없다.
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'public, max-age=300',
    ...extra,
  },
  body: JSON.stringify(body, null, 2),
});

const err = (status, code, message, hint) =>
  json(status, { error: { code, message, ...(hint ? { hint } : {}) } }, { 'Cache-Control': 'no-store' });

/** 아카이브에 실제로 뭐가 들어와 있는지 센다. 없으면 0 을 돌려준다(던지지 않는다). */
async function archiveStatus(id) {
  const dir = path.join(ARCHIVE, 'raw', id);
  try {
    const days = await readdir(dir);
    let files = 0;
    let latest = null;
    for (const d of days) {
      let names = [];
      try {
        names = await readdir(path.join(dir, d));
      } catch {
        continue;
      }
      files += names.length;
      if (!latest || d > latest) latest = d;
    }
    return { collected: files > 0, files, days: days.length, latest_day: latest };
  } catch {
    return { collected: false, files: 0, days: 0, latest_day: null };
  }
}

/* ── 증권사 리포트 ───────────────────────────────────────────────
   `/v1` 에서 **처음으로 실제 데이터가 나가는 곳**이다. 분류 사전은 참조표이고,
   여기부터가 「우리가 모았기 때문에 존재하는 것」이다.

   파는 것은 리포트가 아니라 사실이다 — 어느 증권사가 언제 얼마를 제시했는가.
   본문·PDF 는 수집하지도 않았으므로 나갈 것도 없다.
   ──────────────────────────────────────────────────────────── */

/* ── 리서치 인덱스 ───────────────────────────────────────────────
   ⚠ 2026-08-02 KST — 여기가 `/v1/research` 가 503 이던 원인이었다.

   원래는 요청마다 `archive/raw/research/{날짜}/` 를 직접 훑었다. 이 PC 에서는 됐지만
   **Cloudtype 컨테이너에는 `archive/` 가 아예 없다** — `.gitignore` 라 이미지에 안 들어가고,
   영구 디스크도 없어서 재배포마다 비워진다. 그래서 운영에서는 늘 0건이었다.

   R2 에는 원본이 다 있지만 거기서 직접 훑는 것도 답이 아니다 —
   **ListObjectsV2 는 1회 1,000키라 66,071건이면 왕복 66회**다. 요청 하나에 못 시킨다.

   그래서 `scripts/build-research-index.mjs` 가 **읽기용 인덱스 한 개**를 만든다.
   66,071건이 gzip 0.6MB 다. 프로세스가 뜬 뒤 **한 번만** 받아서 메모리에 든다.

     원본   archive/raw/research/{날짜}/{id}.json   183MB   ← 해자. 그대로 둔다
     인덱스 index/research.ndjson.gz               0.6MB   ← 이게 API 가 읽는 것

   인덱스는 파생물이라 잃어도 원본에서 다시 만든다. 잃으면 안 되는 것은 원본이다.
   ──────────────────────────────────────────────────────────── */

const INDEX_KEY = 'index/research.ndjson.gz';

/** 로드된 인덱스. `null` = 아직 안 읽음, `[]` = 읽었는데 없음(둘은 다르다). */
let 인덱스캐시 = null;
let 인덱스메타 = null;
let 인덱스로딩 = null;

async function 인덱스읽기() {
  const buf = await storeGet(INDEX_KEY);
  if (!buf) return { rows: [], meta: null };

  const 본문 = (await gunzipAsync(buf)).toString('utf8');
  const rows = [];
  for (const 줄 of 본문.split('\n')) {
    if (!줄) continue;
    try {
      rows.push(JSON.parse(줄));
    } catch {
      /* 한 줄이 깨져도 나머지는 쓴다. 인덱스는 다시 만들 수 있는 것이다 */
    }
  }
  let meta = null;
  try {
    const m = await storeGet('index/research.meta.json');
    if (m) meta = JSON.parse(m.toString('utf8'));
  } catch { /* 통계가 없어도 데이터는 나간다 */ }
  return { rows, meta };
}

/**
 * 인덱스를 가져온다. **한 번만 읽고 메모리에 든다.**
 *
 * ⚠ 동시에 들어온 요청이 각자 R2 를 때리지 않게 로딩 프라미스를 공유한다.
 *   콜드스타트 직후에 요청이 몰리면 그것만으로 R2 요금과 지연이 배로 든다.
 */
async function 인덱스() {
  if (인덱스캐시) return 인덱스캐시;
  if (!인덱스로딩) {
    인덱스로딩 = 인덱스읽기()
      .then(({ rows, meta }) => {
        인덱스캐시 = rows;
        인덱스메타 = meta;
        return rows;
      })
      .catch((e) => {
        // 실패는 캐시하지 않는다. R2 가 잠깐 죽은 것뿐일 수 있다.
        인덱스로딩 = null;
        throw e;
      });
  }
  return 인덱스로딩;
}

/** `/v1/meta` 가 쓴다. 아직 안 읽었으면 null — 읽으려고 R2 를 때리지는 않는다. */
export function researchIndexMeta() {
  return 인덱스메타;
}

/**
 * 인덱스에서 리포트를 고른다. 인덱스는 **최신순으로 미리 정렬돼 있어서** 앞에서 끊으면 된다.
 *
 * 돌려주는 것은 `{ rows, collected }` 다.
 * `collected:false` 는 「인덱스 자체가 없다」 — 「조건에 안 걸렸다」와 구분해야 한다.
 */
/**
 * `broker` 질의어를 한글 사명 집합으로 바꾼다.
 *
 * ── 왜 필요한가 ─────────────────────────────────────────────────
 * 영문 API 인데 한글로만 검색되면 쓸 수 없다. 그리고 「Mirae Asset」으로 찾았을 때
 * **대우증권 시절 리포트가 안 나오면 그것도 틀린 답**이다 — 같은 회사다.
 *
 * 그래서 셋 다 받는다. 어느 쪽으로 물어도 **같은 법인의 모든 이름**이 걸린다.
 *   한글 사명   "미래에셋"       (부분 일치)
 *   영문명      "Mirae Asset"   (대소문자 무시, 부분 일치)
 *   법인 식별자  "mirae-asset"   (정확 일치)
 */
function 기관질의(q) {
  const 소문자 = q.toLowerCase();
  const 법인 = new Set();
  for (const [ko, v] of Object.entries(INSTITUTIONS)) {
    if (ko.includes(q) || v.en.toLowerCase().includes(소문자) || v.entity === 소문자) 법인.add(v.entity);
  }
  if (법인.size === 0) return null; // 사전에 안 걸린다 → 원문 부분일치로 떨어진다
  const 이름 = new Set();
  for (const [ko, v] of Object.entries(INSTITUTIONS)) if (법인.has(v.entity)) 이름.add(ko);
  return 이름;
}

async function readResearch({ limit = 50, house, stock, since, rating, stance } = {}) {
  const all = await 인덱스();
  if (all.length === 0) return { rows: [], collected: false };

  /* 사전에 걸리면 법인 단위로 넓히고, 안 걸리면 원문 부분일치로 둔다.
     새 증권사가 사전에 들어오기 전에도 검색이 죽지 않게 하려는 것이다. */
  const 이름집합 = house ? 기관질의(house) : null;

  const out = [];
  for (const r of all) {
    if (since && (r.d ?? '') < since) break; // 최신순이라 여기서 끊어도 된다
    if (house) {
      if (이름집합 ? !이름집합.has(r.h) : !r.h?.includes(house)) continue;
    }
    if (stock && !r.s?.includes(stock)) continue;
    /* 의견으로 거르기. 「20년치 매도 의견만」이 한 번에 나와야 상품이 된다.
       원본 22종을 이용자가 다 알 수는 없으므로 **정규화한 값으로만** 받는다. */
    if (rating || stance) {
      const n = normaliseRating(r.o);
      if (!n) continue; // 상세를 안 받은 것은 「의견이 없다」와 다르다. 제외한다
      if (rating && n.code !== rating) continue;
      if (stance && n.stance !== stance) continue;
    }
    out.push(r);
    if (out.length >= limit) break;
  }
  return { rows: out, collected: true };
}

/**
 * 외부 계약. 내부 필드 이름을 그대로 내보내지 않는다.
 * `nid` 는 네이버 내부 식별자라 우리 계약에 넣지 않는다 — 그쪽이 바꾸면 우리가 깨진다.
 */
/**
 * 인덱스의 짧은 키(용량 때문에 줄였다)를 외부 계약 이름으로 편다.
 *
 * ⚠ 2026-08-03 KST — 영문 필드를 **더했다. 기존 필드는 건드리지 않았다.**
 *   `broker` 를 영문으로 바꾸면 같은 질의가 다른 값을 돌려주게 되고, 그건
 *   /v1/meta 에 적어 둔 determinism 약속("The same query returns the same value")을
 *   깨는 것이다. v1 안에서는 **더하기만 한다.**
 */
function researchContract(r) {
  const inst = describeInstitution(r.h);
  return {
    date: r.d,
    broker: r.h,
    /** 영문명. 사전에 없으면 **null 이다 — 추측해서 채우지 않는다.** */
    brokerEn: inst?.en ?? null,
    /**
     * 동일 법인 식별자. **사명이 바뀌어도 이 값은 안 바뀐다.**
     * 아카이브가 20년치라 한 회사가 여러 이름으로 들어 있다 —
     * 이트레이드증권 → 이베스트투자증권 → LS증권이 네 표기로 흩어져 있었다.
     * 「이 증권사의 20년 적중률」을 내려면 이 값으로 묶어야 한다.
     */
    brokerEntity: inst?.entity ?? null,
    /**
     * 기관 유형. **목표주가가 null 인 이유를 여기서 읽을 수 있다.**
     * 평가기관·IR기관은 애초에 목표주가를 제시하지 않는다(4,164건).
     * 이걸 안 가르면 증권사의 누락처럼 보인다.
     */
    brokerType: inst?.type ?? null,
    subject: r.s,
    /**
     * 종목 영문명. **사전에 없으면 null 이다 — 음차로 지어내지 않는다.**
     * 상장사의 공식 영문 표기는 회사가 정한 것이라 규칙으로 못 만든다
     * (SK hynix·NCSOFT·AMOREPACIFIC 처럼 대소문자까지 회사 것이다).
     * 지금 사전 599개가 리포트의 86.1% 를 덮는다. 나머지는 DART corpCode 의
     * `corp_eng_name` 으로 자동 채울 계획이고, 키를 기다리는 중이다.
     *
     * ⚠ 사명이 바뀐 회사도 **아카이브에 적힌 그 이름 그대로** 영문을 붙인다.
     *   2014년 리포트의 「대우조선해양」을 2026년 사명으로 부르면 기록이 아니라 왜곡이다.
     */
    subjectEn: describeSubject(r.s),
    /** 목표주가. **제시하지 않은 리포트가 실제로 있다.** 0 이나 추정으로 채우지 않는다. */
    targetPrice: r.p ?? null,
    /** **증권사가 실제로 쓴 말.** 22종으로 갈려 있지만 이것이 사실이라 그대로 둔다 */
    rating: r.o ?? null,
    /**
     * 정규화한 의견. 원본 22종(한글·영문·대소문자·오타·잘린 표기)을 8단계로 편다.
     * `score` 는 **우리가 집계용으로 부여한 순서**이지 증권사가 매긴 숫자가 아니다.
     * 사전에 없는 새 표기는 `code:"unknown"` 으로 드러난다 — 추측해서 채우지 않는다.
     */
    ratingNormalised: normaliseRating(r.o),
    analyst: r.a ?? null,
    /** 상세를 아직 안 받은 항목은 목표주가가 null 이다. 그 구분을 밝힌다. */
    detailFetched: Boolean(r.f),
    source: { agency: 'Naver Finance (aggregator)', note: 'Facts only. Report text and PDF are not collected.' },
  };
}

async function research(params, tier = 'free') {
  /* 1회 최대 건수가 등급의 실체다. 66,093건을 통째로 가져가려면
     무료(200)로는 331번을 불러야 하고, 유료(1,000)면 67번이다. 값은 여기서 갈린다. */
  const 최대 = LIMITS[tier]?.maxPageSize ?? LIMITS.free.maxPageSize;
  const limit = Math.min(Number(params.get('limit')) || 50, 최대);
  /* 잘못된 값을 조용히 무시하면 이용자는 「그런 의견이 없다」로 오해한다.
     사전에 없는 값이면 무엇을 쓸 수 있는지 알려 준다. */
  const rating = params.get('rating');
  if (rating && !RATING_SCALE[rating]) {
    return err(
      400,
      'unknown_rating',
      `No such rating: ${rating}`,
      `Use one of: ${Object.keys(RATING_SCALE).join(', ')}. These are our normalised levels, not the broker's own wording.`,
    );
  }
  const stance = params.get('stance');
  if (stance && !['positive', 'neutral', 'negative'].includes(stance)) {
    return err(400, 'unknown_stance', `No such stance: ${stance}`, 'Use positive, neutral or negative.');
  }

  const { rows, collected } = await readResearch({
    limit,
    house: params.get('broker') ?? undefined,
    stock: params.get('subject') ?? undefined,
    since: params.get('since') ?? undefined,
    rating: rating ?? undefined,
    stance: stance ?? undefined,
  });

  /* 「아직 안 모았다」만 오류다. 모은 것에 조건을 걸어 0건인 것은 정상 응답이다.
     ⚠ 503 이 아니라 404 인 이유는 파일 머리 설계원칙 3 을 볼 것 —
       Cloudtype 프록시가 5xx 본문을 자기 에러 페이지로 갈아치운다. */
  if (!collected) {
    return err(
      404,
      'collection_not_started',
      'No brokerage reports have been collected yet.',
      'Collection runs twice daily. /v1/meta shows what the archive holds.',
    );
  }

  const meta = researchIndexMeta();
  return json(200, {
    count: rows.length,
    results: rows.map(researchContract),
    coverage: {
      /* 「이 응답이 얼마 중 얼마인가」를 밝힌다. 개발자가 채택을 결정하는 숫자다 */
      ...(meta
        ? {
            total_records: meta.records,
            first_day: meta.first_day,
            latest_day: meta.latest_day,
            brokers: meta.brokers,
            subjects: meta.subjects,
            as_of: meta.generated_at_kst ? `${meta.generated_at_kst} KST` : null,
          }
        : {}),
      note: 'Target price and rating are facts stated by the broker. We do not collect or redistribute report text, PDFs or charts.',
      /**
       * ⚠ 2026-08-03 KST — **커버리지 편향을 숨기지 않는다.**
       *
       * 기관별로 세어 보니 대형사가 거의 없다. 삼성증권 381건, 한국투자 179건,
       * KB 27건, NH 10건이다. 그 하우스들의 **실제 발행량이 이럴 리가 없다.**
       * 즉 이 아카이브는 「한국 증권사 리서치 전부」가 아니라 **「집계처가 싣는 것」**이다.
       *
       * 밝히지 않으면 첫 이용자가 삼성증권을 조회하고 우리를 버린다.
       * **먼저 말하면 한계이고, 들키면 거짓말이다.**
       */
      caveat:
        'Coverage is uneven by house. This archive reflects what our aggregation source carries, not the full output of Korean research. Several large houses are heavily under-represented — Samsung Securities 381 records, Korea Investment & Securities 179, KB 27, NH 10 — which is not their actual publishing volume. Use /v1/institutions with per-house counts before assuming a house is absent from the market rather than from this archive. We are working to receive reports directly from research desks, which is the only way to close this gap.',
    },
  });
}

/**
 * GET /v1/trade/exports — 관세청 국가별 월 수출입.
 *
 * 직접 관세청 품목별 피드(nitemtrade)가 나오기 전까지의 **국가×월** 서비스다.
 * 데이터는 KOSIS 360(관세청 통관통계)에서 받아 git 에 번들했다(trade-data.mjs) —
 * R2 없이도 라이브가 실제 데이터를 준다. 「키 나올 때까지 손놓는다」를 하지 않는다.
 *
 * 설계원칙 3 그대로: 필터로 0건인 것은 200·count 0(정상). 안 모은 것만 오류다.
 */
/** 국가 질의어 정규화. 대소문자·점·공백을 지운다("U.S.A"→"usa"). */
const 국가정규화 = (s) => String(s).toLowerCase().replace(/[^a-z0-9]/g, '');

/** ISO 별칭 → KOSIS 국명에 든 조각. "CN"·"CHN"·"united states" 를 잇는다. */
const 국가별칭 = {
  cn: 'china', chn: 'china',
  us: 'usa', usa: 'usa', unitedstates: 'usa', unitedstatesofamerica: 'usa',
  uk: 'unitedkingdom', gb: 'unitedkingdom', gbr: 'unitedkingdom',
  jp: 'japan', jpn: 'japan', vn: 'vietnam', vnm: 'vietnam',
  hk: 'hongkong', hkg: 'hongkong', tw: 'taiwan', twn: 'taiwan',
  de: 'germany', deu: 'germany', sg: 'singapore', sgp: 'singapore',
  my: 'malaysia', mys: 'malaysia', in: 'india', ind: 'india',
  au: 'australia', aus: 'australia', sa: 'saudiarabia', sau: 'saudiarabia',
  id: 'indonesia', idn: 'indonesia', th: 'thailand', tha: 'thailand',
  ph: 'philippines', phl: 'philippines', ae: 'unitedarabemirates', are: 'unitedarabemirates',
};

/** 질의어를 TRADE.countries 의 한 나라로 잇는다. 못 이으면 null(→ 400). */
function 국가찾기(q) {
  const n0 = 국가정규화(q);
  if (!n0) return null;
  const target = 국가별칭[n0] || n0;
  return TRADE.countries.find((c) => 국가정규화(c.name_en).includes(target)) || null;
}

function tradeExports(params, tier = 'free') {
  const 최대 = LIMITS[tier]?.maxPageSize ?? LIMITS.free.maxPageSize;
  const limit = Math.min(Number(params.get('limit')) || 50, 최대);
  const since = params.get('since'); // YYYY-MM
  const wantCountry = (params.get('country') || '').trim().toLowerCase();

  const bySince = (m) => (since ? m.month >= since : true);

  let scope, rows, matchedCountry = null;
  if (wantCountry) {
    // 영문 국명·ISO 코드(CN·CHN·US·USA…)를 잇는다. 못 알아듣는 이름은 200·0 이 아니라 오류다 —
    // 243개국이 다 있는데 0 을 「자료 없음」으로 읽고 떠나는 자리이기 때문이다(2번 지시 8/21).
    const hit = 국가찾기(params.get('country'));
    if (!hit) {
      return err(
        400,
        'unknown_country',
        `No partner matched "${params.get('country')}".`,
        'Use an English name or ISO code — e.g. country=china | CN | vietnam | VN | US | "u.s.a". All 243 partners are present; see /v1/countries.',
      );
    }
    matchedCountry = hit.name_en;
    scope = 'partner_country';
    rows = hit.months.filter(bySince);
  } else {
    scope = 'national_total';
    rows = TRADE.national.filter(bySince);
  }

  const sliced = rows.slice(0, limit);
  return json(200, {
    count: sliced.length,
    scope,
    ...(matchedCountry ? { partner: matchedCountry } : {}),
    results: sliced.map((m) => ({
      month: m.month,
      exports_usd_thousand: m.exports,
      imports_usd_thousand: m.imports,
      balance_usd_thousand: m.balance,
    })),
    coverage: { ...tradeCoverage(), returned_of: rows.length, partners_available: TRADE.countries.length },
  });
}

/** /v1/trade/exports 응답에 붙는 출처·한계. 숨기지 않는다. */
function tradeCoverage() {
  return {
    source: `${TRADE.source.org} — ${TRADE.source.dataset}`,
    unit: TRADE.source.unit,
    licence: TRADE.source.licence,
    granularity: TRADE.granularity,
    window: TRADE.window,
    as_of: TRADE.as_of,
    hs_note: TRADE.hs_note,
    caveat:
      'Customs figures are provisional and get revised; the latest month is the least settled. Hong Kong includes entrepôt re-exports trans-shipped onward to mainland China, so its bilateral balance overstates final demand. This is goods trade on a customs basis, not the current account.',
  };
}

/**
 * /v1/valuation — F2 Korea Valuation Tape. 2026-09-10 6번.
 * ⛔ 필드 이름은 밖으로 나가는 이름을 따로 정한다(위 「응답 계약」 원칙) — 엔진 칸 이름
 *   (build-korea-valuation-tape.mjs 의 camelCase)을 그대로 흘리지 않는다.
 */
function valuationCoverage() {
  const m = VALUATION_TAPE?._meta ?? {};
  return {
    source: 'DART (financial statements) + Korea Public Data Portal (daily KRX prices)',
    price_as_of: m.priceAsOf ?? null,
    fiscal_year: m.fiscalYear ?? null,
    report: m.report ?? null,
    built_at: m.builtAt ?? null,
    rows: m.rows ?? (Array.isArray(VALUATION_TAPE?.rows) ? VALUATION_TAPE.rows.length : 0),
    with_per: m.withPer ?? null,
    with_pbr: m.withPbr ?? null,
    with_roe: m.withRoe ?? null,
    not_measured: m.notMeasured ?? null,
    note: m.note ?? null,
    how_to_read: m.howToRead ?? null,
  };
}

function valuationRow(r) {
  return {
    ticker: r.ticker,
    name: r.name,
    name_en: r.nameEn,
    market: r.market,
    industry: r.industry,
    industry_en: r.industryEn,
    price_as_of: r.priceAsOf,
    fiscal_year: r.fiscalYear,
    report: r.report,
    basis: r.basis,
    market_cap_krw: r.marketCap,
    net_income_krw: r.netIncome,
    total_equity_krw: r.totalEquity,
    total_assets_krw: r.totalAssets,
    revenue_krw: r.revenue,
    operating_income_krw: r.operatingIncome,
    per: r.per,
    pbr: r.pbr,
    roe: r.roe,
    debt_to_equity: r.debtToEquity,
    not_measured: r.notMeasured,
  };
}

function valuation(params, tier = 'free') {
  const rows = Array.isArray(VALUATION_TAPE?.rows) ? VALUATION_TAPE.rows : [];

  const tickerQ = (params.get('ticker') || '').trim();
  if (tickerQ) {
    const hit = rows.find((r) => r.ticker === tickerQ);
    if (!hit) {
      return err(
        404,
        'unknown_ticker',
        `No such ticker: ${tickerQ}`,
        'Use the 6-digit KRX short code, e.g. ticker=005930. Browse /v1/valuation without a ticker for the full list.',
      );
    }
    return json(200, { result: valuationRow(hit), coverage: valuationCoverage() });
  }

  const 최대 = LIMITS[tier]?.maxPageSize ?? LIMITS.free.maxPageSize;
  const limit = Math.min(Number(params.get('limit')) || 50, 최대);
  const industryQ = (params.get('industry') || '').trim().toLowerCase();
  const measuredOnly = params.get('measured') === 'true';

  let filtered = rows;
  if (industryQ) {
    filtered = filtered.filter(
      (r) => String(r.industryEn ?? '').toLowerCase().includes(industryQ)
        || String(r.industry ?? '').toLowerCase().includes(industryQ),
    );
  }
  /* ⛔ notMeasured 가 null 이면 「붙었다」다 — 위 build-korea-valuation-tape.mjs 규약 그대로 */
  if (measuredOnly) filtered = filtered.filter((r) => !r.notMeasured);

  const sliced = filtered.slice(0, limit);
  return json(200, {
    count: sliced.length,
    returned_of: filtered.length,
    results: sliced.map(valuationRow),
    coverage: valuationCoverage(),
  });
}

/**
 * /v1/index-tape — F4 Korea Index Tape. 2026-09-10 2번.
 * ⛔ 엔진 칸 이름(build-korea-index-tape.mjs 의 camelCase)을 그대로 흘리지 않는다.
 */
function indexTapeCoverage() {
  const m = INDEX_TAPE?._meta ?? {};
  return {
    source: 'Korea public data portal + KRX index series',
    snapshot_date: m.snapshotDate ?? null,
    source_file: m.sourceFile ?? null,
    built_at: m.builtAt ?? null,
    rows: m.rows ?? (Array.isArray(INDEX_TAPE?.rows) ? INDEX_TAPE.rows.length : 0),
    with_name_en: m.withNameEn ?? null,
    with_year_low: m.withYearLow ?? null,
    year_low_not_measured: m.yearLowNotMeasured ?? null,
    note: m.note ?? null,
    why_rows_are_kept: m.whyRowsAreKept ?? null,
  };
}

function indexTapeRow(r) {
  return {
    date: r.date,
    name: r.name,
    name_en: r.nameEn,
    family: r.family,
    family_en: r.familyEn,
    constituent_count: r.constituentCount,
    is_computed_index: r.isComputedIndex,
    close: r.close,
    change: r.change,
    change_pct: r.changePct,
    open: r.open,
    high: r.high,
    low: r.low,
    volume: r.volume,
    trading_value_krw: r.tradingValue,
    market_cap_krw: r.marketCap,
    year_high: r.yearHigh,
    year_high_date: r.yearHighDate,
    year_low: r.yearLow,
    year_low_date: r.yearLowDate,
    /* ⛔ [2026-09-10 실측] year_low=0 이 연최저일보다 «미래»인 스냅숏 sentinel 이면
       빌더가 이미 null 로 내렸다 — 여기서는 그 까닭만 그대로 흘린다 */
    year_low_not_measured: r.yearLowNotMeasured,
    base_date: r.baseDate,
    base_index: r.baseIndex,
    ytd_change_pct: r.ytdChangePct,
  };
}

function indexTape(params, tier = 'free') {
  const rows = Array.isArray(INDEX_TAPE?.rows) ? INDEX_TAPE.rows : [];

  const nameQ = (params.get('name') || '').trim().toLowerCase();
  const hit = nameQ ? rows.find((r) => String(r.nameEn ?? '').toLowerCase() === nameQ
    || String(r.name ?? '').toLowerCase() === nameQ) : null;
  if (nameQ && !hit) {
    return err(
      404,
      'unknown_index',
      `No such index: ${nameQ}`,
      'Use the English or Korean index name exactly, e.g. name=KOSPI 200. Browse /v1/index-tape without a name for the full list.',
    );
  }
  if (hit) return json(200, { result: indexTapeRow(hit), coverage: indexTapeCoverage() });

  const 최대 = LIMITS[tier]?.maxPageSize ?? LIMITS.free.maxPageSize;
  const limit = Math.min(Number(params.get('limit')) || 50, 최대);
  const familyQ = (params.get('family') || '').trim().toLowerCase();

  let filtered = rows;
  if (familyQ) {
    filtered = filtered.filter(
      (r) => String(r.familyEn ?? '').toLowerCase().includes(familyQ)
        || String(r.family ?? '').toLowerCase().includes(familyQ),
    );
  }

  const sliced = filtered.slice(0, limit);
  return json(200, {
    count: sliced.length,
    returned_of: filtered.length,
    results: sliced.map(indexTapeRow),
    coverage: indexTapeCoverage(),
  });
}

/**
 * /v1/people — F7 Korea People Tape. 2026-09-13 6번.
 * ⛔ women_share·근속비·급여비는 원본 그대로 «비율»이다 — 무료 지면(/data/people)처럼
 *   퍼센트로 곱해 내지 않는다. API 는 원자료 그대로가 원칙이다(강령 ③).
 */
function peopleCoverage() {
  const m = PEOPLE_TAPE?._meta ?? {};
  return {
    source: m.source ?? null,
    built_at: m.builtAt ?? null,
    source_file: m.sourceFile ?? null,
    rows: m.rows ?? (Array.isArray(PEOPLE_TAPE?.rows) ? PEOPLE_TAPE.rows.length : 0),
    with_pay_ratio: m.withPayRatio ?? null,
    pay_withheld_with_reason: m.payWithheldWithReason ?? null,
    pay_withheld_no_reason: m.payWithheldNoReason ?? null,
    pay_ratio_withheld_reason_note: m.payRatioWithheldReasonNote ?? null,
    not_this: m.notThis ?? null,
  };
}

function peopleRow(r) {
  return {
    ticker: r.ticker,
    name_en: r.nameEn,
    name_ko: r.nameKo,
    market: r.market,
    sector_ko: r.sectorKo,
    fiscal_year: r.fiscalYear,
    headcount: r.headcount,
    men: r.men,
    women: r.women,
    women_share_ratio: r.womenShareRatio,
    tenure_years: r.tenureYears,
    tenure_years_men: r.tenureYearsMen,
    tenure_years_women: r.tenureYearsWomen,
    tenure_ratio_women_to_men: r.tenureRatioWomenToMen,
    annual_pay_per_person_krw_men: r.annualPayPerPersonKrwMen,
    annual_pay_per_person_krw_women: r.annualPayPerPersonKrwWomen,
    pay_ratio_women_to_men: r.payRatioWomenToMen,
    pay_ratio_withheld_reason: r.payRatioWithheldReason,
    close_price_krw: r.closePriceKrw,
    market_cap_krw: r.marketCapKrw,
    listed_shares: r.listedShares,
    price_as_of: r.priceAsOf,
  };
}

function people(params, tier = 'free') {
  const rows = Array.isArray(PEOPLE_TAPE?.rows) ? PEOPLE_TAPE.rows : [];

  const tickerQ = (params.get('ticker') || '').trim();
  if (tickerQ) {
    const hit = rows.find((r) => r.ticker === tickerQ);
    if (!hit) {
      return err(
        404,
        'unknown_ticker',
        `No such ticker: ${tickerQ}`,
        'Use the exact KRX ticker (6 characters, may be alphanumeric), e.g. ticker=005930. Browse /v1/people without a ticker for the full list.',
      );
    }
    return json(200, { result: peopleRow(hit), coverage: peopleCoverage() });
  }

  const 최대 = LIMITS[tier]?.maxPageSize ?? LIMITS.free.maxPageSize;
  const limit = Math.min(Number(params.get('limit')) || 50, 최대);
  const marketQ = (params.get('market') || '').trim().toLowerCase();
  const nameQ = (params.get('name') || '').trim().toLowerCase();

  let filtered = rows;
  if (marketQ) filtered = filtered.filter((r) => String(r.market ?? '').toLowerCase() === marketQ);
  if (nameQ) {
    filtered = filtered.filter(
      (r) => String(r.nameEn ?? '').toLowerCase().includes(nameQ) || String(r.nameKo ?? '').includes(nameQ),
    );
  }

  const sliced = filtered.slice(0, limit);
  return json(200, {
    count: sliced.length,
    returned_of: filtered.length,
    results: sliced.map(peopleRow),
    coverage: peopleCoverage(),
  });
}

/**
 * /v1/mezzanine — F7 Korea Mezzanine Tape. 2026-09-13 6번.
 * ⛔ refixFloorPriceKrw 가 null 인 것을 0 으로 안 낸다 — EB 는 그 칸이 애초에 없다.
 *   refixFloorNote 가 있으면 「해당 없음」, 둘 다 없으면 「못 쟀다」다.
 */
function mezzanineCoverage() {
  const m = MEZZANINE_TAPE?._meta ?? {};
  return {
    source: m.source ?? null,
    built_at: m.builtAt ?? null,
    source_file: m.sourceFile ?? null,
    rows: m.rows ?? (Array.isArray(MEZZANINE_TAPE?.rows) ? MEZZANINE_TAPE.rows.length : 0),
    by_type: m.byType ?? null,
    with_refix_floor: m.withFloor ?? null,
    refix_floor_withheld_with_note: m.floorWithheldWithNote ?? null,
    refix_floor_withheld_no_note: m.floorWithheldNoNote ?? null,
    refix_floor_note: m.refixFloorNote ?? null,
    not_this: m.notThis ?? null,
  };
}

function mezzanineRow(r) {
  return {
    ticker: r.ticker,
    name_en: r.nameEn,
    name_ko: r.nameKo,
    filing_id: r.filingId,
    instrument_type: r.instrumentType,
    board_resolution_date: r.boardResolutionDate,
    instrument_kind_ko: r.instrumentKindKo,
    total_face_value_krw: r.totalFaceValueKrw,
    coupon_rate_pct: r.couponRatePct,
    maturity_rate_pct: r.maturityRatePct,
    maturity_date: r.maturityDate,
    strike_price_krw: r.strikePriceKrw,
    strike_ratio_pct: r.strikeRatioPct,
    strike_window_start: r.strikeWindowStart,
    strike_window_end: r.strikeWindowEnd,
    refix_floor_price_krw: r.refixFloorPriceKrw,
    refix_floor_note: r.refixFloorNote,
    subscription_date: r.subscriptionDate,
    payment_date: r.paymentDate,
    private_placement: r.privatePlacement,
  };
}

function mezzanine(params, tier = 'free') {
  const rows = Array.isArray(MEZZANINE_TAPE?.rows) ? MEZZANINE_TAPE.rows : [];

  const filingIdQ = (params.get('filing_id') || '').trim();
  if (filingIdQ) {
    const hit = rows.find((r) => r.filingId === filingIdQ);
    if (!hit) {
      return err(
        404,
        'unknown_filing_id',
        `No such filing_id: ${filingIdQ}`,
        'Use the exact DART filing id (rcept_no), e.g. filing_id=20200601000239. Browse /v1/mezzanine without filing_id for the full list.',
      );
    }
    return json(200, { result: mezzanineRow(hit), coverage: mezzanineCoverage() });
  }

  const 최대 = LIMITS[tier]?.maxPageSize ?? LIMITS.free.maxPageSize;
  const limit = Math.min(Number(params.get('limit')) || 50, 최대);
  const tickerQ = (params.get('ticker') || '').trim();
  const typeQ = (params.get('type') || '').trim().toUpperCase();
  const nameQ = (params.get('name') || '').trim().toLowerCase();

  let filtered = rows;
  if (tickerQ) filtered = filtered.filter((r) => r.ticker === tickerQ);
  if (typeQ) {
    if (!['CB', 'BW', 'EB'].includes(typeQ)) {
      return err(400, 'unknown_type', `Unknown type: ${typeQ}`, 'Use type=CB, type=BW or type=EB.');
    }
    filtered = filtered.filter((r) => r.instrumentType === typeQ);
  }
  if (nameQ) {
    filtered = filtered.filter(
      (r) => String(r.nameEn ?? '').toLowerCase().includes(nameQ) || String(r.nameKo ?? '').includes(nameQ),
    );
  }

  const sliced = filtered.slice(0, limit);
  return json(200, {
    count: sliced.length,
    returned_of: filtered.length,
    results: sliced.map(mezzanineRow),
    coverage: mezzanineCoverage(),
  });
}

/**
 * /v1/ownership — F7 Korea Ownership Ledger. 2026-09-13 6번.
 * ⛔ 두 표(filings·executives)를 억지로 한 모양으로 합치지 않는다 — ?kind= 로 고른다.
 * ⛔ holder_name·person_name 은 원문 그대로다(로마자를 지어내지 않는다).
 */
function ownershipFilingsCoverage() {
  const m = OWNERSHIP_FILINGS_TAPE?._meta ?? {};
  return {
    source: m.source ?? null,
    built_at: m.builtAt ?? null,
    source_file: m.sourceFile ?? null,
    rows: m.rows ?? (Array.isArray(OWNERSHIP_FILINGS_TAPE?.rows) ? OWNERSHIP_FILINGS_TAPE.rows.length : 0),
    by_kind: m.byKind ?? null,
    unmapped_kind: m.unmappedKind ?? null,
    with_related_party: m.withRelatedParty ?? null,
    not_this: m.notThis ?? null,
  };
}

function ownershipFilingsRow(r) {
  return {
    ticker: r.ticker,
    name_en: r.nameEn,
    name_ko: r.nameKo,
    filing_id: r.filingId,
    filed_on: r.filedOn,
    filing_kind: r.filingKind,
    holder_name: r.holderName,
    shares_held: r.sharesHeld,
    shares_change: r.sharesChange,
    stake_pct: r.stakePct,
    stake_change_pct: r.stakeChangePct,
    related_party_shares: r.relatedPartyShares,
    related_party_pct: r.relatedPartyPct,
    reason_raw_ko: r.reasonRawKo,
  };
}

function ownershipExecutivesCoverage() {
  const m = OWNERSHIP_EXECUTIVES_TAPE?._meta ?? {};
  return {
    source: m.source ?? null,
    built_at: m.builtAt ?? null,
    source_file: m.sourceFile ?? null,
    rows: m.rows ?? (Array.isArray(OWNERSHIP_EXECUTIVES_TAPE?.rows) ? OWNERSHIP_EXECUTIVES_TAPE.rows.length : 0),
    by_officer_status: m.byOfficerStatus ?? null,
    not_this: m.notThis ?? null,
  };
}

function ownershipExecutivesRow(r) {
  return {
    ticker: r.ticker,
    name_en: r.nameEn,
    name_ko: r.nameKo,
    filing_id: r.filingId,
    filed_on: r.filedOn,
    person_name: r.personName,
    is_registered_officer: r.isRegisteredOfficer,
    title: r.title,
    relationship: r.relationship,
    shares_held: r.sharesHeld,
    shares_change: r.sharesChange,
    stake_pct: r.stakePct,
    stake_change_pct: r.stakeChangePct,
  };
}

function ownership(params, tier = 'free') {
  const kindQ = (params.get('kind') || 'filings').trim().toLowerCase();
  if (!['filings', 'executives'].includes(kindQ)) {
    return err(400, 'unknown_kind', `Unknown kind: ${kindQ}`, 'Use kind=filings (substantial-shareholding, default) or kind=executives (officer/major-shareholder ownership).');
  }

  const isFilings = kindQ === 'filings';
  const rows = isFilings
    ? (Array.isArray(OWNERSHIP_FILINGS_TAPE?.rows) ? OWNERSHIP_FILINGS_TAPE.rows : [])
    : (Array.isArray(OWNERSHIP_EXECUTIVES_TAPE?.rows) ? OWNERSHIP_EXECUTIVES_TAPE.rows : []);
  const rowFn = isFilings ? ownershipFilingsRow : ownershipExecutivesRow;
  const coverageFn = isFilings ? ownershipFilingsCoverage : ownershipExecutivesCoverage;

  const filingIdQ = (params.get('filing_id') || '').trim();
  if (filingIdQ) {
    const hit = rows.find((r) => r.filingId === filingIdQ);
    if (!hit) {
      return err(
        404,
        'unknown_filing_id',
        `No such filing_id for kind=${kindQ}: ${filingIdQ}`,
        'Use the exact DART filing id (rcept_no), e.g. filing_id=20200601000239. Browse /v1/ownership without filing_id for the full list.',
      );
    }
    return json(200, { result: rowFn(hit), coverage: coverageFn() });
  }

  const 최대 = LIMITS[tier]?.maxPageSize ?? LIMITS.free.maxPageSize;
  const limit = Math.min(Number(params.get('limit')) || 50, 최대);
  const tickerQ = (params.get('ticker') || '').trim();
  const nameQ = (params.get('name') || '').trim().toLowerCase();

  let filtered = rows;
  if (tickerQ) filtered = filtered.filter((r) => r.ticker === tickerQ);
  if (nameQ) {
    filtered = filtered.filter(
      (r) => String(r.nameEn ?? '').toLowerCase().includes(nameQ) || String(r.nameKo ?? '').includes(nameQ),
    );
  }

  const sliced = filtered.slice(0, limit);
  return json(200, {
    kind: kindQ,
    count: sliced.length,
    returned_of: filtered.length,
    results: sliced.map(rowFn),
    coverage: coverageFn(),
  });
}

/**
 * /v1/account-dictionary — F3 영문 계정·재무제표명 사전. 2026-09-10 2번.
 * ⛔ 사전에 없는 계정명은 「unmapped:<원문>」이지 짐작 번역이 아니다 —
 *   그 규약(scripts/lib/financial-account-en.mjs 계정명영문())을 여기서도 그대로 지킨다.
 */
function accountDictionaryCoverage() {
  const m = ACCOUNT_DICTIONARY?._meta ?? {};
  return {
    source: 'Hand-mapped from DART fnlttSinglAcntAll account_nm to standard K-IFRS English terms',
    account_count: Object.keys(ACCOUNT_DICTIONARY?.accountNames ?? {}).length,
    statement_count: Object.keys(ACCOUNT_DICTIONARY?.statementNames ?? {}).length,
    note: m.note ?? null,
    coverage: m.coverage ?? null,
    unmeasured: m.unmeasured ?? null,
    fallback: m.fallback ?? null,
  };
}

function accountDictionary(params, tier = 'free') {
  const type = (params.get('type') || 'account').trim().toLowerCase();
  if (type !== 'account' && type !== 'statement') {
    return err(400, 'unknown_type', `Unknown type: ${type}`, 'Use type=account (default) or type=statement.');
  }
  const table = type === 'statement' ? (ACCOUNT_DICTIONARY?.statementNames ?? {}) : (ACCOUNT_DICTIONARY?.accountNames ?? {});

  const q = (params.get('q') || '').trim().toLowerCase();
  const matched = Object.entries(table)
    .filter(([ko, en]) => !q || ko.toLowerCase().includes(q) || String(en).toLowerCase().includes(q))
    .map(([korean, english]) => ({ korean, english }));

  const 최대 = LIMITS[tier]?.maxPageSize ?? LIMITS.free.maxPageSize;
  const limit = Math.min(Number(params.get('limit')) || 최대, 최대);
  const sliced = matched.slice(0, limit);

  return json(200, {
    type,
    count: sliced.length,
    returned_of: matched.length,
    entries: sliced,
    coverage: accountDictionaryCoverage(),
  });
}

/* ── 라우트 ─────────────────────────────────────────────────── */

/** GET /v1 — 무엇이 있는지. 개발자가 처음 여는 문이다. */
async function root() {
  return json(200, {
    service: 'SeoulMarkets Data API',
    version: 'v1',
    description:
      'Korean official statistics, normalised to English. JSON only. Every response names its source.',
    docs: 'https://seoulmarkets.com/about',
    endpoints: {
      'GET /v1/openapi.json': 'OpenAPI 3.1 specification — import this into your client generator',
      'GET /v1/meta': 'Coverage, dictionary size and what has actually been collected',
      'GET /v1/hs/{code}': 'Resolve an HS code (2, 4, 6 or 10 digits) to its English description',
      'GET /v1/hs?q=': 'Search HS chapters and headings by English keyword',
      'GET /v1/countries': 'Partner country codes and English names',
      'GET /v1/institutions':
        'Korean research institutions in English — official names, rename history, and which ones actually issue target prices',
      'GET /v1/research':
        'Brokerage target prices and ratings — facts only, no report text. Filter by Korean name, English name or entity id',
      'GET /v1/trade/flash': "Korea's 10-day provisional trade figures (1st, 11th, 21st, 09:00 KST)",
      'GET /v1/trade/exports':
        'Exports, imports and balance by partner country and month (customs basis). National totals by default; ?country= for one partner, ?since=YYYY-MM to trim. HS-code granularity arrives with the direct customs feed.',
      'GET /v1/valuation':
        'PER, PBR, ROE and debt-to-equity for listed Korean companies, with the price date and financial-statement vintage the multiple was computed from. ?ticker= for one company (6-digit KRX code), ?industry= to filter, ?measured=true to drop rows without a usable multiple.',
      'GET /v1/index-tape':
        'Daily levels for 168 KRX indices (KOSPI, KOSDAQ, KRX and theme series), in English. ?name= for one index (English or Korean), ?family= to filter by series.',
      'GET /v1/account-dictionary':
        'Korean financial-statement account and statement names mapped to standard English (K-IFRS terms), hand-mapped from real DART filings — not machine translation. ?type=account (default) or ?type=statement, ?q= to search.',
      'GET /v1/people':
        'Workforce filings for listed Korean companies — headcount, tenure and pay by gender, joined to KRX closing price. One row per company-fiscal-year. ?ticker= for one company (exact KRX code), ?market= to filter (KOSPI/KOSDAQ), ?name= to search by English or Korean name. Ratios (women share, tenure, pay) are raw 0-1 figures, not percentages.',
      'GET /v1/mezzanine':
        'DART filings for convertible bonds (CB), bonds with warrants (BW) and exchangeable bonds (EB) — coupon, maturity, strike and refixing-floor terms as filed. One row per filing. ?filing_id= for one filing (exact DART rcept_no), ?ticker= for one company, ?type=CB|BW|EB, ?name= to search. refixFloorPriceKrw is null for EB by design (no refixing floor exists) — see refix_floor_note.',
    },
    licence: 'Source data published by Korean agencies under an unrestricted-use licence.',
    contact: 'sibcheongan@gmail.com',
  });
}

/** GET /v1/meta — 커버리지와 수집 현황을 정직하게 드러낸다. */
async function meta() {
  const datasets = {};
  for (const [id, d] of Object.entries(DATASETS)) {
    datasets[id] = { ...d, ...(await archiveStatus(id)) };
  }

  /* 리서치는 파일 개수가 아니라 인덱스에서 센다 — 66,071 파일을 매 요청 세지 않는다.
     ⚠ 인덱스를 **여기서 읽는다.** /v1/meta 가 첫 요청이면 이 호출이 R2 를 한 번 때리고,
       그 뒤로는 /v1/research 도 같은 캐시를 쓴다. 어느 쪽이 먼저 오든 한 번뿐이다. */
  try {
    await 인덱스();
    const m = researchIndexMeta();
    datasets.research = {
      label: 'Brokerage target prices and ratings',
      agency: 'Naver Finance (aggregator)',
      licence: 'Facts only — no report text, PDF or chart is collected or redistributed.',
      collected: (인덱스캐시?.length ?? 0) > 0,
      ...(m
        ? {
            records: m.records,
            detail_fetched: m.detail_fetched,
            with_target_price: m.with_target_price,
            brokers: m.brokers,
            subjects: m.subjects,
            first_day: m.first_day,
            latest_day: m.latest_day,
            index_built_kst: m.generated_at_kst,
          }
        : {}),
    };
  } catch (e) {
    /* 인덱스를 못 읽는 것은 사고다. **숨기지 않는다** — /v1/meta 는 「무엇이 되고 있나」를
       보는 창이고, 여기서 조용히 빠지면 며칠 뒤에나 안다. */
    datasets.research = {
      label: 'Brokerage target prices and ratings',
      collected: false,
      error: 'Index could not be read.',
    };
  }

  /* 🔴 [2026-09-10 · 6번] F2 는 번들 JSON 이라 archiveStatus() 를 안 거친다 — R2 확인이
     아니라 파일 자체의 _meta 를 그대로 보여 준다(위 valuationCoverage() 와 같은 값). */
  datasets.valuation = {
    label: 'PER, PBR, ROE and debt-to-equity for listed Korean companies',
    agency: 'Financial Supervisory Service (DART) + Korea Public Data Portal',
    licence: 'Unrestricted (Korea Public Data Portal); DART filings are public disclosure.',
    collected: Array.isArray(VALUATION_TAPE?.rows) && VALUATION_TAPE.rows.length > 0,
    ...valuationCoverage(),
  };

  /* 🔴 [2026-09-10 · 2번] F4 — 번들 JSON 이라 archiveStatus() 를 안 거친다. valuation 과 같다 */
  datasets['index-tape'] = {
    label: 'Daily levels for 168 KRX indices, in English',
    agency: 'Korea public data portal + KRX index series',
    licence: 'Unrestricted (Korea Public Data Portal)',
    collected: Array.isArray(INDEX_TAPE?.rows) && INDEX_TAPE.rows.length > 0,
    ...indexTapeCoverage(),
  };

  /* 🔴 [2026-09-10 · 2번] F3 — 사전 파일이라 rows 개념이 없다. account_count 로 붙음을 본다 */
  datasets['account-dictionary'] = {
    label: 'Korean financial-statement account names mapped to standard English',
    agency: 'Financial Supervisory Service (DART), hand-mapped',
    licence: 'Derived work; DART filings are public disclosure.',
    collected: Object.keys(ACCOUNT_DICTIONARY?.accountNames ?? {}).length > 0,
    ...accountDictionaryCoverage(),
  };

  /* 🔴 [2026-09-13 · 6번] F7 첫 갈래 — 번들 JSON 이라 archiveStatus() 를 안 거친다 (위 셋과 같다) */
  datasets.people = {
    label: 'Workforce filings for listed Korean companies — headcount, tenure and pay by gender',
    agency: 'Financial Supervisory Service (FSS) filings + KRX daily closing prices',
    licence: 'Filed disclosure, collected and republished by us as a licensed dataset.',
    collected: Array.isArray(PEOPLE_TAPE?.rows) && PEOPLE_TAPE.rows.length > 0,
    ...peopleCoverage(),
  };

  /* 🔴 [2026-09-13 · 6번] F7 두 번째 갈래 — 번들 JSON 이라 archiveStatus() 를 안 거친다 */
  datasets.mezzanine = {
    label: 'Convertible bond (CB), bond-with-warrant (BW) and exchangeable bond (EB) filings',
    agency: 'Financial Supervisory Service (DART)',
    licence: 'Public disclosure filings, collected and republished by us as a licensed dataset.',
    collected: Array.isArray(MEZZANINE_TAPE?.rows) && MEZZANINE_TAPE.rows.length > 0,
    ...mezzanineCoverage(),
  };

  /* 🔴 [2026-09-13 · 6번] F7 세 번째(마지막) 갈래 — 표 둘(filings·executives), kind 로 고른다 */
  datasets.ownership = {
    label: 'Substantial-shareholding (5%+) and officer/major-shareholder ownership filings',
    agency: 'Financial Supervisory Service (DART)',
    licence: 'Public disclosure filings, collected and republished by us as a licensed dataset.',
    collected: Array.isArray(OWNERSHIP_FILINGS_TAPE?.rows) && OWNERSHIP_FILINGS_TAPE.rows.length > 0
      && Array.isArray(OWNERSHIP_EXECUTIVES_TAPE?.rows) && OWNERSHIP_EXECUTIVES_TAPE.rows.length > 0,
    filings: ownershipFilingsCoverage(),
    executives: ownershipExecutivesCoverage(),
  };

  return json(200, {
    dictionary: {
      hs_chapters: DICT_STATS.chapters,
      hs_headings: DICT_STATS.headings,
      countries: DICT_STATS.countries,
      /* 기관 사전. **이름 수와 법인 수가 다르다** — 그 차이가 사명 변경 이력이다 */
      institution_names: INSTITUTION_STATS.names,
      institution_entities: INSTITUTION_STATS.entities,
      institution_note:
        'Korean research institutions, normalised to English. One firm can appear under several Korean names across our 2007-2026 archive; group by `entity`. Not all of them are brokerages — credit-rating and IR bodies publish analysis without target prices.',
      /* 종목 사전. **커버리지를 숨기지 않고 숫자로 낸다.** 74% 는 74% 라고 말한다 */
      subjects: SUBJECT_STATS.entries,
      subject_coverage_pct: SUBJECT_STATS.coveragePct,
      subject_note:
        'Official English names of listed Korean companies. A company sets its own English spelling (SK hynix, NCSOFT, AMOREPACIFIC), so this cannot be transliterated by rule. Names not yet in the dictionary return `subjectEn: null` rather than a guess. Historical Korean names are kept as filed — a 2014 report on Daewoo Shipbuilding is not relabelled with the 2026 corporate name.',
      note:
        'HS chapter names follow the WCO Harmonized System. Headings cover the products that dominate Korean trade; codes outside that set resolve to their chapter and return null for the heading rather than a guess.',
    },
    datasets,
    /**
     * 스키마 안정성 약속. 이걸 명시해야 남의 서비스가 우리를 물 수 있다.
     * (klifemap 세션의 응답 계약 원칙에서 가져왔다)
     */
    /*
     * 한도 공지. **시행 전에 먼저 알린다** — /api 페이지에 그렇게 써서 내보냈다.
     * 값은 tiers.mjs 하나에서 온다. 두 곳에 적으면 반드시 어긋난다(오늘만 세 번 겪었다).
     */
    tiers: TIER_NOTE,
    /* 🔴 [2026-09-09 · 1번] P7 카탈로그 몫 — 값 없이 칸만(tiers.mjs TIER_CATALOG 참고).
       team·enterprise 는 status:"coming_soon" 이다. 여기서도 두 곳에 안 적는다. */
    tier_catalog: TIER_CATALOG,
    contract: {
      policy:
        'Fields may be added within v1. Fields are never removed or renamed within v1 — a breaking change ships as /v2.',
      determinism:
        'The same query returns the same value. Provisional figures are preserved alongside their revisions rather than overwritten.',
    },
    /**
     * 아카이브 저장 상태.
     *
     * 이걸 밖으로 내는 이유 — Cloudtype 컨테이너에는 영구 디스크가 없다.
     * 원격 저장이 꺼진 채로 수집이 돌면 **재배포 한 번에 아카이브가 사라진다.**
     * 그리고 관세청 10일 잠정치는 확정치로 덮인 뒤 다시 못 받는다.
     * 몇 달 뒤에 알게 되면 이미 늦으므로, 켜져 있는지를 **밖에서 늘 보이게** 둔다.
     * ⚠ 자격증명 값은 담지 않는다 — 존재 여부만 나간다(store.mjs 참조).
     */
    archive: storeStatus(),
    usage_since_restart: usageSnapshot(),
    generated_at: new Date().toISOString(),
  });
}

/* ── 응답 계약 ──────────────────────────────────────────────────
   klifemap 세션의 apiBusiness.js 에서 가져온 원칙이다.

   > 「엔진 필드 이름은 우리 내부 사정이다 … 밖으로 나가는 이름을 따로 정해 고정한다.
   >  필드를 더하는 것은 되고, 빼거나 이름을 바꾸는 것은 안 된다」

   describeHs() 의 출력을 그대로 내보내면 두 가지가 동시에 터진다.
     ① 우리가 내부를 못 고친다 — 필드명 하나 바꾸면 남의 서비스가 죽는다
     ② 내부에만 있어야 할 것이 조용히 새어 나간다
   그래서 밖으로 나가는 모양을 여기서 **명시적으로** 짓는다.
   바꿔야 하면 필드를 빼지 말고 /v2 를 새로 낸다.
   ────────────────────────────────────────────────────────────── */
const HS_SOURCE = { agency: 'World Customs Organization', system: 'Harmonized System' };

function hsContract(d) {
  return {
    code: d.code,
    /** 2(chapter) · 4(heading) · 6(subheading) · 10(national line) */
    digits: d.level,
    chapter: { code: d.chapter, name: d.chapterName },
    heading: d.heading ? { code: d.heading, name: d.headingName } : null,
    /** 화면·리포트에 그대로 쓸 대표 명칭. heading 이 있으면 그것, 없으면 chapter. */
    label: d.label,
    /** 우리 사전이 이 코드를 아는가. 모르면 label 이 null 이고 이 값이 false 다. */
    resolved: d.label != null,
    source: HS_SOURCE,
  };
}

/** GET /v1/hs/{code} */
async function hsLookup(code) {
  const d = describeHs(code);
  if (!d) return err(400, 'invalid_hs_code', 'Provide an HS code of 2, 4, 6 or 10 digits.');
  const body = hsContract(d);
  return json(200, {
    ...body,
    ...(body.resolved
      ? {}
      : {
          note: 'This code is not in our dictionary yet. We return null rather than guessing a description.',
        }),
  });
}

/**
 * 아주 작은 어간 처리.
 *
 * 사전 표제어는 복수형이 많다(batteries, vehicles, preparations).
 * 이용자는 단수로 친다(battery, vehicle). 단순 부분일치로는 「battery」가
 * 「batteries」를 못 찾는다 — 실제로 못 찾았다. 검색이 첫 관문인데 거기서
 * 빈손이면 개발자는 두 번 안 온다.
 *
 * 형태소 분석기를 넣을 일은 아니다. 영어 복수 규칙 세 개면 충분하다.
 */
function stem(w) {
  if (w.length > 4 && w.endsWith('ies')) return `${w.slice(0, -3)}y`;
  if (w.length > 3 && (w.endsWith('es') || w.endsWith('ss'))) {
    return w.endsWith('ss') ? w : w.slice(0, -2);
  }
  if (w.length > 3 && w.endsWith('s')) return w.slice(0, -1);
  return w;
}

/** 표제어를 검색용 어간 토큰으로 쪼갠다. */
function tokens(name) {
  return name
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
    .map(stem);
}

/** GET /v1/hs?q= — 영어 키워드 검색. 코드를 모르는 사람이 쓰는 입구다. */
async function hsSearch(q) {
  const raw = q.trim().toLowerCase();
  if (raw.length < 2)
    return err(400, 'query_too_short', 'Use at least two characters, e.g. ?q=semiconductor');

  const needles = raw.split(/[^a-z0-9]+/).filter(Boolean).map(stem);
  if (!needles.length)
    return err(400, 'query_too_short', 'Use at least two letters, e.g. ?q=semiconductor');

  // 모든 검색어가 표제어 안에 있어야 맞춘 것으로 본다(AND). 두 단어를 치면 좁혀져야 한다.
  const match = (name) => {
    const toks = tokens(name);
    return needles.every((n) => toks.some((t) => t.startsWith(n) || n.startsWith(t)));
  };

  const hits = [];
  for (const [code, name] of Object.entries(HS_HEADINGS)) {
    if (match(name)) hits.push({ code, level: 4, name });
  }
  for (const [code, name] of Object.entries(HS_CHAPTERS)) {
    if (match(name)) hits.push({ code, level: 2, name });
  }
  hits.sort((a, b) => a.level - b.level || a.code.localeCompare(b.code));
  return json(200, {
    query: q,
    count: hits.length,
    results: hits.slice(0, 100),
    source: { agency: 'World Customs Organization', system: 'Harmonized System' },
    ...(hits.length === 0
      ? {
          note: 'No match. Our heading dictionary covers the products that dominate Korean trade; try a broader word, or /v1/hs/{code} if you already have the code.',
        }
      : {}),
  });
}

/**
 * GET /v1/institutions — 기관 사전.
 *
 * **이 사전 자체가 상품이다.** 한국 증권사의 영문명·사명 변경 이력을 한곳에 정리해 둔
 * 공개 자료가 없다. 20년치 리포트를 세면서 만들어졌고, 없으면 우리 데이터도 못 읽는다.
 * `/v1/hs`·`/v1/countries` 와 같은 자리에 놓는다.
 */
async function institutions(params) {
  const 유형 = params?.get('type') ?? null;

  /* 법인 단위로 접는다. 이름 44개를 그대로 주면 이용자가 같은 회사를 두 곳으로 센다. */
  const 법인 = new Map();
  for (const [ko, v] of Object.entries(INSTITUTIONS)) {
    if (!법인.has(v.entity)) {
      /* ⚠ 사전에 먼저 나온 표기를 대표명으로 쓰면 **가장 오래된 사명이 대표가 된다.**
         실제로 ls-securities 가 「E*TRADE Korea Securities」(2015년에 없어진 이름)로
         나왔다. 현재 이름을 따로 들고 있다가 그것을 쓴다. */
      const 현재 = ENTITY_CURRENT_NAME[v.entity];
      법인.set(v.entity, {
        entity: v.entity,
        name: 현재?.en ?? v.en,
        ...(현재?.ko ? { nameKo: 현재.ko } : {}),
        ...(현재?.since ? { renamedIn: 현재.since } : {}),
        /** 현재 이름이 우리 아카이브에 아직 안 나타났는가. 사명 변경 직후에 그렇다 */
        ...(현재 && !INSTITUTIONS[현재.ko] ? { currentNameNotYetInArchive: true } : {}),
        type: v.type,
        typeNote: INSTITUTION_TYPES[v.type],
        issuesTargetPrices: v.type === 'brokerage',
        /** 확인 못 한 영문명은 감추지 않고 밝힌다. 숨기면 이용자가 확인할 수 없다 */
        nameVerified: v.verified,
        knownAs: [],
      });
    }
    const e = 법인.get(v.entity);
    e.knownAs.push({ ko, en: v.en, ...(v.note ? { note: v.note } : {}) });
    /* 한 법인 안에 확인 못 한 표기가 하나라도 있으면 확인 안 된 것으로 둔다 */
    if (!v.verified) e.nameVerified = false;
  }

  let results = [...법인.values()].sort((a, b) => a.name.localeCompare(b.name));
  if (유형) results = results.filter((r) => r.type === 유형);

  return json(200, {
    count: results.length,
    results,
    types: INSTITUTION_TYPES,
    coverage: {
      korean_names: INSTITUTION_STATS.names,
      distinct_entities: INSTITUTION_STATS.entities,
      note:
        'Korean brokerages rename frequently and our archive spans 2007-2026, so one firm appears under several names. `entity` is stable across renames; group by it rather than by name.',
      unverified_english_names: INSTITUTION_STATS.unverified,
      unverified_note:
        'Where we could not confirm an English name against an official source we say so rather than guess.',
    },
  });
}

/** GET /v1/countries */
async function countries() {
  return json(200, {
    count: Object.keys(COUNTRIES).length,
    results: Object.entries(COUNTRIES).map(([code, name]) => ({ code, name })),
    source: { standard: 'ISO 3166-1 alpha-2' },
    note: 'Codes not in this list are returned as-is with a null name.',
  });
}

/**
 * GET /v1/trade/* — 아카이브가 필요한 엔드포인트.
 *
 * 인증키가 아직 없어 수집이 시작되지 않았다. 그때 빈 배열을 200 으로 주면
 * 이용자는 「교역이 없었다」와 「우리가 안 받았다」를 구분하지 못한다.
 * **사실대로 말한다.**
 *
 * ⚠ 2026-08-02 KST — 여기도 503·501 이었다. 둘 다 5xx 라 **본문이 도착하지 않았다**
 *   (Cloudtype 프록시가 갈아치운다. 설계원칙 3 참조). 뜻이 같으면서 본문이 가는
 *   4xx 로 내린다 — 404「아직 없는 자원」· 409「모았지만 조회층이 없음」.
 */
async function tradeNotReady(id) {
  const st = await archiveStatus(id);
  if (st.collected) {
    // 수집이 시작되면 여기서 실제 조회로 넘어간다. (다음 작업)
    return err(
      409,
      'not_implemented',
      'Data has been collected but the query layer for this endpoint is not built yet.',
      `Archive holds ${st.files} file(s) across ${st.days} day(s); latest ${st.latest_day}.`,
    );
  }
  return err(
    404,
    'collection_not_started',
    'This endpoint has no data yet. Collection begins once the Public Data Portal API key is issued.',
    'Meanwhile /v1/hs, /v1/hs?q= and /v1/countries are fully available.',
  );
}

/* ── 호출 계량 ──────────────────────────────────────────────────
   유료 티어를 만들려면 「누가 얼마나 썼나」가 있어야 한다. 지금은 무료·무인증이라
   과금은 없지만, **지금부터 세어 두지 않으면 나중에 과거를 못 만든다.**
   아카이브를 오늘부터 받는 것과 같은 이유다.

   klifemap 의 api_usage 원칙을 따른다 — **개인정보를 저장하지 않는다.**
   남기는 것은 「몇 번 불렸나」뿐이다. IP·UA·쿼리 원문을 담지 않는다.
   프로세스 메모리에만 둔다(재시작하면 0). 영속화는 저장소를 정한 뒤에 한다.
   ────────────────────────────────────────────────────────────── */
const usage = new Map();
function meter(route) {
  usage.set(route, (usage.get(route) ?? 0) + 1);
}

/** 계량 결과. /v1/meta 에서 우리 스스로도 무엇이 쓰이는지 본다. */
export function usageSnapshot() {
  return Object.fromEntries([...usage.entries()].sort((a, b) => b[1] - a[1]));
}

/**
 * 라우터. server.mjs 에서 부른다.
 * 처리 대상이 아니면 **null 을 돌려준다** — 그래야 정적 파일 처리로 넘어간다.
 */
export async function handleApi(pathname, searchParams, ctx = {}) {
  if (pathname !== '/v1' && !pathname.startsWith('/v1/')) return null;

  /*
   * ── 등급과 한도 (2026-08-03 KST, 사장님 「RapidAPI 유료화/등급 해」) ──
   *
   * `ctx` 가 없으면(시험 코드 등) free 로 떨어진다. **기본값은 언제나 닫힘이다.**
   *
   * ⚠ 한도 초과라도 `ENFORCE_FROM` 전에는 **막지 않는다.** 오늘 /api 페이지에
   *   「한도는 시행 전에 먼저 공지한다」고 써서 내보냈다. 같은 날 조이면 그 말이 거짓이 된다.
   *   헤더로는 지금부터 알려 준다 — 이용자가 미리 자기 사용량을 볼 수 있어야 한다.
   */
  const tier = await tierOf(ctx.headers);
  const rate = rateCheck(ctx.ip, tier);
  const 등급헤더 = {
    'X-Tier': tier,
    ...(rate.limit !== null
      ? {
          'X-RateLimit-Limit': String(rate.limit),
          'X-RateLimit-Remaining': String(rate.remaining),
          'X-RateLimit-Policy': `${rate.limit};w=60`,
          ...(rate.enforced ? {} : { 'X-RateLimit-Enforced-From': ENFORCE_FROM }),
        }
      : {}),
  };
  const 붙이기 = (r) => (r ? { ...r, headers: { ...r.headers, ...등급헤더 } } : r);

  if (!rate.allowed) {
    meter('ratelimited');
    return 붙이기({
      ...err(
        429,
        'rate_limited',
        `Free tier is limited to ${rate.limit} requests per minute.`,
        'Wait for the next minute, or use a paid plan through the marketplace listing. Classification endpoints stay free either way — see /v1/meta.',
      ),
      headers: { 'Retry-After': String(rate.retryAfter) },
    });
  }

  /* 라우팅은 아래 함수가 한다. 반환문이 스무 개라 하나씩 감싸면 반드시 하나를 빠뜨린다.
     **한 곳에서만 헤더를 붙인다.** */
  /*
   * 뉴스레터 접수는 **POST 전용**이라 등급·한도 뒤, 라우팅 앞에서 가른다.
   * ⚠ GET 으로 받지 않는다. 쿼리스트링에 이메일이 실리면 서버 로그·리퍼러·브라우저
   *   기록에 남는다. 개인정보를 URL 에 넣지 않는 것은 이 프로젝트의 규칙이다.
   */
  if (pathname === '/v1/subscribe') {
    if (ctx.method !== 'POST') {
      return 붙이기(
        err(405, 'method_not_allowed', 'Use POST with a JSON body: {"email":"you@example.com"}'),
      );
    }
    let body;
    try {
      body = typeof ctx.body === 'string' ? JSON.parse(ctx.body) : (ctx.body ?? {});
    } catch {
      return 붙이기(err(400, 'invalid_json', 'Body must be JSON.'));
    }
    meter('subscribe');
    /**
     * ⛔ 넷 사이트가 한 명단을 쓴다. 어느 사이트에서 온 가입인지 안 적으면
     *   어느 유닛의 구독자인지 영영 못 가른다. 호스트에서 뽑아 같이 넘긴다.
     * ⚠ 호스트가 없으면 만들지 않는다 — null 로 둔다.
     */
    const 어느사이트 = String(ctx?.headers?.host ?? '').split(':')[0].toLowerCase().replace(/^www\./, '') || null;
    const r = await subscribe({ ...body, site: 어느사이트 });
    return 붙이기(json(r.status, r.payload, { 'Cache-Control': 'no-store' }));
  }

  /* 🔴 [2026-09-09 · 1번] 셀프 발급 API 열쇠 — P6(사장님 지시 「전 유닛 절반 투입」)의
     1번 몫. 뉴스레터와 같은 이유로 POST 전용·이메일은 URL 에 안 싣는다.
     ⚠ 지금은 등급을 항상 free 로 낸다 — 결제와 이은 pro 발급은 다음 단계다. */
  if (pathname === '/v1/keys') {
    if (ctx.method !== 'POST') {
      return 붙이기(err(405, 'method_not_allowed', 'Use POST with a JSON body: {"email":"you@example.com"}'));
    }
    let body;
    try {
      body = typeof ctx.body === 'string' ? JSON.parse(ctx.body) : (ctx.body ?? {});
    } catch {
      return 붙이기(err(400, 'invalid_json', 'Body must be JSON.'));
    }
    meter('keys.issue');
    const r = await 열쇠발급({ email: body.email, tier: 'free' });
    if (!r.ok && r.why === 'invalid_email') {
      return 붙이기(err(400, 'invalid_email', 'Provide a valid email address.'));
    }
    if (!r.ok && r.why === 'already_issued') {
      return 붙이기(
        err(409, 'already_issued',
          'A key was already issued to this email. We do not store or re-display raw keys — if it is lost, contact support for a rotation.'),
      );
    }
    return 붙이기(json(201, {
      apiKey: r.apiKey,
      tier: r.tier,
      note: 'This key is shown once and never stored in plaintext. Save it now. Send it as the X-Api-Key header.',
    }, { 'Cache-Control': 'no-store' }));
  }

  return 붙이기(await 라우팅(pathname, searchParams, tier));
}

async function 라우팅(pathname, searchParams, tier) {
  if (pathname === '/v1' || pathname === '/v1/') {
    meter('root');
    return root();
  }
  if (pathname === '/v1/meta') {
    meter('meta');
    return meta();
  }
  // 마켓플레이스(RapidAPI·AWS·Snowflake)가 이걸 읽어 리스팅을 자동 생성한다.
  if (pathname === '/v1/openapi.json' || pathname === '/v1/openapi') {
    meter('openapi');
    return json(200, openapi(PUBLIC_BASE));
  }
  if (pathname === '/v1/countries') {
    meter('countries');
    return countries();
  }
  if (pathname === '/v1/institutions') {
    meter('institutions');
    return institutions(searchParams);
  }

  if (pathname === '/v1/hs') {
    const q = searchParams.get('q');
    if (!q) return err(400, 'missing_query', 'Use /v1/hs?q=<keyword> or /v1/hs/<code>.');
    meter('hs.search');
    return hsSearch(q);
  }
  const hsMatch = pathname.match(/^\/v1\/hs\/([^/]+)$/);
  if (hsMatch) {
    meter('hs.lookup');
    return hsLookup(hsMatch[1]);
  }

  if (pathname === '/v1/research') {
    meter('research');
    return research(searchParams, tier);
  }
  if (pathname === '/v1/trade/flash') {
    meter('trade.flash');
    return tradeNotReady('export-flash-item');
  }
  if (pathname === '/v1/trade/exports') {
    meter('trade.exports');
    return tradeExports(searchParams, tier);
  }
  if (pathname === '/v1/valuation') {
    meter('valuation');
    return valuation(searchParams, tier);
  }
  if (pathname === '/v1/index-tape') {
    meter('index-tape');
    return indexTape(searchParams, tier);
  }
  if (pathname === '/v1/account-dictionary') {
    meter('account-dictionary');
    return accountDictionary(searchParams, tier);
  }
  if (pathname === '/v1/people') {
    meter('people');
    return people(searchParams, tier);
  }
  if (pathname === '/v1/mezzanine') {
    meter('mezzanine');
    return mezzanine(searchParams, tier);
  }
  if (pathname === '/v1/ownership') {
    meter('ownership');
    return ownership(searchParams, tier);
  }

  return err(404, 'unknown_endpoint', `No such endpoint: ${pathname}`, 'See GET /v1');
}
