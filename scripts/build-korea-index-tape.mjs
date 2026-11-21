#!/usr/bin/env node
import { pathToFileURL } from 'node:url';
/**
 * build-korea-index-tape.mjs — **F4. Korea Index Tape.**
 *   KRX 지수 168개(코스피/코스닥/KRX/테마) 스냅샷 → 영문 지수 축 상품
 *
 *   node scripts/build-korea-index-tape.mjs            무엇이 붙나만 잰다 (안 적는다)
 *   node scripts/build-korea-index-tape.mjs --적는다
 *   node scripts/build-korea-index-tape.mjs --자가시험
 *
 * ── 🔴 이 자가 지키는 것 ───────────────────────────────────────────────
 * ```
 * ⛔ 이름을 기계번역하지 않는다 — src/data/korea-index-name-english.json 에
 *   없으면 nameEn 은 null 이다 (unmapped 로 남긴다)
 * ⛔ 「연최저=0」을 그대로 안 낸다 — [2026-09-10 실측] 20260902.ndjson 168줄 중
 *   162줄이 연최저=0 이면서 연최저일이 스냅샷 일자보다 «미래»다(9/2 판인데 9/3).
 *   이것은 실제 연중 최저가 아니라 소스 API가 «아직 못 채운 자리»에 심어 둔
 *   판박이값(sentinel)이다. 0 으로 내면 손님이 「올해 이 지수가 0까지 갔다」로
 *   읽는다 — 그래서 null 로 낸다.
 * ⛔ 못 붙은 줄을 버리지 않는다 — 분모가 사라진다
 * ```
 */

import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
export const 원본방 = 'archive/raw/indices';
export const 낼곳 = 'src/data/korea-index-tape.json';
const 이름사전길 = path.join(ROOT, 'src/data/korea-index-name-english.json');

/** 계열 — KRX 가 쓰는 네 갈래뿐이다. 새 갈래가 나오면 여기 추가한다 */
const 계열영문표 = {
  'KOSPI시리즈': 'KOSPI Series',
  'KOSDAQ시리즈': 'KOSDAQ Series',
  'KRX시리즈': 'KRX Series',
  '테마지수': 'Theme Index',
};

/**
 * 지수명 영문 — 2번의 F4 사전(src/data/korea-index-name-english.json)을 그대로 쓴다.
 * ⛔ 짐작 안 함: 사전에 없으면 null 이다(못 붙었다로 남긴다). 기계번역하지 않는다.
 */
export function 이름영문사전읽기() {
  try { return JSON.parse(fs.readFileSync(이름사전길, 'utf8')).map ?? {}; } catch { return {}; }
}

/** "20260902" 또는 "2026-09-02" 를 비교 가능한 숫자로. 못 읽으면 null */
export function 날짜숫자(s) {
  const t = String(s ?? '').replace(/-/g, '');
  return /^\d{8}$/.test(t) ? Number(t) : null;
}

/**
 * 연최저를 다듬는다. [2026-09-10 실측] 0 과 짝지어 나오는 연최저일이
 * 스냅샷 일자보다 미래인 사례를 sentinel 로 본다.
 * ⛔ 0 이 아니면 손대지 않는다 — 진짜 낮은 값(예: 0.33)까지 지우지 않는다.
 */
export function 연최저다듬기({ 일자, 연최저, 연최저일 }) {
  if (!Number.isFinite(연최저)) return { 값: null, 까닭: '연최저가 없다' };
  if (연최저 !== 0) return { 값: 연최저, 까닭: null };
  const 일자수 = 날짜숫자(일자);
  const 연최저일수 = 날짜숫자(연최저일);
  const 미래 = Number.isFinite(일자수) && Number.isFinite(연최저일수) && 연최저일수 > 일자수;
  const 까닭 = 미래
    ? `연최저=0과 짝지은 연최저일(${연최저일})이 스냅샷 일자(${일자})보다 미래다 — `
      + '소스가 아직 못 채운 자리에 심어 둔 판박이값(sentinel)이지 실제 0이 아니다'
    : '연최저=0인데 날짜로는 미래라는 증거를 못 찾았다 — 그래도 0을 그대로 내지 않는다(못 쟀다)';
  return { 값: null, 까닭 };
}

