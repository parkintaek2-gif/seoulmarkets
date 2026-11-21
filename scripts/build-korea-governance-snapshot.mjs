#!/usr/bin/env node
/**
 * build-korea-governance-snapshot.mjs — **Korea Governance Snapshot (KOSPI).**
 *
 * ── 왜 (사장님 지시 2026-09-11 KST) ──────────────────────────────────────
 * 「거버넌스는 중요한 기업정보」·「거버넌스 데이터를 구해봐, 우리나라 상장사들(코스피만)」
 * SK 그룹의 지주회사 규제 완화(수평출자) 논의·삼성전자의 자사주 대신 배당 선택 뒤에는
 * 「누가 몇 %로 누구를 쥐고 있나」라는 지분 구조가 있다. `collect-dart-ownership.mjs` 가
 * 이미 받아 둔 대량보유(majorstock, 5%룰) 원자료에서 **회사별·보고자별 «가장 최근» 지분율**
 * 만 뽑아 스냅숏으로 낸다 — Korea Ownership Ledger(전체 이력·유료)의 «지금 이 순간» 판이다.
 *
 * ── ⛔ 이 자가 지키는 것 ────────────────────────────────────────────────
 * ⛔ 보고자 이름을 로마자로 지어내지 않는다 — 원문 한글 그대로 낸다(대조는 사람이 한다)
 * ⛔ 접수일이 없는 행은 「최근」 판정에서 뺀다 — 날짜 없는 것을 최신으로 잘못 고르지 않는다
 * ⛔ 못 받은 회사(대량보유 0행)를  — holders: [] 로 두고 이유를 남긴다
 * ✅ 코스피(시장 Y)만 추린다 — 사장님이 그렇게 정하셨다. 코스닥·코넥스는 다음 판이다
 *
 * 쓰는 법
 *   node scripts/build-korea-governance-snapshot.mjs
 *   node scripts/build-korea-governance-snapshot.mjs --자가시험
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const 뿌리 = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const 지분길 = path.join(뿌리, 'archive/raw/dart-ownership/ownership.ndjson');
const 회사길 = path.join(뿌리, 'archive/raw/dart-company/company.ndjson');
const 낼곳 = path.join(뿌리, 'src/data/korea-governance-snapshot-kospi.json');

/** ndjson을 줄마다 읽는다. 못 읽으면 null(⛔ 빈 배열이 아니다) */
export function ndjson읽기(글) {
  if (글 === null || 글 === undefined) return null;
  const 것 = [];
  for (const 줄 of String(글).split(/\r?\n/)) {
    const t = 줄.trim();
    if (!t) continue;
    try { 것.push(JSON.parse(t)); } catch { /* 깨진 줄은 건너뛴다 */ }
  }
  return 것;
}

/**
 * 한 회사의 대량보유 배열에서 «보고자별 최신 한 줄»만 남긴다.
 * ⛔ 접수일이 없으면 그 행은 후보에서 뺀다(가장 최근인지 알 수 없다).
 * ⚠ 같은 보고자가 이름을 살짝 다르게 적는 경우(공백 등)를 가르지 않는다 — 원문 그대로 비교한다.
 */
export function 보고자별최신(대량보유) {
  const 것 = new Map(); // 보고자 -> 최신 행
  for (const x of (Array.isArray(대량보유) ? 대량보유 : [])) {
    const 보고자 = x?.보고자;
    const 접수일 = x?.접수일;
    if (!보고자 || !/^\d{8}$/.test(String(접수일 ?? ''))) continue;
    const 기존 = 것.get(보고자);
    if (!기존 || String(접수일) > String(기존.접수일)) 것.set(보고자, x);
  }
  return [...것.values()];
}

/** ISO 날짜(시각 없음) — yyyymmdd만 다룬다, 지어내지 않는다 */
export function ISO날짜(yyyymmdd) {
  const s = String(yyyymmdd ?? '').trim();
  if (!/^\d{8}$/.test(s)) return null;
  return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
}

/** 한 회사 레코드 → 지면이 쓸 꼴 */
export function 회사스냅숏(c) {
  const 최신들 = 보고자별최신(c?.대량보유)
    .sort((a, b) => (b.보유비율 ?? -1) - (a.보유비율 ?? -1))
    .map((x) => ({
      holder_name: x.보고자 ?? null,
      stake_pct: Number.isFinite(x.보유비율) ? x.보유비율 : null,
      related_party_pct: Number.isFinite(x.특별관계자비율) ? x.특별관계자비율 : null,
      as_of: ISO날짜(x.접수일),
      filing_kind: x.보고구분 ?? null,
    }));
  return {
    ticker: c?.종목 ?? null,
    name_ko: c?.이름 ?? null,
    name_en: c?.영문 ?? null,
    holders: 최신들,
    holder_count: 최신들.length,
  };
}

