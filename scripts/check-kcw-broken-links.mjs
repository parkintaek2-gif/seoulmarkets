#!/usr/bin/env node
/**
 * check-kcw-broken-links.mjs — **K Culture Wire 지면 안의 내부 링크가 실제로 사는가**
 *
 * ── 왜 이 자가 생겼나 ───────────────────────────────────────────
 * 2026-08-29, 사장님 지시로 띠 방 12장을 내렸다. 지면은 지웠는데 **그 방을 가리키는
 * 링크가 세 군데 더 남아 있었다** — 기사 셋(IU·정국·카리나)이 본문에서 `/room/rooster`
 * 같은 주소를 걸고 있었다. 지우기 전에는 살아 있던 링크라 아무 자도 안 걸렸다.
 *
 * ⛔ 이것은 «오늘 한 번»의 실수가 아니라 **결함의 갈래**다. 지면을 내릴 때마다 생긴다.
 *   같은 갈래를 이미 세 번 겪었다 —
 *     · 영상 파일을 6번 폴더에 두어 지면이 부르는 mp4 가 404
 *     · /community 를 만들어 놓고 들어오는 문을 안 냄
 *     · 띠 방을 내리고 기사 셋의 링크를 안 따라감
 *   6번(SeoulMarkets)에는 백년지도용 자(check-100y-broken-links)가 있었는데
 *   **5번에는 없었다.** 그래서 짓는다.
 *
 * ── 이 자가 재는 것 ────────────────────────────────────────────
 * `dist/wikitip` 를 통째로 훑어 `<a href="/...">` 를 뽑고, 그 목적지가 dist 에
 * 실제로 있는지 본다. 없으면 «깨진 링크»다.
 *
 * ⚠ **kculturewire.com 은 주소를 다시 씁니다** — 손님이 보는 `/person/iu` 는
 *   실제로 `dist/wikitip/person/iu.html` 이다. 그래서 `/wikitip` 을 붙여도 보고
 *   안 붙여도 본다. 이것을 모르고 재면 지면 7,000장이 통째로 «깨졌다»고 나온다.
 * ⚠ 읽기 실패는 «깨졌다»가 아니라 **못 쟀다**로 센다 — 여섯 유닛이 같은 dist 를
 *   쓰므로 다른 창이 빌드하는 동안 파일이 순간 사라질 수 있다.
 *   「못 잰 것은 못 쟀다고 적는다」 — 
 *
 * 쓰는 법  node scripts/check-kcw-broken-links.mjs [--자세히]
 *          node scripts/check-kcw-broken-links.mjs --자가시험
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const 뿌리 = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const 방 = path.join(뿌리, 'dist/wikitip');

/** dist 안의 .html 을 다 모은다 */
export function 지면들(곳뿌리) {
  const 낸다 = [];
  const 훑기 = (곳) => {
    let 목록;
    try { 목록 = fs.readdirSync(곳, { withFileTypes: true }); } catch { return; }
    for (const f of 목록) {
      const p = path.join(곳, f.name);
      if (f.isDirectory()) 훑기(p);
      else if (f.name.endsWith('.html')) 낸다.push(p);
    }
  };
  훑기(곳뿌리);
  return 낸다;
}

/**
 * href="/..." 를 뽑는다.
 * ⛔ 밖으로 나가는 링크(http)·앵커(#)·자원 파일은 «지면이 아니다» — 빼고 센다.
 * ⚠ 자원까지 세면 mp4·png 가 전부 깨진 것으로 나와 진짜 깨진 지면이 묻힌다.
 */
export const 자원끝 = /\.(png|jpg|jpeg|webp|avif|svg|json|xml|css|js|mjs|ico|txt|csv|tsv|pdf|mp4|mp3|webm|gif|woff2?|ttf|zip)$/i;