/** 못 읽으면 null, 있으면 그대로(⛔ ) */
function 수(v) { return Number.isFinite(v) ? v : null; }

/**
 * 한 줄을 만든다 — 못 붙어도 «줄은 남긴다».
 */
export function 한줄(원본, { 이름영문 = {} } = {}) {
  const 이름한글 = 원본?.이름 ?? null;
  const 계열한글 = 원본?.계열 ?? null;
  const { 값: 연최저, 까닭: 연최저못잰까닭 } = 연최저다듬기({
    일자: 원본?.일자, 연최저: 원본?.연최저, 연최저일: 원본?.연최저일,
  });

  return {
    date: 원본?.일자 ?? null,
    name: 이름한글,
    nameEn: 이름한글 ? (이름영문[이름한글] ?? null) : null,
    family: 계열한글,
    familyEn: 계열한글 ? (계열영문표[계열한글] ?? null) : null,
    constituentCount: 수(원본?.구성종목수),
    isComputedIndex: typeof 원본?.산출지수 === 'boolean' ? 원본.산출지수 : null,
    close: 수(원본?.종가),
    change: 수(원본?.전일비),
    changePct: 수(원본?.등락률),
    open: 수(원본?.시가),
    high: 수(원본?.고가),
    low: 수(원본?.저가),
    volume: 수(원본?.거래량),
    tradingValue: 수(원본?.거래대금),
    marketCap: 수(원본?.시가총액),
    yearHigh: 수(원본?.연최고),
    yearHighDate: 원본?.연최고일 ?? null,
    yearLow: 연최저,
    yearLowDate: 연최저 === null ? null : (원본?.연최저일 ?? null),
    yearLowNotMeasured: 연최저못잰까닭,
    baseDate: 원본?.기준시점 ?? null,
    baseIndex: 수(원본?.기준지수),
    ytdChangePct: 수(원본?.연초대비),
  };
}

/** 붙은 수를 «분모와 함께» 센다 */
export function 셈보고(줄들) {
  const 전체 = Array.isArray(줄들) ? 줄들.length : 0;
  if (!전체) return { 전체: 0, nameEn: 0, yearLow살음: 0, yearLow못잼: 0 };
  const 세기 = (k) => 줄들.filter((x) => x[k] !== null && x[k] !== undefined).length;
  return {
    전체,
    nameEn: 세기('nameEn'),
    yearLow살음: 세기('yearLow'),
    yearLow못잼: 줄들.filter((x) => x.yearLowNotMeasured).length,
  };
}

/** 화면·파일로 나가는 시각은 영문이다 — 손님이 영어권이다 */
export function 영문시각(날 = new Date()) {
  const 달 = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'][날.getMonth()];
  const 시 = String(날.getHours()).padStart(2, '0');
  const 분 = String(날.getMinutes()).padStart(2, '0');
  return `${날.getDate()} ${달} ${날.getFullYear()}, ${시}:${분} KST`;
}

/** 방에서 가장 최근 파일 이름. 없으면 null */
export function 최근파일(목록, 무늬 = /\.ndjson$/) {
  if (!Array.isArray(목록)) return null;
  const 것 = 목록.filter((f) => 무늬.test(f)).sort();
  return 것.length ? 것[것.length - 1] : null;
}

/** ndjson 을 줄 배열로 읽는다. 깨진 줄·빈 줄은 건너뛴다 */
export function ndjson읽기(글) {
  if (글 === null || 글 === undefined) return [];
  const 결과 = [];
  for (const 줄 of String(글).split(/\r?\n/)) {
    const t = 줄.trim();
    if (!t) continue;
    try { 결과.push(JSON.parse(t)); } catch { /* 건너뛴다 */ }
  }
  return 결과;
}

