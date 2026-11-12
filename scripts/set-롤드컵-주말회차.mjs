#!/usr/bin/env node
/**
 * set-롤드컵-주말회차.mjs — **스포츠 회차 넷을 토요일에도 돌게 한다.**
 *
 * ── 🔴 왜 (2026-10-23 · 사장님) ───────────────────────────────────
 * 「내일 롤드컵 경기마다 기사를 작성하게 해. 모두 8경기이니 경기 결과 및 내용을
 *  상세하게 8건 보도. 8경기가 다 끝나면 일요일에 바로 경기가 있으니 대진표를 중심으로
 *  경기일정에 대한 보도 1건. 모두 9건의 기사를 작성하게 해야 함」
 * 「여기에 날씨 기사 한건 총 10건의 기사를 중부매일계정에게 쓰게 잘 지시하도록.
 *  **네가 직접 쓰지마.**」
 *
 * ── 무엇이 막고 있나 (2026-10-23 18:2x 실측) ──────────────────────
 * ```
 * 25 8  * * *     스포츠 09시   매일 — 내일 돈다 ✅
 * 25 9  * * *     날씨 10시     매일 — 내일 돈다 ✅
 * 25 10 * * 1-5   스포츠 11시   평일만 — 토요일에 «안 돈다» 🔴
 * 25 13 * * 1-5   스포츠 14시   평일만 🔴
 * 25 14 * * 1-5   스포츠 15시   평일만 🔴
 * 25 15 * * 1-5   스포츠 16시   평일만 🔴
 * ```
 * ⇒ 내일 도는 스포츠 회차가 09시 하나뿐이다. 10건을 받을 자리가 없다.
 *
 * ⚠ 그냥 「평일만」을 없애면 **일요일에도 돈다.** 사장님 지시는
 *   [[휴일엔-중부매일기사를-쓰지-않는다]] 였고, 이번 지시는 **내일 하루** 것이다.
 *   ⇒ 그래서 `* * 1-6`(월~토)으로 바꾼다. 일요일은 그대로 쉰다.
 *
 * ⛔ 되돌릴 수 있어야 한다 — 옛 cron 을 찍어 두고, --되돌린다 로 복구한다.
 * ⭐ 쓴 뒤 «다시 읽어» 확인한다. 200 만 보고 「들어갔다」고 하지 않는다.
 *
 * 쓰는 법
 *   node scripts/set-롤드컵-주말회차.mjs --본다        지금 상태만 본다
 *   node scripts/set-롤드컵-주말회차.mjs --바꾼다      월~토로 바꾼다
 *   node scripts/set-롤드컵-주말회차.mjs --되돌린다    평일만으로 되돌린다
 */
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

export const 바꿀회차 = [
  /* 🔴 [2026-10-25 일요일] 사장님이 일요일 기사 세 건을 지시하셨다 —
     롤드컵 종합+26일 대진 · KBL 종합 · 날씨.
     09시와 10시(날씨)는 이미 날마다 돈다. KBL 을 받을 자리가 없어 16시만 연다.
     ⛔ 끝나면 --되돌린다 로 평일만으로 돌린다.

     🔴 [2026-10-24] 11시도 연다. 「09시 회차」는 이름만 09시이고 실제로는 08:25 에
       뜨는데, 롤드컵 마지막 경기가 09:00 에 시작한다. 끝나지 않은 경기를 종합할 수 없어
       10:25 에 뜨는 「스포츠 11시」로 옮겼다. ⛔ 회차 이름을 뜨는 시각으로 읽지 않는다. */
  { 시: '11', id: 'trig_01UW2RtJac77hBVz1tkgCQxN' },
  { 시: '16', id: 'trig_01ErSZQm2VhuNYMRBi3MCufF' },
];

/** 평일만(1-5) → 월~토(1-6). ⛔ 일요일은 그대로 쉰다 */
export function 토요일까지(cron) {
  const c = String(cron ?? '');
  if (!c.includes('1-5')) return null;          /* 이미 바뀌었거나 꼴이 다르다 */
  return c.replace('1-5', '1-6');
}

/** 월~토(1-6) → 평일만(1-5) */
export function 평일만으로(cron) {
  const c = String(cron ?? '');
  if (!c.includes('1-6')) return null;
  return c.replace('1-6', '1-5');
}

