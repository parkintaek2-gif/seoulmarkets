#!/usr/bin/env node
/**
 * 잰다-네이버자리가-비었나.mjs — 어떤 말로 검색했을 때 그 자리에 누가 있나.
 *
 * ── 🔴 왜 (2026-11-18 · 5번) ────────────────────────────────
 * 같은 지면을 두 가지 말로 네이버에 물어 재었더니 이렇게 나왔다 —
 *
 *     의정부시 고등학교            🔴 우리 0개 · 블로그 62 · 카페 19
 *     의정부시 고등학교 «진학률»    ⭐ 우리 6개 · 블로그 48 · 카페 36
 *     부평구 고등학교              🔴 우리 0개 · 블로그 90 · 카페 24
 *     부평구 고등학교 «진학률»      ⭐ 우리 6개 · 블로그 77 · 카페 40
 *
 * **블로그가 적어서 우리가 든 것이 아니다.** 든 자리가 오히려 블로그가 더 많았다.
 * 제목·본문에 「진학률」이라는 말이 있어서 들었다.
 * ⇒ 새 묶음을 내거나 제목을 고치기 전에 **그 말로 자리가 비었나를 먼저 잰다.**
 *
 * ── ⛔ 이 자가 지키는 것 ──────────────────────────────────
 * ⛔ 주소를 그대로 치지 않는다 — 네이버가 검색어 자체를 링크로 내줘 «거짓 통과»가 난다.
 *   2026-11-18 에 아직 배포도 안 된 지면이 「쥐고 있다」로 나와서 잡았다.
 * ⛔ 검색어 메아리 링크(`search.naver` · `query=`)를 셈에서 뺀다.
 * ⭐ **대조군을 함께 넣는다** — 세상에 없는 말을 하나 넣어 그것이 ✅ 로 나오면 측정기가 거짓이다.
 * ⛔ b.close() 금지(사장님 창이 닫힌다) · 연 탭은 그 자리에서 닫는다.
 *
 * 쓰는 법
 *   node scripts/잰다-네이버자리가-비었나.mjs --말 "성북구 중학교" "성북구 중학교 학급당 학생수"
 *   node scripts/잰다-네이버자리가-비었나.mjs --말파일 scratchpad/볼말.txt
 *   node scripts/잰다-네이버자리가-비었나.mjs --selftest
 */
import fs from 'node:fs';
import { createRequire } from 'node:module';

/** 검색 결과 링크 하나가 어느 갈래인가. ⛔ 모르는 것은 null — 억지로 가르지 않는다 */
export function 링크갈래(주소, 우리호스트 = /100yearmap|klifemap|seoulmarkets|kculturewire/) {
  const u = String(주소 ?? '');
  if (!u) return null;
  /* 🔴 검색어 메아리를 세면 아무 말이나 「우리가 있다」로 나온다 */
  if (/search\.naver|[?&]query=/.test(u)) return null;
  if (우리호스트.test(u)) return '우리';
  if (/blog\.naver|post\.naver|blog\.me/.test(u)) return '블로그';
  if (/cafe\.naver/.test(u)) return '카페';
  if (/kin\.naver/.test(u)) return '지식인';
  return null;
}

/** 센 것을 한 줄로. ⛔ 우리가 0 이면 「없다」라고 또렷이 적는다 */
export function 한줄(말, 센다, 대조군 = false) {
  const 우리 = 센다['우리'] || 0;
  const 표 = 대조군
    ? (우리 ? '🔴 거짓! 없는 말을 쥐었다고 한다' : '✅ 대조군 통과 — 안 나온다')
    : (우리 ? '⭐우리 ' + String(우리).padStart(2) : '🔴 없다  ');
  return '  ' + String(말).padEnd(30) + 표.padEnd(13)
    + '블로그 ' + String(센다['블로그'] || 0).padStart(3)
    + ' · 카페 ' + String(센다['카페'] || 0).padStart(3)
    + ' · 지식인 ' + String(센다['지식인'] || 0).padStart(3);
}

