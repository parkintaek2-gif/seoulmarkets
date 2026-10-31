#!/usr/bin/env node
/**
 * 색인-생성-요청한다.mjs — **서치콘솔 화면에서 「색인 생성 요청」을 누른다.**
 *
 * ── 🔴 왜 손으로 누르나 ──────────────────────────────────────────────
 *   사이트맵 제출·IndexNow 는 API 로 되지만 **「색인 생성 요청」은 API 가 없다.**
 *   서치콘솔 화면에서만 누를 수 있다.
 *
 *   2026-10-05 에 이것이 필요했다 — 사장님이 「지금 준 키워드를 장악해라」 하셔서
 *   `/ilzin.html` 제목을 「일진 달력」에서 「오늘의 운세」로 고쳤는데, 구글은
 *   **2026-09-06 에 와 보고 그 뒤로 한 달째 안 왔다.** `/horoscope.html` 은
 *   아예 **한 번도 안 왔다**. 사이트맵에도 있고 IndexNow 도 보냈는데 그렇다.
 *   ⇒ 고친 것을 보여 주려면 직접 요청해야 한다.
 *
 * ── ⛔ 이 자를 만들며 두 번 틀렸다 ────────────────────────────────────
 *   ① 검사 결과 주소를 **지어내서** 넣었다 → 404.
 *      사장님이 「100번 넘게 말했다」고 하신 그 잘못이다.
 *      ⇒ **화면의 검사칸에 넣어서** 간다.
 *   ② 자가 「눌렀다」고 했는데 **안 눌렸다.** 「색인 생성 요청」 글자가 든 `span` 이
 *      여섯이고 진짜 단추는 `div[role=button]` 하나뿐인데, 글자만 보고 첫 `span` 을
 *      눌렀다. 그림으로 떠서 눈으로 보고 알았다.
 *      ⇒ **`div[role=button]` 만** 누르고, 누른 뒤 **화면 글이 바뀌었는지** 본다.
 *   ⭐ 「검사가 통과해도 한 번은 실물을 본다」가 두 번 다 맞았다.
 *
 * ⚠ 구글은 하루 요청 수에 한도가 있다. **급한 지면만** 넣는다.
 * ⛔ 되풀이해 두드리지 않는다. 지면마다 한 번이다.
 * ⛔ 크롬 9222 — b.close() 금지(사장님 창이 닫힌다). disconnect() 만.
 *   언제나 새 탭, 내가 연 탭만 닫는다.
 *
 * 쓰는 법
 *   node scripts/색인-생성-요청한다.mjs https://klifemap.ai/ilzin.html
 *   node scripts/색인-생성-요청한다.mjs https://seoulmarkets.com/ --사이트 seoulmarkets.com
 */

import { createRequire } from 'node:module';

const 넣을것 = process.argv.slice(2).filter((x) => x.startsWith('https://'));
if (!넣을것.length) {
  console.log('⛔ 넣을 주소를 주지 않았다 — node scripts/색인-생성-요청한다.mjs https://…');
  process.exit(1);
}

/** ⛔ 사이트를 못박지 않는다 — 네 사이트 다 쓴다. 안 주면 주소에서 읽는다 */
const 사이트 = (() => {
  const i = process.argv.indexOf('--사이트');
  if (i >= 0 && process.argv[i + 1]) return process.argv[i + 1];
  try { return new URL(넣을것[0]).hostname.replace(/^www\./, ''); } catch { return 'klifemap.ai'; }
})();

const puppeteer = createRequire(import.meta.url)('puppeteer-core');
let b = null;
try {
  b = await puppeteer.connect({ browserURL: (process.env.KLM_CHROME_PORT ? 'http://127.0.0.1:' + process.env.KLM_CHROME_PORT : 'http://127.0.0.1:9223'), defaultViewport: null });
} catch (e) {
  console.log('⚠ 크롬(9222)에 못 붙었다 — ' + String(e.message).slice(0, 60));
  process.exit(0);                        /* ⛔ 못 한 것으로 막지 않는다 */
}