/* ── 자가시험 ───────────────────────────────────────────────────────── */
function 자가시험() {
  const 것 = []; const 재다 = (이름, 됐나) => 것.push({ 이름, 됐나 });

  재다('날짜숫자: 붙어 있는 8자리', 날짜숫자('20260902') === 20260902);
  재다('날짜숫자: 대시 낀 꼴도 읽는다', 날짜숫자('2026-09-02') === 20260902);
  재다('⛔ 날짜숫자: 못 읽으면 null', 날짜숫자('') === null && 날짜숫자(undefined) === null);

  재다('🔴 연최저다듬기: 0 + 미래일 = sentinel, null 로 낸다', (() => {
    const r = 연최저다듬기({ 일자: '20260902', 연최저: 0, 연최저일: '2026-09-03' });
    return r.값 === null && /미래/.test(r.까닭);
  })());
  재다('연최저다듬기: 0 이 아니면 그대로 낸다(진짜 낮은 값을 지우지 않는다)', (() => {
    const r = 연최저다듬기({ 일자: '20260902', 연최저: 0.33, 연최저일: '2026-01-02' });
    return r.값 === 0.33 && r.까닭 === null;
  })());
  재다('⛔ 연최저다듬기: 0 인데 미래 증거가 없어도 0을 내지 않는다(못 쟀다로 남긴다)', (() => {
    const r = 연최저다듬기({ 일자: '20260902', 연최저: 0, 연최저일: '2026-08-01' });
    return r.값 === null && /못 쟀다/.test(r.까닭);
  })());
  재다('연최저다듬기: 값 자체가 없으면 null', 연최저다듬기({ 일자: '20260902', 연최저: null, 연최저일: null }).값 === null);

  const 원본 = {
    일자: '20260902', 이름: 'IT 서비스', 계열: 'KOSPI시리즈', 구성종목수: 25, 산출지수: false,
    종가: 1193.86, 전일비: -44.08, 등락률: -3.56, 시가: 1199.5, 고가: 1214.54, 저가: 1191.97,
    거래량: 4580584, 거래대금: 309074650682, 시가총액: 110803101994255,
    연최고: 1689.41, 연최고일: '2026-06-01', 연최저: 0, 연최저일: '2026-09-03',
    기준시점: '2024-07-01', 기준지수: 1000, 연초대비: -6.66,
  };
  재다('한줄: 사전에 있으면 nameEn 을 채운다', (() => {
    const r = 한줄(원본, { 이름영문: { 'IT 서비스': 'IT Services' } });
    return r.name === 'IT 서비스' && r.nameEn === 'IT Services' && r.familyEn === 'KOSPI Series';
  })());
  재다('🔴 한줄: 사전에 없으면 nameEn 은 null — 기계번역으로 안 채운다', (() => {
    const r = 한줄(원본, { 이름영문: {} });
    return r.name === 'IT 서비스' && r.nameEn === null;
  })());
  재다('🔴 한줄: 연최저 sentinel 은 yearLow·yearLowDate 둘 다 null 이고 까닭이 남는다', (() => {
    const r = 한줄(원본, { 이름영문: {} });
    return r.yearLow === null && r.yearLowDate === null && /미래/.test(r.yearLowNotMeasured);
  })());
  재다('한줄: 정상 값은 그대로 실린다(0 으로 안 채운다)', (() => {
    const r = 한줄(원본, { 이름영문: {} });
    return r.close === 1193.86 && r.yearHigh === 1689.41 && r.marketCap === 110803101994255;
  })());
  재다('⛔ 한줄: 계열이 처음 보는 값이면 familyEn 은 null', (() => {
    const r = 한줄({ ...원본, 계열: '처음보는계열' }, { 이름영문: {} });
    return r.family === '처음보는계열' && r.familyEn === null;
  })());

  재다('이름영문사전읽기 — 실제 사전을 읽는다(코스피가 있다)', (() => {
    const 사전 = 이름영문사전읽기();
    return 사전['코스피'] === 'KOSPI';
  })());

  재다('ndjson읽기: 깨진 줄·빈 줄을 건너뛴다', (() => {
    const r = ndjson읽기('깨진줄\n\n{"이름":"a"}\n');
    return r.length === 1 && r[0].이름 === 'a';
  })());
  재다('⛔ ndjson읽기: null 입력은 빈 배열', ndjson읽기(null).length === 0);

  재다('셈보고: 분모와 같이 센다', (() => {
    const r = 셈보고([
      { nameEn: 'X', yearLow: 1, yearLowNotMeasured: null },
      { nameEn: null, yearLow: null, yearLowNotMeasured: '못 쟀다' },
    ]);
    return r.전체 === 2 && r.nameEn === 1 && r.yearLow살음 === 1 && r.yearLow못잼 === 1;
  })());
  재다('⛔ 셈보고: 빈 것은 0', 셈보고([]).전체 === 0 && 셈보고(null).전체 === 0);

  재다('🔴 영문시각: 화면·파일 시각은 영문이다', (() => {
    return 영문시각(new Date('2026-09-10T09:17:42+09:00')) === '10 September 2026, 09:17 KST';
  })());
  재다('최근파일: 이름 순 마지막(날짜꼴 파일이라 이름순=날짜순)',
    최근파일(['20260818.ndjson', '20260902.ndjson', 'z.txt']) === '20260902.ndjson');
  재다('⛔ 최근파일: 없으면 null', 최근파일([]) === null && 최근파일(null) === null);

  const 실패 = 것.filter((x) => !x.됐나);
  console.log(`■ 자가시험 ${것.length - 실패.length}/${것.length}`);
  for (const x of 실패) console.log(`  🔴 ${x.이름}`);
  return 실패.length === 0;
}

