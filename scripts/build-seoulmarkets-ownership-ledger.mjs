#!/usr/bin/env node
/**
 * build-seoulmarkets-ownership-ledger.mjs — **Korea Ownership Ledger** 상품 파일을 짓는다.
 *
 * ── 무엇을 파는가 (docs/서울마켓츠-상품명세-P1.md Ⅱ-2-3 · 5번이 정한 칸) ─────────
 * DART majorstock(대량보유)·elestock(임원·주요주주 소유)를 영문화해서 두 표로 낸다.
 * FnOwnership(FnGuide, 월 11만원, 국문)의 우리 값 — 영문화 + 파일 + API.
 *
 * ⛔ 원자료가 이미 두 «다른 모양»이라(대량보유 11칸 · 임원주주 별도 칸) 한 표로 억지로
 *   합치지 않는다. 파일 둘 + 사전 하나로 낸다 — People Panel(한 표)과 다른 모양이라도
 *   자료의 실제 모양을 따른다(강령: 있는 그대로 적는다).
 *
 * ── 이 자가 지키는 것 ──────────────────────────────────────────────────────
 * ```
 * ⛔ holder_name(보고자)·person_name(성명)을 로마자로 «지어내지» 않는다.
 *   원문이 영문이면 그대로, 한글이면 한글 원문 그대로 낸다(추측 로마자 표기 없음)
 * ⛔ reason_raw_ko(보고사유원문)를 영문으로 요약하지 않는다 — 원문 한국어 칸으로 둔다
 * ⛔ 못 잰 칸을 
 * ✅ ticker(KRX 6자리)로 회사를 추린다 — 이름으로 추리지 않는다(강령 Ⅱ-2-2)
 * ```
 *
 * 쓰는 법
 *   node scripts/build-seoulmarkets-ownership-ledger.mjs
 *   node scripts/build-seoulmarkets-ownership-ledger.mjs --자가시험
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parquet로쓰기 } from './lib/parquet-out.mjs';
import { csv쓰기 } from './lib/csv-out.mjs';

const 뿌리 = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const 원본길 = path.join(뿌리, 'archive/raw/dart-ownership/ownership.ndjson');
/* 🔴 [2026-09-11] 전량은 공개 폴더에 두지 않는다 — 밸류에이션에서 겪은 실수(2026-09-10,
 * 사장님 물음: 「모든 상장사를 그냥 공짜로 내려받게 하는 게 도움이 될까?」)를 되풀이하지 않는다.
 * 전량은 src/data/full(비공개, git 은 지킨다) · 공개 폴더에는 «표본»만 낸다 */
const 전체방 = path.join(뿌리, 'src/data/full');
const 낼방 = path.join(뿌리, 'public/data');

