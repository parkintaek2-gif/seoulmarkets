#!/usr/bin/env node
/**
 * check-광고는-승인된곳에만.mjs — **광고 자리가 승인된 사이트에만 있는지** 본다.
 *
 * ## 🔴🔴 [2026-11-15 · 사장님] 「광고는 케이컬쳐만 승인 받은. 거기에만 광고 넣어. 더하지마」
 *
 *   그날 재 보니 **네 사이트 전부**에 광고 자리가 나가고 있었다. 승인된 것은
 *   케이컬처와이어 하나다. 백년지도·서울마켓츠의 자리를 빼고, 다시 생기지 않게 굳힌다.
 *
 * ## ⚠ 로더가 아니라 **자리**를 본다
 *
 *   `check-no-ads-where-forbidden.mjs` 는 **로더**(adsbygoogle.js)를 찾는다 —
 *   자동 광고가 로더만 보고 광고를 꽂는 지면을 막기 위해서다. 이 검사는 다르다.
 *   **로더는 남겨 둔다** — 승인 심사에는 로더가 필요하고, 사장님이 빼라 하신 것은 광고다.
 *   ⇒ 여기서 세는 것은 `ins.adsbygoogle` **자리**다.
 *
 * ## 어느 폴더가 어느 사이트인가
 *
 *   ```
 *   dist/wikitip/**   K Culture Wire   ← 승인됨. 광고를 낸다
 *   dist/100y/**      백년지도          ⛔ 승인 전
 *   그 밖             SeoulMarkets     ⛔ 승인 전
 *   ```
 *   ⚠ 케이라이프맵은 저장소가 달라 여기서 재지 않는다.
 *
 * 쓰는 법
 *   node scripts/check-광고는-승인된곳에만.mjs
 *   node scripts/check-광고는-승인된곳에만.mjs --자가시험
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const 뿌리 = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** 승인된 사이트의 dist 폴더. ⛔ 여기에 줄을 더하려면 **먼저 승인을 확인한다** */
export const 승인된곳 = ['wikitip'];

/** dist 안의 상대 경로가 어느 사이트인가 */
/**
 * 경로의 첫 칸에서 사이트를 가른다.
 * ⚠ **`wikitip/…` 뿐 아니라 `wikitip.html` 도 그 사이트다** — 그 한 장이 KCW 홈이다.
 *   폴더만 보다가 홈 한 장을 SeoulMarkets 로 세어 거짓 빨강이 났다(2026-11-15).
 */
function 첫칸(상대경로) {
  const c = String(상대경로 ?? '').replace(/\\/g, '/').split('/')[0];
  return c.replace(/\.html$/, '');
}

/** dist 안의 상대 경로가 어느 사이트인가 */
export function 어느사이트(상대경로) {
  const c = 첫칸(상대경로);
  if (c === 'wikitip') return 'K Culture Wire';
  if (c === '100y') return '백년지도';
  return 'SeoulMarkets';
}

/** 그 경로에 광고를 내도 되나 */
export function 광고내도되나(상대경로) {
  return 승인된곳.includes(첫칸(상대경로));
}

/** 광고 «자리» 수. 로더는 세지 않는다 */
export function 자리수(글) {
  return (String(글 ?? '').match(/class="[^"]*\badsbygoogle\b/g) || []).length;
}

if (process.argv.includes('--자가시험')) {
  const 본 = [
    [() => 광고내도되나('wikitip/article/x.html'), true],
    [() => 광고내도되나('100y/index.html'), false],
    [() => 광고내도되나('index.html'), false],
    [() => 광고내도되나('data/valuation.html'), false],
    [() => 어느사이트('wikitip/x.html'), 'K Culture Wire'],
    [() => 어느사이트('100y/x.html'), '백년지도'],
    [() => 어느사이트('article/x.html'), 'SeoulMarkets'],
    [() => 자리수('<ins class="adsbygoogle" data-x>'), 1],
    [() => 자리수('<ins class="adsbygoogle"><ins class="adsbygoogle">'), 2],
    /* 로더는 자리가 아니다 */
    [() => 자리수('<script src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=x">'), 0],
    [() => 자리수(''), 0],
    /* 윈도 경로 구분자 */
    [() => 광고내도되나('wikitip\\article\\x.html'), true],
    /* 🔴 2026-11-15 — 이 줄이 없어 KCW 홈 한 장이 거짓 빨강으로 걸렸다 */
    [() => 광고내도되나('wikitip.html'), true],
    [() => 어느사이트('wikitip.html'), 'K Culture Wire'],
    [() => 어느사이트('100y.html'), '백년지도'],
    [() => 광고내도되나('100y.html'), false],
  ];
  let 통과 = 0;
  본.forEach(([f, 나와야], i) => {
    const 나옴 = f();
    if (나옴 === 나와야) 통과 += 1;
    else console.log('  X ' + (i + 1) + '번 -> [' + 나옴 + '] (와야 할 것 [' + 나와야 + '])');
  });
  console.log('자가시험 ' + 통과 + '/' + 본.length);
  process.exit(통과 === 본.length ? 0 : 1);
}

/* ── 본 검사 ── */
const dist = path.join(뿌리, 'dist');
if (!fs.existsSync(dist)) {
  console.log('⬜ dist 가 없다 — 빌드하고 나서 다시 본다. **0 건으로 치지 않는다**');
  process.exit(0);
}

const 센것 = { 'K Culture Wire': 0, 백년지도: 0, SeoulMarkets: 0 };
const 걸린것 = [];
(function 훑기(자리) {
  for (const f of fs.readdirSync(자리)) {
    const p = path.join(자리, f);
    const st = fs.statSync(p);
    if (st.isDirectory()) { 훑기(p); continue; }
    if (!f.endsWith('.html')) continue;
    const 상대 = path.relative(dist, p);
    const n = 자리수(fs.readFileSync(p, 'utf8'));
    if (!n) continue;
    센것[어느사이트(상대)] += 1;
    if (!광고내도되나(상대)) 걸린것.push({ 상대, n });
  }
})(dist);

console.log('■ 광고 자리가 승인된 곳에만 있나');
console.log('   승인된 곳 — ' + 승인된곳.join(' · '));
for (const [이름, 수] of Object.entries(센것)) {
  const 표 = 이름 === 'K Culture Wire' ? '✅' : (수 ? '🔴' : '✅');
  console.log('   ' + 표 + ' ' + 이름.padEnd(16) + ' 광고가 있는 지면 ' + 수.toLocaleString() + '장');
}
if (!걸린것.length) {
  console.log('\n✅ 승인되지 않은 사이트에 광고 자리가 없다');
  process.exit(0);
}
console.log('\n🔴 승인되지 않은 사이트에 광고 자리가 ' + 걸린것.length.toLocaleString() + '장 있다 (앞 15장)');
for (const x of 걸린것.slice(0, 15)) console.log('   ' + x.상대 + '  (자리 ' + x.n + '개)');
console.log('\n⛔ 사장님 2026-11-15 — 「광고는 케이컬쳐만 승인 받은. 거기에만 광고 넣어. 더하지마」');
console.log('⚠ 로더(adsbygoogle.js)는 빼지 않는다 — 승인 심사에 필요하다. 빼는 것은 «자리»다.');
process.exit(1);
