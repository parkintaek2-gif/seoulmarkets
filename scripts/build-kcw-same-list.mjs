#!/usr/bin/env node
/**
 * build-kcw-same-list.mjs — **두 나라가 같은 주에 같은 한국 작품을 보나.**
 *
 * ── 🔴 왜 재나 (2026-09-03) ─────────────────────────────────
 * `/all-ten` 을 만들면서 눈에 걸린 것이 있다 — 2022-07-31 주에 **인도네시아와 말레이시아의
 * 시리즈 톱10이 «같은 열 편»**이었다. 우리 기사가 그것을 「once, and it has not happened
 * again」이라고 적었다. 그런데 **얼마나 닮았나를 잰 적은 없다.** 한 번 같았다는 것과
 * 늘 비슷하다는 것은 다른 말이고, 우리는 그 둘을 가릴 수를 갖고 있지 않았다.
 *
 * ⭐ 이 자는 나라쌍마다 **주별 겹침(자카드)**을 재서 평균을 낸다.
 *   ```
 *   그 주 A 의 한국 작품 집합 ∩ B 의 것   /   A ∪ B
 *   ```
 * ⛔ 「같은 취향」이라 부르지 않는다. 우리가 잰 것은 **넷플릭스가 그 주에 그 나라 목록에
 *   올린 것**이고, 그것은 취향·라이선스·공개일이 섞인 결과다.
 *
 * ── ⛔ 이 자가 지키는 것 ────────────────────────────────────
 * ⛔ 둘 다 한국 작품이 **한 편이라도** 있는 주만 센다. 둘 다 없는 주를 「완전히 같다」로
 *   세면 한국 작품을 안 받는 나라끼리 1.0 이 나온다 — 그것이 이 자를 처음 쓸 때 낼 뻔한 흠이다.
 * ⛔ 겹치는 주가 적은 쌍은 안 낸다(최소 50주). 우리가 고른 자리이므로 그 수를 밝힌다.
 * ⛔ 한국 작품 판정은 대표 규칙 하나(`koreanTitleFilter`)를 부른다. 여기서 새로 정하지 않는다.
 * ⛔ 러시아는 뺀다 — 2022-02 부터 넷플릭스가 목록을 안 낸다.
 * ⚠ 시즌은 넷플릭스가 따로 싣는다. 제목 글자로 집합을 만들므로 두 시즌은 두 원소다.
 *   그것이 겹침을 조금 낮춘다 — 낮추는 쪽이라 「닮았다」를 부풀리지 않는다.
 *
 * 쓰는 법
 *   node scripts/build-kcw-same-list.mjs --자가시험
 *   node scripts/build-kcw-same-list.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { 오늘 } from './_kst.mjs';
import { koreanTitleFilter } from './lib/korean-netflix-titles.mjs';

const 뿌리 = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const 나라파일 = path.join(뿌리, 'archive/raw/netflix-top10/countries.ndjson');
const 낼곳 = path.join(뿌리, 'src/data/kcw-same-list.json');

/** 최소 겹침 주 — 이 아래는 안 낸다 */
export const 최소주 = 50;

/**
 * 두 집합의 겹침(자카드). 둘 다 비면 **null** — 「같다」가 아니라 「잴 것이 없다」다.
 * ⛔ 여기서 0 이나 1 을 돌려주면 한국 작품을 안 받는 나라끼리 최고점이 된다.
 */
export function 겹침(A, B) {
  const a = A instanceof Set ? A : new Set(A ?? []);
  const b = B instanceof Set ? B : new Set(B ?? []);
  if (!a.size && !b.size) return null;
  let 공통 = 0;
  for (const x of a) if (b.has(x)) 공통 += 1;
  const 합 = a.size + b.size - 공통;
  return 합 ? 공통 / 합 : null;
}

