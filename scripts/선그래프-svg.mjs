#!/usr/bin/env node
/**
 * 선그래프-svg.mjs — **시청률 추이를 선 그래프로 그린다.**
 * ────────────────────────────────────────────────────────────────────────────
 * [왜 만들었나 — 2026-11-10 사장님]
 *   > 「**시청률은 선 그래프로 만들어서 추이를 볼 수 있게 해**」
 *
 *   표는 숫자를 주지만 «오르는지 내리는지»를 주지 않는다. 손님이 보고 싶은 것은
 *   4.1·4.7·4.8 이 아니라 **「요즘 오르고 있나」**다.
 *
 * [왜 SVG 인가]
 *   ① 그림판을 안 띄워도 글자로 만들어진다 — 지면·PDF 어디에나 그대로 들어간다
 *   ② 인쇄해도 안 깨진다 — 점이 아니라 선이다
 *   ③ 바깥 그림 라이브러리를 안 부른다 — 네트워크가 죽어도 나온다
 *
 * [쓰는 법]
 *   import { 선그래프 } from './선그래프-svg.mjs';
 *   선그래프({ 점들: [{이름:'1회', 값:4.1}, …], 단위: '%' })   → SVG 글자
 *   node scripts/선그래프-svg.mjs --자체검사
 */

