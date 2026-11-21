/**
 * build-seoulmarkets-people-panel.mjs — **Korea People Panel** 상품 파일을 짓는다.
 *
 * ── 🔴 왜 이것이 첫 상품인가 (2026-09-09 · 5번) ─────────────────────────────
 * 사장님: 「**내가 원하는 서울마켓의 비즈니스가 이런 데이터 비즈니스야** … 본격화 해서,
 * 개발을 하고 서비스를 하자」 · 「**네가 할 수 있는 곳부터 다 해라**」 · 「**지금 당장할 일**」
 *
 * 그래서 **새 수집을 기다리지 않고 «이미 붙는» 자료로 첫 파일을 만든다.**
 * 재 보니 사람 축이 우리 자료 가운데 가장 잘 채워져 있다 —
 * ```
 *   KRX 종목 2,765 (KOSPI 943 + KOSDAQ 1,822)
 *   고용 자료가 붙는 종목 2,622 = 94.8%
 *   칸 채움률 — 영문이름 100% · 인원 97.5% · 근속 97.1% · 급여남 96.0% · 급여여 95.1%
 * ```
 * 그리고 이 축을 **파는 곳이 없다.** FnGuide 는 재무를 판다. MarketScreener·Koyfin 류는
 * Refinitiv 를 되판다. Wind 만 임원·기업 자료를 파는데 중국 것이다.
 * ⇒ 「그들은 재무를, 우리는 사람을」이 회사 정의 그대로다.
 *
 * ── ⛔ 이 자가 지키는 것 — 지우지 않는다 ────────────────────────────────────
 * ```
 * ⛔ 못 잰 칸을  빈 칸으로 둔다 (Number(null)===0 함정)
 * ⛔ 얇은 칸에 «비율»을 내지 않는다 — 남녀 어느 쪽이 5명 미만이면 격차를 안 낸다.
 *    두 명으로 낸 비율은 수가 아니라 잡음이다. 몇 건을 안 냈는지 함께 적는다
 * ⛔ 「차별이 있다」고 말하지 않는다. 우리가 내는 것은 «비율»이고 까닭은 자료에 없다
 * ⛔ 평균을 규범으로 만들지 않는다. 회사마다의 값을 그대로 낸다
 * ⛔ 투자자문이 아니다 — 파일 머리글에 넣는다
 * ⚠ 급여는 «1인당 연간 원»이다. 총액이 아니다. 칸 이름에 단위를 박는다
 * ```
 *
 * 쓰는 법
 *   node scripts/build-seoulmarkets-people-panel.mjs
 *   node scripts/build-seoulmarkets-people-panel.mjs --자가시험
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { 시세 } from '../src/lib/stock-prices-datago.mjs';
import { parquet로쓰기 } from './lib/parquet-out.mjs';
import { csv쓰기 } from './lib/csv-out.mjs';

const 뿌리 = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const 고용길 = path.join(뿌리, 'archive/raw/dart-employment/employment-2025.ndjson');
const 회사길 = path.join(뿌리, 'archive/raw/dart-company/company.ndjson');
/* 🔴 [2026-09-11] 전량 파일은 «공개 폴더»에 두지 않는다 — 같은 실수를 밸류에이션에서 한 번
 * 겪었다(2026-09-10, 사장님 물음): 「모든 상장사를 그냥 공짜로 내려받게 하는 게 도움이 될까?」
 * ⛔ 전량을 public/ 에 두면 링크가 없어도 URL 을 알면 누구나 «상품 전체»를 가져간다.
 * ✅ 전량은 src/data/full(비공개, 그러나 git 은 지킨다 · 판마다 남긴다) · 공개 폴더에는 «표본»만 낸다 */
const 전체방 = path.join(뿌리, 'src/data/full');
const 낼방 = path.join(뿌리, 'public/data');