function 자가시험() {
  const 봄 = []; const 본다 = (이름, 참) => 봄.push({ 이름, 참 });
  본다('① 우리 사이트를 가른다', 링크갈래('https://100yearmap.com/report/area/x') === '우리');
  본다('② 네 사이트를 다 안다',
    링크갈래('https://klifemap.ai/a') === '우리'
    && 링크갈래('https://seoulmarkets.com/a') === '우리'
    && 링크갈래('https://www.kculturewire.com/a') === '우리');
  본다('③ 블로그를 가른다', 링크갈래('https://blog.naver.com/abc') === '블로그');
  본다('④ 카페를 가른다', 링크갈래('https://cafe.naver.com/abc') === '카페');
  본다('⑤ 지식인을 가른다', 링크갈래('https://kin.naver.com/abc') === '지식인');
  /* 🔴 거짓 통과의 뿌리 — 네이버가 검색어 자체를 링크로 내준다 */
  본다('⑥ 검색어 메아리는 안 센다',
    링크갈래('https://search.naver.com/search.naver?query=100yearmap.com') === null);
  본다('⑦ query= 가 붙은 우리 주소도 안 센다',
    링크갈래('https://m.search.naver.com/x?query=https://100yearmap.com') === null);
  본다('⑧ 모르는 곳은 null', 링크갈래('https://example.com') === null);
  본다('⑨ 빈 값도 null', 링크갈래('') === null && 링크갈래(null) === null);
  본다('⑩ 우리가 없으면 「없다」로 적는다', 한줄('가', { 블로그: 5 }).includes('🔴 없다'));
  본다('⑪ 대조군이 걸리면 거짓이라 적는다', 한줄('가', { 우리: 2 }, true).includes('🔴 거짓'));
  본다('⑫ 대조군이 비면 통과라 적는다', 한줄('가', {}, true).includes('✅ 대조군 통과'));
  let 깨짐 = 0;
  for (const s of 봄) if (!s.참) { console.log('🔴 ' + s.이름); 깨짐 += 1; }
  console.log(깨짐 ? '🔴 ' + 깨짐 + '가지 깨졌다' : '✅ ' + 봄.length + '가지 다 통과');
  return 깨짐 === 0;
}

if (process.argv.includes('--selftest') || process.argv.includes('--자가시험')) {
  process.exit(자가시험() ? 0 : 1);
}

/* ── 볼 말을 모은다 ───────────────────────────────────────── */
let 볼말 = [];
const i말 = process.argv.indexOf('--말');
if (i말 >= 0) 볼말 = process.argv.slice(i말 + 1).filter((x) => !x.startsWith('--'));
const i파일 = process.argv.indexOf('--말파일');
if (i파일 >= 0 && i파일 + 1 < process.argv.length) {
  볼말 = fs.readFileSync(process.argv[i파일 + 1], 'utf8').split(/\r?\n/)
    .map((x) => x.trim()).filter(Boolean);
}
if (!볼말.length) {
  console.log('🔴 볼 말이 없다 — --말 "…" "…"  또는  --말파일 <파일> 을 준다');
  process.exit(1);
}
/* ⭐ 대조군 — 세상에 없는 말. 이것이 ✅ 로 나오면 측정기를 믿지 않는다 */
const 대조군말 = '2031년 7월 이사하기 좋은 날 백년지도 대조군';

const require = createRequire('C:/Users/User/Documents/GitHub/dataeconomics/package.json');
const puppeteer = require('puppeteer-core');

const b = await puppeteer.connect({
  browserURL: 'http://127.0.0.1:9222', defaultViewport: null, protocolTimeout: 300000,
});
let p = null;
let 거짓 = false;
try {
  p = await b.newPage();
  await p.setViewport({ width: 1180, height: 900 });
  console.log('\n📏 네이버에서 그 자리에 누가 있나 — 적을수록 우리가 든다\n');
  for (const 말 of [...볼말, 대조군말]) {
    const 대조군 = 말 === 대조군말;
    await p.goto('https://search.naver.com/search.naver?query=' + encodeURIComponent(말),
      { waitUntil: 'domcontentloaded', timeout: 120000 });
    await new Promise((r) => setTimeout(r, 1900));
    const 주소들 = await p.evaluate(() =>
      [...document.querySelectorAll('a[href^="http"]')].map((a) => a.getAttribute('href')));
    const 센다 = {};
    for (const u of 주소들) {
      const g = 링크갈래(u);
      if (g) 센다[g] = (센다[g] || 0) + 1;
    }
    if (대조군 && (센다['우리'] || 0) > 0) 거짓 = true;
    console.log(한줄(대조군 ? '(대조군 — 없는 말)' : 말, 센다, 대조군));
    await new Promise((r) => setTimeout(r, 1100));
  }
} finally {
  if (p) { try { await p.close(); } catch (e) { /* 이미 닫혔다 */ } }
  await b.disconnect();
}

console.log('');
if (거짓) {
  console.log('🔴 **이 측정을 믿지 않는다** — 대조군이 걸렸다. 세는 자를 먼저 고친다.\n');
  process.exitCode = 1;
} else {
  console.log('  ⬜ 블로그 수가 적다고 좋은 자리가 아니다 — 수요도 같이 적을 수 있다.');
  console.log('  ⭐ 우리가 드는 자리는 «제목에 그 말이 있는» 자리다. 블로그 수와는 상관이 약했다.\n');
}