/** 글자를 SVG 에 넣기 전에 막는다 */
export const 막는다 = (s) => String(s ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/**
 * 눈금을 고른다. ⛔ 0 부터 그리지 않는다 — 4.1 과 4.8 의 차이가 안 보인다.
 * 그렇다고 바닥을 최솟값에 딱 붙이지도 않는다 — 바닥에 닿은 점은 「없다」처럼 보인다.
 */
export function 눈금정한다(값들) {
  const 쓸것 = (값들 ?? []).filter((v) => Number.isFinite(v));
  if (쓸것.length === 0) return null;
  const 가장작은 = Math.min(...쓸것);
  const 가장큰 = Math.max(...쓸것);
  if (가장큰 === 가장작은) return { 아래: 가장작은 - 1, 위: 가장큰 + 1 };
  const 품 = (가장큰 - 가장작은) * 0.25;
  return { 아래: 가장작은 - 품, 위: 가장큰 + 품 };
}

/** 0 으로 채우지 않는다 — 값이 없는 회차는 선을 끊는다 */
export function 토막낸다(점들) {
  const 토막 = [];
  let 지금 = [];
  (점들 ?? []).forEach((점, 자리) => {
    if (Number.isFinite(점?.값)) 지금.push({ ...점, 자리 });
    else if (지금.length) { 토막.push(지금); 지금 = []; }
  });
  if (지금.length) 토막.push(지금);
  return 토막;
}

export function 선그래프(설정 = {}) {
  const 점들 = 설정.점들 ?? [];
  const 단위 = 설정.단위 ?? '';
  const 너비 = 설정.너비 ?? 760;
  const 높이 = 설정.높이 ?? 300;
  const 왼 = 52; const 오른 = 18; const 위 = 22; const 아래 = 42;

  const 눈 = 눈금정한다(점들.map((p) => p?.값));
  if (!눈 || 점들.length < 2) return '';

  const 폭 = 너비 - 왼 - 오른;
  const 길 = 높이 - 위 - 아래;
  const x = (자리) => 왼 + (점들.length === 1 ? 폭 / 2 : (폭 * 자리) / (점들.length - 1));
  const y = (값) => 위 + 길 - ((값 - 눈.아래) / (눈.위 - 눈.아래)) * 길;

  const 조각 = [];
  조각.push(`<rect x="0" y="0" width="${너비}" height="${높이}" fill="#ffffff"/>`);

  /* 가로 눈금 다섯 줄 */
  for (let i = 0; i <= 4; i += 1) {
    const 값 = 눈.아래 + ((눈.위 - 눈.아래) * i) / 4;
    const yy = y(값).toFixed(1);
    조각.push(`<line x1="${왼}" y1="${yy}" x2="${너비 - 오른}" y2="${yy}" stroke="#e3e6ea" stroke-width="1"/>`);
    조각.push(`<text x="${왼 - 8}" y="${(Number(yy) + 4).toFixed(1)}" text-anchor="end" font-size="11" fill="#8a9099">${값.toFixed(1)}${막는다(단위)}</text>`);
  }

  /* 선 — 값이 없는 구간은 잇지 않는다 */
  for (const 토막 of 토막낸다(점들)) {
    if (토막.length === 1) continue;
    const 길자국 = 토막.map((p) => `${x(p.자리).toFixed(1)},${y(p.값).toFixed(1)}`).join(' ');
    조각.push(`<polyline points="${길자국}" fill="none" stroke="#1f3b73" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>`);
  }

  /* 점과 가장 높은 값 표시 */
  const 가장큰값 = Math.max(...점들.filter((p) => Number.isFinite(p?.값)).map((p) => p.값));
  점들.forEach((점, 자리) => {
    if (!Number.isFinite(점?.값)) return;
    const cx = x(자리).toFixed(1); const cy = y(점.값).toFixed(1);
    const 꼭대기 = 점.값 === 가장큰값;
    조각.push(`<circle cx="${cx}" cy="${cy}" r="${꼭대기 ? 4.5 : 3}" fill="${꼭대기 ? '#c0392b' : '#1f3b73'}"/>`);
    if (꼭대기 || 자리 === 0 || 자리 === 점들.length - 1) {
      조각.push(`<text x="${cx}" y="${(Number(cy) - 10).toFixed(1)}" text-anchor="middle" font-size="12" font-weight="700" fill="${꼭대기 ? '#c0392b' : '#1f3b73'}">${점.값}${막는다(단위)}</text>`);
    }
  });

  /* 가로 눈금 이름 — 촘촘하면 건너뛴다 */
  const 건너 = Math.max(1, Math.ceil(점들.length / 12));
  점들.forEach((점, 자리) => {
    if (자리 % 건너 !== 0 && 자리 !== 점들.length - 1) return;
    조각.push(`<text x="${x(자리).toFixed(1)}" y="${높이 - 20}" text-anchor="middle" font-size="11" fill="#55606c">${막는다(점.이름 ?? '')}</text>`);
  });

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${너비} ${높이}" width="${너비}" height="${높이}" font-family="Malgun Gothic, sans-serif">${조각.join('')}</svg>`;
}

/* ───────────────────────── 자체검사 ───────────────────────── */
if (process.argv.includes('--자체검사') || process.argv.includes('--selftest')) {
  let 센다 = 0; let 깨짐 = 0;
  const 본다 = (말, 참인가) => {
    센다 += 1;
    if (!참인가) { 깨짐 += 1; console.log('  ⛔ ' + 말); } else console.log('  ✔ ' + 말);
  };

  본다('값이 없으면 눈금이 없다', 눈금정한다([]) === null);
  본다('🔴 0 부터 그리지 않는다 — 4.1~4.8 이 평평해 보이면 안 된다',
    눈금정한다([4.1, 4.8]).아래 > 3);
  본다('바닥에 딱 붙이지 않는다', 눈금정한다([4.1, 4.8]).아래 < 4.1);
  본다('꼭대기에 딱 붙이지 않는다', 눈금정한다([4.1, 4.8]).위 > 4.8);
  본다('값이 하나뿐이면 위아래로 벌린다', 눈금정한다([3]).위 - 눈금정한다([3]).아래 === 2);
  본다('못 잰 값은 셈에서 뺀다', 눈금정한다([4, null, 5]).위 > 5);

  본다('🔴 빠진 회차를 0 으로 채우지 않는다 — 선이 바닥으로 떨어지면 거짓말이다',
    토막낸다([{ 값: 4 }, { 값: null }, { 값: 5 }]).length === 2);
  본다('이어진 것은 한 토막이다', 토막낸다([{ 값: 4 }, { 값: 5 }]).length === 1);
  본다('자리를 기억한다', 토막낸다([{ 값: 4 }, { 값: null }, { 값: 5 }])[1][0].자리 === 2);
  본다('값이 하나도 없으면 토막도 없다', 토막낸다([{ 값: null }]).length === 0);

  const 그림 = 선그래프({ 점들: [{ 이름: '1회', 값: 4.1 }, { 이름: '2회', 값: 5.1 }, { 이름: '3회', 값: 4.7 }], 단위: '%' });
  본다('SVG 가 나온다', 그림.startsWith('<svg') && 그림.endsWith('</svg>'));
  본다('선이 들어 있다', 그림.includes('<polyline'));
  본다('가장 높은 값을 붉게 표시한다', 그림.includes('#c0392b'));
  본다('첫 점 이름이 들어 있다', 그림.includes('1회'));
  본다('점이 두 개 미만이면 그리지 않는다', 선그래프({ 점들: [{ 이름: 'ㄱ', 값: 1 }] }) === '');
  본다('글자를 막는다', 막는다('<b>&"') === '&lt;b&gt;&amp;&quot;');

  console.log(`\n${깨짐 === 0 ? '✅' : '🔴'} 선그래프-svg — ${센다 - 깨짐}/${센다}`);
  process.exitCode = 깨짐 === 0 ? 0 : 1;
}
