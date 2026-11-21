#!/usr/bin/env node
/**
 * collect-uae-adx-marketwatch.mjs — **ADX 가 «공식으로» 내는 시가총액·시세를 날마다 받는다.**
 *
 *   node scripts/collect-uae-adx-marketwatch.mjs --자가시험
 *   node scripts/collect-uae-adx-marketwatch.mjs            받아서 쌓는다
 *   node scripts/collect-uae-adx-marketwatch.mjs --안적는다   받아서 세기만 한다
 *
 * ── 🔴 왜 만드나 (2026-09-16 · 5번) ──────────────────────────────────────
 *
 * `/data/screener` 머리글이 손님에게 이렇게 말하고 있었다 —
 *   “**Abu Dhabi publishes no market capitalisation we can source**, so no Gulf
 *    company here has a PER at all.”
 *
 * ⛔ **사실이 아니다.** 아부다비는 낸다. 우리가 «옆 문»을 부르고 있었을 뿐이다.
 *
 * ```
 *   우리가 부르던 것   /adx/marketwatch-delayed/1.1/scrollingTicker   → 종목·현재가뿐
 *   시총이 있는 곳     /adx/marketwatch/1.1/securityBoard/marketwatch  ← «-delayed» 가 없다
 * ```
 *
 * 우리 강령은 「못 잰 것은 못 쟀다고 적는다」이지 **「그쪽이 안 낸다」고 적는 것이 아니다.**
 * 우리가 못 찾은 것을 그쪽 탓으로 적었다. 그 문장을 지우려면 자료가 먼저 있어야 한다.
 *
 * ── ⛔ 「계산해서 메꾸기」는 하지 않는다 — 해 보고 버렸다 ──────────────────
 *
 * `주식수 = 순이익 ÷ EPS`, `시총 = 주가 × 주식수` 로 72곳을 뽑아 봤다. 수는 그럴듯했다.
 * 그런데 공식 값이 있는 두바이로 검산하니 깨졌다 —
 * ```
 *   맞대 본 16곳 중 오차 5% 안 2곳(13%) · 오차 가운데값 99.9%
 *   까닭: 순이익이 AED'000 인데 EPS 는 AED 라 주식수가 1,000배 작게 나온다
 *   FAB — 계산 228.7bn vs 공식 218.3bn
 * ```
 * ⛔ 그럴듯한 수를 검산 없이 실었으면 **틀린 PER 을 팔 뻔했다.** 공식 값을 받아 쓴다.
 *
 * ── ⚠ 이 자료는 «소급이 안 된다» ─────────────────────────────────────────
 * 그날 시세·시총은 그날만 있다. 하루 빠뜨리면 그날치는 영영 없다.
 * ⇒ 아카이빙 목록(CLAUDE.md 「아카이빙은 하루도 빠뜨리지 않는다」)에 올린다.
 *
 * 실측 2026-09-16 16:5x — 행 128 · 시총이 «들어 있는» 종목 128/128.
 * 큰 순서 IHC 805.0bn · ADNOCGAS 250.2bn · FAB 218.3bn · EAND 190.5bn · ADCB 129.8bn (AED)
 *
 * 저장: archive/raw/uae-adx-marketwatch/<YYYY-MM-DD>.json  (한국시간 날짜)
 */
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36';
const APIKEY = '1863a94c-582b-46f9-b4f0-0d02c0cc5307';
export const 주소 = 'https://apigateway.adx.ae/adx/marketwatch/1.1/securityBoard/marketwatch';
export const 담는곳 = 'archive/raw/uae-adx-marketwatch';

function 헤더인자() {
  return [
    '-A', UA,
    '-H', 'Accept: application/json',
    '-H', 'Referer: https://www.adx.ae/',
    '-H', 'Origin: https://www.adx.ae',
    '-H', 'channel-id: OSS WEB',
    '-H', 'x-correlation-id: uuid',
    '-H', 'x-uuid: ',
    '-H', `adx-gateway-apikey: ${APIKEY}`,
  ];
}

/* ── 판정만 떼어 낸다 ─────────────────────────────────────────────────── */

