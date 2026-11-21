#!/usr/bin/env node
/**
 * build-kcw-label-accounts.mjs — **상장 K팝 회사의 «신고된 계정»을 축 지면 자료로 접는다.**
 *
 *   node scripts/build-kcw-label-accounts.mjs            무엇이 붙나만 잰다
 *   node scripts/build-kcw-label-accounts.mjs --적는다
 *   node scripts/build-kcw-label-accounts.mjs --자가시험
 *
 * ── 🔴 왜 만드나 (2026-09-10) ────────────────────────────────────────────
 *
 * 오늘 「상장 K팝 여섯 곳의 2025 실적」 기사를 냈는데, **그 기사가 걸 축 지면이 없었다.**
 * 표 약속 검사가 그것을 잡았다 — 기사의 대표 수(17.5%)가 걸린 지면의 «표 칸»에 없다고.
 * ⛔ 검사를 피해 가지 않는다. 지면이 없는 것이 사실이므로 지면을 만든다.
 *   사장님 규칙: 「이슈 4편은 반드시 축 지면 하나에 묶는다」 — 묶을 지면이 있어야 묶는다.
 *
 * ── ⛔ 이 자가 지키는 것 ───────────────────────────────────────────────
 * ```
 * ⛔ 값이 «중첩 객체·쉼표 든 글자»다. 숫자로 바로 읽으면 NaN 이 된다 — 오늘 내가 그랬다.
 *   {"매출액":{"당기":"2,649,870,246,000","전기":"..."}}
 * ⛔ 못 읽으면 null 이다.  — 「매출 0」은 폐업한 회사라는 뜻이 된다.
 * ⛔ 시총이 없는 곳(CJ E&M)을 빼지 않는다. 줄로 남기고 「못 쟀다」를 칸에 적는다.
 * ⛔ PER 을 내지 않는다 — 시총은 하루, 이익은 한 해다. 분자와 분모를 내고 몫은 손님이 낸다.
 * ⛔ 「왜 손실이 났나」를 지어내지 않는다. 영업선 아래 차이를 «수로만» 낸다.
 * ⛔ 회사 이름을 영문으로 낸다 — 손님이 영어권이다. 영문이 없으면 null 이고, 그렇게 적는다.
 * ```
 */

import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
export const 재무길 = 'archive/raw/kpop-agencies/financials-2025.json';
export const 시총길 = 'archive/raw/kpop-agencies/market-cap-20260908.json';
export const 회사길 = 'archive/raw/kpop-agencies/company.json';
export const 낼곳 = 'src/data/kcw-label-accounts.json';

/* ── 재는 함수들 ───────────────────────────────────────────────────── */

/**
 * 쉼표 든 금액 글자를 수로. ⛔ 빈 것·못 읽는 것은 null (0 이 아니다).
 * 🔴 [2026-09-10] 이 자를 안 쓰고 값을 바로 Number() 에 넣어 여섯 곳이 «전부 NaN» 이 나왔고,
 *   나는 그것을 「재무 자료가 없다」로 읽을 뻔했다. 한 줄을 열어 보고 알았다.
 */
