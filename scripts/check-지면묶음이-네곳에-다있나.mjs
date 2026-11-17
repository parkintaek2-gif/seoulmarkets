#!/usr/bin/env node
/**
 * check-지면묶음이-네곳에-다있나.mjs — 새 지면 묶음이 **네 곳 모두**에 들어갔나.
 *
 * ── 🔴 왜 (2026-11-18 · 5번) ────────────────────────────────
 * 하룻밤에 **같은 결의 잘못을 세 번** 찾았다. 초등 지역 261장을 11-15 에 냈는데
 * 28일 동안 순방문자가 **0명**이었다. 지면이 나쁜 것이 아니었다 —
 *
 * ```
 *                  고등 258장   초등 261장
 *   사이트맵          ✅          ✅
 *   들어가는 링크      ✅(12곳)    🔴 한 곳뿐
 *   <lastmod>        ✅          🔴 없음
 *   llms.txt         ✅          🔴 없음
 * ```
 * 사이트맵 한 곳에만 있으면 **아무도 못 찾는다.** 세 번 다 따로 찾아 따로 고쳤다.
 * ⇒ 네 곳을 **한 자로 함께** 본다. 하나라도 비면 그 자리에서 잡는다.
 *
 * ⛔ 「냈다」를 「닿는다」로 읽지 않는다. 사이트맵에 올리는 것은 네 걸음 가운데 하나다.
 *
 * ── 어떻게 재나 ──────────────────────────────────────────────
 * 지어 놓은 `dist` 를 읽는다. 라이브를 긁지 않는다.
 * 묶음은 **스무 장 넘는 것**만 본다 — 지면 둘짜리까지 걸면 소음이 된다.
 *
 * 쓰는 법
 *   node scripts/check-지면묶음이-네곳에-다있나.mjs
 *   node scripts/check-지면묶음이-네곳에-다있나.mjs --selftest
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const 뿌리 = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(뿌리, 'dist', '100y');
export const 최소장수 = 20;

/** 주소에서 묶음 이름. ⛔ `/report/area/x` 와 `/report/123` 은 다른 묶음이다 */
export function 묶음이름(주소) {
  let 길;
  try { 길 = decodeURIComponent(String(주소).replace(/^https?:\/\/[^/]+/, '')); }
  catch (e) { 길 = String(주소).replace(/^https?:\/\/[^/]+/, ''); }
  const 마디 = 길.split('/').filter(Boolean);
  if (마디.length < 3) return null;      /* 묶음은 두 마디 밑에 장이 있는 것이다 */
  return '/' + 마디[0] + '/' + 마디[1] + '/';
}

/**
 * 네 곳을 함께 본다. 하나라도 0 이면 흠이다.
 * ⛔ 「링크가 한 곳뿐」도 잡는다 — 초등이 바로 그 꼴이었다(/elementary 하나).
 */
export function 모자란묶음({ 사이트맵, 링크수, 날수, llms }, 최소 = 최소장수) {
  const 흠 = [];
  for (const [묶음, 장] of Object.entries(사이트맵)) {
    if (장 < 최소) continue;
    const 빈곳 = [];
    if (!(링크수[묶음] > 0)) 빈곳.push('들어가는 링크');
    else if (링크수[묶음] < 장 / 2) 빈곳.push(`들어가는 링크가 적다(${링크수[묶음]}/${장})`);
    if (!(날수[묶음] > 0)) 빈곳.push('<lastmod>');
    if (!(llms[묶음] > 0)) 빈곳.push('llms.txt');
    if (빈곳.length) 흠.push({ 묶음, 장, 빈곳 });
  }
  return 흠;
}

function 자가시험() {
  const 봄 = [];
  const 본다 = (이름, 참) => 봄.push({ 이름, 참 });

  본다('① 묶음 이름을 낸다', 묶음이름('https://x.com/report/area/서울특별시-성북구') === '/report/area/');
  본다('② 마디가 둘뿐이면 묶음이 아니다', 묶음이름('https://x.com/report/123') === null);
  본다('③ 한 마디도 아니다', 묶음이름('https://x.com/about') === null);
  본다('④ 퍼센트 인코딩을 푼다',
    묶음이름('https://x.com/elementary/area/%EA%B2%BD%EA%B8%B0%EB%8F%84-%ED%99%94%EC%84%B1%EC%8B%9C') === '/elementary/area/');

  /* 🔴 [2026-11-18] 초등 261장이 바로 이 꼴이었다 — 사이트맵만 있었다 */
  const 초등꼴 = {
    사이트맵: { '/elementary/area/': 261 },
    링크수: { '/elementary/area/': 1 },
    날수: {},
    llms: {},
  };
  const 흠1 = 모자란묶음(초등꼴);
  본다('⑤ 초등 261장 꼴을 잡는다', 흠1.length === 1);
  본다('⑥ 빈 곳 셋을 다 적는다', 흠1[0].빈곳.length === 3);
  본다('⑦ 링크가 적은 것도 적는다', /링크가 적다/.test(흠1[0].빈곳.join(' ')));

  /* 고등 258장 꼴 — 네 곳에 다 있다 */
  const 고등꼴 = {
    사이트맵: { '/report/area/': 258 },
    링크수: { '/report/area/': 258 },
    날수: { '/report/area/': 258 },
    llms: { '/report/area/': 258 },
  };
  본다('⑧ 네 곳에 다 있으면 깨끗하다', 모자란묶음(고등꼴).length === 0);

  /* ⛔ 작은 묶음은 안 잡는다 */
  본다('⑨ 스무 장 미만은 안 잡는다',
    모자란묶음({ 사이트맵: { '/zzz/area/': 3 }, 링크수: {}, 날수: {}, llms: {} }).length === 0);

  본다('⑩ dist 가 지어져 있다', fs.existsSync(dist));

  let 깨짐 = 0;
  for (const s of 봄) if (!s.참) { console.log('🔴 ' + s.이름); 깨짐 += 1; }
  console.log(깨짐 ? `🔴 ${깨짐}가지 깨졌다` : `✅ ${봄.length}가지 다 통과`);
  return 깨짐 === 0;
}

