#!/usr/bin/env node
/**
 * build-seoulmarkets-mezzanine-book.mjs — **Korea Mezzanine Book** 상품 파일을 짓는다.
 *
 * ── 무엇을 파는가 (docs/서울마켓츠-상품명세-P1.md Ⅱ-2-3) ─────────────────────
 * DART cvbdIsDecsn(CB)·bdwtIsDecsn(BW)·exbdIsDecsn(EB) 원문 46칸 가운데
 * 값이 되는 칸만 골라 «한 표»로 영문화한다. FnMezzanine(월 22만원, 국문)의 우리 값.
 *
 * 🔴 [2026-09-09 · 2번] **P1 문서의 칸 목록을 CB 기준으로만 확인한 오차를 여기서 고친다.**
 *   P1 이 적은 「cv_prc(전환가)·cv_rt(전환비율)·cvrqpd_bgd/edd(전환청구기간)」은 CB 만의
 *   실제 필드명이다. **BW·EB 는 다른 이름을 쓴다** — 오늘 원자료(archive/raw/dart-issuance/
 *   mezzanine.ndjson)를 직접 열어서 확인했다(⛔ 짐작하지 않았다):
 *   ```
 *   CB   cv_prc · cv_rt   ·  cvrqpd_bgd / cvrqpd_edd
 *   BW   ex_prc · ex_rt   ·  expd_bgd   / expd_edd     (+ act_mktprcfl_cvprc_lwtrsprc 있음)
 *   EB   ex_prc · ex_rt   ·  exrqpd_bgd / exrqpd_edd    (act_mktprcfl_cvprc_lwtrsprc 없음 —
 *        새로 찍는 주식이 아니라 «이미 있는» 주식과 바꾸는 것이라 리픽싱 하한 자체가 없다.
 *        그래서 이 칸은 EB 에서 «못 잰 것»이 아니라 «해당 없음»이다 — 다르게 적는다)
 *   ```
 *   ⇒ 세 필드를 같은 경제적 뜻(«주당 바꾸는 값»)으로 보고 strike_price_krw·strike_ratio_pct·
 *   strike_window_start/end 세 칸으로 «묶어» 낸다. 다른 이름을 억지로 다른 칸에 흩어 놓으면
 *   손님이 CB·BW·EB 를 나란히 비교하지 못한다 — 묶는 것이 우리 몫이고, 사전에 그 까닭을 적는다.
 *
 * ── 이 자가 지키는 것 ──────────────────────────────────────────────────────
 * ```
 * ⛔ 46칸을 다 내지 않는다 — 값이 되는 것만 고른다(P1 Ⅱ-2-3)
 * ⛔ 못 잰 칸을  「해당 없음」과 「못 쟀다」를 섞지 않는다
 * ⛔ DART 한글 날짜("2020년 06월 01일")·천단위 콤마 숫자("14,851,200,000")를
 *   지어내지 않고 «파싱»한다 — 실패하면 null, 0 으로 만들지 않는다
 * ```
 *
 * 쓰는 법
 *   node scripts/build-seoulmarkets-mezzanine-book.mjs
 *   node scripts/build-seoulmarkets-mezzanine-book.mjs --자가시험
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parquet로쓰기 } from './lib/parquet-out.mjs';
import { csv쓰기 } from './lib/csv-out.mjs';

const 뿌리 = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const 원본길 = path.join(뿌리, 'archive/raw/dart-issuance/mezzanine.ndjson');
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

/** DART 가 주는 「-」·빈 글은 못 잰 것/해당 없음이지 0 이 아니다 */
export function 빈값인가(v) {
  const s = String(v ?? '').trim();
  return s === '' || s === '-';
}

/** 「14,851,200,000」 같은 천단위 콤마 숫자를 읽는다. 「-」·빈 글은 null */
export function 원화수(v) {
  if (빈값인가(v)) return null;
  const n = Number(String(v).replace(/,/g, ''));
  return Number.isFinite(n) ? n : null;
}

