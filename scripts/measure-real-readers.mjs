#!/usr/bin/env node
/**
 * measure-real-readers.mjs — **방문자 수에서 「사람이 아닌 것」을 갈라낸다.** (5번, 2026-08-24)
 *
 * ── 왜 이 자가 생겼나 ────────────────────────────────────────
 * 🔴 2026-08-24 아침에 나는 전 유닛과 사장님께 「내 유닛 28일 순방문자 111명」을 보냈다.
 *   2번이 그 형식대로 등록하라고 전 유닛에 지시했다. 그날 오전에 출처를 갈라 보니
 *   그 수의 대부분이 **사람의 행동을 하지 않는 세션**이었다 —
 *
 *     데스크톱 · Direct    70세션 / 70사람 · 붙은몫  9% · 세션당  2.0초 · 걸음 1.01
 *     미국     · Direct    43세션 / 43사람 · 붙은몫  5% · 세션당  0.9초 · 걸음 1.02
 *     이란     · Direct    13세션 / 13사람 · 붙은몫  0% · 세션당  0.0초 · 걸음 1.00
 *
 *   1인 1세션 · 0~2초 · 한 장만 열고 나감. 사람이 읽은 흔적이 없다.
 *   같은 기간 검색 유입은 전혀 다르게 움직였다 —
 *     Organic Search       23세션 / 16사람 · 붙은몫 61% · 세션당 70.6초 · 걸음 1.39
 *
 * ⛔ **두 덩어리를 합쳐서 「방문자 N명」이라고 말하지 않는다.** 9월 목표가 하루 1,000명인데
 *   분자에 사람이 아닌 것을 넣으면 목표에 다가간 것처럼 보이고, 그것이 제일 나쁘다.
 *   「맞는지 모르는 숫자로 만든 확신」을 안 낸다는 것이 우리 강령이다.
 *
 * ── ⚠ 이 자가 «하지 않는» 말 ────────────────────────────────
 * ⛔ 「봇이다」라고 단정하지 않는다. Direct 에는 주소를 직접 치는 실제 사람도 있고,
 *   우리 여섯 유닛이 서로 열어 본 것도 여기 들어온다. 기계인지는 여기서 못 가린다.
 * ✅ 대신 이렇게 적는다 — **「읽은 흔적이 있는 세션」과 「없는 세션」.**
 *   기준은 셋이고 전부 GA4 가 준 값이다: 붙은 세션 몫 · 세션당 초 · 세션당 지면 수.
 *   판정이 아니라 **가름**이다. 가른 뒤 두 수를 나란히 낸다.
 *
 * 쓰는 법
 *   node scripts/measure-real-readers.mjs --selftest
 *   node scripts/measure-real-readers.mjs --잰다                  네 사이트 전부
 *   node scripts/measure-real-readers.mjs --잰다 --days 7
 *   node scripts/measure-real-readers.mjs --잰다 --적는다=src/data/real-readers.json
 */
import { readFileSync, existsSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { 유닛, 손님아님, 토큰받기, 무엇이막혔나, 우리속성 } from './ga4-report.mjs';
import { 오늘 as 케이에스티오늘 } from './_kst.mjs';   /* 🔴 [2026-09-06] UTC 날짜 병 — KST 새벽에 하루 앞서 찍혔다 */

const 내가실행됐다 = process.argv[1]
  && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);

/**
 * 🔴 [2026-09-11 22:3x · 5번] **이 자가 «깨져서» 아무것도 못 재고 죽었다.**
 *
 * 22시 방송을 하려고 돌렸더니 이랬다 —
 *   SyntaxError: Unexpected token '<', "<!DOCTYPE "... is not valid JSON
 *
 * 구글이 JSON 이 아니라 «HTML 오류 쪽»을 돌려준 것이다(로그인 벽·점검·프록시 따위).
 * 그런데 코드가 곧바로 r.json() 을 부르는 바람에 자가 그냥 죽었다.
 *
 * ⛔ **자가 죽으면 「못 쟀다」조차 말해 주지 못한다.** 그게 제일 나쁘다 —
 *   나는 그 자리에서 다른 자(ga4-report)로 갈아타 재야 했다.
 * ✅ 그래서 답을 읽기 전에 «무엇이 왔는지» 보고, JSON 이 아니면 그렇게 말한다.
 *    우리 강령 그대로 — 「못 잰 것은 못 쟀다고 적는다」.
 */