/* ── 자가시험 ───────────────────────────────────────────────────────── */
function 자가시험() {
  const 것 = []; const 재다 = (이름, 됐나) => 것.push({ 이름, 됐나 });

  재다('ndjson읽기: 줄마다 읽는다', (() => {
    const r = ndjson읽기('{"a":1}\n{"a":2}\n');
    return Array.isArray(r) && r.length === 2 && r[1].a === 2;
  })());
  재다('⛔ ndjson읽기: 못 읽으면 null', ndjson읽기(null) === null);
  재다('ndjson읽기: 깨진 줄은 건너뛴다', ndjson읽기('{"a":1}\n깨진줄\n').length === 1);

  const 대량 = [
    { 보고자: '삼성물산', 접수일: '20241025', 보유비율: 20.08, 특별관계자비율: 1.63 },
    { 보고자: '삼성물산', 접수일: '20240101', 보유비율: 19.5, 특별관계자비율: 1.6 },
    { 보고자: '삼성생명', 접수일: '20240601', 보유비율: 8.5, 특별관계자비율: null },
    { 보고자: '접수일없음', 접수일: null, 보유비율: 5, 특별관계자비율: null },
  ];
  재다('보고자별최신: 같은 보고자는 «가장 최근 것 하나»만 남긴다', (() => {
    const r = 보고자별최신(대량);
    const 삼성물산 = r.find((x) => x.보고자 === '삼성물산');
    return r.length === 2 && 삼성물산.접수일 === '20241025' && 삼성물산.보유비율 === 20.08;
  })());
  재다('🔴 보고자별최신: 접수일 없는 행은 뺀다', (() => {
    const r = 보고자별최신(대량);
    return !r.some((x) => x.보고자 === '접수일없음');
  })());
  재다('⛔ 보고자별최신: 빈/이상 입력은 빈 배열', (() => {
    return 보고자별최신(null).length === 0 && 보고자별최신([{ 보고자: null }]).length === 0;
  })());

  재다('ISO날짜: 8자리를 하이픈으로', ISO날짜('20241025') === '2024-10-25');
  재다('⛔ ISO날짜: 못 읽으면 null', ISO날짜('2024') === null && ISO날짜(null) === null);

  재다('회사스냅숏: 지분율 내림차순 정렬', (() => {
    const r = 회사스냅숏({ 종목: '005930', 이름: '삼성전자', 영문: 'Samsung Electronics', 대량보유: 대량 });
    return r.holders[0].holder_name === '삼성물산' && r.holders[0].stake_pct === 20.08
      && r.holder_count === 2;
  })());
  재다('🔴 회사스냅숏: 대량보유가 없으면 holders 빈 배열()', (() => {
    const r = 회사스냅숏({ 종목: '000001', 이름: 'X', 영문: 'X', 대량보유: [] });
    return Array.isArray(r.holders) && r.holders.length === 0 && r.holder_count === 0;
  })());
  재다('회사스냅숏: 대량보유 필드가 아예 없어도 안 죽는다', (() => {
    const r = 회사스냅숏({ 종목: '000002', 이름: 'Y', 영문: 'Y' });
    return r.holders.length === 0;
  })());

  const 실패 = 것.filter((x) => !x.됐나);
  console.log(`■ 자가시험 ${것.length - 실패.length}/${것.length}`);
  for (const x of 실패) console.log(`  🔴 ${x.이름}`);
  return 실패.length === 0;
}

if (process.argv.includes('--자가시험')) {
  process.exit(자가시험() ? 0 : 1);
}

function 돌리기() {
  if (!자가시험()) { console.log('🔴 자가시험이 깨졌다 — 만들지 않는다.'); process.exit(1); }
  console.log('');

  const 지분원문 = ndjson읽기(fs.readFileSync(지분길, 'utf8'));
  if (지분원문 === null) { console.log(`🔴 못 읽었다 — ${지분길}`); process.exit(1); }
  const 회사원문 = ndjson읽기(fs.readFileSync(회사길, 'utf8'));
  if (회사원문 === null) { console.log(`🔴 못 읽었다 — ${회사길}`); process.exit(1); }

  const 코스피종목 = new Set(회사원문.filter((c) => c.시장 === 'Y').map((c) => c.종목));
  console.log(`■ 코스피 상장 ${코스피종목.size}곳`);

  const 코스피지분 = 지분원문.filter((c) => 코스피종목.has(c.종목));
  console.log(`■ 지분공시 자료가 있는 코스피 ${코스피지분.length}곳 (자료가 없는 ${코스피종목.size - 코스피지분.length}곳은 5% 이상 보고 자체가 없다)`);

  const 회사들 = 코스피지분.map(회사스냅숏).sort((a, b) => (b.holders[0]?.stake_pct ?? -1) - (a.holders[0]?.stake_pct ?? -1));
  const 보고자있는곳 = 회사들.filter((c) => c.holder_count > 0).length;

  const 낼것 = {
    _왜: 'DART 대량보유상황보고(5%룰)에서 회사·보고자별 «가장 최근» 지분율만 뽑은 스냅숏. 코스피만(사장님 지시 2026-09-11).',
    builtAt: new Date().toLocaleString('en-GB', { timeZone: 'Asia/Seoul' }),
    market: 'KOSPI',
    companiesInMarket: 코스피종목.size,
    companiesWithFilings: 보고자있는곳,
    companies: 회사들,
  };
  fs.mkdirSync(path.dirname(낼곳), { recursive: true });
  fs.writeFileSync(낼곳, JSON.stringify(낼것, null, 1), 'utf8');
  console.log(`■ 대량보유 있는 곳 ${보고자있는곳} / ${코스피종목.size}`);
  console.log(`📁 적었다 — ${낼곳}`);
}

돌리기();