/** 「2020년 06월 01일」 → ISO 8601. 못 읽으면 null(지어내지 않는다) */
export function 한글날짜(v) {
  if (빈값인가(v)) return null;
  const m = String(v).match(/(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일/);
  if (!m) return null;
  return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
}

export function 칸(v) {
  if (v === null || v === undefined) return '';
  const s = String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export const 머리칸 = [
  'ticker', 'name_en', 'name_ko',
  'filing_id', 'instrument_type', 'board_resolution_date',
  'instrument_kind_ko', 'total_face_value_krw',
  'coupon_rate_pct', 'maturity_rate_pct', 'maturity_date',
  'strike_price_krw', 'strike_ratio_pct', 'strike_window_start', 'strike_window_end',
  'refix_floor_price_krw', 'refix_floor_note',
  'subscription_date', 'payment_date', 'private_placement',
];

/** CB/BW/EB 원문 한 건 → 공통 칸. 필드명이 갈래마다 다른 것을 여기서 묶는다(주석에 까닭이 있다) */
export function 한줄(원문, 갈래) {
  const strike =
    갈래 === 'CB'
      ? { price: 원문.cv_prc, ratio: 원문.cv_rt, ws: 원문.cvrqpd_bgd, we: 원문.cvrqpd_edd }
      : 갈래 === 'BW'
      ? { price: 원문.ex_prc, ratio: 원문.ex_rt, ws: 원문.expd_bgd, we: 원문.expd_edd }
      : { price: 원문.ex_prc, ratio: 원문.ex_rt, ws: 원문.exrqpd_bgd, we: 원문.exrqpd_edd }; // EB

  // ⚠ EB 는 리픽싱 하한 칸 자체가 없다(이미 있는 주식과 바꾸므로) — 「해당 없음」으로 적는다.
  //   CB·BW 는 칸은 있는데 값이 「-」면 그것은 「못 쟀다」가 아니라 「이 건엔 리픽싱이 없다」다.
  const 리픽싱해당없음 = 갈래 === 'EB';

  return {
    filing_id: 원문.rcept_no ?? null,
    instrument_type: 갈래,
    board_resolution_date: 한글날짜(원문.bddd),
    instrument_kind_ko: 빈값인가(원문.bd_knd) ? null : String(원문.bd_knd).trim(),
    total_face_value_krw: 원화수(원문.bd_fta),
    coupon_rate_pct: 원화수(원문.bd_intr_ex),
    maturity_rate_pct: 원화수(원문.bd_intr_sf),
    maturity_date: 한글날짜(원문.bd_mtd),
    strike_price_krw: 원화수(strike.price),
    strike_ratio_pct: 원화수(strike.ratio),
    strike_window_start: 한글날짜(strike.ws),
    strike_window_end: 한글날짜(strike.we),
    refix_floor_price_krw: 리픽싱해당없음 ? null : 원화수(원문.act_mktprcfl_cvprc_lwtrsprc),
    refix_floor_note: 리픽싱해당없음 ? 'not applicable (EB is exchanged for already-issued shares, not newly issued)' : null,
    subscription_date: 한글날짜(원문.sbd),
    payment_date: 한글날짜(원문.pymd),
    private_placement: 원문.bdis_mthn ? (String(원문.bdis_mthn).trim() === '사모' ? 'private' : 'public') : null,
  };
}

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

/** 표본 — 이사회 결의일이 가장 최근인 것부터 N건 */
export function 표본뽑기(rows, 몇줄 = 100) {
  if (!Array.isArray(rows)) return [];
  return [...rows]
    .sort((a, b) => String(b?.board_resolution_date ?? '').localeCompare(String(a?.board_resolution_date ?? '')))
    .slice(0, 몇줄);
}

function 짓기() {
  const 회사들 = fs.readFileSync(원본길, 'utf8').trim().split('\n')
    .map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);

  const 줄들 = [];
  const 갈래건수 = { CB: 0, BW: 0, EB: 0 };
  let 리픽싱없음건수 = 0;

  for (const c of 회사들) {
    const t = String(c.종목 ?? '').padStart(6, '0');
    if (!유효한종목코드인가(t)) continue;
    const 공통 = { ticker: t, name_en: c.영문 ?? null, name_ko: c.이름 ?? null };

    for (const [칼래, 키] of [['CB', '전환사채'], ['BW', '신주인수권부사채'], ['EB', '교환사채']]) {
      for (const 원문 of c[키]?.원문 ?? []) {
        줄들.push({ ...공통, ...한줄(원문, 칼래) });
        갈래건수[칼래] += 1;
      }
    }
  }
  리픽싱없음건수 = 줄들.filter((r) => r.refix_floor_note).length;

  const 오늘 = 날꼴();
  fs.mkdirSync(전체방, { recursive: true });
  fs.mkdirSync(낼방, { recursive: true });

  const csv길 = path.join(전체방, `korea-mezzanine-book-${오늘}.csv`);
  csv쓰기(csv길, CSV로(머리칸, 줄들)); // ⭐ [F5·2번] BOM — 엑셀에서 안 깨지게

  /* 표본 — 최근 결의 100건. 칸은 하나도 줄이지 않는다 */
  const 표본 = 표본뽑기(줄들);
  const 표본머리 = [
    `# Korea Mezzanine Book — SeoulMarkets (https://seoulmarkets.com/data/mezzanine)`,
    `# 🔓 THIS IS A FREE SAMPLE: the ${표본.length} most recent board-resolution filings.`,
    `#   The full book covers ${줄들.length.toLocaleString('en-US')} rows. Same columns, same method.`,
    '#   The full file and the query API are the licensed product: https://seoulmarkets.com/data',
    `# built: ${오늘}`,
  ].join('\n');
  csv쓰기(
    path.join(낼방, 'korea-mezzanine-book-sample.csv'),
    [표본머리, CSV로(머리칸, 표본)].join('\n'),
  );
  parquet로쓰기(표본, 머리칸, path.join(낼방, 'korea-mezzanine-book-sample.parquet'));

  const 사전 = {
    product: 'Korea Mezzanine Book',
    version: 오늘,
    publisher: 'SeoulMarkets (KLifeDesign Inc.)',
    disclaimer: 'This file is data, not investment advice. It contains no recommendation to buy or sell anything.',
    whatThisIs: `Convertible bond (CB), bond-with-warrant (BW) and exchangeable bond (EB) issuance filings from DART (Financial Supervisory Service), for Korean listed companies. ${줄들.length.toLocaleString('en-US')} rows: CB ${갈래건수.CB.toLocaleString('en-US')} · BW ${갈래건수.BW.toLocaleString('en-US')} · EB ${갈래건수.EB.toLocaleString('en-US')}.`,
    whatThisIsNot: [
      'Not investment advice or a recommendation.',
      'Not all 46 DART fields. We publish the columns that carry value; the rest is in the raw DART filing (rcept_no links to it).',
      'Not a single instrument. CB, BW and EB are different legal instruments; instrument_type tells them apart. strike_price_krw / strike_ratio_pct / strike_window_* normalize three differently-named DART fields (conversion for CB, exercise for BW/EB) into one column because they serve the same economic role — see the note on this file’s builder script.',
      'Not proof a refixing floor is missing when refix_floor_price_krw is blank for an EB row — EB has no such field at all (see refix_floor_note).',
    ],
    source: 'DART (Financial Supervisory Service) — cvbdIsDecsn (convertible bond), bdwtIsDecsn (bond with warrant), exbdIsDecsn (exchangeable bond) resolution-to-issue APIs, full history (2010–present) swept 2026-09-09',
    rows: 줄들.length,
    byInstrument: 갈래건수,
    refixFloorNotApplicable: 리픽싱없음건수,
    columns: {
      ticker: 'Six-digit KRX issue code.',
      name_en: 'English company name as filed with DART.',
      name_ko: 'Korean company name as filed.',
      filing_id: 'DART receipt number (rcept_no). Look up the full 46-field filing with this.',
      instrument_type: 'CB (convertible bond), BW (bond with warrant), or EB (exchangeable bond).',
      board_resolution_date: 'Board resolution date, ISO 8601.',
      instrument_kind_ko: 'Instrument description as filed, original Korean (e.g. registered/unregistered, secured/unsecured, public/private placement).',
      total_face_value_krw: 'Total face value of the issue, Korean won.',
      coupon_rate_pct: 'Coupon (stated) interest rate, percent.',
      maturity_rate_pct: 'Yield to maturity rate, percent.',
      maturity_date: 'Maturity date, ISO 8601.',
      strike_price_krw: 'Price per share to convert (CB) or exercise (BW/EB) into equity, Korean won.',
      strike_ratio_pct: 'Conversion (CB) or exercise (BW/EB) ratio, percent.',
      strike_window_start: 'First date the conversion/exercise right may be used, ISO 8601.',
      strike_window_end: 'Last date the conversion/exercise right may be used, ISO 8601.',
      refix_floor_price_krw: 'Floor price below which the strike price cannot be refixed downward, Korean won. Blank for EB — see refix_floor_note.',
      refix_floor_note: 'Explains a blank refix_floor_price_krw. "not applicable" for every EB row (the field does not exist for exchangeable bonds); blank otherwise (CB/BW report a value or explicitly "-", both preserved as blank here, not 0).',
      subscription_date: 'Subscription date, ISO 8601.',
      payment_date: 'Payment date, ISO 8601.',
      private_placement: '"private" or "public", from the DART issuance-method field.',
    },
  };
  const 사전길 = path.join(낼방, `korea-mezzanine-book-dictionary-${오늘}.json`);
  fs.writeFileSync(사전길, JSON.stringify(사전, null, 1), 'utf8');

  console.log(`✅ ${csv길} (전량 · 공개 폴더 아님)`);
  console.log(`   행 ${줄들.length.toLocaleString('en-US')} · 칸 ${머리칸.length} · CB ${갈래건수.CB} · BW ${갈래건수.BW} · EB ${갈래건수.EB}`);
  console.log(`✅ ${사전길}`);
  console.log(`✅ ${path.join(낼방, 'korea-mezzanine-book-sample.csv')} (표본 ${표본.length}행 · 공개)`);
  console.log(`✅ ${path.join(낼방, 'korea-mezzanine-book-sample.parquet')} (같은 표본 · Parquet)`);
}

const 나 = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);