export function 날꼴(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const 날 = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${날}`;
}

/** yyyymmdd → ISO 8601 날짜(시각 없음, KST 기준 날짜라 시각을 지어내지 않는다) */
export function ISO날짜(yyyymmdd) {
  const s = String(yyyymmdd ?? '').trim();
  if (!/^\d{8}$/.test(s)) return null;
  return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
}

export function 잰수(v) {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

const 보고구분사전 = { 일반: 'general', 약식: 'abbreviated' };
export function 보고구분영문(v) {
  return 보고구분사전[v] ?? (v ? `unmapped:${v}` : null);
}

const 등기여부사전 = { 등기임원: 'registered', 비등기임원: 'unregistered', '-': null };
export function 등기여부영문(v) {
  if (v === undefined) return null;
  return Object.prototype.hasOwnProperty.call(등기여부사전, v) ? 등기여부사전[v] : `unmapped:${v}`;
}

export function 칸(v) {
  if (v === null || v === undefined) return '';
  const s = String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export const 대량보유머리 = [
  'ticker', 'name_en', 'name_ko',
  'filing_id', 'filed_on', 'filing_kind', 'holder_name',
  'shares_held', 'shares_change', 'stake_pct', 'stake_change_pct',
  'related_party_shares', 'related_party_pct', 'reason_raw_ko',
];

export const 임원주주머리 = [
  'ticker', 'name_en', 'name_ko',
  'filing_id', 'filed_on', 'person_name', 'is_registered_officer', 'title', 'relationship',
  'shares_held', 'shares_change', 'stake_pct', 'stake_change_pct',
];

function CSV로(머리, 줄들) {
  return [머리.join(','), ...줄들.map((r) => 머리.map((k) => 칸(r[k])).join(','))].join('\n');
}

/**
 * 🔴 [2026-09-11 실측] 종목코드는 «6자리 숫자»가 아니라 «6자리 영숫자»다.
 * "0015S0" 처럼 글자 섞인 코드도 KRX·공공데이터포털 시세 파일에 그대로 있는 진짜 코드다
 * (People Panel 에서 먼저 실측 — 스팩 아닌 실제 상장사 22곳이 순수 숫자 필터에서 빠졌었다).
 */
export function 유효한종목코드인가(t) {
  return /^[0-9A-Za-z]{6}$/.test(String(t ?? ''));
}

/** 표본 — 가장 최근에 접수된 건부터 N건. ⛔ 파일 순서(회사 순서)로 자르지 않는다 */
export function 표본뽑기(rows, 몇줄 = 100) {
  if (!Array.isArray(rows)) return [];
  return [...rows]
    .sort((a, b) => String(b?.filed_on ?? '').localeCompare(String(a?.filed_on ?? '')))
    .slice(0, 몇줄);
}

function 짓기() {
  const 회사들 = fs.readFileSync(원본길, 'utf8').trim().split('\n')
    .map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);

  const 대량보유줄 = [];
  const 임원주주줄 = [];
  let 보고구분못맞춘것 = 0;
  let 등기여부못맞춘것 = 0;

  for (const c of 회사들) {
    const t = String(c.종목 ?? '').padStart(6, '0');
    if (!유효한종목코드인가(t)) continue;
    const 공통 = { ticker: t, name_en: c.영문 ?? null, name_ko: c.이름 ?? null };

    for (const x of c.대량보유 ?? []) {
      const 구분 = 보고구분영문(x.보고구분);
      if (구분?.startsWith('unmapped:')) 보고구분못맞춘것 += 1;
      대량보유줄.push({
        ...공통,
        filing_id: x.접수번호 ?? null,
        filed_on: ISO날짜(x.접수일),
        filing_kind: 구분,
        holder_name: x.보고자 ?? null,
        shares_held: 잰수(x.보유주식수),
        shares_change: 잰수(x.보유주식수증감),
        stake_pct: 잰수(x.보유비율),
        stake_change_pct: 잰수(x.보유비율증감),
        related_party_shares: 잰수(x.특별관계자주식수),
        related_party_pct: 잰수(x.특별관계자비율),
        reason_raw_ko: x.보고사유원문 ?? null,
      });
    }

    for (const x of c.임원주주 ?? []) {
      const 등기 = 등기여부영문(x.등기여부);
      if (등기?.startsWith?.('unmapped:')) 등기여부못맞춘것 += 1;
      임원주주줄.push({
        ...공통,
        filing_id: x.접수번호 ?? null,
        filed_on: ISO날짜(x.접수일),
        person_name: x.성명 ?? null,
        is_registered_officer: 등기,
        title: x.직위 ?? null,
        relationship: x.관계 ?? null,
        shares_held: 잰수(x.소유주식수),
        shares_change: 잰수(x.소유주식수증감),
        stake_pct: 잰수(x.소유비율),
        stake_change_pct: 잰수(x.소유비율증감),
      });
    }
  }

  const 오늘 = 날꼴();
  fs.mkdirSync(전체방, { recursive: true });
  fs.mkdirSync(낼방, { recursive: true });

  const 대량보유길 = path.join(전체방, `korea-ownership-ledger-filings-${오늘}.csv`);
  csv쓰기(대량보유길, CSV로(대량보유머리, 대량보유줄)); // ⭐ [F5·2번] BOM

  const 임원주주길 = path.join(전체방, `korea-ownership-ledger-executives-${오늘}.csv`);
  csv쓰기(임원주주길, CSV로(임원주주머리, 임원주주줄)); // ⭐ [F5·2번] BOM

  /* 표본 — 최근 접수 100건씩. 칸은 하나도 줄이지 않는다 */
  const 대량보유표본 = 표본뽑기(대량보유줄);
  const 대량보유표본머리 = [
    `# Korea Ownership Ledger — substantial-shareholding filings — SeoulMarkets (https://seoulmarkets.com/data/ownership)`,
    `# 🔓 THIS IS A FREE SAMPLE: the ${대량보유표본.length} most recently filed rows.`,
    `#   The full ledger covers ${대량보유줄.length.toLocaleString('en-US')} filings. Same columns, same method.`,
    '#   The full file and the query API are the licensed product: https://seoulmarkets.com/data',
    `# built: ${오늘}`,
  ].join('\n');
  csv쓰기(
    path.join(낼방, 'korea-ownership-ledger-filings-sample.csv'),
    [대량보유표본머리, CSV로(대량보유머리, 대량보유표본)].join('\n'),
  );
  parquet로쓰기(대량보유표본, 대량보유머리, path.join(낼방, 'korea-ownership-ledger-filings-sample.parquet'));

  const 임원주주표본 = 표본뽑기(임원주주줄);
  const 임원주주표본머리 = [
    `# Korea Ownership Ledger — officer/major-shareholder rows — SeoulMarkets (https://seoulmarkets.com/data/ownership)`,
    `# 🔓 THIS IS A FREE SAMPLE: the ${임원주주표본.length} most recently filed rows.`,
    `#   The full ledger covers ${임원주주줄.length.toLocaleString('en-US')} rows. Same columns, same method.`,
    '#   The full file and the query API are the licensed product: https://seoulmarkets.com/data',
    `# built: ${오늘}`,
  ].join('\n');
  csv쓰기(
    path.join(낼방, 'korea-ownership-ledger-executives-sample.csv'),
    [임원주주표본머리, CSV로(임원주주머리, 임원주주표본)].join('\n'),
  );
  parquet로쓰기(임원주주표본, 임원주주머리, path.join(낼방, 'korea-ownership-ledger-executives-sample.parquet'));

  const 사전 = {
    product: 'Korea Ownership Ledger',
    version: 오늘,
    publisher: 'SeoulMarkets (KLifeDesign Inc.)',
    disclaimer: 'This file is data, not investment advice. It contains no recommendation to buy or sell anything.',
    whatThisIs: `Two tables from DART (Financial Supervisory Service) ownership disclosures for Korean listed companies. ${대량보유줄.length.toLocaleString('en-US')} substantial-shareholding filings (majorstock) and ${임원주주줄.length.toLocaleString('en-US')} officer/major-shareholder ownership rows (elestock).`,
    whatThisIsNot: [
      'Not investment advice or a recommendation.',
      'Not a live feed. Each version is a snapshot as of its filename date; it does not update after publication.',
      'Not a romanized name list. holder_name and person_name are printed exactly as filed — Korean text is left in Korean, not transliterated.',
      'Not a full float table. This covers only names required to file (5%+ holders, officers, major shareholders), not every shareholder.',
    ],
    source: 'DART (Financial Supervisory Service) — majorstock (substantial shareholding) and elestock (executive/major shareholder ownership status) APIs',
    files: {
      [`korea-ownership-ledger-filings-${오늘}.csv`]: {
        rows: 대량보유줄.length,
        grain: 'one row per substantial-shareholding filing (majorstock)',
        columns: {
          ticker: 'Six-digit KRX issue code.',
          name_en: 'English company name as filed with DART. Blank when DART has no English name on record.',
          name_ko: 'Korean company name as filed.',
          filing_id: 'DART receipt number (rcept_no). Unique per filing.',
          filed_on: 'Filing date, ISO 8601 (YYYY-MM-DD), KST.',
          filing_kind: '"general" or "abbreviated" (일반/약식), from DART report_tp. "unmapped:<원문>" if a new value appears that this file has not yet mapped.',
          holder_name: 'Reporting holder’s name exactly as filed. Not translated or transliterated.',
          shares_held: 'Shares held after this filing.',
          shares_change: 'Change in shares held versus the previous filing.',
          stake_pct: 'Ownership percentage after this filing.',
          stake_change_pct: 'Change in ownership percentage versus the previous filing.',
          related_party_shares: 'Shares held by related parties acting together with the reporting holder.',
          related_party_pct: 'Ownership percentage held by related parties.',
          reason_raw_ko: 'Reason for the filing, original Korean text as filed. Not summarized or translated — we do not invent an English gloss for legal text.',
        },
      },
      [`korea-ownership-ledger-executives-${오늘}.csv`]: {
        rows: 임원주주줄.length,
        grain: 'one row per officer/major-shareholder ownership record (elestock)',
        columns: {
          ticker: 'Six-digit KRX issue code.',
          name_en: 'English company name as filed with DART.',
          name_ko: 'Korean company name as filed.',
          filing_id: 'DART receipt number (rcept_no).',
          filed_on: 'Filing date, ISO 8601 (YYYY-MM-DD), KST.',
          person_name: 'Person’s name exactly as filed. Not translated or transliterated.',
          is_registered_officer: '"registered" or "unregistered" (등기임원/비등기임원). Blank when DART reports neither (major shareholder who is not an officer).',
          title: 'Job title as filed, original text.',
          relationship: 'Relationship to the company as filed (e.g. major shareholder, executive), original text.',
          shares_held: 'Shares held.',
          shares_change: 'Change in shares held versus the previous filing.',
          stake_pct: 'Ownership percentage.',
          stake_change_pct: 'Change in ownership percentage versus the previous filing.',
        },
      },
    },
  };
  const 사전길 = path.join(낼방, `korea-ownership-ledger-dictionary-${오늘}.json`);
  fs.writeFileSync(사전길, JSON.stringify(사전, null, 1), 'utf8');

  console.log(`✅ ${대량보유길} (전량 · 공개 폴더 아님)`);
  console.log(`   행 ${대량보유줄.length.toLocaleString('en-US')} · 칸 ${대량보유머리.length}`);
  console.log(`✅ ${임원주주길} (전량 · 공개 폴더 아님)`);
  console.log(`   행 ${임원주주줄.length.toLocaleString('en-US')} · 칸 ${임원주주머리.length}`);
  if (보고구분못맞춘것) console.log(`   ⚠ filing_kind 못 맞춘 값 ${보고구분못맞춘것}건 — 사전에 unmapped: 로 남음`);
  if (등기여부못맞춘것) console.log(`   ⚠ is_registered_officer 못 맞춘 값 ${등기여부못맞춘것}건 — 사전에 unmapped: 로 남음`);
  console.log(`✅ ${사전길}`);
  console.log(`✅ ${path.join(낼방, 'korea-ownership-ledger-filings-sample.csv')} (표본 ${대량보유표본.length}행 · 공개)`);
  console.log(`✅ ${path.join(낼방, 'korea-ownership-ledger-executives-sample.csv')} (표본 ${임원주주표본.length}행 · 공개)`);
  console.log(`✅ 같은 표본 둘 다 .parquet 로도 냄`);
}

