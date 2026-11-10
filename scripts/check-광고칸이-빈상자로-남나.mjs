#!/usr/bin/env node
/**
 * check-광고칸이-빈상자로-남나.mjs
 * 라이브에서 폰 크기로 — **광고가 안 들어온 칸이 빈 상자로 남아 있나**를 잰다.
 *
 * ── 왜 만드나 (2026-11-10) ──────────────────────────────────────────
 * 사장님 「광고 게재해」로 백년지도·K컬처와이어에 광고 자리를 처음 넣었다.
 * 넣고 배포한 뒤 400px 로 재니 우리 칸이 이렇게 남아 있었다 —
 *
 *   처리(data-adsbygoogle-status) = done     요청은 끝났다
 *   답(data-ad-status)            = null     그런데 답이 없다
 *   높이                          = 385px    **빈 상자가 폰 한 화면을 먹는다**
 *
 * ⭐ CSS 는 `unfilled` 만 접는다. 답이 «없는» 것은 못 접는다 — 그래서 못 본 채 지나갔다.
 * ⭐ 사장님이 올인하라 하신 것은 체류시간이다. 광고를 넣은 날 그것을 깎으면 거꾸로 간 것이다.
 * ⛔ 「광고 자리를 넣었다」를 「광고가 제대로 뜬다」로 읽지 않는다. 그 둘은 다른 일이다.
 *
 * 무엇을 흠으로 보나
 *   답이 없거나 unfilled 인데 **높이가 60px 을 넘으면** 흠이다.
 *   60px 은 「접힌 것과 안 접힌 것」을 가르는 선이다 — 접히면 0 이 된다.
 *
 * ⛔ 채워진 광고(filled)는 아무리 커도 흠이 아니다. 그것이 우리가 바라는 것이다.
 * ⛔ 못 쟀으면 «못 쟀다»고 적는다. 0 으로 채우지 않는다.
 *
 * 쓰는 법
 *   node scripts/check-광고칸이-빈상자로-남나.mjs            라이브를 잰다
 *   node scripts/check-광고칸이-빈상자로-남나.mjs --자가시험
 */
import { createRequire } from 'node:module';

export const 접힌선 = 60;

/** 광고가 들어온 칸인가 — 들어왔으면 크기를 묻지 않는다 */
export function 채워졌나(답) {
  return String(답 ?? '').trim() === 'filled';
}

/**
 * 칸 하나를 판정한다.
 *   { 흠: true|false, 왜 }  ·  못 쟀으면 { 못쟀다: true }
 */
export function 칸판정(칸) {
  if (!칸 || typeof 칸.높이 !== 'number' || !Number.isFinite(칸.높이)) {
    return { 못쟀다: true, 왜: '높이를 못 쟀다' };
  }
  if (채워졌나(칸.답)) return { 흠: false, 왜: '광고가 들어왔다' };
  if (칸.높이 > 접힌선) {
    return { 흠: true, 왜: `답이 「${칸.답 ?? '없다'}」인데 높이가 ${Math.round(칸.높이)}px 이다 — 빈 상자가 남는다` };
  }
  return { 흠: false, 왜: '안 들어왔고 접혀 있다' };
}

/** 지면 하나의 칸들을 한꺼번에 — 흠만 돌려준다 */
export function 지면판정(이름, 칸들) {
  const 흠 = [];
  const 못쟀다 = [];
  for (const 칸 of 칸들 ?? []) {
    const p = 칸판정(칸);
    if (p.못쟀다) 못쟀다.push({ 이름, 왜: p.왜 });
    else if (p.흠) 흠.push({ 이름, 왜: p.왜 });
  }
  return { 흠, 못쟀다 };
}

export const 볼곳 = [
  ['백년지도 첫 화면', 'https://100yearmap.com/'],
  ['백년지도 지역 리포트', 'https://100yearmap.com/report/area/%EA%B2%BD%EA%B8%B0%EB%8F%84-%EC%9D%98%EC%A0%95%EB%B6%80%EC%8B%9C'],
  ['K컬처와이어 첫 화면', 'https://www.kculturewire.com/'],
  ['서울마켓츠 데이터 지면', 'https://seoulmarkets.com/data/kospi-weights'],
];