if (process.argv.includes('--selftest')) process.exit(자가시험() ? 0 : 1);

/* ── 본 일 ───────────────────────────────────────────────── */
if (!fs.existsSync(dist)) {
  console.log('⬜ dist 가 없다 — 먼저 빌드한다. 「없다」를 「깨끗하다」로 읽지 않는다');
  process.exit(0);
}

/* ① 사이트맵 · ② 날 */
const 사이트맵 = {}, 날수 = {};
const sm = fs.readFileSync(path.join(dist, 'sitemap.xml'), 'utf8');
for (const m of sm.matchAll(/<url>\s*<loc>([^<]+)<\/loc>([\s\S]*?)<\/url>/g)) {
  const 이름 = 묶음이름(m[1]);
  if (!이름) continue;
  사이트맵[이름] = (사이트맵[이름] || 0) + 1;
  if (/<lastmod>\s*\d{4}-\d{2}-\d{2}/.test(m[2])) 날수[이름] = (날수[이름] || 0) + 1;
}

/* ③ llms.txt */
const llms = {};
const lt = fs.existsSync(path.join(dist, 'llms.txt'))
  ? fs.readFileSync(path.join(dist, 'llms.txt'), 'utf8') : '';
for (const m of lt.matchAll(/https?:\/\/[^\s)]+/g)) {
  const 이름 = 묶음이름(m[0]);
  if (이름) llms[이름] = (llms[이름] || 0) + 1;
}

/* ④ 들어가는 링크 — 지어 놓은 지면을 통째로 읽어 센다 */
const 링크수 = {};
(function 훑는다(방) {
  for (const 것 of fs.readdirSync(방, { withFileTypes: true })) {
    const 길 = path.join(방, 것.name);
    if (것.isDirectory()) { 훑는다(길); continue; }
    if (!것.name.endsWith('.html')) continue;
    const 본것 = new Set();
    for (const m of fs.readFileSync(길, 'utf8').matchAll(/href="([^"]+)"/g)) {
      const 이름 = 묶음이름(m[1].replace(/^https?:\/\/[^/]+/, ''));
      if (이름) 본것.add(이름);
    }
    /* ⛔ 한 지면이 같은 묶음을 여러 번 가리켜도 한 번으로 센다 */
    for (const 이름 of 본것) 링크수[이름] = (링크수[이름] || 0) + 1;
  }
})(dist);

const 흠 = 모자란묶음({ 사이트맵, 링크수, 날수, llms });

console.log('\n📏 지면 묶음이 네 곳에 다 들어갔나 — 사이트맵 · 들어가는 링크 · lastmod · llms.txt\n');
const 큰묶음 = Object.entries(사이트맵).filter(([, n]) => n >= 최소장수).sort((a, b) => b[1] - a[1]);
console.log('  묶음'.padEnd(26) + '장'.padStart(6) + '링크'.padStart(8) + '날'.padStart(7) + 'llms'.padStart(7));
console.log('  ' + '─'.repeat(52));
for (const [이름, 장] of 큰묶음) {
  console.log('  ' + 이름.padEnd(24) + String(장).padStart(6)
    + String(링크수[이름] || 0).padStart(8)
    + String(날수[이름] || 0).padStart(7)
    + String(llms[이름] || 0).padStart(7));
}

if (흠.length) {
  console.log('\n  🔴 모자란 묶음 ' + 흠.length + '개:');
  for (const x of 흠) console.log('     ' + x.묶음 + ' (' + x.장 + '장) — ' + x.빈곳.join(' · ') + ' 가 비었다');
  console.log('\n  ⛔ 사이트맵에만 있으면 아무도 못 찾는다. 초등 261장이 28일 동안 0명이던 까닭이다.');
  process.exit(1);
}
console.log('\n  ✅ 스무 장 넘는 묶음이 네 곳에 다 들어가 있다\n');
