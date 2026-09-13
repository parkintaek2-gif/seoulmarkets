#!/usr/bin/env node
/**
 * build-korea-ownership-tape.mjs — **F7. Korea Ownership Ledger.** (SeoulMarkets 데이터 API)
 *   DART 대량보유(majorstock)·임원·주요주주 소유(elestock) 원자료를 **행 단위**로 API 에 낸다.
 *   src/data/full/korea-ownership-ledger-{filings,executives}-*.csv (build-seoulmarkets-ownership-ledger.mjs
 *   가 이미 짓는 전량 CSV) 를 읽어 두 개의 API 탭(JSON)으로 낸다.
 *
 *   node scripts/build-korea-ownership-tape.mjs --자가시험
 *   node scripts/build-korea-ownership-tape.mjs                무엇이 붙나만 잰다 (안 적는다)
 *   node scripts/build-korea-ownership-tape.mjs --적는다
 *
 * ── 이 자가 지키는 것 ────────────────────────────────────────────────
 * ⛔ 두 표(대량보유·임원주주)를 «한 표»로 억지로 합치지 않는다 — 원자료 자체가 다른 모양이다
 *   (build-seoulmarkets-ownership-ledger.mjs 가 이미 못박은 결정, 그대로 물려받는다).
 *   people·mezzanine 처럼 «한 표 한 API»가 아니라, 이 상품만 «한 API·kind 로 표 둘»이다.
 * ⛔ holder_name·person_name 을 로마자로 지어내지 않는다 — 원문 그대로.
 * ⛔ reason_raw_ko 를 영문으로 요약하지 않는다 — 법률 문서 원문이다.
 * ⛔ ticker 를 숫자로 바꾸지 않는다 — "0015S0" 같은 영숫자 코드가 실재한다.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const 뿌리 = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const 자료방 = path.join(뿌리, 'src/data/full');
const 낼곳_filings = 'src/data/korea-ownership-filings-tape.json';
const 낼곳_executives = 'src/data/korea-ownership-executives-tape.json';

/** CSV 를 인용까지 알고 읽는다 — mezzanine·people 축과 같은 규약. */
export function 파싱(s) {
  const 줄 = []; let 칸 = []; let 값 = ''; let 인용 = false;
  const 글 = String(s ?? '');
  for (let i = 0; i < 글.length; i += 1) {
    const c = 글[i];
    if (인용) {
      if (c === '"') { if (글[i + 1] === '"') { 값 += '"'; i += 1; } else 인용 = false; } else 값 += c;
    } else if (c === '"') 인용 = true;
    else if (c === ',') { 칸.push(값); 값 = ''; }
    else if (c === '\n') { 칸.push(값); 값 = ''; 줄.push(칸); 칸 = []; }
    else if (c !== '\r') 값 += c;
  }
  if (값 !== '' || 칸.length) { 칸.push(값); 줄.push(칸); }
  return 줄.filter((r) => r.some((v) => String(v).trim() !== ''));
}