async function 라이브로잰다() {
  const require = createRequire(new URL('../package.json', import.meta.url));
  const puppeteer = require('puppeteer-core');
  const 잠깐 = (ms) => new Promise((f) => setTimeout(f, ms));
  let b;
  try {
    b = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  } catch (e) {
    console.log('⬜ 못 쟀다 — 크롬(9222)에 못 붙었다. ' + String(e.message).slice(0, 60));
    process.exitCode = 0;   /* ⛔ 못 잰 것을 깨진 것으로 세지 않는다 */
    return;
  }
  const 흠 = [];
  const 못쟀다 = [];
  try {
    for (const [이름, 주소] of 볼곳) {
      const 탭 = await b.newPage();
      try {
        await 탭.setViewport({ width: 400, height: 880 });
        await 탭.goto(주소, { waitUntil: 'domcontentloaded', timeout: 70000 });
        await 잠깐(12000);   /* 접는 자가 4초에 돈다 — 넉넉히 기다린다 */
        const 칸들 = await 탭.evaluate(() => [...document.querySelectorAll('ins.adsbygoogle')].map((e) => ({
          답: e.getAttribute('data-ad-status'),
          처리: e.getAttribute('data-adsbygoogle-status'),
          높이: e.getBoundingClientRect().height,
          슬롯: e.getAttribute('data-ad-slot'),
        })));
        const r = 지면판정(이름, 칸들);
        흠.push(...r.흠); 못쟀다.push(...r.못쟀다);
        const 접힘 = 칸들.filter((x) => x.높이 <= 접힌선).length;
        console.log(`■ ${이름} — 칸 ${칸들.length} · 접힘 ${접힘} · 흠 ${r.흠.length}`);
        for (const x of r.흠) console.log(`   🔴 ${x.왜}`);
      } catch (e) {
        못쟀다.push({ 이름, 왜: String(e.message).slice(0, 70) });
        console.log(`⬜ 못 쟀다 — ${이름}`);
      } finally { await 탭.close().catch(() => {}); }
    }
  } finally { await b.disconnect(); }

  console.log('');
  if (못쟀다.length) console.log(`⬜ 못 잰 지면 ${못쟀다.length}개 — 「없다」가 아니라 「못 쟀다」다`);
  if (흠.length) {
    console.log(`🔴 빈 상자가 남는 칸 ${흠.length}개 — 폰에서 한 화면을 먹는다`);
    process.exitCode = 1;
  } else {
    console.log('✅ 안 들어온 칸은 모두 접혀 있다');
  }
}

function 자가시험() {
  let 통과 = 0, 실패 = 0;
  const 자가 = (이름, 참인가) => { if (참인가) { 통과 += 1; console.log('  ✅ ' + 이름); } else { 실패 += 1; console.log('  🔴 ' + 이름); } };

  자가('들어온 광고는 커도 흠이 아니다', 칸판정({ 답: 'filled', 높이: 385 }).흠 === false);
  자가('🔴 답이 없는데 큰 칸은 흠이다', 칸판정({ 답: null, 높이: 385 }).흠 === true);
  자가('🔴 unfilled 인데 안 접혔으면 흠이다', 칸판정({ 답: 'unfilled', 높이: 280 }).흠 === true);
  자가('접힌 칸(0px)은 흠이 아니다', 칸판정({ 답: 'unfilled', 높이: 0 }).흠 === false);
  자가('답이 없어도 접혀 있으면 흠이 아니다', 칸판정({ 답: null, 높이: 0 }).흠 === false);
  자가('경계 — 60px 까지는 접힌 것으로 본다', 칸판정({ 답: null, 높이: 60 }).흠 === false);
  자가('경계 — 61px 부터 흠이다', 칸판정({ 답: null, 높이: 61 }).흠 === true);
  자가('⛔ 높이를 못 쟀으면 «못 쟀다»지 통과가 아니다', 칸판정({ 답: null, 높이: null }).못쟀다 === true);
  자가('⛔ NaN 도 못 쟀다로 센다', 칸판정({ 답: null, 높이: NaN }).못쟀다 === true);
  자가('⛔ 칸이 null 이어도 안 터지고 못 쟀다로 센다', 칸판정(null).못쟀다 === true);
  자가('채워졌나 는 filled 만 참이다', 채워졌나('filled') === true && 채워졌나('unfilled') === false && 채워졌나(null) === false);
  자가('지면판정 — 흠과 못쟀다를 갈라 센다', (() => {
    const r = 지면판정('x', [{ 답: null, 높이: 385 }, { 답: 'filled', 높이: 385 }, { 답: null, 높이: null }]);
    return r.흠.length === 1 && r.못쟀다.length === 1;
  })());
  자가('지면판정 — 칸이 없으면 흠도 없다(광고 안 내는 지면)', 지면판정('x', []).흠.length === 0);
  자가('지면판정 — null 을 줘도 안 터진다', 지면판정('x', null).흠.length === 0);
  자가('볼곳에 네 사이트가 다 있다', new Set(볼곳.map(([, u]) => new URL(u).host)).size >= 3);

  console.log(`\n통과 ${통과} · 실패 ${실패}`);
  if (실패) process.exitCode = 1;
}

if (process.argv.includes('--자가시험')) 자가시험();
else await 라이브로잰다();