export function 금액(글) {
  if (글 === null || 글 === undefined) return null;
  const s = String(글).trim().replace(/,/g, '');
  if (!s || s === '-') return null;
  if (!/^-?\d+(\.\d+)?$/.test(s)) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/** 중첩 칸에서 당기·전기를 꺼낸다. 칸이 없으면 둘 다 null */
export function 두해(칸) {
  if (!칸 || typeof 칸 !== 'object') return { 당기: null, 전기: null, 기간: null };
  return {
    당기: 금액(칸.당기),
    전기: 금액(칸.전기),
    기간: typeof 칸.당기기간 === 'string' ? 칸.당기기간 : null,
  };
}

/** 늘어난 비율(%). ⛔ 전기가 0 이하면 «비율이 뜻을 잃는다» — null 이고 까닭을 함께 낸다 */
export function 늘음(당기, 전기) {
  if (!Number.isFinite(당기) || !Number.isFinite(전기)) return { 값: null, 까닭: 'not measured' };
  if (전기 <= 0) return { 값: null, 까닭: 'prior year was not positive' };
  return { 값: +(((당기 / 전기) - 1) * 100).toFixed(1), 까닭: null };
}

/** 흑자·적자가 바뀌었나 — ⛔ 「좋아졌다」로 적지 않는다. 무엇이 무엇으로 바뀌었나만 적는다 */
export function 부호바뀜(당기, 전기) {
  if (!Number.isFinite(당기) || !Number.isFinite(전기)) return null;
  const 꼴 = (n) => (n > 0 ? 'profit' : n < 0 ? 'loss' : 'nil');
  const a = 꼴(전기); const b = 꼴(당기);
  return a === b ? null : `${a} to ${b}`;
}

/**
 * 영업선 «아래»에서 난 차이. 영업이익과 순이익의 거리다.
 * ⛔ 이것이 «무엇인지»는 말하지 않는다 — 크기만 낸다. 주석을 읽는 것은 다른 일이다.
 */
export function 영업선아래(영업이익, 순이익) {
  if (!Number.isFinite(영업이익) || !Number.isFinite(순이익)) return null;
  return 순이익 - 영업이익;
}

/** 한 줄 접기 */
export function 한줄(f, 시총, 영문이름) {
  const 매출 = 두해(f?.매출액);
  const 영업 = 두해(f?.영업이익);
  const 순익 = 두해(f?.당기순이익);
  const 못쟀다 = [];
  if (!Number.isFinite(시총)) 못쟀다.push('market capitalisation');
  if (매출.당기 === null) 못쟀다.push('revenue');
  if (영업.당기 === null) 못쟀다.push('operating profit');
  if (순익.당기 === null) 못쟀다.push('net profit');

  return {
    nameEn: 영문이름 ?? null,
    ticker: f?.종목 ?? null,
    basis: typeof f?.재무제표구분 === 'string' && f.재무제표구분.startsWith('CFS')
      ? 'Consolidated' : (f?.재무제표구분 ? 'Separate' : null),
    filingReceipt: f?.rcept_no ?? null,
    fiscalYear: f?.사업연도 ? Number(f.사업연도) : null,
    period: 매출.기간,
    marketCap: Number.isFinite(시총) ? 시총 : null,
    revenue: 매출.당기, revenuePrior: 매출.전기,
    revenueChangePct: 늘음(매출.당기, 매출.전기).값,
    operatingProfit: 영업.당기, operatingProfitPrior: 영업.전기,
    operatingProfitChangePct: 늘음(영업.당기, 영업.전기).값,
    operatingProfitChangeNote: 늘음(영업.당기, 영업.전기).까닭,
    operatingSwing: 부호바뀜(영업.당기, 영업.전기),
    netProfit: 순익.당기, netProfitPrior: 순익.전기,
    netProfitSwing: 부호바뀜(순익.당기, 순익.전기),
    belowOperatingLine: 영업선아래(영업.당기, 순익.당기),
    notMeasured: 못쟀다.length ? 못쟀다.join(', ') : null,
  };
}

/* ── 자가시험 ───────────────────────────────────────────────────────── */
function 자가시험() {
  const 것 = []; const 재다 = (이름, 됐나) => 것.push({ 이름, 됐나 });

  재다('금액: 쉼표를 뗀다', 금액('2,649,870,246,000') === 2649870246000);
  재다('금액: 음수', 금액('-254,385,318,000') === -254385318000);
  재다('🔴 금액: 빈 것·「-」·못 읽는 것은 null — 0 이 아니다',
    금액('') === null && 금액('-') === null && 금액('약 1,000') === null && 금액(null) === null);
  재다('금액: 0 은 진짜 0', 금액('0') === 0);

  재다('두해: 당기·전기·기간을 꺼낸다', (() => {
    const r = 두해({ 당기: '100', 전기: '80', 당기기간: '2025.01.01 ~ 2025.12.31' });
    return r.당기 === 100 && r.전기 === 80 && /2025/.test(r.기간);
  })());
  재다('🔴 두해: 칸이 없으면 둘 다 null — 이 자를 안 써서 여섯 곳이 NaN 으로 나왔다', (() => {
    const r = 두해(undefined);
    return r.당기 === null && r.전기 === null && r.기간 === null;
  })());
  재다('⛔ 두해: 수를 바로 넣으면 (객체가 아니면) null', 두해(100).당기 === null);

  재다('늘음: 17.5%', 늘음(2650, 2256).값 === 17.5);
  재다('늘음: 줄어든 것은 음수', 늘음(87, 103).값 === -15.5);
  재다('🔴 늘음: 전기가 0 이하면 null 이고 까닭을 낸다 — 「적자→흑자」를 비율로 내지 않는다', (() => {
    const r = 늘음(71, -21);
    return r.값 === null && /not positive/.test(r.까닭);
  })());
  재다('⛔ 늘음: 못 재면 null', 늘음(null, 100).값 === null && 늘음(100, null).값 === null);

  재다('부호바뀜: 적자에서 흑자로', 부호바뀜(71, -21) === 'loss to profit');
  재다('부호바뀜: 흑자에서 적자로', 부호바뀜(-7, 12) === 'profit to loss');
  재다('부호바뀜: 안 바뀌면 null', 부호바뀜(100, 80) === null && 부호바뀜(-1, -4) === null);
  재다('⛔ 부호바뀜: 못 재면 null', 부호바뀜(null, 1) === null);

  재다('영업선아래: 순익 − 영업익', 영업선아래(49, -254) === -303);
  재다('⛔ 영업선아래: 못 재면 null', 영업선아래(null, 1) === null);

  const f = {
    종목: '352820', 사업연도: '2025', 재무제표구분: 'CFS(연결)', rcept_no: '20260320000802',
    매출액: { 당기: '2,650', 전기: '2,256', 당기기간: '2025.01.01 ~ 2025.12.31' },
    영업이익: { 당기: '49', 전기: '184' },
    당기순이익: { 당기: '-254', 전기: '-3' },
  };
  재다('한줄: 다 붙으면 notMeasured 가 null', (() => {
    const r = 한줄(f, 7820, 'HYBE Co., Ltd.');
    return r.notMeasured === null && r.revenueChangePct === 17.5
      && r.basis === 'Consolidated' && r.belowOperatingLine === -303
      && r.filingReceipt === '20260320000802';
  })());
  재다('🔴 한줄: 시총이 없어도 «줄은 남고» 까닭이 칸에 적힌다', (() => {
    const r = 한줄(f, null, 'X');
    return r.marketCap === null && /market capitalisation/.test(r.notMeasured);
  })());
  재다('🔴 한줄: 재무가 통째로 없으면 못 쟀다가 셋 다 적힌다', (() => {
    const r = 한줄({}, null, 'CJ E&M Corporation');
    return /revenue/.test(r.notMeasured) && /operating profit/.test(r.notMeasured)
      && /net profit/.test(r.notMeasured);
  })());
  재다('⛔ 한줄: 영문 이름이 없으면 null 이다 — 한국어로 채우지 않는다',
    한줄(f, 1, null).nameEn === null);

  const 실패 = 것.filter((x) => !x.됐나);
  console.log(`■ 자가시험 ${것.length - 실패.length}/${것.length}`);
  for (const x of 실패) console.log(`  🔴 ${x.이름}`);
  return 실패.length === 0;
}

/* ── 돌리기 ─────────────────────────────────────────────────────────── */
if (process.argv.includes('--자가시험')) process.exit(자가시험() ? 0 : 1);
if (!자가시험()) { console.log('🔴 자가시험이 깨졌다 — 만들지 않는다.'); process.exit(1); }
console.log('');

const 읽기 = (p) => { try { return JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8')); } catch { return null; } };
const 재무 = 읽기(재무길); const 시총 = 읽기(시총길); const 회사 = 읽기(회사길);
if (!재무 || !시총 || !회사) {
  console.log(`🔴 원자료를 못 읽었다 — 재무 ${!!재무} · 시총 ${!!시총} · 회사 ${!!회사}`);
  process.exit(1);
}

const 영문 = new Map((회사.회사 ?? []).map((x) => [x.이름, x.corp_name_eng ?? null]));
const 시총표 = new Map((시총.회사 ?? []).map((x) => [x.이름, x.시가총액]));

const 줄들 = (재무.회사들 ?? [])
  .map((f) => 한줄(f, 시총표.get(f.이름), 영문.get(f.이름)))
  .sort((a, b) => (b.marketCap ?? -1) - (a.marketCap ?? -1));

const 쟀다 = 줄들.filter((x) => !x.notMeasured).length;
const 매출늘음 = 줄들.filter((x) => Number.isFinite(x.revenueChangePct) && x.revenueChangePct > 0).length;
const 순손실 = 줄들.filter((x) => Number.isFinite(x.netProfit) && x.netProfit < 0).length;

console.log(`■ 상장 K팝 회사 ${줄들.length}곳 · 다 붙은 곳 ${쟀다}`);
console.log(`   매출이 늘어난 곳 ${매출늘음} · 순손실을 낸 곳 ${순손실}`);
for (const r of 줄들) {
  console.log(`   ${String(r.nameEn ?? r.ticker).padEnd(30)}`
    + ` 시총 ${r.marketCap === null ? '—' : (r.marketCap / 1e12).toFixed(2)}조`
    + ` · 매출 ${r.revenueChangePct === null ? '—' : `${r.revenueChangePct > 0 ? '+' : ''}${r.revenueChangePct}%`}`
    + ` · 순익 ${r.netProfit === null ? '—' : (r.netProfit / 1e12).toFixed(3)}조`
    + `${r.notMeasured ? `  ⬜ ${r.notMeasured}` : ''}`);
}

if (!process.argv.includes('--적는다')) { console.log('\n⭐ 아직 안 적었다. --적는다 를 붙인다.'); process.exit(0); }

/* 🔴 시각은 «만들 때부터» 영문이다 — 오늘 CSV 머리글에 한국어가 새어 나갔다 */
const 이제 = new Date();
const 달 = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'][이제.getMonth()];
const builtAt = `${이제.getDate()} ${달} ${이제.getFullYear()}, `
  + `${String(이제.getHours()).padStart(2, '0')}:${String(이제.getMinutes()).padStart(2, '0')} KST`;

fs.writeFileSync(path.join(ROOT, 낼곳), `${JSON.stringify({
  _meta: {
    page: 'Listed K-pop label accounts',
    builtAt,
    fiscalYear: 2025,
    marketCapAsOf: 시총.기준일 ?? null,
    companies: 줄들.length,
    fullyMeasured: 쟀다,
    revenueGrew: 매출늘음,
    netLossMakers: 순손실,
    source: 'Financial Supervisory Service DART open API (annual consolidated statements, '
      + 'fiscal 2025) and Korea Public Data Portal dataset 15094808 for market capitalisation.',
    howToRead: 'Market capitalisation is one trading day; revenue, operating profit and net '
      + 'profit are the full fiscal year. Months separate the two, so no price-earnings ratio is '
      + 'published here — the inputs and both dates are given instead. A change in percent is left '
      + 'empty where the prior year was not positive, because a percentage across a sign change '
      + 'says nothing; the swing column names the change instead.',
    notComputed: 'Rows that could not be completed are kept, with the missing fields named in '
      + 'notMeasured. Nothing is filled with zero.',
  },
  rows: 줄들,
}, null, 1)}\n`, 'utf8');
console.log(`\n📁 적었다 — ${낼곳}`);