async function 답읽기(r, 무엇) {
  const 글 = await r.text();
  try {
    return JSON.parse(글);
  } catch {
    const 꼴 = /^\s*</.test(글) ? 'HTML' : '알 수 없는 꼴';
    console.log(`🔴 ${무엇} — **못 쟀다.** 구글이 JSON 이 아니라 ${꼴} 을 돌려줬다 (HTTP ${r.status})`);
    console.log(`   첫 줄: ${글.split('\n')[0].slice(0, 100)}`);
    console.log('   ⇒ 대개 토큰이 막혔거나 구글 쪽이 잠깐 막힌 것이다. 잠시 뒤 다시 잰다.');
    console.log('   ⛔ 이때 0 으로 적지 않는다. 「못 쟀다」가 맞는 답이다.');
    process.exit(0);
  }
}

/* ── 가르는 자. 여기만 자가시험한다 ────────────────────────── */

/**
 * 🔴🔴 [2026-08-29 · 2번 정본 확정] **「진짜 손님」은 채널로 가른다.**
 *
 * 1번이 찾았다 — klifemap 자체 카운터와 사장님 체감이 크게 어긋난 까닭이,
 * **우리 여섯 유닛이 매일 하는 「라이브 확인」**이었다. Playwright·크롬 자동확인은
 * 진짜 브라우저 UA 를 쓰므로 서버가 못 거른다. 그것이 Direct 로 쌓인다.
 * 2번이 그 자리에서 정본을 확정했다 —
 *
 * ```
 *   ✅ 손님으로 센다   Organic Search · AI Assistant · Organic Social
 *   ⛔ 안 센다        Direct · Unassigned · Referral (우리 자신일 개연성이 크다)
 * ```
 * ⚠ 「누구 잘못도 아니다」 — 라이브 확인은 계속하되 **세는 기준만** 고친다.
 * ⭐ AI Assistant 는 진짜다 — ChatGPT·Perplexity 답변을 타고 오는 사람이 주 19세션 있었다.
 *    그래서 이것을 빼면 «과소 계상»이 된다. 셋을 다 센다.
 * ⛔ 이 자는 이 가름을 **안 하고 있었다.** 전부 세고 「읽은 흔적」으로만 갈랐다.
 */
export const 손님갈래 = ['Organic Search', 'AI Assistant', 'Organic Social'];

/** 채널 이름이 「진짜 손님」인가. ⛔ 모르는 채널은 손님으로 «안» 센다 — 넘겨 세지 않는다 */
export function 손님인가(채널) {
  return 손님갈래.includes(String(채널 ?? '').trim());
}

/** 덩어리 이름 「채널 · 기기 · 나라」에서 채널만 뽑는다 */
export function 채널뽑기(덩어리이름) {
  return String(덩어리이름 ?? '').split('·')[0].trim();
}

/**
 * 「읽은 흔적이 없는 세션」의 조건. **셋을 다 넘겨야** 흔적 없음으로 본다 —
 * 하나만 보고 가르면 짧게 읽고 답을 찾아 나간 사람까지 버린다.
 */
export const 흔적없음기준 = {
  세션당초: 5,      /* 5초 안에 나갔다 */
  걸음: 1.1,        /* 사실상 한 장만 열었다 */
  붙은몫: 15,       /* 구글도 「붙어 있었다」고 안 세었다 */
};

/**
 * 한 덩어리가 「읽은 흔적이 없다」인가.
 * ⛔ 세션이 없으면 판정하지 않는다 — null 이다. 「흔적 없음」이 아니다.
 */
export function 흔적이없나(덩어리) {
  const { 세션, 붙은, 초합, 열림 } = 덩어리 ?? {};
  if (!Number.isFinite(세션) || 세션 <= 0) return null;
  if (![붙은, 초합, 열림].every(Number.isFinite)) return null;
  const 세션당초 = 초합 / 세션;
  const 걸음 = 열림 / 세션;
  const 붙은몫 = (100 * 붙은) / 세션;
  return 세션당초 < 흔적없음기준.세션당초
    && 걸음 < 흔적없음기준.걸음
    && 붙은몫 < 흔적없음기준.붙은몫;
}