export function 안쪽링크들(html) {
  const 링크들 = [...String(html).matchAll(/<a\s[^>]*href="(\/[^"#?]*)"/g)].map((m) => m[1]);
  return [...new Set(링크들)].filter((h) => h !== '/' && !자원끝.test(h));
}

/**
 * 주소 → dist 파일.
 * 🔴 kculturewire.com 은 `/xxx` 를 `dist/wikitip/xxx` 로 다시 쓴다. 그 규칙을 그대로 흉내낸다.
 * ⚠ %-인코딩된 주소는 풀어야 파일 이름과 맞는다.
 */
export function 후보들(href) {
  let 몸;
  try { 몸 = decodeURIComponent(href).replace(/^\//, ''); } catch { 몸 = href.replace(/^\//, ''); }
  const 벗김 = 몸.replace(/^wikitip\//, '');
  return [
    `dist/wikitip/${벗김}.html`,
    `dist/wikitip/${벗김}/index.html`,
    `dist/${몸}.html`,
    `dist/${몸}/index.html`,
  ];
}

export function 목적지파일(href, 있나 = (p) => fs.existsSync(path.join(뿌리, p))) {
  for (const 후보 of 후보들(href)) if (있나(후보)) return 후보;
  return null;
}

/**
 * 🔴 [2026-08-29] **빌드가 도는 중에 재면 헛경보가 난다.** 처음 돌렸을 때 지면 741장에
 *   깨진 주소 1,169개가 나왔다 — dist 를 다시 짓는 중이라 «아직 안 써진» 지면을
 *   가리키는 링크가 다 깨진 것으로 보인 것이다. 빌드가 끝나고 다시 재니 0개였다.
 *
 * ⛔ 그러니 이 자는 「깨졌다」와 「못 쟀다」를 갈라 말해야 한다. 0 으로 채우지 않는 것과
 *   같은 뜻이다 — 있지도 않은 결함 1,169개를 있다고 적으면 진짜 결함이 묻힌다.
 * ⚠ 가르는 표는 «깨진 몫»이다. 손질된 지면에서 링크가 통째로 깨져 있을 일은 없다.
 */
export const 헛경보몫 = 0.05;

export function 빌드중인가(깨진수, 지면수, 문턱 = 헛경보몫) {
  if (!Number.isFinite(깨진수) || !Number.isFinite(지면수) || 지면수 <= 0) return false;
  return 깨진수 / 지면수 > 문턱;
}

/* ── 자가시험 ─────────────────────────────────────────── */
if (process.argv.includes('--selftest') || process.argv.includes('--자가시험')) {
  let 셈 = 0;
  const 본다 = (말, 참) => { 셈 += 1; console.log(참 ? '✅' : '🔴', 말); if (!참) process.exitCode = 1; };

  본다('① a 태그의 href 를 뽑는다', 안쪽링크들('<a href="/person/iu">IU</a>').includes('/person/iu'));
  본다('② 밖으로 나가는 링크는 안 뽑는다',
    안쪽링크들('<a href="https://netflix.com">x</a>').length === 0);
  본다('③ 앵커는 안 뽑는다', 안쪽링크들('<a href="#top">x</a>').length === 0);
  본다('④ 물음표가 붙은 주소는 안 뽑는다', 안쪽링크들('<a href="/a?b=1">x</a>').length === 0);
  본다('⑤ 자원 파일은 지면이 아니다', 안쪽링크들('<a href="/x.png">x</a>').length === 0);
  본다('⑤-1 🔴 영상(mp4)도 자원이다 — 8/29 에 여기서 헛경보가 날 뻔했다',
    안쪽링크들('<a href="/wikitip/video/a.mp4">x</a>').length === 0);
  본다('⑥ 같은 주소를 두 번 세지 않는다',
    안쪽링크들('<a href="/a">1</a><a href="/a">2</a>').length === 1);
  본다('⑦ 뿌리(/)는 안 센다', 안쪽링크들('<a href="/">home</a>').length === 0);

  /* 🔴 이 자의 핵심 — 주소 다시 쓰기를 흉내내는 자리다. 여기가 틀리면 7,000장이 헛경보다 */
  const 가짜 = new Set(['dist/wikitip/person/iu.html', 'dist/wikitip/community.html']);
  const 있나 = (p) => 가짜.has(p);
  본다('⑧ 🔴 /person/iu 를 dist/wikitip/person/iu.html 로 찾는다',
    목적지파일('/person/iu', 있나) === 'dist/wikitip/person/iu.html');
  본다('⑨ /wikitip 이 이미 붙은 주소도 같은 곳으로 간다',
    목적지파일('/wikitip/person/iu', 있나) === 'dist/wikitip/person/iu.html');
  본다('⑩ 없는 지면은 못 찾는다고 한다', 목적지파일('/room/rooster', 있나) === null);
  본다('⑪ 미리 지은 지면(community.html)도 찾는다',
    목적지파일('/community', 있나) === 'dist/wikitip/community.html');

  /* 🔴 빌드 도중에 잰 것을 「결함」으로 보고하지 않으려는 자리 — 8/29 에 1,169개 헛경보가 났다 */
  본다('⑫-1 🔴 깨진 몫이 크면 «못 쟀을 수 있다»로 본다', 빌드중인가(1169, 741) === true);
  본다('⑫-2 몇 개 깨진 것은 진짜 결함으로 본다', 빌드중인가(4, 2723) === false);
  본다('⑫-3 하나도 안 깨졌으면 당연히 아니다', 빌드중인가(0, 2723) === false);
  본다('⑫-4 지면이 없으면 판단하지 않는다', 빌드중인가(3, 0) === false);

  본다('⑫ 없는 갈래를 훑어도 안 죽는다', 지면들(path.join(뿌리, '없는-갈래-xyz')).length === 0);
  본다('⑬ %-인코딩된 주소를 풀어서 찾는다',
    목적지파일('/person/' + encodeURIComponent('아이유'),
      (p) => p === 'dist/wikitip/person/아이유.html') === 'dist/wikitip/person/아이유.html');

  console.log(`\n${process.exitCode ? '❌' : '✅'} check-kcw-broken-links 자가시험 (${셈})`);
  process.exit();
}

/* ── 몸 ───────────────────────────────────────────────── */
if (!fs.existsSync(방)) {
  console.log('⬜ dist/wikitip 이 없다 — **못 쟀다.** npm run build 를 먼저 돌린다');
  process.exit(0);
}

const 자세히 = process.argv.includes('--자세히');
const 지면 = 지면들(방);
const 깨진것 = new Map(); // href -> Set(가리키는 지면들)
let 못읽은지면 = 0;

for (const p of 지면) {
  let 원문;
  try { 원문 = fs.readFileSync(p, 'utf8'); } catch { 못읽은지면 += 1; continue; }
  const 이름 = path.relative(뿌리, p).split(path.sep).join('/');
  for (const href of 안쪽링크들(원문)) {
    if (목적지파일(href)) continue;
    if (!깨진것.has(href)) 깨진것.set(href, new Set());
    깨진것.get(href).add(이름);
  }
}

console.log('\nK Culture Wire — 지면 안 내부 링크가 실제로 사는가\n');
console.log(`  지면 ${지면.length.toLocaleString('ko-KR')}장`
  + (못읽은지면 ? ` · ⬜ 못 읽은 지면 ${못읽은지면}장(다른 창이 같은 dist 를 쓰는 중일 수 있다)` : ''));
console.log(`  ${깨진것.size ? '🔴' : '✅'} 깨진 주소 ${깨진것.size}개\n`);

const 정렬 = [...깨진것.entries()].sort((a, b) => b[1].size - a[1].size);
for (const [href, 가리키는것] of 정렬.slice(0, 자세히 ? 9999 : 40)) {
  const 목록 = [...가리키는것];
  console.log(`  🔴 ${href}  — ${가리키는것.size}장에서 가리킴 (예: ${목록.slice(0, 3).join(', ')})`);
}
if (!깨진것.size) console.log('  ✅ 깨진 내부 링크가 없다');
if (!자세히 && 정렬.length > 40) console.log(`\n  ⚠ ${정렬.length - 40}개 더 있다 — --자세히 로 전부 본다`);

/* ⬜ 깨진 몫이 너무 크면 «결함»이 아니라 «못 쟀다»일 가능성이 크다 */
if (빌드중인가(깨진것.size, 지면.length)) {
  console.log(`\n⬜ **못 쟀을 수 있다.** 깨진 몫이 ${(깨진것.size / 지면.length * 100).toFixed(0)}% 다 —`);
  console.log('   손질된 지면에서 이만큼이 한꺼번에 깨질 일은 없다. dist 를 «다시 짓는 중»이면');
  console.log('   아직 안 써진 지면을 가리키는 링크가 다 깨진 것으로 보인다.');
  console.log('   ⭐ 빌드가 끝난 뒤에 다시 재고, 그때 나온 수를 쓴다. 이 수를 보고하지 않는다.');
  process.exitCode = 2;
} else {
  process.exitCode = 깨진것.size ? 1 : 0;
}