/** ⚠ 시각은 KST. 이 PC 가 이미 KST 다 — UTC 로 바꾸면 새벽에 하루 어긋난다 */
export function 날꼴(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const 날 = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${날}`;
}

/** ⛔ 빈 것을 0 으로 만들지 않는다. 이 저장소의 대표 함정이다 */
export function 잰수(v) {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/**
 * 남녀 격차 비율 — **얇으면 안 낸다.**
 * @returns {{값:number|null, 까닭:string|null}}
 */
export function 격차(여값, 남값, 여수, 남수, 바닥 = 5) {
  const a = 잰수(여값); const b = 잰수(남값);
  const 여n = 잰수(여수); const 남n = 잰수(남수);
  if (a === null || b === null) return { 값: null, 까닭: 'not reported' };
  if (여n === null || 남n === null) return { 값: null, 까닭: 'headcount not reported' };
  if (여n < 바닥 || 남n < 바닥) return { 값: null, 까닭: `fewer than ${바닥} of one sex` };
  if (b === 0) return { 값: null, 까닭: 'divide by zero' };
  return { 값: Math.round((a / b) * 1000) / 1000, 까닭: null };
}

/**
 * 🔴 [2026-09-11 실측] 종목코드는 «6자리 숫자»가 아니라 «6자리 영숫자»다.
 * "0015S0"(페스카로) 처럼 글자 섞인 코드가 KRX·공공데이터포털 시세 파일에도 그대로 있다 —
 * 진짜 코드이지 오류·스팩이 아니다(스팩과는 별개로 실제 인원 데이터가 있는 회사 22곳 확인).
 * ⛔ 순수 숫자만 받으면 그 22곳이 «조용히» 빠진다.
 */
export function 유효한종목코드인가(t) {
  return /^[0-9A-Za-z]{6}$/.test(String(t ?? ''));
}

/** 표본 — 인원이 많은 회사부터 N곳. ⛔ 앞에서 자르지 않는다(파일 순서는 뜻이 없다) */
export function 표본뽑기(rows, 몇줄 = 100) {
  if (!Array.isArray(rows)) return [];
  return [...rows].sort((a, b) => (b?.headcount ?? -1) - (a?.headcount ?? -1)).slice(0, 몇줄);
}

/** CSV 한 칸 — ⛔ 쉼표·따옴표·줄바꿈이 든 값이 표를 깨뜨리지 않게 한다 */
export function 칸(v) {
  if (v === null || v === undefined) return '';
  const s = String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export const 머리칸 = [
  'ticker', 'name_en', 'name_ko', 'market', 'sector_ko', 'fiscal_year',
  'headcount', 'men', 'women', 'women_share',
  'tenure_years', 'tenure_years_men', 'tenure_years_women', 'tenure_ratio_women_to_men',
  'annual_pay_per_person_krw_men', 'annual_pay_per_person_krw_women', 'pay_ratio_women_to_men',
  'pay_ratio_withheld_reason', 'close_price_krw', 'market_cap_krw', 'listed_shares',
  'price_as_of',
];

/** 가장 최근 거래일의 시세를 두 시장에서 모아 온다. ⛔ 없으면 «없다»고 하고 0 으로 안 채운다 */
/* 🔴 [2026-09-09] KRX 직접 경로 → 공공데이터포털 15094808 로 갈아탔다.
 *   사장님: 「공공데이터포털에서만 수집하도록 해, krx 자료가 전혀 필요없네」
 *   까닭: KRX OPEN API 약관 제6조② 「비상업적인 목적으로만」 · 제11조 「제3자 제공 금지」.
 *     ⛔ 이 파일은 «파는» 파일을 만든다. 비상업 전용 자료가 들어가면 안 된다.
 *   ⭐ 칸 이름은 KRX 그대로다(ISU_CD·TDD_CLSPRC·MKTCAP…) — 아래 셈은 안 바꿨다.
 *   정본: docs/수집-금지경로.tsv · 검사: scripts/check-forbidden-sources.mjs */
export function 최근시세(뿌리길 = 뿌리, 재기 = 시세) {
  const { 날, 줄들, 까닭 } = 재기(뿌리길);
  if (!줄들.length) { console.log(`⚠ 못 쟀다 — ${까닭}. 시세 칸을 「못 쟀다」로 남긴다`); return { 날: null, 줄: [] }; }
  return { 날, 줄: 줄들 };
}

function 짓기() {
  const 고용 = fs.readFileSync(고용길, 'utf8').trim().split('\n')
    .map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
  const 회사 = new Map();
  for (const l of fs.readFileSync(회사길, 'utf8').trim().split('\n')) {
    try { const o = JSON.parse(l); if (o.종목) 회사.set(String(o.종목).padStart(6, '0'), o); } catch { /* 한 줄이 깨져도 나머지를 버리지 않는다 */ }
  }
  const 시세 = 최근시세();
  const 시세표 = new Map(시세.줄.map((r) => [String(r.ISU_CD).trim(), r]));

  const 줄들 = [];
  let 격차안낸것 = 0; let 시세붙은것 = 0;
  for (const e of 고용) {
    const t = String(e.종목 ?? '').padStart(6, '0');
    if (!유효한종목코드인가(t)) continue;
    const c = 회사.get(t);
    const p = 시세표.get(t);
    if (p) 시세붙은것 += 1;

    const 급여격차 = 격차(e.급여여, e.급여남, e.여, e.남);
    const 근속격차 = 격차(e.근속여, e.근속남, e.여, e.남);
    if (급여격차.값 === null) 격차안낸것 += 1;

    const 인원 = 잰수(e.인원); const 여 = 잰수(e.여);
    줄들.push({
      ticker: t,
      name_en: e.영문 ?? null,
      name_ko: e.이름 ?? null,
      market: p?.MKT_NM ?? null,
      sector_ko: c?.업종명 ?? null,
      fiscal_year: e.연도 ?? null,
      headcount: 인원,
      men: 잰수(e.남),
      women: 여,
      women_share: (인원 && 여 !== null && 인원 > 0) ? Math.round((여 / 인원) * 1000) / 1000 : null,
      tenure_years: 잰수(e.근속),
      tenure_years_men: 잰수(e.근속남),
      tenure_years_women: 잰수(e.근속여),
      tenure_ratio_women_to_men: 근속격차.값,
      annual_pay_per_person_krw_men: 잰수(e.급여남),
      annual_pay_per_person_krw_women: 잰수(e.급여여),
      pay_ratio_women_to_men: 급여격차.값,
      pay_ratio_withheld_reason: 급여격차.까닭,
      close_price_krw: 잰수(p?.TDD_CLSPRC?.toString().replace(/,/g, '')),
      market_cap_krw: 잰수(p?.MKTCAP?.toString().replace(/,/g, '')),
      listed_shares: 잰수(p?.LIST_SHRS?.toString().replace(/,/g, '')),
      price_as_of: p ? 시세.날 : null,
    });
  }
  줄들.sort((a, b) => (b.headcount ?? -1) - (a.headcount ?? -1));

  const 오늘 = 날꼴();
  fs.mkdirSync(전체방, { recursive: true });
  fs.mkdirSync(낼방, { recursive: true });
  const csv = [머리칸.join(','), ...줄들.map((r) => 머리칸.map((k) => 칸(r[k])).join(','))].join('\n');
  const csv길 = path.join(전체방, `korea-people-panel-${오늘}.csv`);
  csv쓰기(csv길, csv); // ⭐ [F5·2번] BOM — 한글 칸(name_ko)이 엑셀에서 안 깨지게

  /* 표본 — 인원 많은 100곳. 칸은 하나도 줄이지 않는다(품질은 다 보여야 깔때기가 돈다) */
  const 표본 = 표본뽑기(줄들);
  const 표본머리 = [
    `# Korea People Panel — SeoulMarkets (https://seoulmarkets.com/data/people)`,
    `# 🔓 THIS IS A FREE SAMPLE: the ${표본.length} companies with the largest headcount.`,
    `#   The full panel covers ${줄들.length} companies — every listed company we could join.`,
    '#   Same columns, same method. Only the row count differs. The full file and the query API',
    '#   are the licensed product: https://seoulmarkets.com/data',
    `# built: ${오늘}`,
  ].join('\n');
  const 표본csv = [표본머리, 머리칸.join(','), ...표본.map((r) => 머리칸.map((k) => 칸(r[k])).join(','))].join('\n');
  csv쓰기(path.join(낼방, 'korea-people-panel-sample.csv'), 표본csv);
  parquet로쓰기(표본, 머리칸, path.join(낼방, 'korea-people-panel-sample.parquet'));

  /* 칸 사전 — ⭐ Wind·QUICK 이 상품 지면에서 가장 길게 쓰는 것이 이것이다 */
  const 사전 = {
    product: 'Korea People Panel',
    version: 오늘,
    publisher: 'SeoulMarkets (KLifeDesign Inc.)',
    /* ⚠ [2026-09-09] 칸 이름을 6번 쪽에 맞춘다 — 상품마다 이름이 다르면
       손님이 파일마다 사전을 다시 읽어야 한다. 6번의 «disclaimer» 가 더 짧고 넓다 */
    disclaimer: 'This file is data, not investment advice. It contains no recommendation to buy or sell anything.',
    whatThisIs: `Workforce figures that Korean listed companies file with the Financial Supervisory Service, joined to KRX daily prices. ${줄들.length} companies.`,
    whatThisIsNot: [
      'Not a claim about discrimination. We publish ratios; the reasons are not in the filings.',
      'Not a benchmark. No company is scored, ranked as good, or compared to a norm.',
      'Not total payroll. Pay columns are annual pay PER PERSON in Korean won.',
      'Not a complete market. A company appears only if it filed workforce figures.',
    ],
    source: 'DART (Financial Supervisory Service) employee status filings; KRX daily trading data',
    priceAsOf: 시세.날,
    rows: 줄들.length,
    withPrice: 시세붙은것,
    payRatioWithheld: 격차안낸것,
    withheldRule: 'A women-to-men ratio is left blank when either sex has fewer than 5 employees, when a figure was not reported, or when the denominator is zero. The reason is given in pay_ratio_withheld_reason.',
    columns: {
      ticker: 'Six-digit KRX issue code.',
      name_en: 'English company name as filed with DART.',
      name_ko: 'Korean company name as filed.',
      market: 'KOSPI or KOSDAQ, from KRX. Blank when the ticker did not trade on the price date.',
      sector_ko: 'Industry name as recorded by DART. Korean text; an English mapping is not yet published.',
      fiscal_year: 'Filing year of the workforce figures.',
      headcount: 'Total employees reported.',
      men: 'Male employees reported.',
      women: 'Female employees reported.',
      women_share: 'women divided by headcount. Blank when either is missing.',
      tenure_years: 'Average years of service, all employees.',
      tenure_years_men: 'Average years of service, men.',
      tenure_years_women: 'Average years of service, women.',
      tenure_ratio_women_to_men: 'tenure_years_women divided by tenure_years_men. Withheld on thin cells.',
      annual_pay_per_person_krw_men: 'Annual pay PER PERSON for men, Korean won.',
      annual_pay_per_person_krw_women: 'Annual pay PER PERSON for women, Korean won.',
      pay_ratio_women_to_men: 'Women pay divided by men pay. 1.0 means equal. Withheld on thin cells.',
      pay_ratio_withheld_reason: 'Why a ratio is blank. Empty when a ratio is given.',
      close_price_krw: 'KRX closing price on price_as_of.',
      market_cap_krw: 'KRX market capitalisation on price_as_of.',
      listed_shares: 'Listed shares on price_as_of.',
      price_as_of: 'Trading date of the price columns. Blank when no price was joined.',
    },
  };
  const 사전길 = path.join(낼방, `korea-people-panel-${오늘}.dictionary.json`);
  fs.writeFileSync(사전길, JSON.stringify(사전, null, 1), 'utf8');

  console.log(`✅ ${csv길} (전량 · 공개 폴더 아님)`);
  console.log(`   행 ${줄들.length.toLocaleString('en-US')} · 칸 ${머리칸.length}`);
  console.log(`   시세가 붙은 것 ${시세붙은것.toLocaleString('en-US')} (${(시세붙은것 / 줄들.length * 100).toFixed(1)}%) · 시세 기준일 ${시세.날 ?? '⬜ 못 찾음'}`);
  console.log(`   ⛔ 급여 격차를 «안 낸» 것 ${격차안낸것.toLocaleString('en-US')} — 얇은 칸에 비율을 내지 않는다`);
  console.log(`✅ ${사전길}`);
  console.log(`✅ ${path.join(낼방, 'korea-people-panel-sample.csv')} (표본 ${표본.length}행 · 공개)`);
  console.log(`✅ ${path.join(낼방, 'korea-people-panel-sample.parquet')} (같은 표본 · Parquet)`);
}

