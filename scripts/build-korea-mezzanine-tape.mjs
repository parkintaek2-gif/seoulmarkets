#!/usr/bin/env node
import { pathToFileURL } from 'node:url';
/**
 * build-korea-mezzanine-tape.mjs — **F7. Korea Mezzanine Tape.** (SeoulMarkets 데이터 API)
 *   CB·BW·EB(전환사채·신주인수권부사채·교환사채) 공시 원자료를 **한 건(filing) 한 줄**로 API 에 낸다.
 *
 *   node scripts/build-korea-mezzanine-tape.mjs --자가시험
 *   node scripts/build-korea-mezzanine-tape.mjs                무엇이 붙나만 잰다 (안 적는다)
 *   node scripts/build-korea-mezzanine-tape.mjs --적는다
 *
 * ── 이 자가 지키는 것 ────────────────────────────────────────────────
 * ⛔ `refix_floor_note` 빈칸을  — EB 는 리픽싱 하한 칸이 «애초에 없다»
 *   (build-seoulmarkets-mezzanine-page.mjs 가 이미 겪은 함정, 그대로 물려받는다). 값이 없어도
 *   note 가 있으면 「해당 없음」이고, note 도 없으면 「못 쟀다」다 — 둘을 같은 null 로 뭉개지
 *   않게 `refixFloorPriceKrw`(값) 과 `refixFloorNote`(까닭)를 별도 칸으로 낸다.
 * ⛔ ticker 를 숫자로 바꾸지 않는다 — people 축과 같은 함정(영숫자 코드).
 * ⛔ 판정·전망을 하지 않는다 — 필드는 공시에 적힌 조건 그대로다(강령 「사실만, 표현은 우리가」).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const 뿌리 = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const 자료방 = path.join(뿌리, 'src/data/full');
const 낼곳 = 'src/data/korea-mezzanine-tape.json';

/** CSV 를 인용까지 알고 읽는다 — people 축과 같은 규약. */
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
export function 최근원자료(파일들) {
  const 것 = (파일들 ?? []).filter((f) => /^korea-mezzanine-book-\d{4}-\d{2}-\d{2}\.csv$/.test(f)).sort();
  return 것.at(-1) ?? null;
}

/** 한 줄(공시 한 건)을 만든다. */
export function 한줄(r, 자) {
  return {
    ticker: 글자(r[자('ticker')]),
    nameEn: 글자(r[자('name_en')]),
    nameKo: 글자(r[자('name_ko')]),
    filingId: 글자(r[자('filing_id')]),
    instrumentType: 글자(r[자('instrument_type')]),
    boardResolutionDate: 글자(r[자('board_resolution_date')]),
    instrumentKindKo: 글자(r[자('instrument_kind_ko')]),
    totalFaceValueKrw: 수(r[자('total_face_value_krw')]),
    couponRatePct: 수(r[자('coupon_rate_pct')]),
    maturityRatePct: 수(r[자('maturity_rate_pct')]),
    maturityDate: 글자(r[자('maturity_date')]),
    strikePriceKrw: 수(r[자('strike_price_krw')]),
    strikeRatioPct: 수(r[자('strike_ratio_pct')]),
    strikeWindowStart: 글자(r[자('strike_window_start')]),
    strikeWindowEnd: 글자(r[자('strike_window_end')]),
    refixFloorPriceKrw: 수(r[자('refix_floor_price_krw')]),
    /* 🔴 EB 는 이 칸이 «애초에 없다» — note 가 있으면 해당 없음, 없으면 못 쟀다 */
    refixFloorNote: 글자(r[자('refix_floor_note')]),
    subscriptionDate: 글자(r[자('subscription_date')]),
    paymentDate: 글자(r[자('payment_date')]),
    privatePlacement: 글자(r[자('private_placement')]),
  };
}

/** 영문 시각. */
export function 영문시각(날 = new Date()) {
  const 달 = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'][날.getMonth()];
  const 시 = String(날.getHours()).padStart(2, '0');
  const 분 = String(날.getMinutes()).padStart(2, '0');
  return `${날.getDate()} ${달} ${날.getFullYear()}, ${시}:${분} KST`;
}

