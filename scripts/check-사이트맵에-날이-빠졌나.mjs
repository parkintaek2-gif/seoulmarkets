#!/usr/bin/env node
/**
 * check-사이트맵에-날이-빠졌나.mjs — `<lastmod>` 가 빠진 묶음을 잡는다.
 *
 * ── 🔴 왜 ────────────────────────────────────────────────────
 * [2026-11-18] 사이트맵을 열어 보니 초등 261장·중등 258장에 `<lastmod>` 가 없었다.
 * 고등(`갈래:area`)에만 있었다. 열쇠 표에 두 갈래가 빠져 있었던 것이다.
 *
 * lastmod 가 없으면 수집기가 **언제 바뀌었는지 모른다.** 새로 낸 지면이라는
 * 신호가 약해진다. 초등 261장이 28일 동안 순방문자 0명이던 까닭이 하나 더 있었다.
 *
 * ⛔ 빌드는 그대로 지나간다. 날이 없어도 사이트맵은 성한 XML 이다.
 *   **눈으로 열어 보기 전에는 아무도 모른다.** 그래서 검사로 굳힌다.
 *
 * ── 어떻게 재나 ──────────────────────────────────────────────
 * 주소를 묶음으로 가르고, 묶음마다 「날 있는 장 / 전체」를 센다.
 * ⛔ 한 장이라도 빠지면 잡는 것이 아니다 — **묶음이 통째로 빠진 것**을 잡는다.
 *   한두 장은 새로 난 지면일 수 있지만, 묶음 전체가 비면 열쇠가 빠진 것이다.
 *
 * 쓰는 법
 *   node scripts/check-사이트맵에-날이-빠졌나.mjs
 *   node scripts/check-사이트맵에-날이-빠졌나.mjs --selftest
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const 뿌리 = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** 주소를 묶음 이름으로 가른다. ⛔ 지면 한 장이 아니라 «묶음»으로 본다 */
export function 묶음이름(주소) {
  let 길;
  try { 길 = decodeURIComponent(String(주소).replace(/^https?:\/\/[^/]+/, '')); }
  catch (e) { 길 = String(주소).replace(/^https?:\/\/[^/]+/, ''); }
  const 마디 = 길.split('/').filter(Boolean);
  if (!마디.length) return '/';
  if (마디.length === 1) return '/' + 마디[0];
  /* `/report/area/x` 와 `/report/123` 은 다른 묶음이다 */
  if (마디[0] === 'report' && 마디[1] === 'area') return '/report/area/';
  if (마디[0] === 'report') return '/report/';
  if (마디.length >= 3) return '/' + 마디[0] + '/' + 마디[1] + '/';
  return '/' + 마디[0] + '/';
}

/** 묶음마다 「날 있는 장 / 전체」. ⛔ 묶음이 통째로 빈 것만 흠으로 본다 */
export function 날없는묶음(사이트맵글, 최소장수 = 20) {
  const 센다 = {};
  for (const m of 사이트맵글.matchAll(/<url>\s*<loc>([^<]+)<\/loc>([\s\S]*?)<\/url>/g)) {
    const 이름 = 묶음이름(m[1]);
    const c = (센다[이름] ??= { 전체: 0, 날있음: 0 });
    c.전체 += 1;
    if (/<lastmod>\s*\d{4}-\d{2}-\d{2}/.test(m[2])) c.날있음 += 1;
  }
  const 흠 = [];
  for (const [이름, c] of Object.entries(센다)) {
    if (c.전체 >= 최소장수 && c.날있음 === 0) 흠.push({ 묶음: 이름, 장: c.전체 });
  }
  return { 센다, 흠 };
}