/** 빈칸을 0 으로 세지 않는 수 읽기. */
export function 수(v) {
  const s = String(v ?? '').trim();
  if (s === '') return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/** 빈 문자열은 null, 그 밖은 트림해 그대로. */
export function 글자(v) {
  const s = String(v ?? '').trim();
  return s === '' ? null : s;
}

/** 가장 새 원자료 파일. */
export function 최근원자료(파일들, 갈래) {
  const 정규 = new RegExp(`^korea-ownership-ledger-${갈래}-\\d{4}-\\d{2}-\\d{2}\\.csv$`);
  const 것 = (파일들 ?? []).filter((f) => 정규.test(f)).sort();
  return 것.at(-1) ?? null;
}

/** 영문 시각. */
export function 영문시각(날 = new Date()) {
  const 달 = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'][날.getMonth()];
  const 시 = String(날.getHours()).padStart(2, '0');
  const 분 = String(날.getMinutes()).padStart(2, '0');
  return `${날.getDate()} ${달} ${날.getFullYear()}, ${시}:${분} KST`;
}

/** 대량보유(majorstock) 한 줄. */
export function 대량보유한줄(r, 자) {
  return {
    ticker: 글자(r[자('ticker')]),
    nameEn: 글자(r[자('name_en')]),
    nameKo: 글자(r[자('name_ko')]),
    filingId: 글자(r[자('filing_id')]),
    filedOn: 글자(r[자('filed_on')]),
    filingKind: 글자(r[자('filing_kind')]),
    holderName: 글자(r[자('holder_name')]),
    sharesHeld: 수(r[자('shares_held')]),
    sharesChange: 수(r[자('shares_change')]),
    stakePct: 수(r[자('stake_pct')]),
    stakeChangePct: 수(r[자('stake_change_pct')]),
    relatedPartyShares: 수(r[자('related_party_shares')]),
    relatedPartyPct: 수(r[자('related_party_pct')]),
    reasonRawKo: 글자(r[자('reason_raw_ko')]),
  };
}

/** 임원·주요주주(elestock) 한 줄. */
export function 임원주주한줄(r, 자) {
  return {
    ticker: 글자(r[자('ticker')]),
    nameEn: 글자(r[자('name_en')]),
    nameKo: 글자(r[자('name_ko')]),
    filingId: 글자(r[자('filing_id')]),
    filedOn: 글자(r[자('filed_on')]),
    personName: 글자(r[자('person_name')]),
    isRegisteredOfficer: 글자(r[자('is_registered_officer')]),
    title: 글자(r[자('title')]),
    relationship: 글자(r[자('relationship')]),
    sharesHeld: 수(r[자('shares_held')]),
    sharesChange: 수(r[자('shares_change')]),
    stakePct: 수(r[자('stake_pct')]),
    stakeChangePct: 수(r[자('stake_change_pct')]),
  };
}

function 읽기(갈래, 한줄) {
  const f = 최근원자료(fs.readdirSync(자료방), 갈래);
  if (!f) throw new Error(`korea-ownership-ledger-${갈래} CSV 가 없다 — build-seoulmarkets-ownership-ledger.mjs 를 먼저 돌린다`);
  const 글 = fs.readFileSync(path.join(자료방, f), 'utf8');
  const 표 = 파싱(글);
  const 머리 = 표[0]; const 몸 = 표.slice(1);
  const 자 = (이름) => 머리.indexOf(이름);
  const 줄들 = 몸.map((r) => 한줄(r, 자));
  return { rows: 줄들, sourceFile: f, 머리길이: 머리.length };
}

function 짓기_대량보유() {
  const { rows, sourceFile, 머리길이 } = 읽기('filings', 대량보유한줄);
  const byKind = {};
  for (const k of ['general', 'abbreviated']) byKind[k] = rows.filter((x) => x.filingKind === k).length;
  const unmappedKind = rows.filter((x) => x.filingKind && !['general', 'abbreviated'].includes(x.filingKind)).length;
  const withRelatedParty = rows.filter((x) => x.relatedPartyShares !== null).length;
  return {
    rows, sourceFile, 머리길이, byKind, unmappedKind, withRelatedParty,
  };
}

function 짓기_임원주주() {
  const { rows, sourceFile, 머리길이 } = 읽기('executives', 임원주주한줄);
  const byOfficerStatus = {};
  for (const k of ['registered', 'unregistered']) byOfficerStatus[k] = rows.filter((x) => x.isRegisteredOfficer === k).length;
  byOfficerStatus.not_an_officer = rows.filter((x) => x.isRegisteredOfficer === null).length;
  return {
    rows, sourceFile, 머리길이, byOfficerStatus,
  };
}

/* ── 자가시험 ───────────────────────────────────────────────────────── */
function 자가시험() {
  const 것 = []; const 재다 = (이름, 됐나) => 것.push({ 이름, 됐나 });

  const 대량글 = 'ticker,name_en,filing_kind,holder_name,shares_held,related_party_shares,reason_raw_ko\n'
    + '"0015S0","QUOTED, CO",general,"Kim, Jane",100,50,"사유 있음"\n'
    + '999999,PLAIN CO,abbreviated,Plain Holder,0,,\n';
  const 대량표 = 파싱(대량글);
  const 대량머리 = 대량표[0]; const 대량자 = (이름) => 대량머리.indexOf(이름);

  재다('파싱: 인용 속 쉼표를 칸 나눔으로 읽지 않는다', 대량표[1][1] === 'QUOTED, CO');
  재다('대량보유한줄: ticker 를 문자 그대로 지킨다(영숫자 코드)', 대량보유한줄(대량표[1], 대량자).ticker === '0015S0');
  재다('대량보유한줄: holder_name 을 원문 그대로 지킨다(로마자를 지어내지 않는다)',
    대량보유한줄(대량표[1], 대량자).holderName === 'Kim, Jane');
  재다('🔴 대량보유한줄: related_party_shares 빈칸은 null(0 이 아니다)',
    대량보유한줄(대량표[2], 대량자).relatedPartyShares === null);
  재다('대량보유한줄: 0 은 0 으로 읽는다(못 잰 것과 다르다)',
    대량보유한줄(대량표[2], 대량자).sharesHeld === 0);

  const 임원글 = 'ticker,person_name,is_registered_officer,title,relationship,shares_held\n'
    + '005930,Lee Byung,registered,대표이사,10%이상주주,1000\n'
    + '005930,Some Fund,,-,사실상지배주주,2000\n';
  const 임원표 = 파싱(임원글);
  const 임원머리 = 임원표[0]; const 임원자 = (이름) => 임원머리.indexOf(이름);

  재다('임원주주한줄: person_name 원문 그대로', 임원주주한줄(임원표[1], 임원자).personName === 'Lee Byung');
  재다('🔴 임원주주한줄: is_registered_officer 빈칸(주요주주·임원 아님)은 null',
    임원주주한줄(임원표[2], 임원자).isRegisteredOfficer === null);
  재다('임원주주한줄: registered 값은 그대로 옮긴다',
    임원주주한줄(임원표[1], 임원자).isRegisteredOfficer === 'registered');

  재다('글자: 빈 문자열은 null', 글자('') === null && 글자('  ') === null);
  재다('수: 빈칸은 null(0 이 아니다)', 수('') === null && 수(null) === null);
  재다('수: 0 은 0 으로 읽는다', 수('0') === 0);

  재다('최근원자료: 갈래별로 날짜순 가장 새 것', 최근원자료([
    'korea-ownership-ledger-filings-2026-09-01.csv',
    'korea-ownership-ledger-filings-2026-09-11.csv',
    'korea-ownership-ledger-executives-2026-09-11.csv',
  ], 'filings') === 'korea-ownership-ledger-filings-2026-09-11.csv');
  재다('⛔ 최근원자료: 없으면 null', 최근원자료([], 'filings') === null);
  재다('🔴 영문시각', 영문시각(new Date('2026-09-13T00:40:00+09:00')) === '13 September 2026, 00:40 KST');

  let 대량실제 = null; let 임원실제 = null;
  try { 대량실제 = 짓기_대량보유(); } catch (e) { 재다('실제 대량보유 CSV 로 지어진다 — ' + e.message, false); }
  try { 임원실제 = 짓기_임원주주(); } catch (e) { 재다('실제 임원주주 CSV 로 지어진다 — ' + e.message, false); }

  if (대량실제) {
    재다('실제 대량보유 파일로 지어진다', 대량실제.rows.length > 0);
    재다('머리 칸이 14개다(원자료 스펙)', 대량실제.머리길이 === 14);
    재다('🔴 filing_kind 두 갈래(general·abbreviated)의 합이 unmapped 를 제외한 전체와 같다',
      대량실제.byKind.general + 대량실제.byKind.abbreviated + 대량실제.unmappedKind === 대량실제.rows.length);
    재다('⛔ 실데이터: ticker 가 숫자로 안 바뀌어 앞자리 0 이 산다',
      대량실제.rows.every((r) => typeof r.ticker === 'string' || r.ticker === null));
  }
  if (임원실제) {
    재다('실제 임원주주 파일로 지어진다', 임원실제.rows.length > 0);
    재다('머리 칸이 13개다(원자료 스펙)', 임원실제.머리길이 === 13);
    재다('🔴 등기여부 세 갈래(등기·비등기·주요주주뿐)의 합이 전체 줄 수와 같다',
      임원실제.byOfficerStatus.registered + 임원실제.byOfficerStatus.unregistered
      + 임원실제.byOfficerStatus.not_an_officer === 임원실제.rows.length);
  }

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
console.log('');

const 적는다 = process.argv.includes('--적는다');
const 대량 = 짓기_대량보유();
const 임원 = 짓기_임원주주();

console.log(`■ Korea Ownership Ledger — filings: ${대량.sourceFile} · ${대량.rows.length}줄`);
console.log(`   general ${대량.byKind.general} · abbreviated ${대량.byKind.abbreviated} · unmapped ${대량.unmappedKind}`);
console.log(`■ Korea Ownership Ledger — executives: ${임원.sourceFile} · ${임원.rows.length}줄`);
console.log(`   registered ${임원.byOfficerStatus.registered} · unregistered ${임원.byOfficerStatus.unregistered} · 주요주주뿐 ${임원.byOfficerStatus.not_an_officer}`);

if (!적는다) { console.log('\n⭐ 아직 안 적었다. --적는다 를 붙인다.'); process.exit(0); }

const 오늘 = new Date();
const notThisFilings = [
  'Not investment advice or a recommendation.',
  'Not a romanized name list. holder_name is printed exactly as filed — Korean text stays Korean.',
  'Not a full float table. Only holders required to file (5%+ substantial shareholding), not every shareholder.',
  'Not a live feed. Reflects filings collected as of the source file date.',
];
const notThisExecutives = [
  'Not investment advice or a recommendation.',
  'Not a romanized name list. person_name is printed exactly as filed.',
  'Not a full insider list beyond what DART requires officers and major shareholders to file.',
  'Not a live feed. Reflects filings collected as of the source file date.',
];

fs.mkdirSync(path.dirname(path.join(뿌리, 낼곳_filings)), { recursive: true });
fs.writeFileSync(path.join(뿌리, 낼곳_filings), JSON.stringify({
  _meta: {
    product: 'Korea Ownership Ledger — substantial-shareholding filings',
    builtAt: 영문시각(오늘),
    sourceFile: `src/data/full/${대량.sourceFile}`,
    rows: 대량.rows.length,
    byKind: 대량.byKind,
    unmappedKind: 대량.unmappedKind,
    withRelatedParty: 대량.withRelatedParty,
    source: 'DART (Financial Supervisory Service) majorstock — substantial shareholding (5%+) filings, collected by us and published as our licensed dataset.',
    notThis: notThisFilings,
  },
  rows: 대량.rows,
}, null, 1), 'utf8');
console.log(`\n📁 적었다 — ${낼곳_filings}`);

fs.writeFileSync(path.join(뿌리, 낼곳_executives), JSON.stringify({
  _meta: {
    product: 'Korea Ownership Ledger — officer/major-shareholder ownership rows',
    builtAt: 영문시각(오늘),
    sourceFile: `src/data/full/${임원.sourceFile}`,
    rows: 임원.rows.length,
    byOfficerStatus: 임원.byOfficerStatus,
    source: 'DART (Financial Supervisory Service) elestock — officer/major-shareholder ownership status filings, collected by us and published as our licensed dataset.',
    notThis: notThisExecutives,
  },
  rows: 임원.rows,
}, null, 1), 'utf8');
console.log(`📁 적었다 — ${낼곳_executives}`);
