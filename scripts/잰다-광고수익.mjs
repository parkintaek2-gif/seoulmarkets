#!/usr/bin/env node
/**
 * 잰다-광고수익.mjs — **애드센스 오늘·어제 예상 수입을 읽는다.**
 *
 * ── 왜 만드나 (2026-11-19 23:30 · 5번) ───────────────────────────
 * 사장님 — 「**이게 보고야. 할 일 하고 보고해**」
 * 실적 보고의 「매출(B2C)」 칸에 「못 잼 — 광고 수익 화면을 오늘 열어 보지 않았다」라고
 * 적어 올렸다. 그것은 못 잰 것이 아니라 **안 한 것**이다. 그래서 읽는 자를 만든다.
 *
 * ⛔ 크롬 9222 에 붙을 때 b.close() 금지 — disconnect() 만. 언제나 새 탭, 연 탭은 닫는다
 * ⛔ 애드센스 계정이 둘이다. 게시자 번호를 함께 적는다 —
 *   지금 쓰는 것은 admin 계정(pub-3547185342873229), 옛 개인 계정은 pub-5113515144381167
 * ⛔ 못 읽으면 0 이라 적지 않는다. 「못 쟀다」와 그 이유를 적는다
 *
 * 쓰는 법
 *   node scripts/잰다-광고수익.mjs
 *   node scripts/잰다-광고수익.mjs --자가시험
 */
import { createRequire } from 'node:module';
import path from 'node:path';
import url from 'node:url';

const require = createRequire('file:///C:/Users/User/Documents/GitHub/dataeconomics/package.json');

export const 애드센스홈 = 'https://www.google.com/adsense/new/u/0/pub-3547185342873229/home';
export const 지금쓰는계정 = 'pub-3547185342873229';
export const 옛계정 = 'pub-5113515144381167';

/** 화면 글에서 「₩1,234」·「$1.23」 꼴 돈을 고른다. ⛔ 못 고르면 null 이다 */
export function 돈고르기(글) {
  const s = String(글 ?? '');
  const m = /(?:₩|원|\$|US\$)\s?([0-9][0-9,]*(?:\.[0-9]+)?)|([0-9][0-9,]*(?:\.[0-9]+)?)\s?(?:₩|원)/.exec(s);
  if (!m) return null;
  const 수 = Number(String(m[1] ?? m[2]).replace(/,/g, ''));
  return Number.isFinite(수) ? 수 : null;
}

/** 「오늘까지 예상 수입」 같은 이름표 옆의 돈을 찾는다 */
export function 이름표옆돈(줄들, 이름표들) {
  for (let i = 0; i < 줄들.length; i += 1) {
    const 줄 = String(줄들[i] ?? '');
    if (!이름표들.some((n) => 줄.includes(n))) continue;
    for (let j = i; j < Math.min(i + 4, 줄들.length); j += 1) {
      const 돈 = 돈고르기(줄들[j]);
      if (돈 !== null) return { 값: 돈, 어디: 줄.slice(0, 40) };
    }
  }
  return null;
}