/**
 * 평일만(1-5) 또는 월~토(1-6) → **날마다**(*).
 *
 * 🔴 [2026-10-25 · 사장님] 일요일 기사 세 건을 지시하셨다 —
 *   「1. 롤드컵 전 경기 종합+다음날 대진 일정 기사 1건
 *    2. 25일 KBL 프로농구 종합 중심으로 24일 경기결과 짧게 언급하는 기사 1건
 *    3. 다음날 날씨 중심 + 당일 날씨 부연 기사」
 *   09시와 10시(날씨)는 이미 날마다 돈다. KBL 을 받을 자리가 없어 하나를 더 연다.
 * ⛔ 「휴일엔 중부매일 기사를 쓰지 않는다」는 평소 지시이고, 이번은 사장님이 직접
 *   그날 쓰라고 시키신 것이다. 끝나면 다시 평일만으로 돌린다.
 */
export function 날마다로(cron) {
  const c = String(cron ?? '');
  if (c.includes('1-5')) return c.replace('1-5', '*');
  if (c.includes('1-6')) return c.replace('1-6', '*');
  return null;                                   /* 이미 날마다다 */
}

export function 자가시험() {
  let 통과 = 0; let 탈 = 0;
  const 검 = (이름, 참) => { if (참) { 통과++; console.log('✅', 이름); } else { 탈++; console.log('🔴', 이름); } };
  검('평일만을 월~토로 바꾼다',
    토요일까지('CRON_TZ=Asia/Seoul 25 10 * * 1-5') === 'CRON_TZ=Asia/Seoul 25 10 * * 1-6');
  검('⛔ 일요일(0)을 넣지 않는다 — 휴일엔 쓰지 않는다는 지시가 살아 있다',
    !토요일까지('CRON_TZ=Asia/Seoul 25 10 * * 1-5').includes('0-6')
    && !토요일까지('CRON_TZ=Asia/Seoul 25 10 * * 1-5').endsWith('*'));
  검('⛔ 이미 매일인 것은 건드리지 않는다', 토요일까지('CRON_TZ=Asia/Seoul 25 8 * * *') === null);
  검('되돌리기가 된다',
    평일만으로('CRON_TZ=Asia/Seoul 25 10 * * 1-6') === 'CRON_TZ=Asia/Seoul 25 10 * * 1-5');
  검('⛔ 되돌릴 것이 없으면 null', 평일만으로('CRON_TZ=Asia/Seoul 25 10 * * 1-5') === null);
  검('시각 자리는 건드리지 않는다',
    토요일까지('CRON_TZ=Asia/Seoul 25 13 * * 1-5').includes('25 13'));
  console.log(탈 ? `\n🔴 자가시험 ${탈}건 탈` : `\n✅ 자가시험 ${통과} 통과`);
  return 탈 === 0;
}