const 나 = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);

if (나 && process.argv.includes('--자가시험')) {
  let 통 = 0; const 실 = [];
  const 검 = (n, ok) => { if (ok) 통 += 1; else 실.push(n); };

  검('잰수 — 수를 읽는다', 잰수('1234') === 1234);
  검('⛔ 잰수 — null 은 null (0 이 아니다)', 잰수(null) === null);
  검('⛔ 잰수 — 빈 글도 null', 잰수('') === null);
  검('⛔ 잰수 — undefined 도 null', 잰수(undefined) === null);
  검('⛔ 잰수 — 0 은 «잰 0» 이므로 살린다', 잰수(0) === 0);

  검('격차 — 둘 다 두꺼우면 비율을 낸다', 격차(50, 100, 10, 10).값 === 0.5);
  검('⛔ 격차 — 여성이 5명 미만이면 안 낸다', 격차(50, 100, 3, 100).값 === null);
  검('⛔ 격차 — 남성이 5명 미만이면 안 낸다', 격차(50, 100, 100, 2).값 === null);
  검('⛔ 격차 — 안 낼 때 까닭을 적는다', /fewer than 5/.test(격차(50, 100, 3, 100).까닭));
  검('⛔ 격차 — 값이 없으면 not reported', 격차(null, 100, 10, 10).까닭 === 'not reported');
  검('⛔ 격차 — 인원을 모르면 안 낸다', 격차(50, 100, null, 10).까닭 === 'headcount not reported');
  검('⛔ 격차 — 0 으로 나누지 않는다', 격차(50, 0, 10, 10).까닭 === 'divide by zero');
  검('격차 — 낸 것에는 까닭이 없다', 격차(50, 100, 10, 10).까닭 === null);
  검('격차 — 소수 셋째 자리까지', 격차(1, 3, 10, 10).값 === 0.333);

  검('칸 — 보통 값은 그대로', 칸('abc') === 'abc');
  검('⛔ 칸 — 없는 값은 빈 칸 (0 이 아니다)', 칸(null) === '');
  검('⛔ 칸 — 쉼표가 든 값을 감싼다', 칸('a,b') === '"a,b"');
  검('⛔ 칸 — 따옴표를 두 번으로', 칸('a"b') === '"a""b"');

  검('머리칸에 단위가 박혀 있다 — 급여를 총액으로 오해하지 않게',
    머리칸.includes('annual_pay_per_person_krw_men'));
  검('머리칸에 «안 낸 까닭» 칸이 있다', 머리칸.includes('pay_ratio_withheld_reason'));

  검('유효한종목코드인가 — 순수 숫자 6자리는 유효', 유효한종목코드인가('005930') === true);
  검('🔴 유효한종목코드인가 — 글자 섞인 6자리도 유효("0015S0" 페스카로, 스팩 아니다)',
    유효한종목코드인가('0015S0') === true);
  검('⛔ 유효한종목코드인가 — 5자리는 무효', 유효한종목코드인가('12345') === false);
  검('⛔ 유효한종목코드인가 — 7자리는 무효', 유효한종목코드인가('1234567') === false);

  검('표본뽑기 — 인원 많은 순으로 N곳', (() => {
    const r = 표본뽑기([{ headcount: 5 }, { headcount: 50 }, { headcount: 20 }], 2);
    return r.length === 2 && r[0].headcount === 50 && r[1].headcount === 20;
  })());
  검('⛔ 표본뽑기 — 배열이 아니면 빈 배열', 표본뽑기(null).length === 0);

  /* 🔴 [2026-09-09] 최근시세 가 공공데이터포털을 읽게 바뀌었다(KRX 직접 경로 폐지).
   *   ⚠ 내가 서명을 바꿔 놓고 이 시험들을 안 고쳐서 npm test 156개 중 1개가 깨졌다.
   *     «서명을 바꾸면 그 자리의 시험도 같은 커밋에서 고친다.» */
  const 가짜시세 = (_뿌리) => ({
    날: '20260908',
    줄들: [{ ISU_CD: '005930', MKT_NM: 'KOSPI', TDD_CLSPRC: 70000, MKTCAP: 1 },
           { ISU_CD: '060310', MKT_NM: 'KOSDAQ', TDD_CLSPRC: 2000, MKTCAP: 2 }],
    까닭: null,
  });
  const s = 최근시세('/아무데나', 가짜시세);
  검('최근시세 — 포털이 준 기준일을 그대로 쓴다', s.날 === '20260908');
  검('최근시세 — 두 시장이 한 파일에 함께 온다 (포털은 시장을 안 가른다)', s.줄.length === 2);
  검('최근시세 — 코스닥이 함께 들어 있다 (KRX 판은 유가증권 943뿐이었다)',
    s.줄.some((r) => r.MKT_NM === 'KOSDAQ'));
  검('⛔ 최근시세 — 줄이 없으면 «없다»고 한다. ',
    최근시세('/아무데나', () => ({ 날: null, 줄들: [], 까닭: '폴더가 없다' })).날 === null);
  검('⛔ 최근시세 — 못 읽었을 때 줄도 빈 배열이다',
    최근시세('/아무데나', () => ({ 날: '20260908', 줄들: [], 까닭: '못 읽었다' })).줄.length === 0);

  검('날꼴 — KST 자정 직후에도 그날이다', 날꼴(new Date(2026, 8, 9, 0, 30)) === '2026-09-09');
  검('🔴 「차별이 있다고 말하지 않는다」가 코드에 살아 있다',
    fs.readFileSync(fileURLToPath(import.meta.url), 'utf8').includes('「차별이 있다」고 말하지 않는다'));

  if (실.length) {
    console.error(`❌ 자가시험 실패 ${실.length}\n${실.map((x) => `   · ${x}`).join('\n')}`);
    process.exit(1);
  }
  console.log(`✅ Korea People Panel 짓는 자 — 자가시험 ${통}개 통과`);
  process.exit(0);
}

if (나) 짓기();