async function 잰다() {
  const puppeteer = require('puppeteer-core');
  let b = null; let p = null;
  try {
    b = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null, protocolTimeout: 180000 });
  } catch (e) {
    console.log('⬜ 크롬에 못 붙었습니다 — ' + String(e.message).slice(0, 70));
    console.log('   «못 쟀다»입니다. 0 으로 적지 않습니다');
    return 1;
  }
  try {
    p = await b.newPage();
    await p.setViewport({ width: 1400, height: 1000 });
    await p.goto(애드센스홈, { waitUntil: 'networkidle2', timeout: 120000 });
    /* 애드센스 홈은 숫자 카드를 나중에 그린다. 글자가 멈출 때까지 기다린다 */
    let 앞길이 = -1;
    for (let i = 0; i < 12; i += 1) {
      await new Promise((r) => setTimeout(r, 2500));
      const 길이 = await p.evaluate(() => document.body.innerText.length);
      if (길이 === 앞길이 && 길이 > 400) break;
      앞길이 = 길이;
    }

    const 주소 = p.url();
    if (/accounts\.google\.com|signin/.test(주소)) {
      console.log('⬜ 애드센스가 로그인 화면을 줍니다 — «못 쟀다»입니다');
      console.log('   주소 — ' + 주소.slice(0, 80));
      return 1;
    }
    const 글 = await p.evaluate(() => document.body.innerText);
    const 줄들 = String(글).split(/\n+/).map((x) => x.trim()).filter(Boolean);

    const 오늘 = 이름표옆돈(줄들, ['오늘', 'Today', '오늘까지']);
    const 어제 = 이름표옆돈(줄들, ['어제', 'Yesterday']);
    const 이번달 = 이름표옆돈(줄들, ['이번 달', 'This month', '당월']);

    console.log('■ 애드센스 예상 수입 — ' + 지금쓰는계정);
    console.log('   오늘   ' + (오늘 ? 오늘.값.toLocaleString() + '원' : '⚠ 화면에서 못 찾았습니다'));
    console.log('   어제   ' + (어제 ? 어제.값.toLocaleString() + '원' : '⚠ 화면에서 못 찾았습니다'));
    console.log('   이번 달 ' + (이번달 ? 이번달.값.toLocaleString() + '원' : '⚠ 화면에서 못 찾았습니다'));
    if (!오늘 && !어제 && !이번달) {
      console.log('   ⬜ 화면에서 수입 칸을 하나도 못 찾았습니다 — 화면 모양이 바뀌었을 수 있습니다');
      /* 글로만 보지 말고 그림을 남긴다 — 다음 사람이 눈으로 보고 고친다 */
      const 그림 = (process.env.TEMP || 'C:/Users/User/AppData/Local/Temp') + '/애드센스홈.png';
      try { await p.screenshot({ path: 그림, fullPage: false }); console.log('   그림 — ' + 그림); }
      catch (e) { /* 그림을 못 찍어도 글은 남긴다 */ }
      const 돈든줄 = 줄들.filter((x) => 돈고르기(x) !== null).slice(0, 10);
      console.log('   돈이 든 줄 — ' + (돈든줄.length ? 돈든줄.join(' / ') : '한 줄도 없습니다'));
      console.log('   화면 줄 수 — ' + 줄들.length);
      return 1;
    }
    return 0;
  } catch (e) {
    console.log('⬜ 읽다가 막혔습니다 — ' + String(e.message).slice(0, 80) + '. «못 쟀다»입니다');
    return 1;
  } finally {
    if (p) { try { await p.close(); } catch (e) { /* 이미 닫혔으면 둔다 */ } }
    if (b) await b.disconnect();                     /* ⛔ close() 금지 */
  }
}

// ── 자가시험 ───────────────────────────────────────────────
function 자가시험() {
  let 통과 = 0; let 깨짐 = 0;
  const T = (이름, 참) => { if (참) { 통과 += 1; } else { 깨짐 += 1; console.log('🔴 ' + 이름); } };

  T('원화를 읽습니다', 돈고르기('₩1,234') === 1234);
  T('뒤에 붙은 원도 읽습니다', 돈고르기('1,234원') === 1234);
  T('달러도 읽습니다', 돈고르기('$1.23') === 1.23);
  T('돈이 없으면 null 입니다', 돈고르기('예상 수입') === null);
  T('빈 글은 null 입니다', 돈고르기('') === null && 돈고르기(null) === null);
  T('0 원도 0 으로 읽습니다 — null 이 아닙니다', 돈고르기('₩0') === 0);

  const 줄들 = ['예상 수입', '오늘', '₩0', '어제', '₩1,200', '이번 달', '₩3,400'];
  T('이름표 옆의 돈을 찾습니다', 이름표옆돈(줄들, ['오늘'])?.값 === 0);
  T('어제 칸을 찾습니다', 이름표옆돈(줄들, ['어제'])?.값 === 1200);
  T('이번 달 칸을 찾습니다', 이름표옆돈(줄들, ['이번 달'])?.값 === 3400);
  T('없는 이름표는 null 입니다', 이름표옆돈(줄들, ['작년']) === null);
  T('이름표가 있어도 네 줄 안에 돈이 없으면 null 입니다',
    이름표옆돈(['오늘', '가', '나', '다', '라', '₩5'], ['오늘']) === null);
  T('쓰는 계정과 옛 계정이 다릅니다', 지금쓰는계정 !== 옛계정);

  console.log(`\n■ 자가시험 ${통과}가지 통과 · ${깨짐}가지 깨짐`);
  return 깨짐 === 0;
}

const 나 = url.fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(나)) {
  if (process.argv.includes('--자가시험')) process.exit(자가시험() ? 0 : 1);
  process.exit(await 잰다());
}