if (나 && process.argv.includes('--자가시험')) {
  let 통 = 0; const 실 = [];
  const 검 = (n, ok) => { if (ok) 통 += 1; else 실.push(n); };

  검('빈값인가 — 「-」는 빈 값', 빈값인가('-') === true);
  검('빈값인가 — 빈 글도 빈 값', 빈값인가('') === true);
  검('빈값인가 — 실제 값은 아니다', 빈값인가('100') === false);

  검('원화수 — 콤마 숫자를 읽는다', 원화수('14,851,200,000') === 14851200000);
  검('⛔ 원화수 — 「-」는 null(0 이 아니다)', 원화수('-') === null);
  검('⛔ 원화수 — 빈 값은 null', 원화수('') === null);
  검('원화수 — 「0」은 «잰 0»이라 살린다', 원화수('0') === 0);

  검('한글날짜 — 「년 월 일」을 ISO 로', 한글날짜('2020년 06월 01일') === '2020-06-01');
  검('한글날짜 — 한 자리 월도 받는다', 한글날짜('2020년 6월 1일') === '2020-06-01');
  검('⛔ 한글날짜 — 「-」는 null', 한글날짜('-') === null);
  검('⛔ 한글날짜 — 못 읽으면 null(지어내지 않는다)', 한글날짜('모름') === null);

  const cb샘플 = {
    rcept_no: '20200601000239', bddd: '2020년 06월 01일', bd_knd: '무기명식 무보증 사모 전환사채',
    bd_fta: '14,851,200,000', bd_intr_ex: '0', bd_intr_sf: '2.0', bd_mtd: '2023년 06월 30일',
    cv_rt: '100', cv_prc: '463', cvrqpd_bgd: '2021년 06월 30일', cvrqpd_edd: '2023년 05월 30일',
    act_mktprcfl_cvprc_lwtrsprc: '-', sbd: '2020년 06월 01일', pymd: '2020년 06월 30일', bdis_mthn: '사모',
  };
  const cb줄 = 한줄(cb샘플, 'CB');
  검('한줄 — CB 는 cv_prc 를 strike_price_krw 로', cb줄.strike_price_krw === 463);
  검('한줄 — CB 는 cv_rt 를 strike_ratio_pct 로', cb줄.strike_ratio_pct === 100);
  검('한줄 — CB 는 cvrqpd_bgd/edd 를 strike_window 로', cb줄.strike_window_start === '2021-06-30' && cb줄.strike_window_end === '2023-05-30');
  검('한줄 — CB 는 리픽싱 칸이 있고 「-」면 null(못 잰 것 아님)', cb줄.refix_floor_price_krw === null && cb줄.refix_floor_note === null);
  검('한줄 — 사모/공모', cb줄.private_placement === 'private');

  const bw샘플 = { rcept_no: 'x', ex_prc: '1000', ex_rt: '100', expd_bgd: '2021년 01월 01일', expd_edd: '2025년 01월 01일', act_mktprcfl_cvprc_lwtrsprc: '900' };
  const bw줄 = 한줄(bw샘플, 'BW');
  검('한줄 — BW 는 ex_prc 를 strike_price_krw 로(cv_prc 가 아니다)', bw줄.strike_price_krw === 1000);
  검('한줄 — BW 는 expd_bgd/edd 를 strike_window 로', bw줄.strike_window_start === '2021-01-01');
  검('한줄 — BW 는 리픽싱 값이 있으면 낸다', bw줄.refix_floor_price_krw === 900);

  const eb샘플 = { rcept_no: 'y', ex_prc: '2000', ex_rt: '100', exrqpd_bgd: '2022년 01월 01일', exrqpd_edd: '2026년 01월 01일' };
  const eb줄 = 한줄(eb샘플, 'EB');
  검('한줄 — EB 는 exrqpd_bgd/edd 를 strike_window 로(BW 의 expd_* 가 아니다)', eb줄.strike_window_start === '2022-01-01');
  검('🔴 한줄 — EB 는 리픽싱 칸 자체가 없어 «해당 없음»으로 적는다(못 잰 것과 다르다)',
    eb줄.refix_floor_price_krw === null && eb줄.refix_floor_note === 'not applicable (EB is exchanged for already-issued shares, not newly issued)');

  검('칸 — 쉼표가 든 값을 감싼다', 칸('a,b') === '"a,b"');
  검('머리칸 — 46칸을 다 내지 않는다(값이 되는 것만)', 머리칸.length < 46);
  검('머리칸 — instrument_type 으로 CB·BW·EB 를 가른다', 머리칸.includes('instrument_type'));

  검('🔴 「P1 문서의 칸 목록을 CB 기준으로만」 정정 근거가 코드에 남아 있다',
    fs.readFileSync(fileURLToPath(import.meta.url), 'utf8').includes('BW·EB 는 다른 이름을 쓴다'));

  검('유효한종목코드인가 — 순수 숫자 6자리는 유효', 유효한종목코드인가('005930') === true);
  검('🔴 유효한종목코드인가 — 글자 섞인 6자리도 유효(진짜 코드다)', 유효한종목코드인가('0015S0') === true);
  검('⛔ 유효한종목코드인가 — 6자리가 아니면 무효', 유효한종목코드인가('12345') === false);

  검('표본뽑기 — 결의일 최근 순', (() => {
    const r = 표본뽑기([{ board_resolution_date: '2020-01-01' }, { board_resolution_date: '2026-01-01' }], 2);
    return r[0].board_resolution_date === '2026-01-01';
  })());
  검('⛔ 표본뽑기 — 배열이 아니면 빈 배열', 표본뽑기(null).length === 0);

  if (실.length) {
    console.error(`❌ 자가시험 실패 ${실.length}\n${실.map((x) => `   · ${x}`).join('\n')}`);
    process.exit(1);
  }
  console.log(`✅ Korea Mezzanine Book 짓는 자 — 자가시험 ${통}개 통과`);
  process.exit(0);
}

if (나) 짓기();