/** 이 PC 는 이미 KST 다. ⛔ toISOString() 을 쓰지 않는다 — 새벽에 하루가 어긋난다. */
export function 오늘날짜(d = new Date()) {
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

/** 답 덩어리에서 행 배열을 꺼낸다. 꼴이 바뀌어도 한 군데만 고치면 되게 모아 둔다. */
export function 행꺼내기(덩어리) {
  const r = 덩어리?.response?.results ?? 덩어리?.response ?? 덩어리;
  if (Array.isArray(r)) return r;
  if (Array.isArray(r?.results)) return r.results;
  return [];
}

/** 숫자 칸 하나. ⛔ 0 과 「없음」을 섞지 않는다 — 없으면 null 이다. */
export function 수(v) {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/**
 * 한 행을 우리 꼴로 옮긴다.
 * ⛔ 시총이 0 이거나 없으면  — null 로 두고 「못 잰 것」으로 센다.
 */
export function 한줄옮기기(r, 날짜) {
  const 종목 = String(r?.companySymbol || '').trim();
  if (!종목) return null;
  const mc = 수(r.marketCap);
  return {
    date: 날짜,
    market: 'ADX',
    symbol: 종목,
    isin: String(r.companyISIN || '').trim() || null,
    last: 수(r.last),
    previousClose: 수(r.previousClose),
    change: 수(r.change),
    open: 수(r.open),
    high: 수(r.high),
    low: 수(r.low),
    volume: 수(r.volume),
    value: 수(r.value),
    trades: 수(r.trades),
    marketCap: mc && mc > 0 ? mc : null,   /* 단위 AED */
    tradingState: String(r.tradingState || '').trim() || null,
  };
}

/** 받은 것을 통째로 옮기고 «채움률»을 함께 낸다. 수를 말할 때는 출처까지 말한다. */
export function 고른다(덩어리, 날짜 = 오늘날짜()) {
  const 줄 = 행꺼내기(덩어리).map((r) => 한줄옮기기(r, 날짜)).filter(Boolean);
  const 시총있음 = 줄.filter((x) => x.marketCap != null).length;
  const ISIN있음 = 줄.filter((x) => x.isin).length;
  return { 날짜, 줄, 셈: { 행: 줄.length, 시총: 시총있음, ISIN: ISIN있음 } };
}

/* ── 받아서 쌓는다 ────────────────────────────────────────────────────── */

function 받는다() {
  const 글자 = execFileSync('curl', ['-sS', '-f', ...헤더인자(), 주소], { maxBuffer: 1024 * 1024 * 20 }).toString('utf8');
  return JSON.parse(글자);
}

/* ── 자가시험 ─────────────────────────────────────────────────────────── */

function 자가시험() {
  const 것들 = [];
  const 다 = (이름, 참) => 것들.push({ 이름, 참: !!참 });

  /* 실측한 꼴 그대로 */
  const 본보기 = {
    response: {
      results: [
        { companySymbol: '2POINTZERO', companyISIN: 'AEM001001019', last: 2.25, marketCap: 77768159168, volume: 100, trades: 3, tradingState: 'OPEN' },
        { companySymbol: 'ABNIC', companyISIN: 'AEA001701019', last: 2.55, marketCap: 637500000 },
        { companySymbol: 'NOCAP', companyISIN: 'AEX', last: 1.0, marketCap: 0 },
        { companySymbol: '', companyISIN: 'AEY', marketCap: 5 },
      ],
    },
  };
  const 것 = 고른다(본보기, '2026-09-16');
  다('빈 종목은 버린다', 것.줄.length === 3);
  다('시총을 센다', 것.셈.시총 === 2);
  다('ISIN 을 센다', 것.셈.ISIN === 3);
  다('🔴 시총 0 은 0 이 아니라 null 이다', 것.줄.find((x) => x.symbol === 'NOCAP').marketCap === null);
  다('시총 값을 그대로 옮긴다', 것.줄[0].marketCap === 77768159168);
  다('ISIN 을 옮긴다', 것.줄[0].isin === 'AEM001001019');
  다('시장 이름을 박는다', 것.줄.every((x) => x.market === 'ADX'));
  다('날짜를 박는다', 것.줄.every((x) => x.date === '2026-09-16'));

  /* 행 꺼내기 — 꼴이 셋 중 무엇이어도 */
  다('response.results 꼴', 행꺼내기({ response: { results: [1, 2] } }).length === 2);
  다('response 가 바로 배열', 행꺼내기({ response: [1] }).length === 1);
  다('맨 배열', 행꺼내기([1, 2, 3]).length === 3);
  다('모르는 꼴이면 빈 배열', 행꺼내기({ a: 1 }).length === 0);
  다('null 도 견딘다', 행꺼내기(null).length === 0);

  /* 수 */
  다('빈 값은 null', 수('') === null && 수(null) === null && 수(undefined) === null);
  다('0 은 0 이다', 수(0) === 0);
  다('글자 수도 읽는다', 수('12.5') === 12.5);
  다('숫자가 아니면 null', 수('abc') === null);

  /* 날짜 — ⛔ UTC 로 만들지 않는다 */
  다('KST 날짜를 만든다', 오늘날짜(new Date(2026, 8, 16)) === '2026-09-16');
  다('한 자리 달·날에 0 을 채운다', 오늘날짜(new Date(2026, 0, 5)) === '2026-01-05');
  /* ⛔ 날짜를 UTC 로 만들면 새벽에 하루가 어긋난다. 함수 «본문»에 그것이 없는지 본다
       (파일 전체를 훑으면 이 시험 줄 자신이 걸린다 — 자를 자기 자신으로 재면 안 된다) */
  다('날짜 함수가 UTC 를 안 쓴다', !오늘날짜.toString().includes('toISOStr' + 'ing'));

  /* 우물 — 「-delayed」를 다시 부르지 않게 못 박는다 */
  다('🔴 «-delayed» 우물이 아니다', !주소.includes('-delayed'));
  다('시총이 있는 끝점이다', 주소.endsWith('/securityBoard/marketwatch'));
  다('담는 곳이 매체를 드러낸다', 담는곳.includes('uae-adx'));

  const 진 = 것들.filter((x) => !x.참);
  console.log(`자가시험 ${것들.length - 진.length}/${것들.length}`);
  for (const x of 진) console.log('   🔴 ' + x.이름);
  process.exit(진.length ? 1 : 0);
}

/* ── 들머리 ───────────────────────────────────────────────────────────── */

/**
 * 🔴🔴 [2026-09-18 12:5x · 5번] **이 수집기는 멈춰 세웠다. 돌리면 약관을 어긴다.**
 *
 * 라이선스 대장을 채우면서 ADX 이용약관 원문을 브라우저로 직접 읽었다(curl 은 403 이다).
 * `adx.ae/en/terms-of-use` 원문 —
 * ```
 *   “Systematic retrieval of data or other content from this site to create or compile,
 *    directly or indirectly, a collection, compilation, database or directory without
 *    written permission from ADX is prohibited.”
 * ```
 * ⛔ 막히는 것이 «싣는 것»만이 아니다. **날마다 받아 표로 쌓는 것 그 자체**가 그 문장이다.
 *   그래서 KRX 에 쓰던 「쌓되 안 싣는다(내부 검산용)」가 여기엔 안 통한다 —
 *   KRX 조문은 「비상업적 목적으로만」이라 내부 검산에 여지가 있지만, 이쪽은 compile 자체다.
 *
 * 함께 한 일 — screener 에서 뺐고(ADX시총을_지면에_싣나=false),
 *   아카이빙 감시에서 내렸고, 라이선스 대장에 🔴 로 올렸다.
 * ⚠ 이미 받아 둔 것(2026-09-16·17)은 지우지 않는다. 버리지 않고 안 쓴다.
 * ⬜ 열린 우물을 찾으면 그때 되살린다. 못 찾았다 — Bayanat.ae(CMA)는 예산자료뿐이고
 *   시장통계는 2019년에 멈춰 있다(docs/UAE-데이터-출처-라이선스.md).
 *
 * ⛔ 「소급이 안 되니 일단 받아 두자」로 이 빗장을 풀지 않는다. 받는 것이 곧 어기는 것이다.
 *   푸는 조건은 하나 — ADX 의 «written permission» 을 받거나, 같은 값을 주는 열린 우물을
 *   찾는 것. 그때 이 상수를 false 로 내리고 위 세 자리를 함께 되돌린다.
 */
export const 약관이막는다 = true;

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (약관이막는다 && !process.argv.includes('--자가시험')) {
    console.log('⛔ 멈춰 세운 수집기다 — ADX 이용약관이 «systematic retrieval … to compile a');
    console.log('   database» 를 금지한다. 날마다 받아 쌓는 것이 바로 그 행위다.');
    console.log('   까닭과 되살리는 조건은 이 파일 아래쪽 「약관이막는다」 주석에 적어 두었다.');
    console.log('   docs/라이선스-대장.tsv 의 uae-adx-marketwatch 줄도 함께 본다.');
    process.exit(0);
  }
  if (process.argv.includes('--자가시험')) 자가시험();
  else {
    const 것 = 고른다(받는다());
    console.log(`■ ADX marketwatch — ${것.날짜}`);
    console.log(`   행 ${것.셈.행} · 시가총액 ${것.셈.시총}/${것.셈.행} · ISIN ${것.셈.ISIN}/${것.셈.행}`);
    const 큰것 = 것.줄.filter((x) => x.marketCap).sort((a, b) => b.marketCap - a.marketCap).slice(0, 5);
    console.log('   큰 순서 ' + 큰것.map((x) => `${x.symbol} ${(x.marketCap / 1e9).toFixed(1)}bn`).join(' · ') + ' (AED)');
    if (!것.셈.행) { console.log('🔴 한 줄도 못 받았다 — 적지 않는다'); process.exit(1); }
    if (!process.argv.includes('--안적는다')) {
      fs.mkdirSync(담는곳, { recursive: true });
      const 자리 = path.join(담는곳, `${것.날짜}.json`);
      fs.writeFileSync(자리, JSON.stringify({ _meta: { 받은때: new Date().toLocaleString('ko-KR'), 주소, 셈: 것.셈 }, rows: 것.줄 }, null, 1));
      console.log('   ✅ 적었다 — ' + 자리);
    }
  }
}