function 짓기() {
  const f = 최근원자료(fs.readdirSync(자료방));
  if (!f) throw new Error('korea-mezzanine-book CSV 가 없다 — collect-dart-mezzanine.mjs 를 먼저 돌린다');
  /* 🔴 [2026-09-19] 커밋 b061823b0(F5·BOM)이 이 원본에 엑셀용 BOM을 붙였다 —
   * 벗기지 않으면 첫 칸 이름을 머리.indexOf() 가 못 찾아 그 칸이 통째로 undefined 가
   * 된다. 이 자는 손님이 실제로 사는 판을 만드므로 더 위험하다 — 뿌리에서 벗긴다. */
  const 글원본 = fs.readFileSync(path.join(자료방, f), 'utf8');
  const 글 = 글원본.charCodeAt(0) === 0xFEFF ? 글원본.slice(1) : 글원본; // 엑셀용 BOM 벗기기
  const 표 = 파싱(글);
  const 머리 = 표[0]; const 몸 = 표.slice(1);
  const 자 = (이름) => 머리.indexOf(이름);
  const 줄들 = 몸.map((r) => 한줄(r, 자));

  const 갈래목 = ['CB', 'BW', 'EB'];
  const byType = {};
  for (const g of 갈래목) byType[g] = 줄들.filter((x) => x.instrumentType === g).length;

  const withFloor = 줄들.filter((x) => x.refixFloorPriceKrw !== null).length;
  const floorWithheldWithNote = 줄들.filter((x) => x.refixFloorPriceKrw === null && x.refixFloorNote !== null).length;
  const floorWithheldNoNote = 줄들.filter((x) => x.refixFloorPriceKrw === null && x.refixFloorNote === null).length;

  return {
    rows: 줄들, sourceFile: f, 머리길이: 머리.length, byType,
    withFloor, floorWithheldWithNote, floorWithheldNoNote,
  };
}