/* ── 돌리기 ─────────────────────────────────────────────────────────── */
if (process.argv.includes('--자가시험')) {
  process.exit(자가시험() ? 0 : 1);
}

if (!자가시험()) { console.log('🔴 자가시험이 깨졌다 — 만들지 않는다.'); process.exit(1); }
/* 🔴 [2026-10-28 · 5번] 가져오면 도는 자였다 — 다른 자가 들여오면 아래가 그대로 돌아
   그 자의 보고 대신 이 글이 찍힌다(검사: check-가져오면-도는자.mjs).
   ⛔ 관문 글귀만 끼워 넣지 않았다. 직접 불렸을 때만 돌도록 실제로 감쌌다. */
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  console.log('');

  const 적는다 = process.argv.includes('--적는다');

  let 목록 = null;
  try { 목록 = fs.readdirSync(path.join(ROOT, 원본방)); } catch { /* 없다 */ }
  const 최근 = 최근파일(목록, /^\d{8}\.ndjson$/);
  if (!최근) {
    console.log(`🔴 지수 스냅샷이 아직 없다 — ${원본방}`);
    process.exit(1);
  }
  const 원본줄들 = ndjson읽기(fs.readFileSync(path.join(ROOT, 원본방, 최근), 'utf8'));
  console.log(`■ 지수 판 ${최근} — ${원본줄들.length}줄`);

  const 이름영문 = 이름영문사전읽기();
  const 줄들 = 원본줄들.map((x) => 한줄(x, { 이름영문 }));
  const 보고 = 셈보고(줄들);

  console.log('');
  console.log(`■ Korea Index Tape — ${보고.전체}줄`);
  console.log(`   nameEn      ${보고.nameEn} / ${보고.전체}`);
  console.log(`   yearLow 살음 ${보고.yearLow살음} / ${보고.전체}`);
  console.log(`   yearLow 못잼 ${보고.yearLow못잼} / ${보고.전체} (sentinel·증거부족 — null 로 냈다)`);

  if (!적는다) { console.log('\n⭐ 아직 안 적었다. --적는다 를 붙인다.'); process.exit(0); }

  const 오늘 = new Date();
  const 낼것 = {
    _meta: {
      product: 'Korea Index Tape',
      builtAt: 영문시각(오늘),
      snapshotDate: 원본줄들[0]?.일자 ?? null,
      sourceFile: `${원본방}/${최근}`,
      rows: 보고.전체,
      withNameEn: 보고.nameEn,
      withYearLow: 보고.yearLow살음,
      yearLowNotMeasured: 보고.yearLow못잼,
      note: 'yearLow (and its date) is null whenever the source reported exactly 0 — in the '
        + `${최근} snapshot, ${보고.yearLow못잼} of ${보고.전체} rows carried a 0 that was paired `
        + 'with a yearLowDate one day after the snapshot date itself, an impossible value. That is '
        + 'a source placeholder, not a real annual low of zero. See yearLowNotMeasured per row.',
      whyRowsAreKept: 'Rows that could not be fully measured are kept, with the reason in the '
        + 'relevant *NotMeasured column. Dropping them would remove the denominator.',
    },
    rows: 줄들,
  };
  fs.writeFileSync(path.join(ROOT, 낼곳), JSON.stringify(낼것, null, 1), 'utf8');
  console.log(`\n📁 적었다 — ${낼곳}`);

}
