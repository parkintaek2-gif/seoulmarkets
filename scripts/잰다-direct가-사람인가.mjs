#!/usr/bin/env node
/**
 * 잰다-direct가-사람인가.mjs — 「직접 들어왔다」로 찍힌 방문이 **사람인지** 본다.
 *
 * ── 🔴 왜 ────────────────────────────────────────────────────
 * [2026-11-18] 28일 유입원을 재니 사이트마다 direct 비율이 이렇다 —
 * ```
 *   K Culture Wire   4,012 / 4,238  (95%)
 *   SeoulMarkets     3,226 / 3,367  (96%)
 *   KLifeMap         1,760 / 2,058  (86%)
 *   백년지도            176 / 3,102  ( 6%)   ← 네이버가 2,829명
 * ```
 * 백년지도만 정상이다. 나머지 셋은 **사람이 주소를 직접 치고 들어왔다고 보기엔 너무 많다.**
 * 우리 점검 도구이거나 자동 수집기일 수 있다.
 *
 * ⛔ 가르지 못한 것을 사람 수로 올리지 않는다. 사장님께 드리는 방문자 수가 부풀면
 *   그 수로 내리는 판단이 전부 틀어진다.
 * ⛔ 반대로 「전부 봇이다」로 깎지도 않는다 — 재서 말한다.
 *
 * ── 무엇으로 가르나 ──────────────────────────────────────────
 * 사람과 자동을 가르는 자국은 하나로 안 된다. 넷을 함께 본다 —
 *   ① 머문 시간 — 자동은 0초에 몰린다
 *   ② 하루 중 시각 — 사람은 깨어 있는 때에 퍼지고, 자동은 한 시각에 몰린다
 *   ③ 나라 — 한국어 사이트인데 한국 밖이 대부분이면 수상하다
 *   ④ 한 사람이 본 지면 수 — 자동은 1장이거나 아주 많다
 *
 * 쓰는 법
 *   node scripts/잰다-direct가-사람인가.mjs
 *   node scripts/잰다-direct가-사람인가.mjs --selftest
 */
import { 토큰받기, 재기, 우리것인가, 사이트이름 } from './lib/ga4.mjs';

/** 한 시각에 몰렸나 — 가장 큰 시각이 전체의 몇 %인가 */
export function 한시각에몰렸나(시각별) {
  const 값 = Object.values(시각별);
  const 합 = 값.reduce((a, b) => a + b, 0);
  if (!합) return null;
  return Math.round((Math.max(...값) / 합) * 1000) / 10;
}

/** 깨어 있는 때(07~23시)의 몫. 사람이면 대개 여기에 몰린다 */
export function 낮몫(시각별) {
  let 낮 = 0, 합 = 0;
  for (const [시, 수] of Object.entries(시각별)) {
    합 += 수;
    const h = Number(시);
    if (h >= 7 && h <= 23) 낮 += 수;
  }
  return 합 ? Math.round((낮 / 합) * 1000) / 10 : null;
}

function 자가시험() {
  const 봄 = [];
  const 본다 = (이름, 참) => 봄.push({ 이름, 참 });
  본다('① 한 시각에 다 몰리면 100%', 한시각에몰렸나({ 3: 100 }) === 100);
  본다('② 고르게 퍼지면 작다', 한시각에몰렸나({ 0: 10, 1: 10, 2: 10, 3: 10 }) === 25);
  본다('③ 빈 것은 null', 한시각에몰렸나({}) === null);
  본다('④ 낮몫을 센다', 낮몫({ 8: 50, 3: 50 }) === 50);
  /* 🔴 07시와 23시는 «낮»에 든다 — 경계를 빠뜨리면 사람을 자동으로 센다 */
  본다('⑤ 07시는 낮이다', 낮몫({ 7: 10 }) === 100);
  본다('⑥ 23시는 낮이다', 낮몫({ 23: 10 }) === 100);
  본다('⑦ 06시는 낮이 아니다', 낮몫({ 6: 10 }) === 0);
  본다('⑧ 빈 것은 null', 낮몫({}) === null);
  let 깨짐 = 0;
  for (const s of 봄) if (!s.참) { console.log('🔴 ' + s.이름); 깨짐 += 1; }
  console.log(깨짐 ? `🔴 ${깨짐}가지 깨졌다` : `✅ ${봄.length}가지 다 통과`);
  return 깨짐 === 0;
}

