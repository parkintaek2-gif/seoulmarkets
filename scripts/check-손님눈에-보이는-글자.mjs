#!/usr/bin/env node
/**
 * check-손님눈에-보이는-글자.mjs — **지면에 읽을거리가 있나를 손님 눈으로 잰다.**
 *
 * ── 🔴🔴 왜 만들었나 (2026-10-04 · 5번) ─────────────────────────────────
 * 사장님 — 「**케이라리프맵 방문자가 0명이라고? … 방문자를 빨리 만들고 늘려**」
 *
 * klifemap.ai 는 구글 검색에서 28일 노출 0 이었다. 구글이 주는 까닭은
 * 「크롤링됨 — 현재 색인이 생성되지 않음」까지뿐이라 더 캐물을 데가 없다.
 * 그래서 색인된 지면과 안 된 지면을 «같은 자»로 재서 견주었다 —
 *
 * ```
 * 100yearmap/100y/spending   5,007자   ✅ 색인됨
 * klifemap/saju.html         1,719자   🔴 안 됨
 * klifemap/tarot.html        1,121자   🔴 안 됨
 * klifemap/astro.html        1,267자   🔴 안 됨
 * ```
 * ⭐ 도구 지면은 **손님이 입력해야 결과가 나오는 앱**이라 읽을 글이 없다.
 *   구글은 그런 지면을 색인할 값이 낮다고 본다.
 *
 * 🔴 **curl 로 재면 안 된다.** saju.html 은 curl 로 38만 자가 나왔는데
 *   그것은 스크립트에 든 자료였다. 사람 눈에 보이는 것은 1,719자다.
 * 🔴 **로그인한 눈으로 재도 안 된다.** 공용 크롬은 사장님 계정이 로그인돼 있어
 *   tarot.html 이 「결제」 화면으로 보였다. 손님에게는 「무료 타로카드」로 열린다.
 *   ⇒ **쿠키 없는 새 맥락**으로 연다. 하마터면 거짓 흠을 보고할 뻔했다.
 *
 * ⛔ 이 자는 색인 여부를 «판정하지 않는다». 읽을거리가 얼마나 되는지만 잰다.
 *
 * 쓰는 법
 *   node scripts/check-손님눈에-보이는-글자.mjs <주소> [주소...]
 *   node scripts/check-손님눈에-보이는-글자.mjs --klifemap   (주요 지면 한 묶음)
 *   node scripts/check-손님눈에-보이는-글자.mjs --자가시험
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/** 색인된 우리 지면에서 재서 나온 선. ⛔ 지어낸 수가 아니다 */
export const 넉넉한선 = 4000;
export const 모자란선 = 2500;

/** 틀(메뉴·로그인·바닥글)이 차지하는 몫 — 이만큼은 어느 지면에나 있다 */
export const 틀글자 = 700;

/** 읽을거리가 얼마나 되나. ⛔ 틀을 빼고 본다 */
export function 읽을거리(보이는글자, 틀 = 틀글자) {
  /* ⛔ Number(null) 은 0 이다 — 「못 쟀다」가 「0자」로 둔갑하는 바로 그 자리다.
     오늘 아침 429 를 「자료 없음」으로 읽던 것과 같은 꼴이고, 이번엔 자가시험이 잡았다. */
  if (typeof 보이는글자 !== 'number' || !Number.isFinite(보이는글자) || 보이는글자 < 0) return null;
  return Math.max(0, 보이는글자 - Math.max(0, Number(틀) || 0));
}

/** 빛깔. ⛔ 「색인 되나」를 말하지 않는다 — 읽을거리가 얼마인가만 말한다 */
export function 빛(보이는글자) {
  const r = 읽을거리(보이는글자);
  if (r === null) return { 표: '⬜', 말: '못 쟀다' };
  if (보이는글자 >= 넉넉한선) return { 표: '✅', 말: `읽을거리 ${r}자 — 넉넉하다` };
  if (보이는글자 >= 모자란선) return { 표: '⚠', 말: `읽을거리 ${r}자 — 아슬하다` };
  return { 표: '🔴', 말: `읽을거리 ${r}자 — 모자라다(틀을 빼면 거의 없다)` };
}

/** 주요 지면 한 묶음 */
export const KLIFEMAP주요 = [
  'https://klifemap.ai/saju.html',
  'https://klifemap.ai/mingli-gunghap.html',
  'https://klifemap.ai/tarot.html',
  'https://klifemap.ai/astro.html',
  'https://klifemap.ai/horoscope.html',
  'https://klifemap.ai/mansecalendar.html',
  'https://klifemap.ai/ilzin.html',
];

