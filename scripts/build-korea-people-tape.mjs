#!/usr/bin/env node
import { pathToFileURL } from 'node:url';
/**
 * build-korea-people-tape.mjs — **F7. Korea People Tape.** (SeoulMarkets 데이터 API)
 *   상장사 인력 공시(성별 인원·근속·급여) 원자료를 **한 회사 한 줄**로 API 에 낸다.
 *
 *   node scripts/build-korea-people-tape.mjs --자가시험
 *   node scripts/build-korea-people-tape.mjs                무엇이 붙나만 잰다 (안 적는다)
 *   node scripts/build-korea-people-tape.mjs --적는다
 *
 * ── 이 자가 지키는 것 ────────────────────────────────────────────────
 * ⛔ women_share 는 원본 그대로 **비율(0~1)**로 낸다 — 무료 지면(build-seoulmarkets-
 *   people-page.mjs)이 퍼센트로 한 번 곱해 낸 것과 다른 목적이다. 여기는 API 원자료라
 *   «가공하지 않은 사실»을 원 단위 그대로 낸다(강령 ③). 필드 이름에 Ratio 를 박아
 *   손님이 다시 헷갈리지 않게 한다.
 * ⛔ 급여비율 빈칸을  — `payRatioWithheldReason` 이 «해당 없음»과
 *   «못 쟀다»를 가른다(people-page 스크립트가 이미 겪은 함정, 그대로 물려받는다).
 * ⛔ ticker 를 숫자로 바꾸지 않는다 — "0015S0" 처럼 영숫자 6자리 코드가 실제로 있다
 *   (2026-09-12 실측, people-page 스크립트 knownGap 참고).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const 뿌리 = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const 자료방 = path.join(뿌리, 'src/data/full');
const 낼곳 = 'src/data/korea-people-tape.json';

/** CSV 를 인용까지 알고 읽는다 — build-seoulmarkets-people-page.mjs 와 같은 규약. */
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

/** 빈 문자열은 null, 그 밖은 그대로(트림만). */
export function 글자(v) {
  const s = String(v ?? '').trim();
  return s === '' ? null : s;
}

/** 가장 새 원자료 파일. 이름을 손으로 적지 않는다. */
export function 최근원자료(파일들) {
  const 것 = (파일들 ?? []).filter((f) => /^korea-people-panel-\d{4}-\d{2}-\d{2}\.csv$/.test(f)).sort();
  return 것.at(-1) ?? null;
}

/** 한 줄(회사 한 곳)을 만든다 — 못 붙어도 줄은 남긴다. */
export function 한줄(r, 자) {
  return {
    ticker: 글자(r[자('ticker')]),
    nameEn: 글자(r[자('name_en')]),
    nameKo: 글자(r[자('name_ko')]),
    market: 글자(r[자('market')]),
    sectorKo: 글자(r[자('sector_ko')]),
    fiscalYear: 수(r[자('fiscal_year')]),
    headcount: 수(r[자('headcount')]),
    men: 수(r[자('men')]),
    women: 수(r[자('women')]),
    /* ⛔ 퍼센트로 바꾸지 않는다 — 원본 그대로 비율(0~1). 무료 지면과 목적이 다르다(위 주석) */
    womenShareRatio: 수(r[자('women_share')]),
    tenureYears: 수(r[자('tenure_years')]),
    tenureYearsMen: 수(r[자('tenure_years_men')]),
    tenureYearsWomen: 수(r[자('tenure_years_women')]),
    tenureRatioWomenToMen: 수(r[자('tenure_ratio_women_to_men')]),
    annualPayPerPersonKrwMen: 수(r[자('annual_pay_per_person_krw_men')]),
    annualPayPerPersonKrwWomen: 수(r[자('annual_pay_per_person_krw_women')]),
    payRatioWomenToMen: 수(r[자('pay_ratio_women_to_men')]),
    /* 🔴 있음/해당없음/못쟀다 — 급여비율이 비어 있는 까닭. null 이면 «못 쟀다» 다 */
    payRatioWithheldReason: 글자(r[자('pay_ratio_withheld_reason')]),
    closePriceKrw: 수(r[자('close_price_krw')]),
    marketCapKrw: 수(r[자('market_cap_krw')]),
    listedShares: 수(r[자('listed_shares')]),
    priceAsOf: 글자(r[자('price_as_of')]),
  };
}