/** 덩어리 여러 개를 하나로 더한다 */
export function 더해(덩어리들) {
  const 합 = { 세션: 0, 붙은: 0, 초합: 0, 열림: 0, 사람: 0 };
  for (const d of 덩어리들 ?? []) {
    합.세션 += Number(d.세션) || 0;
    합.붙은 += Number(d.붙은) || 0;
    합.초합 += Number(d.초합) || 0;
    합.열림 += Number(d.열림) || 0;
    합.사람 += Number(d.사람) || 0;
  }
  return 합;
}

/**
 * 가른다 — 흔적 있는 것 / 없는 것 / 판정 못한 것.
 * ⛔ 판정 못한 것을 「흔적 있음」에 넣지 않는다. 셋째 칸으로 따로 낸다.
 *   못 잰 것을 좋은 쪽에 넣는 것이 숫자를 부풀리는 가장 흔한 길이다.
 */
export function 가른다(덩어리들) {
  const 있음 = []; const 없음 = []; const 모름 = [];
  for (const d of 덩어리들 ?? []) {
    const r = 흔적이없나(d);
    if (r === null) 모름.push(d);
    else if (r) 없음.push(d);
    else 있음.push(d);
  }
  return { 있음, 없음, 모름, 있음합: 더해(있음), 없음합: 더해(없음), 모름합: 더해(모름) };
}

/**
 * 사람 수를 «사람이 셀 수 있는 말»로 적는다.
 *
 * 🔴 2026-08-28 에 사장님이 「사람이 소숫점인게 이해가 안돼」라고 하셨다.
 *    그때 나는 28일치를 28로 나눠 「하루평균 0.46명」이라고 적어 놓았었다.
 *    보고서만 고치고 «이 자»를 안 고쳤더니 다음 날 같은 줄이 또 나왔다.
 *    ⛔ 그러니 나눗셈 결과에 「명」을 붙이는 자리를 여기서 없앤다.
 *
 * 잰 기간에 실제로 온 «사람 수»를 그대로 적는다. 하루치가 궁금하면
 * 「며칠에 몇 명」을 보고 보는 쪽이 나눈다 — 우리가 나눠서 사람인 척하지 않는다.
 */
export function 사람수말하기(사람, 날수) {
  /* ⛔ null 을 Number() 에 넣으면 0 이 된다 — 「0명」과 「못 잼」은 다른 말이다 */
  if (사람 === null || 사람 === undefined || 사람 === '') return '못 잼';
  const n = Number(사람);
  const d = Number(날수);
  if (!Number.isFinite(n) || n < 0) return '못 잼';
  if (!Number.isFinite(d) || d <= 0) return `${Math.round(n)}명`;
  return `${d}일 동안 ${Math.round(n)}명`;
}

/** 읽는 말로. ⛔ 세션이 0인 칸을 「0초」로 적지 않는다 */
export function 한줄(이름, 폭, d) {
  const 초 = d.세션 > 0 ? (d.초합 / d.세션).toFixed(1) : '못잼';
  const 걸음 = d.세션 > 0 ? (d.열림 / d.세션).toFixed(2) : '못잼';
  const 몫 = d.세션 > 0 ? `${((100 * d.붙은) / d.세션).toFixed(0)}%` : '못잼';
  return `${String(이름).slice(0, 폭).padEnd(폭)} ${String(d.세션).padStart(5)} ${String(d.사람).padStart(5)}`
    + ` ${몫.padStart(7)} ${초.padStart(9)} ${걸음.padStart(6)}`;
}

