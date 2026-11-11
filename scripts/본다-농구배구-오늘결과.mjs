#!/usr/bin/env node
/**
 * 본다-농구배구-오늘결과.mjs — **KBL·KOVO 공식 화면에서 그날 결과를 읽는다.**
 * ═══════════════════════════════════════════════════════════════════════════
 * 사장님 — 「기사에서만 확인하지마. 공식 사이트에서 확인하는 습관을 가져」
 *
 * ⛔ 크롬 9222 에 붙을 때 b.close() 금지 — 사장님 창이 닫힌다. disconnect() 만
 * ⛔ 언제나 새 탭. 연 탭은 «그 일이 끝나는 자리»에서 닫는다 (finally)
 *
 * 쓰는 법
 *   node scripts/본다-농구배구-오늘결과.mjs [YYYY-MM-DD]
 */
import puppeteer from 'puppeteer-core';

const 날 = process.argv[2] || new Date().toISOString().slice(0, 10);

const 볼곳 = [
  { 이름: 'KBL 일정·결과', 길: 'https://www.kbl.or.kr/game/schedule' },
  { 이름: 'KOVO 첫 화면', 길: 'https://www.kovo.co.kr/' },
  { 이름: 'KOVO 일정·결과', 길: 'https://www.kovo.co.kr/game/v-league/11110_schedule.asp' },
];

const b = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
for (const 곳 of 볼곳) {
  const page = await b.newPage();
  try {
    await page.goto(곳.길, { waitUntil: 'networkidle2', timeout: 60000 });
    await new Promise((r) => setTimeout(r, 3500));
    const 글 = await page.evaluate(() => document.body.innerText.replace(/\n{3,}/g, '\n\n').slice(0, 4000));
    console.log('\n━━━━━━ ' + 곳.이름 + ' ━━━━━━');
    console.log('주소 ' + page.url());
    console.log(글);
  } catch (e) {
    console.log('\n━━━━━━ ' + 곳.이름 + ' ━━━━━━');
    console.log('🔴 못 읽었다 — ' + String(e).slice(0, 200));
  } finally {
    await page.close();
  }
}
await b.disconnect();
console.log('\n■ 기준 날짜 ' + 날);