/** 영문 시각 — 화면·API 는 영어권 손님이 본다. */
export function 영문시각(날 = new Date()) {
  const 달 = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'][날.getMonth()];
  const 시 = String(날.getHours()).padStart(2, '0');
  const 분 = String(날.getMinutes()).padStart(2, '0');
  return `${날.getDate()} ${달} ${날.getFullYear()}, ${시}:${분} KST`;
}

function 짓기() {
  const f = 최근원자료(fs.readdirSync(자료방));
  if (!f) throw new Error('korea-people-panel CSV 가 없다 — build-seoulmarkets-people-panel.mjs 를 먼저 돌린다');
  /* 🔴 [2026-09-19] 커밋 b061823b0(F5·BOM)이 이 원본에 엑셀용 BOM을 붙였다 —
   * 벗기지 않으면 첫 칸 이름을 머리.indexOf() 가 못 찾아 그 칸이 통째로 undefined 가
   * 된다. 이 자는 손님이 실제로 사는 판을 만드므로 더 위험하다 — 뿌리에서 벗긴다. */
  const 글원본 = fs.readFileSync(path.join(자료방, f), 'utf8');
  const 글 = 글원본.charCodeAt(0) === 0xFEFF ? 글원본.slice(1) : 글원본; // 엑셀용 BOM 벗기기
  const 표 = 파싱(글);
  const 머리 = 표[0]; const 몸 = 표.slice(1);
  const 자 = (이름) => 머리.indexOf(이름);
  const 줄들 = 몸.map((r) => 한줄(r, 자));

  const withPayRatio = 줄들.filter((x) => x.payRatioWomenToMen !== null).length;
  const payWithheldWithReason = 줄들.filter((x) => x.payRatioWomenToMen === null && x.payRatioWithheldReason !== null).length;
  const payWithheldNoReason = 줄들.filter((x) => x.payRatioWomenToMen === null && x.payRatioWithheldReason === null).length;

  return {
    rows: 줄들,
    sourceFile: f,
    머리길이: 머리.length,
    withPayRatio,
    payWithheldWithReason,
    payWithheldNoReason,
  };
}

