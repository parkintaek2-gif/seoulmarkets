#!/usr/bin/env node
/**
 * measure-kcw-inbound.mjs — **지면마다 «들어오는 안쪽 링크»가 몇 개인가.** 갈래별로 센다.
 *
 * ── 왜 이 자가 필요한가 ─────────────────────────────────────────
 * 사람 지면 636장이 구글에서 **「발견만」**에 머물러 있다 — 크롤러가 주소는 아는데
 * 색인에 안 넣는다. 그 자리에서 가장 큰 힘은 **안쪽 링크**다. 어디로도 안 걸린 지면은
 * 사이트맵에 있어도 「이 사이트가 중요하게 여기지 않는 지면」으로 읽힌다.
 *
 * ⛔ 그런데 우리는 그것을 **한 번도 전수로 재 본 적이 없다.**
 *   `measure-inbound-links.mjs` 가 있었지만 지면 열셋을 손으로 박아 둔 «한 번 쓰는 자»였다.
 *   ⭐ 열셋으로는 「어느 갈래가 굶고 있나」를 못 본다. 그것이 정작 알아야 할 것이다.
 *
 * ── 이 자가 내는 것 ─────────────────────────────────────────────
 * 갈래마다 — 지면 수 · 들어오는 링크가 0인 것 · 1인 것 · 가운데값 · 가장 굶은 것 몇 장
 *
 * ⛔ 「링크가 적으니 색인이 안 된다」고 «단정하지» 않는다. 색인은 구글이 정한다.
 *   여기서 말할 수 있는 것은 **「이 갈래는 우리 안에서 아무 데서도 안 걸린다」**까지다.
 * ⚠ 자기 지면이 자기를 거는 것은 안 센다(꼬리말·차림표의 「현재 지면」).
 * ⚠ 목록 지면 한 장이 그 갈래 전부를 거는 일이 흔하다. 그래서 **「몇 «장»에서 걸리나」**를
 *   센다 — 같은 지면이 두 번 걸어도 하나다. 「한 곳에서만 걸린다」가 진짜 위험 신호다.
 *
 * 쓰는 법  node scripts/measure-kcw-inbound.mjs [--갈래=person] [--몇장=20]
 *          node scripts/measure-kcw-inbound.mjs --자가시험
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const 뿌리 = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const 방 = path.join(뿌리, 'dist/wikitip');

/** 지면 파일 하나 → 손님이 보는 주소 */
export function 지면주소(상대길) {
  const s = String(상대길).split(path.sep).join('/');
  const 벗 = s.replace(/^dist\/wikitip\/?/, '').replace(/\/index\.html$/, '').replace(/\.html$/, '');
  return '/' + 벗;
}

/**
 * 갈래 이름 — 주소의 첫 칸.
 * ⚠ 칸이 하나뿐인 주소(`/underrated`)는 «홑장»으로 묶는다. 갈래가 아니라 한 장짜리다.
 */