/* ── 자가시험 ───────────────────────────────────────────────────────── */
function 자가시험() {
  const 것 = []; const 재다 = (이름, 됐나) => 것.push({ 이름, 됐나 });

  const 글 = 'ticker,name_en,instrument_type,refix_floor_price_krw,refix_floor_note\n'
    + '"0015S0","QUOTED, CO",CB,463,\n'
    + '999999,PLAIN CO,EB,,not applicable (EB has no refixing floor)\n'
    + '111111,GAP CO,CB,,\n';
  const 표 = 파싱(글);
  const 머리 = 표[0]; const 자 = (이름) => 머리.indexOf(이름);

  재다('파싱: 인용 속 쉼표를 칸 나눔으로 읽지 않는다', 표[1][1] === 'QUOTED, CO');
  재다('한줄: ticker 를 문자 그대로 지킨다(영숫자 코드)', 한줄(표[1], 자).ticker === '0015S0');
  재다('한줄: 값이 있으면 refixFloorNote 는 null', 한줄(표[1], 자).refixFloorNote === null
    && 한줄(표[1], 자).refixFloorPriceKrw === 463);
  재다('🔴 한줄: EB 값 없고 note 있으면 「해당 없음」', 한줄(표[2], 자).refixFloorNote !== null
    && 한줄(표[2], 자).refixFloorPriceKrw === null);
  재다('🔴 한줄: 값도 note 도 없으면 「못 쟀다」(둘 다 null)', 한줄(표[3], 자).refixFloorNote === null
    && 한줄(표[3], 자).refixFloorPriceKrw === null);

  재다('글자: 빈 문자열은 null', 글자('') === null && 글자('  ') === null);
  재다('수: 빈칸은 null(0 이 아니다)', 수('') === null && 수(null) === null);
  재다('수: 0 은 0 으로 읽는다', 수('0') === 0);

  재다('최근원자료: 날짜순 가장 새 것', 최근원자료([
    'korea-mezzanine-book-2026-09-01.csv', 'korea-mezzanine-book-2026-09-11.csv', 'other.csv',
  ]) === 'korea-mezzanine-book-2026-09-11.csv');
  재다('⛔ 최근원자료: 없으면 null', 최근원자료([]) === null);

  재다('🔴 영문시각', 영문시각(new Date('2026-09-13T00:40:00+09:00')) === '13 September 2026, 00:40 KST');

  let 실제 = null;
  try { 실제 = 짓기(); } catch (e) { 재다('실제 CSV 로 지어진다 — ' + e.message, false); }
  if (실제) {
    재다('실제 파일로 지어진다', 실제.rows.length > 0);
    재다('머리 칸이 20개다(원자료 스펙)', 실제.머리길이 === 20);
    재다('🔴 리픽싱 세 갈래의 합이 전체 줄 수와 같다',
      실제.withFloor + 실제.floorWithheldWithNote + 실제.floorWithheldNoNote === 실제.rows.length);
    재다('🔴 실데이터: EB 는 리픽싱 하한이 전부 「해당 없음」(값 0건)',
      실제.rows.filter((r) => r.instrumentType === 'EB' && r.refixFloorPriceKrw !== null).length === 0
      && 실제.byType.EB > 0);
    재다('갈래(CB·BW·EB)의 합이 전체 줄 수와 같다',
      실제.byType.CB + 실제.byType.BW + 실제.byType.EB === 실제.rows.length);
    재다('⛔ 실데이터: ticker 가 숫자로 안 바뀌어 앞자리 0 이 산다', 실제.rows.every((r) => typeof r.ticker === 'string' || r.ticker === null));
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
/* 🔴 [2026-10-28 · 5번] 가져오면 도는 자였다 — 다른 자가 들여오면 아래가 그대로 돌아
   그 자의 보고 대신 이 글이 찍힌다(검사: check-가져오면-도는자.mjs).
   ⛔ 관문 글귀만 끼워 넣지 않았다. 직접 불렸을 때만 돌도록 실제로 감쌌다. */
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  console.log('');

  const 적는다 = process.argv.includes('--적는다');
  const {
    rows, sourceFile, byType, withFloor, floorWithheldWithNote, floorWithheldNoNote,
  } = 짓기();

  console.log(`■ Korea Mezzanine Tape — ${sourceFile} · ${rows.length}줄`);
  console.log(`   CB ${byType.CB} · BW ${byType.BW} · EB ${byType.EB}`);
  console.log(`   리픽싱 하한 있음 ${withFloor} · 해당없음 ${floorWithheldWithNote} · 못잼 ${floorWithheldNoNote}`);

  if (!적는다) { console.log('\n⭐ 아직 안 적었다. --적는다 를 붙인다.'); process.exit(0); }

  const 오늘 = new Date();
  const 낼것 = {
    _meta: {
      product: 'Korea Mezzanine Tape',
      builtAt: 영문시각(오늘),
      sourceFile: `src/data/full/${sourceFile}`,
      rows: rows.length,
      byType,
      withFloor,
      floorWithheldWithNote,
      floorWithheldNoNote,
      source: 'DART filings for convertible bonds (CB), bonds with warrants (BW) and exchangeable '
        + 'bonds (EB), collected by us and published as our licensed dataset.',
      notThis: [
        'Not a judgement. A zero coupon or a private placement is a fact about a filing, not a '
          + 'criticism of the company.',
        'Not a dilution forecast. We publish the terms as filed and never model what a conversion '
          + 'would do.',
        'Not a complete history. The window is what we have collected.',
        'Not a signal. Nothing here is a view on any security.',
      ],
      refixFloorNote: 'refixFloorPriceKrw is null either because the filing marked the field not '
        + 'applicable (refixFloorNote carries the filed reason — this is the normal case for EB, '
        + 'which structurally has no refixing floor) or because we could not measure it '
        + '(refixFloorNote is also null in that case). The two are not the same thing.',
    },
    rows,
  };
  fs.mkdirSync(path.dirname(path.join(뿌리, 낼곳)), { recursive: true });
  fs.writeFileSync(path.join(뿌리, 낼곳), JSON.stringify(낼것, null, 1), 'utf8');
  console.log(`\n📁 적었다 — ${낼곳}`);

}