if (내가실행됐다 && process.argv.includes('--selftest')) {
  let 통 = 0; let 실 = 0;
  const 참 = (이름, 값) => { if (값) 통 += 1; else { 실 += 1; console.log(`   🔴 ${이름}`); } };

  /* 🔴 이것이 실제로 본 값이다 — 데스크톱 Direct 70세션 · 2.0초 · 걸음 1.01 · 붙은 9% */
  참('0~2초에 한 장만 열고 나간 덩어리는 흔적 없음',
    흔적이없나({ 세션: 70, 붙은: 6, 초합: 140, 열림: 71 }) === true);
  /* 🔴 같은 기간 검색 유입 — 23세션 · 70.6초 · 걸음 1.39 · 붙은 61% */
  참('검색 유입은 흔적 있음',
    흔적이없나({ 세션: 23, 붙은: 14, 초합: 1624, 열림: 32 }) === false);

  참('짧아도 두 장 걸었으면 흔적 있음',
    흔적이없나({ 세션: 10, 붙은: 0, 초합: 20, 열림: 25 }) === false);
  참('짧고 한 장이어도 구글이 붙었다고 세면 흔적 있음',
    흔적이없나({ 세션: 100, 붙은: 40, 초합: 200, 열림: 101 }) === false);
  참('오래 머물면 한 장이어도 흔적 있음',
    흔적이없나({ 세션: 10, 붙은: 0, 초합: 600, 열림: 10 }) === false);

  참('세션이 0이면 판정하지 않는다', 흔적이없나({ 세션: 0, 붙은: 0, 초합: 0, 열림: 0 }) === null);
  참('값이 없으면 판정하지 않는다', 흔적이없나({ 세션: 5 }) === null);
  참('빈 것도 안 죽는다', 흔적이없나(null) === null);
  참('빈 것도 안 죽는다 2', 흔적이없나(undefined) === null);

  참('더하기가 맞다', 더해([{ 세션: 1, 붙은: 2, 초합: 3, 열림: 4, 사람: 5 },
    { 세션: 10, 붙은: 20, 초합: 30, 열림: 40, 사람: 50 }]).세션 === 11);
  참('빈 목록을 더하면 0', 더해([]).세션 === 0);
  참('빈 값을 더해도 안 죽는다', 더해(null).열림 === 0);

  const g = 가른다([
    { 이름: '봇같은것', 세션: 70, 붙은: 6, 초합: 140, 열림: 71, 사람: 70 },
    { 이름: '검색', 세션: 23, 붙은: 14, 초합: 1624, 열림: 32, 사람: 16 },
    { 이름: '빈것', 세션: 0, 붙은: 0, 초합: 0, 열림: 0, 사람: 0 },
  ]);
  참('셋으로 갈린다', g.있음.length === 1 && g.없음.length === 1 && g.모름.length === 1);
  참('흔적 있는 쪽 사람 수가 맞다', g.있음합.사람 === 16);
  참('흔적 없는 쪽 세션 수가 맞다', g.없음합.세션 === 70);
  /* ⛔ 못 잰 것을 좋은 쪽에 얹지 않는다 */
  참('판정 못한 것은 흔적 있음에 안 들어간다', g.있음합.세션 === 23);
  참('판정 못한 것이 셋째 칸에 있다', g.모름.length === 1);

  참('한 줄에 못잼을 쓴다', 한줄('빈', 6, { 세션: 0, 붙은: 0, 초합: 0, 열림: 0, 사람: 0 }).includes('못잼'));
  참('한 줄이 초를 적는다', 한줄('검', 6, { 세션: 2, 붙은: 1, 초합: 100, 열림: 3, 사람: 2 }).includes('50.0'));

  /* 🔴 사장님 지적 — 「사람이 소숫점인게 이해가 안돼」 */
  참('사람 수에 소수점이 안 붙는다', 사람수말하기(13, 28) === '28일 동안 13명');
  참('사람 수를 날수로 안 나눈다', !/0\.|\d\.\d/.test(사람수말하기(13, 28)));
  참('한 명도 안 왔으면 0명이라 적는다', 사람수말하기(0, 28) === '28일 동안 0명');
  참('날수를 모르면 사람 수만 적는다', 사람수말하기(21, 0) === '21명');
  참('못 잰 것은 못 잼이라 적는다', 사람수말하기(null, 28) === '못 잼');
  참('음수는 못 잼', 사람수말하기(-1, 28) === '못 잼');
  /* ⛔ 이 자가 다시 나눗셈으로 「명」을 만들면 여기서 걸린다 */
  const 내소스 = readFileSync(fileURLToPath(import.meta.url), 'utf8');
  참('소스에 나눗셈 뒤 「명」이 없다',
    !/\/\s*날수\s*\)?\s*\.toFixed\([^)]*\)\s*\}명/.test(내소스));

  참('기준 셋이 다 있다', ['세션당초', '걸음', '붙은몫'].every((k) => Number.isFinite(흔적없음기준[k])));
  참('유닛 목록에 네 자리가 있다', 유닛.length === 4);
  참('우리 서버는 손님이 아니다', 손님아님.test('127.0.0.1') === true);

  /**
   * 🔴🔴 [2026-08-29 · 2번 정본] 「진짜 손님」을 채널로 가른다.
   * ⛔ 이 자는 이 가름을 안 하고 있었다 — 전부 세고 「읽은 흔적」으로만 갈랐다.
   */
  참('⭐ Organic Search 는 손님이다', 손님인가('Organic Search'));
  참('⭐ AI Assistant 도 손님이다 — 빼면 과소 계상이다', 손님인가('AI Assistant'));
  참('⭐ Organic Social 도 손님이다', 손님인가('Organic Social'));
  참('⛔ Direct 는 손님이 아니다 — 우리 라이브 확인이 여기 쌓인다', !손님인가('Direct'));
  참('⛔ Unassigned 도 아니다', !손님인가('Unassigned'));
  참('⛔ Referral 도 아니다', !손님인가('Referral'));
  참('⛔ 모르는 채널은 손님으로 «안» 센다 — 넘겨 세지 않는다', !손님인가('Something New'));
  참('⛔ 빈 값도 손님이 아니다', !손님인가(null) && !손님인가('') && !손님인가(undefined));
  참('채널 이름을 덩어리 이름에서 뽑는다',
    채널뽑기('Organic Search · desktop · Korea') === 'Organic Search');
  참('채널만 있어도 뽑는다', 채널뽑기('Direct') === 'Direct');
  참('빈 값도 안 터진다', 채널뽑기(null) === '' && 채널뽑기(undefined) === '');
  /* ⚠ 두 축은 «다른 것»이다 — 흔적은 「머물렀나」, 손님갈래는 「누구인가」 */
  참('⭐ 흔적 기준과 손님 기준이 서로 다른 축이다',
    흔적이없나({ 세션: 10, 붙은: 0, 초합: 1, 열림: 10 }) === true
    && 손님인가('Organic Search') === true);

  console.log(`사람이 아닌 것을 가르는 자 — 자가시험 ${통} 통과 · ${실} 실패`);
  process.exit(실 ? 1 : 0);
}