const 탭 = [];
let 된것 = 0; let 안된것 = 0;
try {
  const p = await b.newPage();
  탭.push(p);
  await p.setViewport({ width: 1400, height: 1000 });
  await p.goto('https://search.google.com/search-console?resource_id=' + encodeURIComponent('sc-domain:' + 사이트),
    { waitUntil: 'domcontentloaded', timeout: 35000 });
  await new Promise((r) => setTimeout(r, 6000));

  const 머리 = await p.evaluate(() => document.body.innerText.replace(/\s+/g, ' ').slice(0, 120));
  if (/로그인|Sign in/i.test(머리)) {
    console.log('🔴 서치콘솔에 로그인돼 있지 않다 — 못 한다');
    process.exit(0);
  }
  console.log(`■ 서치콘솔 — sc-domain:${사이트}\n`);

  for (const u of 넣을것) {
    console.log(`■ ${u}`);
    /* ① 화면 위 검사칸에 넣는다 — ⛔ 주소를 지어내지 않는다 */
    const 칸찾음 = await p.evaluate(() => {
      const 칸 = [...document.querySelectorAll('input, [role="combobox"], [contenteditable="true"]')]
        .find((e) => /URL 검사|Inspect any URL|검사/i.test((e.getAttribute('aria-label') || e.placeholder || '')) && e.offsetParent !== null);
      if (!칸) return false;
      칸.focus(); 칸.click();
      return true;
    });
    if (!칸찾음) { console.log('   🔴 검사칸을 못 찾았다'); 안된것++; continue; }

    await p.keyboard.down('Control'); await p.keyboard.press('KeyA'); await p.keyboard.up('Control');
    await p.keyboard.type(u, { delay: 12 });
    await p.keyboard.press('Enter');
    await new Promise((r) => setTimeout(r, 16000));

    const 전 = await p.evaluate(() => document.body.innerText.replace(/\s+/g, ' '));
    const 이미색인 = /URL이 Google에 등록됨|URL is on Google/i.test(전);
    console.log(`   검사 결과 — ${이미색인 ? '✅ 이미 색인돼 있다' : '🔴 색인 안 됨'}`);

    /* ② 진짜 단추만 누른다 — ⛔ span 을 누르면 아무 일도 안 난다 */
    const 눌렀나 = await p.evaluate(() => {
      const 단추 = [...document.querySelectorAll('div[role="button"], button')]
        .find((e) => /^색인 생성 요청$|^REQUEST INDEXING$/i.test((e.innerText || '').trim()) && e.offsetParent !== null);
      if (!단추) return false;
      단추.click();
      return true;
    });
    if (!눌렀나) { console.log('   🔴 「색인 생성 요청」 단추를 못 찾았다'); 안된것++; continue; }

    /* ③ 진짜 눌렸나 — ⛔ 「눌렀다」를 「됐다」로 세지 않는다 */
    let 됐나 = false;
    for (let i = 0; i < 24; i++) {
      await new Promise((r) => setTimeout(r, 5000));
      const 뒤 = await p.evaluate(() => document.body.innerText.replace(/\s+/g, ' '));
      if (/색인 생성이 요청됨|Indexing requested|색인 생성 요청됨|대기열에 추가/i.test(뒤)) { 됐나 = true; break; }
    }
    console.log(`   ${됐나 ? '✅ 색인 생성이 요청됐다' : '⚠ 바뀐 글을 못 봤다 — 한도에 걸렸을 수 있다'}`);
    됐나 ? 된것++ : 안된것++;
  }
} finally {
  for (const p of 탭) { try { await p.close(); } catch { /* 내가 연 것만 */ } }
  await b.disconnect();                   /* ⛔ close() 가 아니다 */
}

console.log(`\n${안된것 ? '⚠' : '✅'} 요청됨 ${된것} · 안 된 것 ${안된것}`);
console.log('⛔ 「요청했다」를 「색인됐다」로 세지 않는다 — 구글이 넣기까지 며칠 걸린다.');