async function 돈다() {
  const t = await 토큰받기();
  if (t.못잼) { console.log('🔴 못 쟀다 —', t.못잼); return; }

  console.log('\n📏 「직접 들어왔다」로 찍힌 방문이 사람인가 — 28일\n');
  console.log('  ⛔ 하나로 판정하지 않는다. 넷을 함께 본다.\n');

  /* ① 시각별 */
  const 시각줄 = await 재기(t.토큰, t.속성, ['hostName', 'sessionSource', 'hour'],
    { 시작: '28daysAgo', 끝: 'yesterday', 지표: 'sessions' });
  /* ② 나라별 */
  const 나라줄 = await 재기(t.토큰, t.속성, ['hostName', 'sessionSource', 'country'],
    { 시작: '28daysAgo', 끝: 'yesterday', 지표: 'sessions' });
  /* ③ 머문 시간 · 한 사람이 본 지면 */
  const 깊이줄 = await 재기(t.토큰, t.속성, ['hostName', 'sessionSource'],
    { 시작: '28daysAgo', 끝: 'yesterday', 지표: 'screenPageViewsPerSession' });
  const 머문줄 = await 재기(t.토큰, t.속성, ['hostName', 'sessionSource'],
    { 시작: '28daysAgo', 끝: 'yesterday', 지표: 'averageSessionDuration' });

  const 모음 = {};
  const 넣기 = (줄들, 칸, 뽑기) => {
    for (const r of 줄들 || []) {
      const [h, s, 셋째] = r.값;
      if (!우리것인가(h)) continue;
      const 이름 = 사이트이름(h);
      const 갈래 = /^\(direct\)$/i.test(s) ? 'direct' : '그 밖';
      const 칸들 = ((모음[이름] ??= {})[갈래] ??= { 시각: {}, 나라: {}, 깊이: null, 머문: null });
      뽑기(칸들, 셋째, r.수);
    }
  };
  넣기(시각줄, 'hour', (칸, 시, 수) => { 칸.시각[시] = (칸.시각[시] || 0) + 수; });
  넣기(나라줄, 'country', (칸, 나라, 수) => { 칸.나라[나라] = (칸.나라[나라] || 0) + 수; });
  넣기(깊이줄, null, (칸, _, 수) => { 칸.깊이 = 수; });
  넣기(머문줄, null, (칸, _, 수) => { 칸.머문 = 수; });

  for (const [사이트, 갈래들] of Object.entries(모음)) {
    console.log('  ■ ' + 사이트);
    for (const 갈래 of ['direct', '그 밖']) {
      const c = 갈래들[갈래];
      if (!c) { console.log('     ' + 갈래.padEnd(6) + ' 자료 없다'); continue; }
      const 합 = Object.values(c.시각).reduce((a, b) => a + b, 0);
      const 나라위 = Object.entries(c.나라).sort((a, b) => b[1] - a[1]).slice(0, 3);
      const 한국몫 = 합 ? Math.round(((c.나라['South Korea'] || 0) / Object.values(c.나라).reduce((a, b) => a + b, 0)) * 1000) / 10 : null;
      console.log('     ' + 갈래.padEnd(6)
        + ' 세션 ' + String(합).padStart(5)
        + ' · 머문 ' + (c.머문 != null ? Math.round(c.머문) + '초' : '못 쟀음').padStart(6)
        + ' · 사람당 지면 ' + (c.깊이 != null ? c.깊이.toFixed(1) : '—').padStart(4)
        + ' · 낮(07~23) ' + String(낮몫(c.시각) ?? '—').padStart(5) + '%'
        + ' · 한 시각 쏠림 ' + String(한시각에몰렸나(c.시각) ?? '—').padStart(5) + '%'
        + ' · 한국 ' + String(한국몫 ?? '—').padStart(5) + '%');
      console.log('            나라 : ' + 나라위.map(([k, v]) => k + ' ' + v).join(' · '));
    }
    console.log('');
  }

  console.log('  ⬜ 읽는 법 — 머문 시간이 0초에 가깝고, 한 시각 쏠림이 크고,');
  console.log('     한국어 사이트인데 한국 몫이 낮으면 사람이 아닐 가능성이 크다.');
  console.log('  ⛔ 다만 이 넷으로도 «확정»은 못 한다. 가린 것은 가렸다고만 적는다.\n');
}

const 인자 = process.argv.slice(2);
if (인자.includes('--selftest')) process.exit(자가시험() ? 0 : 1);
await 돈다();
