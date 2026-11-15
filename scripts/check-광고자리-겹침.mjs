#!/usr/bin/env node
/**
 * check-광고자리-겹침.mjs — **같은 광고 단위가 한 지면에 두 번 나가지 않는지** 본다.
 *
 * ## 🔴 왜 이 검사가 생겼나 (2026-11-15 · 5번)
 *
 *   사장님 「케이컬쳐와이어 구글 애드센스 광고게재해」를 받고 KCW 기사 틀에
 *   인아티클 자리를 하나 넣었다. **그런데 이미 있었다** —
 *   `astro.config.mjs` 의 `inArticleAdPlugin` 이 본문 세 번째 h2 앞에 끼워 넣고 있었다.
 *
 *   소스를 `grep "inArticle"` 로 훑었을 때는 안 나왔다. 그 플러그인이 `ADS.slots.inArticle`
 *   을 쓰지 `slot="inArticle"` 로 쓰지 않기 때문이다. **빌드해서 세고 나서야 알았다.**
 *
 *   ⛔ 같은 단위를 한 지면에 두 번 내보내는 것은 애드센스가 권하지 않는다 —
 *     「2개 이상 게재하려는 경우 각 광고 사이에 충분한 콘텐츠가 포함되도록 하여
 *      독자의 불편을 최소화해야 합니다」(사장님이 보내 주신 안내 화면).
 *
 * ## ⚠ 「몇 개인가」가 아니라 「같은 단위가 겹치나」를 본다
 *
 *   한 지면에 배너와 인아티클이 하나씩 있는 것은 정상이다. 막을 것은 **같은 슬롯 번호**가
 *   두 번 나오는 것이다.
 *
 * 쓰는 법
 *   node scripts/check-광고자리-겹침.mjs            dist 를 훑는다
 *   node scripts/check-광고자리-겹침.mjs --자가시험
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const 뿌리 = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** 한 지면의 HTML 에서 광고 슬롯 번호를 모두 뽑는다 */
export function 슬롯뽑기(글) {
  return [...String(글 ?? '').matchAll(/data-ad-slot="([0-9]+)"/g)].map((m) => m[1]);
}

/** 겹치는 슬롯만 돌려준다. 없으면 빈 배열 */
export function 겹친슬롯(슬롯들) {
  const 셈 = {};
  for (const s of 슬롯들) 셈[s] = (셈[s] ?? 0) + 1;
  return Object.entries(셈)
    .filter(([, n]) => n > 1)
    .map(([슬롯, 수]) => ({ 슬롯, 수 }));
}

if (process.argv.includes('--자가시험')) {
  const 본 = [
    ['<ins data-ad-slot="111"><ins data-ad-slot="222">', 0],
    ['<ins data-ad-slot="111"><ins data-ad-slot="111">', 1],
    ['', 0],
    ['<ins data-ad-slot="111">', 0],
    ['<ins data-ad-slot="111"><ins data-ad-slot="111"><ins data-ad-slot="222">', 1],
  ];
  let 통과 = 0;
  for (const [글, 나와야] of 본) {
    const 나옴 = 겹친슬롯(슬롯뽑기(글)).length;
    if (나옴 === 나와야) 통과 += 1;
    else console.log('  X [' + 글.slice(0, 50) + '] -> ' + 나옴 + ' (와야 할 것 ' + 나와야 + ')');
  }
  /* 수까지 맞는지 */
  const 셋 = 겹친슬롯(슬롯뽑기('<ins data-ad-slot="9"><ins data-ad-slot="9"><ins data-ad-slot="9">'));
  if (셋.length === 1 && 셋[0].수 === 3) 통과 += 1;
  else console.log('  X 세 번 겹친 것을 못 셌다: ' + JSON.stringify(셋));
  console.log('자가시험 ' + 통과 + '/' + (본.length + 1));
  process.exit(통과 === 본.length + 1 ? 0 : 1);
}

/* ── 본 검사 ── */
const dist = path.join(뿌리, 'dist');
if (!fs.existsSync(dist)) {
  console.log('⬜ dist 가 없다 — 빌드하고 나서 다시 본다. **0 건으로 치지 않는다**');
  process.exit(0);
}

const 파일 = [];
(function 훑기(자리) {
  for (const f of fs.readdirSync(자리)) {
    const p = path.join(자리, f);
    const st = fs.statSync(p);
    if (st.isDirectory()) 훑기(p);
    else if (f.endsWith('.html')) 파일.push(p);
  }
})(dist);

const 걸린것 = [];
let 광고있는지면 = 0;
for (const p of 파일) {
  const 슬롯 = 슬롯뽑기(fs.readFileSync(p, 'utf8'));
  if (!슬롯.length) continue;
  광고있는지면 += 1;
  const 겹침 = 겹친슬롯(슬롯);
  if (겹침.length) 걸린것.push({ p, 겹침 });
}

console.log('■ 광고 자리 겹침 검사 — 지면 ' + 파일.length.toLocaleString() + '장 가운데 광고가 있는 것 ' + 광고있는지면.toLocaleString() + '장');
if (!걸린것.length) {
  console.log('✅ 같은 광고 단위가 두 번 나가는 지면이 없다');
  process.exit(0);
}
console.log('🔴 ' + 걸린것.length.toLocaleString() + '장에서 **같은 단위가 두 번 이상** 나간다\n');
for (const x of 걸린것.slice(0, 20)) {
  console.log('   ' + path.relative(뿌리, x.p));
  for (const g of x.겹침) console.log('      슬롯 ' + g.슬롯 + ' 이 ' + g.수 + '번');
}
if (걸린것.length > 20) console.log('   … 그리고 ' + (걸린것.length - 20).toLocaleString() + '장 더');
console.log('\n⛔ 애드센스 안내 — 「2개 이상 게재하려는 경우 각 광고 사이에 충분한 콘텐츠가');
console.log('   포함되도록 하여 독자의 불편을 최소화해야 합니다」');
console.log('⚠ 자리를 만드는 곳이 둘이다 — `astro.config.mjs` 의 inArticleAdPlugin(본문 안)과');
console.log('   `components/AdSlot.astro`(틀). 하나를 넣기 전에 다른 하나를 본다.');
process.exit(1);