function 자가시험() {
  const 봄 = [];
  const 본다 = (이름, 참) => 봄.push({ 이름, 참 });

  본다('① 고등 지역을 한 묶음으로', 묶음이름('https://x.com/report/area/서울특별시-성북구') === '/report/area/');
  본다('② 학교 한 곳은 다른 묶음', 묶음이름('https://x.com/report/7010057') === '/report/');
  본다('③ 초등·중등 지역', 묶음이름('https://x.com/elementary/area/경기도-화성시') === '/elementary/area/'
    && 묶음이름('https://x.com/middle/area/경기도-화성시') === '/middle/area/');
  본다('④ 한 마디 지면', 묶음이름('https://x.com/elementary') === '/elementary');
  본다('⑤ 홈', 묶음이름('https://x.com/') === '/');

  /* 🔴 [2026-11-18] 이 꼴이 실제로 났다 — 묶음 전체에 날이 없다 */
  const 날없음 = '<url><loc>https://x.com/elementary/area/a</loc></url>'.repeat(25);
  본다('⑥ 묶음이 통째로 비면 잡는다', 날없는묶음(날없음).흠.length === 1);

  /* ⛔ 한두 장 빠진 것은 잡지 않는다 — 새로 난 지면일 수 있다 */
  const 거의있음 = '<url><loc>https://x.com/report/area/a</loc><lastmod>2026-11-18</lastmod></url>'.repeat(24)
    + '<url><loc>https://x.com/report/area/b</loc></url>';
  본다('⑦ 한 장만 빠진 것은 안 잡는다', 날없는묶음(거의있음).흠.length === 0);

  /* ⛔ 작은 묶음은 잡지 않는다 — 지면 둘짜리 묶음까지 걸면 소음이 된다 */
  const 작은것 = '<url><loc>https://x.com/zzz/area/a</loc></url>'.repeat(3);
  본다('⑧ 작은 묶음은 안 잡는다', 날없는묶음(작은것).흠.length === 0);

  본다('⑨ 날이 다 있으면 깨끗하다',
    날없는묶음('<url><loc>https://x.com/report/area/a</loc><lastmod>2026-11-18</lastmod></url>'.repeat(25)).흠.length === 0);

  let 깨짐 = 0;
  for (const s of 봄) if (!s.참) { console.log('🔴 ' + s.이름); 깨짐 += 1; }
  console.log(깨짐 ? `🔴 ${깨짐}가지 깨졌다` : `✅ ${봄.length}가지 다 통과`);
  return 깨짐 === 0;
}

if (process.argv.includes('--selftest')) process.exit(자가시험() ? 0 : 1);

/* ── 본 일 ───────────────────────────────────────────────── */
const 사이트맵들 = [
  'dist/100y/sitemap.xml',
  'dist/sitemap.xml',
].map((p) => path.join(뿌리, p)).filter((p) => fs.existsSync(p));

if (!사이트맵들.length) {
  console.log('⬜ 사이트맵이 없다 — 먼저 빌드한다. 「없다」를 「깨끗하다」로 읽지 않는다');
  process.exit(0);
}

let 탈 = 0;
for (const f of 사이트맵들) {
  const { 센다, 흠 } = 날없는묶음(fs.readFileSync(f, 'utf8'));
  const 묶음수 = Object.keys(센다).length;
  console.log('\n■ ' + path.relative(뿌리, f) + ' — 묶음 ' + 묶음수 + '개');
  if (흠.length) {
    탈 += 흠.length;
    for (const x of 흠) {
      console.log('   🔴 ' + x.묶음 + ' — ' + x.장 + '장에 <lastmod> 가 하나도 없다');
    }
    console.log('   ⇒ scripts/build-100y-lastmod.mjs 의 `갈래` 표에 그 열쇠를 더한다');
  } else if (!묶음수) {
    /* ⛔ 0 묶음을 「깨끗하다」로 읽지 않는다 — 못 읽은 것과 흠 없는 것은 다르다 */
    console.log('   ⬜ 묶음을 하나도 못 읽었다 — 사이트맵 꼴이 다를 수 있다. «못 쟀다»다');
  } else {
    console.log('   ✅ 스무 장 넘는 묶음에 날이 다 있다');
  }
}

if (탈) {
  console.log('\n🔴 ' + 탈 + '개 묶음에 날이 빠졌다 — 수집기가 언제 바뀌었는지 모른다');
  process.exit(1);
}
console.log('');