/* ── 자가시험 ─────────────────────────────────────────────────────────── */
export function 자가시험() {
  const 결과 = [];
  const 본다 = (이름, 참) => 결과.push({ 이름, 참: !!참 });

  본다('틀을 빼고 센다', 읽을거리(1719) === 1019);
  본다('⛔ 틀보다 적으면 0 — 음수가 안 된다', 읽을거리(300) === 0);
  본다('⛔ 숫자가 아니면 null — ',
    읽을거리(null) === null && 읽을거리('가') === null);

  본다('🔴 색인된 지면 수준은 넉넉하다', 빛(5007).표 === '✅');
  본다('🔴 saju.html 수준은 모자라다', 빛(1719).표 === '🔴');
  본다('가운데는 아슬하다', 빛(3000).표 === '⚠');
  본다('⛔ 못 잰 것은 ⬜ — 0 이 아니다', 빛(null).표 === '⬜');
  본다('⛔ 「색인된다」고 말하지 않는다', !/색인/.test(빛(5007).말));

  본다('주요 지면 묶음이 있다', KLIFEMAP주요.length >= 7);
  본다('⛔ 주소가 다 https', KLIFEMAP주요.every((u) => u.startsWith('https://')));

  const 빨강 = 결과.filter((r) => !r.참).length;
  console.log('■ 손님 눈에 보이는 글자 — 자가시험');
  for (const r of 결과) console.log(`  ${r.참 ? '✅' : '🔴'} ${r.이름}`);
  console.log(빨강 ? `🔴 빨강 ${빨강}개` : `✅ ${결과.length}가지 다 통과`);
  return 빨강 === 0;
}

/* ── 혼자 돌 때 ───────────────────────────────────────────────────────── */
const 내가실행됐다 = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (내가실행됐다) {
  if (process.argv.includes('--selftest') || process.argv.includes('--자가시험')) {
    process.exit(자가시험() ? 0 : 1);
  }
  const 것들 = process.argv.includes('--klifemap')
    ? KLIFEMAP주요
    : process.argv.slice(2).filter((a) => a.startsWith('http'));
  if (!것들.length) {
    console.log('⛔ 쓰는 법: node scripts/check-손님눈에-보이는-글자.mjs <주소>... | --klifemap');
    process.exit(1);
  }

  const puppeteer = (await import('puppeteer-core')).default;
  const b = await puppeteer.connect({ browserURL: (process.env.KLM_CHROME_PORT ? 'http://127.0.0.1:' + process.env.KLM_CHROME_PORT : 'http://127.0.0.1:9222'), defaultViewport: null });
  let 맥락 = null;
  const 잰것 = [];
  try {
    /* 🔴 쿠키 없는 새 맥락 — 로그인한 눈으로 재면 손님이 보는 화면이 아니다 */
    맥락 = await b.createBrowserContext();
    const p = await 맥락.newPage();
    await p.setViewport({ width: 1280, height: 900 });
    for (const u of 것들) {
      try {
        await p.goto(u, { waitUntil: 'networkidle2', timeout: 60000 });
        await new Promise((r) => setTimeout(r, 2500));
        const x = await p.evaluate(() => ({
          글자: document.body.innerText.replace(/\s+/g, ' ').trim().length,
          제목: document.title,
        }));
        잰것.push({ 주소: u, ...x });
      } catch (e) {
        잰것.push({ 주소: u, 글자: null, 제목: null, 탈: String(e.message).slice(0, 60) });
      }
    }
  } finally {
    if (맥락) await 맥락.close();
    b.disconnect();
  }

  console.log('■ 손님 눈(로그인 안 함)에 보이는 글자');
  console.log(`   선 — 넉넉 ${넉넉한선}자 · 모자람 ${모자란선}자 미만 (틀 ${틀글자}자를 빼고 읽을거리를 센다)\n`);
  for (const r of 잰것) {
    const v = 빛(r.글자);
    console.log(`  ${v.표} ${r.주소.replace('https://', '')}`);
    console.log(`     보이는 글자 ${r.글자 ?? '못 쟀다'}자 · ${v.말}`);
    if (r.탈) console.log(`     ⬜ ${r.탈}`);
  }
  const 빨강 = 잰것.filter((r) => 빛(r.글자).표 === '🔴').length;
  console.log(`\n■ 읽을거리가 모자란 지면 ${빨강}개 / ${잰것.length}개`);
  if (빨강) {
    console.log('   ⭐ 도구 지면은 손님이 입력해야 결과가 나와 읽을 글이 없다.');
    console.log('      그 자리에 «우리가 잰 사실»을 붙이면 읽을거리가 생긴다.');
    console.log('   ⛔ 글자 수를 채우려고 아무 말이나 붙이지 않는다 — 그건 구글도 사람도 안 읽는다.');
  }
}