if (process.argv.includes('--자가시험')) {
  const 실 = [];
  const 검 = (n, ok) => { if (!ok) 실.push(n); };
  검('같은 집합은 1', 겹침(['a', 'b'], ['b', 'a']) === 1);
  검('겹침이 없으면 0', 겹침(['a'], ['b']) === 0);
  검('반만 겹치면 1/3', Math.abs(겹침(['a', 'b'], ['b', 'c']) - 1 / 3) < 1e-9);
  검('⛔ 둘 다 비면 null — 「같다」가 아니다', 겹침([], []) === null);
  검('한쪽만 비면 0', 겹침(['a'], []) === 0);
  검('⛔ 빈 것도 안 터진다', 겹침(undefined, undefined) === null);
  if (실.length) {
    console.error(`❌ 자가시험 실패 ${실.length}\n${실.map((s) => `   · ${s}`).join('\n')}`);
    process.exit(1);
  }
  console.log('✅ build-kcw-same-list 자가시험 통과 (6)');
  process.exit(0);
}

if (!fs.existsSync(나라파일)) {
  console.log(`⬜ **못 쟀다** — ${path.relative(뿌리, 나라파일)} 가 없다. archive/ 는 git 에 안 올라간다.`);
  process.exit(1);
}

const ko = await koreanTitleFilter();
if (!ko || typeof ko.keepTitle !== 'function') {
  console.log('⛔ 한국 제목 규칙을 못 불렀다 — 여기서 새로 정하지 않는다');
  process.exit(1);
}

/* 나라·주마다 그 주의 한국 작품 집합 */
const 주별 = new Map();     /* 주 → Map(iso2 → Set(제목)) */
const 나라이름 = new Map();
let 줄수 = 0;
for (const l of fs.readFileSync(나라파일, 'utf8').split('\n')) {
  if (!l) continue;
  let r;
  try { r = JSON.parse(l); } catch { continue; }
  const iso2 = String(r.iso2).toUpperCase();
  if (iso2 === 'RU') continue;
  줄수 += 1;
  if (r.국가 && !나라이름.has(iso2)) 나라이름.set(iso2, String(r.국가));
  if (!ko.keepTitle(r.제목)) continue;
  if (!주별.has(r.주)) 주별.set(r.주, new Map());
  const w = 주별.get(r.주);
  if (!w.has(iso2)) w.set(iso2, new Set());
  w.get(iso2).add(String(r.제목));
}

/* 쌍마다 합계 */
const 쌍 = new Map();
for (const [, w] of 주별) {
  const 나라들 = [...w.keys()].sort();
  for (let i = 0; i < 나라들.length; i += 1) {
    for (let j = i + 1; j < 나라들.length; j += 1) {
      const a = 나라들[i]; const b = 나라들[j];
      const v = 겹침(w.get(a), w.get(b));
      if (v === null) continue;
      const k = `${a}|${b}`;
      if (!쌍.has(k)) 쌍.set(k, { 합: 0, 주: 0, 같은주: 0, 크기합: 0, 굵합: 0, 굵주: 0 });
      const s = 쌍.get(k);
      const 크기 = Math.min(w.get(a).size, w.get(b).size);
      s.합 += v; s.주 += 1; s.크기합 += 크기;
      if (v === 1) s.같은주 += 1;
      /* 둘 다 다섯 편 이상인 주 — 집합이 작아서 쉽게 같아지는 것을 걸러 낸다 */
      if (크기 >= 5) { s.굵합 += v; s.굵주 += 1; }
    }
  }
}

const 쌍들 = [...쌍.entries()]
  .filter(([, s]) => s.주 >= 최소주)
  .map(([k, s]) => {
    const [a, b] = k.split('|');
    return {
      a, b,
      aName: 나라이름.get(a) ?? a,
      bName: 나라이름.get(b) ?? b,
      weeks: s.주,
      meanOverlapPc: +((100 * s.합) / s.주).toFixed(1),
      identicalWeeks: s.같은주,
      /* 그 주에 둘 중 적은 쪽이 몇 편이었나 — 이 수가 작으면 겹침이 쉽게 커진다 */
      meanSmallerSet: +(s.크기합 / s.주).toFixed(1),
      /* ⬜ 다섯 편 이상인 주가 스물이 안 되면 «못 쟀다»로 둔다.  */
      thickWeeks: s.굵주,
      thickOverlapPc: s.굵주 >= 20 ? +((100 * s.굵합) / s.굵주).toFixed(1) : null,
    };
  })
  .sort((x, y) => y.meanOverlapPc - x.meanOverlapPc);