/* ── 자가시험 ───────────────────────────────────────────────────────── */
function 자가시험() {
  const 것 = []; const 재다 = (이름, 됐나) => 것.push({ 이름, 됐나 });

  const 글 = 'ticker,name_en,women_share,pay_ratio_women_to_men,pay_ratio_withheld_reason\n'
    + '"0015S0","QUOTED, CO",0.269,0.778,\n'
    + '999999,PLAIN CO,,,not disclosed by gender\n'
    + '111111,GAP CO,,,\n';
  const 표 = 파싱(글);
  const 머리 = 표[0]; const 자 = (이름) => 머리.indexOf(이름);

  재다('파싱: 인용 속 쉼표를 칸 나눔으로 읽지 않는다', 표[1][1] === 'QUOTED, CO');
  재다('한줄: ticker 를 문자 그대로 지킨다(영숫자 코드)', 한줄(표[1], 자).ticker === '0015S0');
  재다('🔴 한줄: women_share 를 퍼센트로 바꾸지 않는다(비율 그대로)', 한줄(표[1], 자).womenShareRatio === 0.269);
  재다('한줄: 빈칸은 0 이 아니라 null', 한줄(표[2], 자).payRatioWomenToMen === null);
  재다('🔴 한줄: 급여비율 있으면 payRatioWithheldReason 은 null', 한줄(표[1], 자).payRatioWithheldReason === null);
  재다('🔴 한줄: 급여비율 없고 까닭 있으면 «해당 없음»', 한줄(표[2], 자).payRatioWithheldReason === 'not disclosed by gender');
  재다('🔴 한줄: 급여비율도 까닭도 없으면 «못 쟀다»(null)', 한줄(표[3], 자).payRatioWithheldReason === null
    && 한줄(표[3], 자).payRatioWomenToMen === null);

  재다('글자: 빈 문자열은 null', 글자('') === null && 글자('  ') === null);
  재다('글자: 값은 트림해 그대로', 글자(' KOSPI ') === 'KOSPI');
  재다('수: 빈칸은 null(0 이 아니다)', 수('') === null && 수(null) === null);
  재다('수: 0 은 0 으로 읽는다', 수('0') === 0);

  재다('최근원자료: 날짜순 가장 새 것', 최근원자료([
    'korea-people-panel-2026-09-01.csv', 'korea-people-panel-2026-09-11.csv', 'other.csv',
  ]) === 'korea-people-panel-2026-09-11.csv');
  재다('⛔ 최근원자료: 없으면 null', 최근원자료([]) === null);

  재다('🔴 영문시각', 영문시각(new Date('2026-09-13T00:12:00+09:00')) === '13 September 2026, 00:12 KST');

  let 실제 = null;
  try { 실제 = 짓기(); } catch (e) { 재다('실제 CSV 로 지어진다 — ' + e.message, false); }
  if (실제) {
    재다('실제 파일로 지어진다', 실제.rows.length > 0);
    재다('머리 칸이 22개다(원자료 스펙)', 실제.머리길이 === 22);
    재다('🔴 급여비율 세 갈래의 합이 전체 줄 수와 같다',
      실제.withPayRatio + 실제.payWithheldWithReason + 실제.payWithheldNoReason === 실제.rows.length);
    const 삼성 = 실제.rows.find((r) => r.ticker === '005930');
    재다('🔴 실데이터: 삼성전자 여성비중이 비율(0.269 근처)이지 퍼센트(26.9)가 아니다',
      !!삼성 && 삼성.womenShareRatio > 0.2 && 삼성.womenShareRatio < 0.3);
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
  const { rows, sourceFile, withPayRatio, payWithheldWithReason, payWithheldNoReason } = 짓기();

  console.log(`■ Korea People Tape — ${sourceFile} · ${rows.length}줄`);
  console.log(`   급여비율 있음 ${withPayRatio} · 해당없음 ${payWithheldWithReason} · 못잼 ${payWithheldNoReason}`);

  if (!적는다) { console.log('\n⭐ 아직 안 적었다. --적는다 를 붙인다.'); process.exit(0); }

  const 오늘 = new Date();
  const 낼것 = {
    _meta: {
      product: 'Korea People Tape',
      builtAt: 영문시각(오늘),
      sourceFile: `src/data/full/${sourceFile}`,
      rows: rows.length,
      withPayRatio,
      payWithheldWithReason,
      payWithheldNoReason,
      source: 'Workforce figures that Korean listed companies file with the Financial Supervisory '
        + 'Service (headcount, tenure and pay by gender), joined to KRX daily closing prices. We '
        + 'collect the filings ourselves and publish this as our licensed dataset.',
      notThis: [
        'Not a claim about discrimination. The filings carry ratios, not reasons: job mix, seniority '
          + 'mix and contract type all sit inside a single number.',
        'Not a benchmark. No company is scored, ranked as good, or compared to a norm.',
        'Not total payroll. Pay fields are annual pay PER PERSON in Korean won.',
        'womenShareRatio and the tenure/pay ratio fields are raw ratios (0-1, roughly), not percentages.',
      ],
      payRatioWithheldReasonNote: 'payRatioWomenToMen is null either because the filing marked the '
        + 'figure not applicable (payRatioWithheldReason carries the filed reason) or because we could '
        + 'not measure it (payRatioWithheldReason is also null in that case — the two are not the same '
        + 'thing, and this file lets a client tell them apart).',
    },
    rows,
  };
  fs.mkdirSync(path.dirname(path.join(뿌리, 낼곳)), { recursive: true });
  fs.writeFileSync(path.join(뿌리, 낼곳), JSON.stringify(낼것, null, 1), 'utf8');
  console.log(`\n📁 적었다 — ${낼곳}`);

}