export function 갈래(주소) {
  const 칸 = String(주소).replace(/^\//, '').split('/').filter(Boolean);
  if (칸.length === 0) return '(첫 지면)';
  if (칸.length === 1) return '(홑장)';
  return 칸[0];
}

/** 나가는 안쪽 링크. ⛔ 자원 파일·앵커·물음표는 지면이 아니다 */
export const 자원끝 = /\.(png|jpg|jpeg|webp|avif|svg|json|xml|css|js|mjs|ico|txt|csv|tsv|pdf|mp4|mp3|webm|gif|woff2?|ttf|zip)$/i;

export function 나가는링크들(html) {
  const 다 = [...String(html).matchAll(/<a\s[^>]*href="(\/[^"#?]*)"/g)].map((m) => m[1]);
  return [...new Set(다)]
    .map((h) => h.replace(/\/$/, '') || '/')
    .map((h) => h.replace(/^\/wikitip(?=\/|$)/, '') || '/')
    .filter((h) => !자원끝.test(h));
}

/** 가운데값. ⛔ 빈 목록이면 0 이 아니라 null 이다 — 못 잰 것을  */
export function 가운데(수들) {
  const s = [...수들].filter(Number.isFinite).sort((a, b) => a - b);
  if (!s.length) return null;
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

/**
 * 갈래마다 셈을 낸다.
 * @param 표 Map(주소 → Set(그 지면을 «거는» 지면 주소들))
 */
export function 갈래별셈(표) {
  const 통 = new Map();
  for (const [주소, 거는것] of 표) {
    const g = 갈래(주소);
    if (!통.has(g)) 통.set(g, { 갈래: g, 지면: 0, 없음: 0, 한곳: 0, 수들: [], 굶은것: [] });
    const t = 통.get(g);
    const n = 거는것.size;
    t.지면 += 1;
    t.수들.push(n);
    if (n === 0) { t.없음 += 1; t.굶은것.push(주소); }
    else if (n === 1) t.한곳 += 1;
  }
  return [...통.values()]
    .map((t) => ({ ...t, 가운데: 가운데(t.수들) }))
    .sort((a, b) => (b.없음 + b.한곳) - (a.없음 + a.한곳) || b.지면 - a.지면);
}

/* ── 자가시험 ─────────────────────────────────────────── */
if (process.argv.includes('--자가시험') || process.argv.includes('--selftest')) {
  let 셈 = 0;
  const 본다 = (말, 참) => { 셈 += 1; console.log(참 ? '✅' : '🔴', 말); if (!참) process.exitCode = 1; };

  본다('① 파일 이름을 주소로 바꾼다', 지면주소('dist/wikitip/person/iu.html') === '/person/iu');
  본다('② index.html 은 칸 이름이 주소다', 지면주소('dist/wikitip/person/index.html') === '/person');
  본다('③ 갈래는 첫 칸이다', 갈래('/person/iu') === 'person');
  본다('④ 칸이 하나면 홑장이다', 갈래('/underrated') === '(홑장)');
  본다('⑤ 뿌리는 첫 지면이다', 갈래('/') === '(첫 지면)');

  본다('⑥ 나가는 링크를 뽑는다', 나가는링크들('<a href="/person/iu">x</a>')[0] === '/person/iu');
  본다('⑦ 자원은 링크가 아니다', 나가는링크들('<a href="/a.png">x</a>').length === 0);
  본다('⑧ 끝의 빗금을 떼어 같은 주소로 본다',
    나가는링크들('<a href="/person/iu/">x</a>')[0] === '/person/iu');
  /* ⚠ 지면들이 /wikitip 을 붙여 걸기도 한다. 안 맞추면 「아무 데서도 안 걸린다」가 헛경보다 */
  본다('⑨ 🔴 /wikitip 이 붙은 주소도 같은 곳으로 본다',
    나가는링크들('<a href="/wikitip/person/iu">x</a>')[0] === '/person/iu');
  본다('⑩ 같은 주소를 두 번 세지 않는다',
    나가는링크들('<a href="/a/b">1</a><a href="/a/b">2</a>').length === 1);

  본다('⑪ 가운데값을 낸다', 가운데([1, 3, 5]) === 3 && 가운데([1, 3]) === 2);
  본다('⑫ ⛔ 빈 목록은 0 이 아니라 못 잰 것이다', 가운데([]) === null);

  const 표 = new Map([
    ['/person/a', new Set()],
    ['/person/b', new Set(['/person'])],
    ['/person/c', new Set(['/person', '/most-read'])],
    ['/title/x', new Set(['/titles', '/year/2024', '/underrated'])],
  ]);
  const 셈표 = 갈래별셈(표);
  const p = 셈표.find((t) => t.갈래 === 'person');
  본다('⑬ 갈래마다 지면 수를 센다', p.지면 === 3);
  본다('⑭ 아무 데서도 안 걸리는 것을 센다', p.없음 === 1);
  본다('⑮ 한 곳에서만 걸리는 것을 센다', p.한곳 === 1);
  본다('⑯ 굶은 지면의 주소를 남긴다', p.굶은것[0] === '/person/a');
  본다('⑰ 굶은 갈래가 «먼저» 나온다', 셈표[0].갈래 === 'person');

  console.log(`\n${process.exitCode ? '❌' : '✅'} measure-kcw-inbound 자가시험 (${셈})`);
  process.exit();
}

/* ── 몸 ───────────────────────────────────────────────── */
if (!fs.existsSync(방)) {
  console.log('⬜ dist/wikitip 이 없다 — **못 쟀다.** npm run build 를 먼저 돌린다');
  process.exit(0);
}

const 고른갈래 = (process.argv.find((a) => a.startsWith('--갈래=')) ?? '').split('=')[1] ?? null;
const 몇장 = Number((process.argv.find((a) => a.startsWith('--몇장=')) ?? '').split('=')[1] ?? 12);

const 지면 = [];
(function 훑(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) 훑(p);
    else if (e.name.endsWith('.html')) 지면.push(p);
  }
})(방);

/** 주소 → 그 지면을 «거는» 지면들 */
const 표 = new Map(지면.map((p) => [지면주소(path.relative(뿌리, p)), new Set()]));
let 못읽은것 = 0;

for (const p of 지면) {
  let 글;
  try { 글 = fs.readFileSync(p, 'utf8'); } catch { 못읽은것 += 1; continue; }
  const 나 = 지면주소(path.relative(뿌리, p));
  for (const h of 나가는링크들(글)) {
    if (h === 나) continue;              /* ⛔ 자기가 자기를 거는 것은 안 센다 */
    if (표.has(h)) 표.get(h).add(나);
  }
}

const 셈표 = 갈래별셈(표);
const 보일것 = 고른갈래 ? 셈표.filter((t) => t.갈래 === 고른갈래) : 셈표;

console.log('\n■ 지면마다 «들어오는 안쪽 링크»가 몇 «장»에서 오나 — 갈래별\n');
console.log(`  지면 ${지면.length.toLocaleString('ko-KR')}장`
  + (못읽은것 ? ` · ⬜ 못 읽은 것 ${못읽은것}장` : ''));
console.log('\n  갈래            지면    ⛔0곳   ⚠1곳   가운데');
console.log('  ' + '─'.repeat(48));
for (const t of 보일것) {
  console.log(`  ${t.갈래.padEnd(14)}${String(t.지면).padStart(5)}`
    + `${String(t.없음).padStart(7)}${String(t.한곳).padStart(7)}`
    + `${(t.가운데 === null ? '못잼' : String(t.가운데)).padStart(8)}`);
}

const 굶은갈래 = 보일것.filter((t) => t.없음 > 0);
if (굶은갈래.length) {
  console.log('\n  ⛔ 아무 데서도 안 걸리는 지면 — 갈래마다 몇 장만');
  for (const t of 굶은갈래.slice(0, 6)) {
    console.log(`\n   ${t.갈래} — ${t.없음}장`);
    for (const 주소 of t.굶은것.slice(0, 몇장)) console.log(`      ${주소}`);
    if (t.굶은것.length > 몇장) console.log(`      … ${t.굶은것.length - 몇장}장 더`);
  }
} else {
  console.log('\n  ✅ 아무 데서도 안 걸리는 지면이 없다');
}

console.log('\n## 이 표를 읽는 법 — ⛔ 이 세 줄을 빼고 수만 옮기지 않는다');
console.log('   · 「1곳」은 대개 그 갈래의 «목록 지면 한 장»이다. 목록이 접히면 통째로 고아가 된다.');
console.log('   · ⛔ 「링크가 적어서 색인이 안 된다」로 «단정하지» 않는다 — 색인은 구글이 정한다.');
console.log('     여기서 말할 수 있는 것은 「우리 안에서 아무 데서도 안 걸린다」까지다.');
console.log('   · ⚠ 사이트맵에 있는 것과 «걸어 준 것»은 다른 일이다. 둘 다 있어야 한다.');