/* 나라마다 «가장 닮은 상대» */
const 가장닮은 = new Map();
for (const p of 쌍들) {
  for (const [me, other, otherName] of [[p.a, p.b, p.bName], [p.b, p.a, p.aName]]) {
    const 이전 = 가장닮은.get(me);
    if (!이전 || p.meanOverlapPc > 이전.overlapPc) {
      가장닮은.set(me, {
        iso2: me, name: 나라이름.get(me) ?? me, partner: other, partnerName: otherName,
        overlapPc: p.meanOverlapPc, weeks: p.weeks,
      });
    }
  }
}

const out = {
  generated: 오늘(),
  source: 'Netflix Top 10 (Tudum) per-country weekly lists. Russia excluded — Netflix stopped publishing its list in February 2022.',
  question: 'Two countries, the same week. How much of each other\'s Korean list do they hold?',
  unit: 'For one week and one pair of countries, the share of the combined set of Korean titles that both countries held (an intersection over union). Averaged over every week in which at least one of the two had a Korean title.',
  whatThisIsNot: 'This is not taste. What we measured is what Netflix put on each list that week, and that is licensing, release dates and chart mechanics mixed together with whatever people opened.',
  whyBothMustHaveOne: 'Weeks in which neither country had a Korean title are left out. Counting them as agreement would make two markets that take no Korean content look like the most alike pair on the board.',
  minWeeks: 최소주,
  rowsRead: 줄수,
  weeksRead: 주별.size,
  pairsMeasured: 쌍들.length,
  pairsDropped: 쌍.size - 쌍들.length,
  topPairs: 쌍들.slice(0, 15),
  /* ⭐ 이쪽이 진짜 물음에 답한다 — 「둘 다 한국 작품을 여러 편 받는 주」에 얼마나 같은가 */
  topThickPairs: 쌍들.filter((x) => x.thickOverlapPc !== null)
    .sort((x, y) => y.thickOverlapPc - x.thickOverlapPc).slice(0, 15),
  thickPairsMeasured: 쌍들.filter((x) => x.thickOverlapPc !== null).length,
  bottomPairs: 쌍들.slice(-10).reverse(),
  /* 한국이 낀 쌍 — 굵은 주 기준 위 다섯과 모든 주 기준 위 다섯 */
  koreaThick: 쌍들.filter((x) => (x.a === 'KR' || x.b === 'KR') && x.thickOverlapPc !== null)
    .sort((x, y) => y.thickOverlapPc - x.thickOverlapPc).slice(0, 5),
  koreaAll: 쌍들.filter((x) => x.a === 'KR' || x.b === 'KR')
    .sort((x, y) => y.meanOverlapPc - x.meanOverlapPc).slice(0, 5),
  koreaBottom: 쌍들.filter((x) => x.a === 'KR' || x.b === 'KR')
    .sort((x, y) => x.meanOverlapPc - y.meanOverlapPc).slice(0, 5),
  closestPartner: [...가장닮은.values()].sort((a, b) => b.overlapPc - a.overlapPc),
};
fs.writeFileSync(낼곳, `${JSON.stringify(out, null, 2)}\n`, 'utf8');
console.log(`줄 ${줄수.toLocaleString('en-US')} · 주 ${주별.size} · 쌍 ${쌍.size} (낸 것 ${쌍들.length} · 뺀 것 ${쌍.size - 쌍들.length})`);
console.log('\n■ 둘 다 다섯 편 이상인 주만 (집합이 작아 쉽게 같아지는 것을 걸러 낸 것)');
for (const p of 쌍들.filter((x) => x.thickOverlapPc !== null).sort((x, y) => y.thickOverlapPc - x.thickOverlapPc).slice(0, 10)) {
  console.log(`   ${p.aName} — ${p.bName}  ${p.thickOverlapPc}%  (${p.thickWeeks}주)`);
}
console.log('\n■ 모든 주 (집합이 작은 주까지 포함 — 위 열 쌍은 대개 한 편씩만 받는 시장이다)');
for (const p of 쌍들.slice(0, 10)) {
  console.log(`   ${p.aName} — ${p.bName}  ${p.meanOverlapPc}%  (${p.weeks}주 · 적은 쪽 평균 ${p.meanSmallerSet}편)`);
}
console.log(`냈다 — ${path.relative(뿌리, 낼곳)}`);