const 나 = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);

if (나 && process.argv.includes('--자가시험')) {
  let 통 = 0; const 실 = [];
  const 검 = (n, ok) => { if (ok) 통 += 1; else 실.push(n); };

  검('잰수 — 수를 읽는다', 잰수('1234') === 1234);
  검('⛔ 잰수 — null 은 null (0 이 아니다)', 잰수(null) === null);
  검('⛔ 잰수 — 빈 글도 null', 잰수('') === null);
  검('잰수 — 0 은 «잰 0» 이므로 살린다', 잰수(0) === 0);

  검('ISO날짜 — yyyymmdd 를 가른다', ISO날짜('20250416') === '2025-04-16');
  검('⛔ ISO날짜 — 8자리 아니면 null', ISO날짜('2025416') === null);
  검('⛔ ISO날짜 — 없으면 null', ISO날짜(null) === null);

  검('보고구분영문 — 일반→general', 보고구분영문('일반') === 'general');
  검('보고구분영문 — 약식→abbreviated', 보고구분영문('약식') === 'abbreviated');
  검('⛔ 보고구분영문 — 모르는 값은 지어내지 않고 표시만 한다', 보고구분영문('새구분') === 'unmapped:새구분');
  검('보고구분영문 — 없으면 null', 보고구분영문(null) === null);

  검('등기여부영문 — 등기임원→registered', 등기여부영문('등기임원') === 'registered');
  검('등기여부영문 — 비등기임원→unregistered', 등기여부영문('비등기임원') === 'unregistered');
  검('등기여부영문 — «-»는 null(임원이 아닌 주요주주)', 등기여부영문('-') === null);
  검('⛔ 등기여부영문 — 모르는 값은 지어내지 않는다', 등기여부영문('새값') === 'unmapped:새값');

  검('칸 — 보통 값은 그대로', 칸('abc') === 'abc');
  검('⛔ 칸 — 없는 값은 빈 칸', 칸(null) === '');
  검('⛔ 칸 — 쉼표가 든 값을 감싼다', 칸('a,b') === '"a,b"');
  검('⛔ 칸 — 줄바꿈이 든 값을 감싼다(보고사유원문이 여러 줄이다)', 칸('a\nb') === '"a\nb"');

  검('머리칸 — holder_name 은 있고 romanized 이름 칸은 없다',
    대량보유머리.includes('holder_name') && !대량보유머리.some((h) => /roman/i.test(h)));
  검('머리칸 — reason_raw_ko 이름에 «원문 한국어»가 드러난다', 대량보유머리.includes('reason_raw_ko'));
  검('머리칸 — ticker 로 추린다(이름으로 추리지 않는다)', 대량보유머리[0] === 'ticker' && 임원주주머리[0] === 'ticker');

  검('🔴 「로마자로 «지어내지» 않는다」가 코드에 살아 있다',
    fs.readFileSync(fileURLToPath(import.meta.url), 'utf8').includes('로마자로 «지어내지» 않는다'));

  검('유효한종목코드인가 — 순수 숫자 6자리는 유효', 유효한종목코드인가('005930') === true);
  검('🔴 유효한종목코드인가 — 글자 섞인 6자리도 유효(진짜 코드다)', 유효한종목코드인가('0015S0') === true);
  검('⛔ 유효한종목코드인가 — 6자리가 아니면 무효', 유효한종목코드인가('12345') === false);

  검('표본뽑기 — 최근 접수일부터 N건', (() => {
    const r = 표본뽑기([{ filed_on: '2026-01-01' }, { filed_on: '2026-09-01' }, { filed_on: '2026-05-01' }], 2);
    return r.length === 2 && r[0].filed_on === '2026-09-01' && r[1].filed_on === '2026-05-01';
  })());
  검('⛔ 표본뽑기 — 배열이 아니면 빈 배열', 표본뽑기(null).length === 0);

  if (실.length) {
    console.error(`❌ 자가시험 실패 ${실.length}\n${실.map((x) => `   · ${x}`).join('\n')}`);
    process.exit(1);
  }
  console.log(`✅ Korea Ownership Ledger 짓는 자 — 자가시험 ${통}개 통과`);
  process.exit(0);
}

if (나) 짓기();