async function 돈다(무엇) {
  const require = createRequire('file:///C:/Users/User/Documents/GitHub/klifemap/package.json');
  const puppeteer = require('puppeteer-core');
  const 쉼 = (ms) => new Promise((r) => setTimeout(r, ms));
  const b = await puppeteer.connect({ browserURL: (process.env.KLM_CHROME_PORT ? 'http://127.0.0.1:' + process.env.KLM_CHROME_PORT : 'http://127.0.0.1:9222'), defaultViewport: null, protocolTimeout: 240000 });
  const page = await b.newPage();
  try {
    await page.goto('https://claude.ai', { waitUntil: 'domcontentloaded', timeout: 90000 });
    await 쉼(3000);
    const 결과 = await page.evaluate(async (인자) => {
      const { 회차들, 무엇 } = 인자;
      const 조직 = await (await fetch('/api/organizations', { headers: { accept: 'application/json' } })).json();
      const oid = 조직[0]?.uuid;
      /* 🔴 [2026-10-23] 개별 조회(/scheduled_tasks/<id>)는 «빈 것»을 돌려준다.
         그것을 모르고 돌렸다가 넷 다 「바꿀 것이 없다」가 나왔다 — 이름조차 비어 있었다.
         ⛔ 빈 답을 「바꿀 것이 없다」로 읽으면 안 된다. 목록에서 집는다. */
      const 목록받기 = async () => (await (await fetch(
        `/api/organizations/${oid}/cowork/scheduled_tasks`,
        { headers: { accept: 'application/json' } })).json()).data || [];
      const 목록 = await 목록받기();
      const 낸것 = [];
      for (const { 시, id } of 회차들) {
        const 전 = 목록.find((t) => t.id === id) || {};
        const 옛 = 전.cron_expression || '';
        if (!옛) { 낸것.push({ 시, 이름: 전.name, 옛: '', 지금: '', 한것: '🔴 목록에서 못 찾았다' }); continue; }
        if (무엇 === '본다') { 낸것.push({ 시, 이름: 전.name, 옛, 지금: 옛 }); continue; }
        const 새 = 무엇 === '바꾼다'
          ? (옛.includes('1-5') ? 옛.replace('1-5', '1-6') : null)
          : 무엇 === '날마다'
            ? (옛.includes('1-5') ? 옛.replace('1-5', '*')
              : (옛.includes('1-6') ? 옛.replace('1-6', '*') : null))
            : (옛.includes('1-6') ? 옛.replace('1-6', '1-5')
              : (/\*\s*$/.test(옛) ? 옛.replace(/\*\s*$/, '1-5') : null));
        if (!새) { 낸것.push({ 시, 이름: 전.name, 옛, 지금: 옛, 한것: '바꿀 것이 없다' }); continue; }
        const res = await fetch(`/api/organizations/${oid}/cowork/scheduled_tasks/${id}`, {
          method: 'PATCH',
          headers: { 'content-type': 'application/json', accept: 'application/json' },
          body: JSON.stringify({ cron_expression: 새 }),
        });
        /* ⭐ 쓴 뒤 «다시 읽어» 확인한다 — 여기도 목록으로 읽는다 */
        const 뒤 = (await 목록받기()).find((t) => t.id === id) || {};
        낸것.push({ 시, 이름: 전.name, 옛, 보낸것: 새, 상태: res.status,
          지금: 뒤.cron_expression, 다음: (뒤.next_run_at || '').slice(0, 16) });
      }
      return 낸것;
    }, { 회차들: 바꿀회차, 무엇 });
    let 탈 = 0;
    for (const x of 결과) {
      const 바랐던것 = 무엇 === '바꾼다' ? '1-6'
        : 무엇 === '날마다' ? '* * *'
          : (무엇 === '되돌린다' ? '1-5' : null);
      const 됐나 = !바랐던것 || (x.지금 || '').includes(바랐던것);
      if (!됐나) 탈 += 1;
      console.log(`${무엇 === '본다' ? '　' : (됐나 ? '✅' : '🔴')} ${시표(x.시)} ${(x.이름 || '').slice(0, 34).padEnd(36)}`);
      console.log(`     ${(x.옛 || '').replace('CRON_TZ=Asia/Seoul ', '')}`
        + (x.보낸것 ? `  →  ${(x.지금 || '').replace('CRON_TZ=Asia/Seoul ', '')}` : `  ${x.한것 || ''}`));
      if (x.다음) console.log(`     다음 실행 ${x.다음}`);
    }
    return 탈;
  } finally { try { await page.close(); } catch (e) {} b.disconnect(); }
}
const 시표 = (시) => `${시}시`.padEnd(5);

const 내가실행됐다 = process.argv[1]
  && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (내가실행됐다) {
  if (process.argv.includes('--자가시험')) process.exit(자가시험() ? 0 : 1);
  const 무엇 = process.argv.includes('--바꾼다') ? '바꾼다'
    : process.argv.includes('--날마다') ? '날마다'
      : process.argv.includes('--되돌린다') ? '되돌린다'
        : process.argv.includes('--본다') ? '본다' : null;
  if (!무엇) {
    console.log('쓰는 법: --본다 | --바꾼다 | --되돌린다 | --자가시험');
    process.exit(1);
  }
  console.log(`■ 스포츠 회차 넷 — ${무엇}`);
  console.log('  (사장님 2026-10-23 「총 10건의 기사를 중부매일계정에게 쓰게」)');
  console.log('  ⛔ 일요일은 그대로 쉰다 — 월~토(1-6)로만 바꾼다\n');
  const 탈 = await 돈다(무엇);
  if (탈) { console.log(`\n🔴 ${탈}개가 안 바뀌었다`); process.exit(1); }
  if (무엇 !== '본다') console.log('\n✅ 다 됐다 — 다시 읽어 확인했다');
}