if (내가실행됐다 && process.argv.includes('--잰다')) {
  const i = process.argv.indexOf('--days');
  const 날수 = (i >= 0 ? Number(process.argv[i + 1]) : 28) || 28;
  const 적을곳 = process.argv.find((a) => a.startsWith('--적는다='))?.split('=')[1] ?? null;

  const 키파일 = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!키파일 || !existsSync(키파일)) {
    console.log('⚠ 서비스 계정 키파일이 없다 — **못 쟀다.**');
    process.exit(0);
  }
  const 키 = JSON.parse(readFileSync(키파일, 'utf8'));
  let 토큰;
  try { 토큰 = await 토큰받기(키); } catch (e) {
    const m = 무엇이막혔나(e.message);
    console.log(`🔴 토큰을 못 받았다 — **못 쟀다.** ${m.무엇} / ${m.할것}`);
    process.exit(0);
  }

  let 속성 = process.argv.find((a) => a.startsWith('--속성='))?.split('=')[1]
    ?? process.env.GA4_PROPERTY_ID ?? null;
  if (!속성) {
    const r = await fetch('https://analyticsadmin.googleapis.com/v1beta/accountSummaries',
      { headers: { Authorization: `Bearer ${토큰}` } });
    const j = await 답읽기(r, '속성 목록');
    속성 = 우리속성(j.accountSummaries).고른것?.속성 ?? 우리속성(j.accountSummaries).전부[0]?.속성 ?? null;
  }
  if (!속성) { console.log('🔴 속성을 못 찾았다 — **못 쟀다**'); process.exit(0); }

  console.log(`읽은 흔적이 있는 세션을 가른다 — ${날수}일 · 속성 ${속성}`);
  console.log(`기준(셋을 다 넘겨야 「흔적 없음」): 세션당 ${흔적없음기준.세션당초}초 미만`
    + ` · 걸음 ${흔적없음기준.걸음}장 미만 · 붙은 세션 ${흔적없음기준.붙은몫}% 미만`);
  console.log('⛔ 「봇이다」라고 말하지 않는다. 읽은 흔적이 있나 없나만 가른다.\n');

  const 줄 = await (async () => {
    const r = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${속성}:runReport`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${토큰}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dateRanges: [{ startDate: `${날수}daysAgo`, endDate: 'yesterday' }],
        dimensions: [{ name: 'hostName' }, { name: 'sessionDefaultChannelGroup' },
          { name: 'deviceCategory' }, { name: 'country' }],
        metrics: [{ name: 'sessions' }, { name: 'engagedSessions' },
          { name: 'averageSessionDuration' }, { name: 'screenPageViews' }, { name: 'totalUsers' }],
        limit: 5000,
      }),
    });
    const j = await 답읽기(r, 'GA4 보고');
    if (j.error) { console.log(`🔴 GA4 가 거절했다 — **못 쟀다.** ${JSON.stringify(j.error).slice(0, 200)}`); process.exit(0); }
    return j.rows ?? [];
  })();

  const 유닛별 = new Map();
  for (const x of 줄) {
    const host = x.dimensionValues[0].value;
    if (손님아님.test(host)) continue;
    const 이름 = 유닛.find((u) => u.자.test(host))?.이름 ?? `(모름) ${host}`;
    const se = Number(x.metricValues[0].value);
    const 덩 = {
      이름: `${x.dimensionValues[1].value} · ${x.dimensionValues[2].value} · ${x.dimensionValues[3].value}`,
      세션: se,
      붙은: Number(x.metricValues[1].value),
      초합: Number(x.metricValues[2].value) * se,
      열림: Number(x.metricValues[3].value),
      사람: Number(x.metricValues[4].value),
    };
    if (!유닛별.has(이름)) 유닛별.set(이름, []);
    유닛별.get(이름).push(덩);
  }

  /* ⚠ `customerChannels` 는 «최상위»에도 둔다 — 유닛마다 다른 값이 아니고,
     읽는 쪽이 `d.customerChannels` 로 집는다. 안 두면 방송에 «빈 자리»가 나간다(실제로 그랬다). */
  const 적을것 = {
    generated: 케이에스티오늘(),
    days: 날수,
    property: 속성,
    기준: 흔적없음기준,
    customerChannels: 손님갈래,
    units: [],
  };

  console.log(`${'유닛'.padEnd(22)} ${'세션'.padStart(5)} ${'사람'.padStart(5)} ${'붙은몫'.padStart(7)} ${'세션당초'.padStart(9)} ${'걸음'.padStart(6)}`);
  console.log('─'.repeat(60));
  for (const [이름, 덩어리들] of [...유닛별].sort((a, b) => 더해(b[1]).세션 - 더해(a[1]).세션)) {
    const g = 가른다(덩어리들);
    const 전체 = 더해(덩어리들);
    console.log(한줄(`${이름} 전체`, 22, 전체));
    console.log(한줄('  ├ 읽은 흔적 있음', 22, g.있음합));
    console.log(한줄('  ├ 흔적 없음', 22, g.없음합));
    if (g.모름합.세션 || g.모름.length) console.log(한줄('  └ 판정 못함', 22, g.모름합));
    const 몫 = 전체.세션 > 0 ? (100 * g.있음합.세션) / 전체.세션 : null;
    console.log(`   → 세션 중 읽은 흔적이 있는 몫 ${몫 === null ? '못 잼' : `${몫.toFixed(0)}%`}`
      + ` · 흔적 있는 사람 ${사람수말하기(g.있음합.사람, 날수)}`);

    /**
     * 🔴 [2026-08-29 · 2번 정본] **채널로 가른 「진짜 손님」을 따로 낸다.**
     * ⚠ 위의 「읽은 흔적」과 이것은 «다른 축»이다. 흔적은 «머물렀나», 이것은 «누구인가»다.
     *    둘 다 낸다 — 하나로 합치면 무엇 때문에 수가 움직였는지 못 가린다.
     */
    const 손님덩 = 덩어리들.filter((d) => 손님인가(채널뽑기(d.이름)));
    const 손님합 = 더해(손님덩);
    console.log(한줄('  ⭐ 진짜 손님(채널)', 22, 손님합));
    const 갈래별 = new Map();
    for (const d of 손님덩) {
      const c = 채널뽑기(d.이름);
      갈래별.set(c, 더해([갈래별.get(c) ?? {}, d]));
    }
    for (const [c, v] of [...갈래별].sort((a, b) => b[1].세션 - a[1].세션)) {
      console.log(`      · ${c.padEnd(16)} 세션 ${String(v.세션).padStart(4)} · ${사람수말하기(v.사람, 날수)}`);
    }
    if (!손님덩.length) console.log('      ⛔ 손님 갈래(Organic Search·AI Assistant·Organic Social)가 «하나도» 없다');
    /* 무엇이 흔적 없음으로 갈렸나 — 이름을 보여 준다. 안 보여 주면 못 믿는다 */
    for (const d of g.없음.sort((a, b) => b.세션 - a.세션).slice(0, 3)) {
      console.log(`      ⛔ ${d.이름} — 세션 ${d.세션} · ${(d.초합 / d.세션).toFixed(1)}초 · 걸음 ${(d.열림 / d.세션).toFixed(2)}`);
    }
    console.log('');
    적을것.units.push({
      unit: 이름,
      total: 전체,
      withReadingSigns: g.있음합,
      withoutReadingSigns: g.없음합,
      undecided: g.모름합,
      /* ⛔ dailyRealUsers(날수로 나눈 값)는 없앴다 — 사람은 소수점이 될 수 없다 */
      realUsersInWindow: g.있음합.사람,
      windowDays: 날수,
      groupsWithoutSigns: g.없음.sort((a, b) => b.세션 - a.세션).slice(0, 10),
      /**
       * 🔴 [2026-08-29 · 2번 정본] 채널로 가른 «진짜 손님». 이것이 방문자 방송의 근거다.
       * ⚠ 화면을 정규식으로 뜯지 말고 **이 자료를 읽으십시오** — 화면은 깨지기 쉽습니다.
       */
      realCustomers: 더해(덩어리들.filter((d) => 손님인가(채널뽑기(d.이름)))),
      realCustomerChannels: (() => {
        const m = new Map();
        for (const d of 덩어리들.filter((x) => 손님인가(채널뽑기(x.이름)))) {
          const c = 채널뽑기(d.이름);
          m.set(c, 더해([m.get(c) ?? {}, d]));
        }
        return [...m].sort((a, b) => b[1].세션 - a[1].세션).map(([channel, v]) => ({ channel, ...v }));
      })(),
      customerChannels: 손님갈래,
    });
  }

  console.log('⚠ 이 가름은 판정이 아니다. Direct 에는 주소를 직접 치는 사람과 우리 여섯 유닛도 섞인다.');
  console.log('⚠ GA4 자체가 광고차단·쿠키거부로 덜 센다. 두 방향 오차가 같이 있다.');
  console.log('✅ 말할 수 있는 것 — 「읽은 흔적이 있는 세션은 이만큼이다」까지다.');

  if (적을곳) {
    writeFileSync(적을곳, `${JSON.stringify(적을것, null, 2)}\n`);
    console.log(`\n적었다 — ${적을곳}`);
  } else {
    console.log('\n⚠ 아직 안 적었다. 적으려면 --적는다=src/data/real-readers.json');
  }
}

if (내가실행됐다 && !process.argv.includes('--잰다') && !process.argv.includes('--selftest')) {
  console.log('⛔ --잰다 나 --selftest 을 준다');
}
