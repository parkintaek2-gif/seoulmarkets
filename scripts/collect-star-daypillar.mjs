#!/usr/bin/env node
/**
 * collect-star-daypillar.mjs — 한국 연예인의 **공개된 생년월일**을 캐서 일주(日柱)를 세운다.
 *
 * ── 왜 ─────────────────────────────────────────────────────────
 * 영문권에서 「아이돌 사주」를 내는 곳을 여덟 곳 넘게 세어 봤다(2026-08-22). 전부 같은 꼴이다 —
 * **한 사람의 여덟 글자를 풀어 준다.** 표본 1, 분모 없음.
 * 그 자리에 아홉 번째로 들어가면 우리가 더 잘 쓸 것이 없고, 우리 강령과도 어긋난다
 * (「⛔ 이렇게 하세요 → ✅ N명 중 M명이 그렇다」).
 *
 * ⭐ 그래서 **분모를 만든다.** 한 사람을 풀지 않고 만 명을 센다.
 *   저쪽이 이걸 안 하는 까닭은 간단하다 — 한 사람을 풀어 주는 장사는 분모가 필요 없다.
 *
 * ── 왜 위키데이터에서 캐나 ─────────────────────────────────────
 * 🔴 2026-08-22 07:5x — 이 서버에 `archive/`(원자료)가 **아예 없다.** 서버 이사에서 안 실렸다.
 *   그래서 1,047명 명단(`archive/raw/wikidata/korean-people.json`)을 열 수 없다.
 *   기다리지 않고 **직접 캔다.** 캐는 김에 분모가 열 배로 커진다.
 *
 * ⛔ 사람(P31=Q5)·대한민국 국적(P27=Q884)·연예 직업(P106)만 센다.
 * ⛔ 생년월일이 **날까지(precision 11)** 적힌 사람만 일주를 세운다.
 *    달·해까지만 적힌 사람은 「못 잼」으로 **따로 센다.** 
 * ⛔ 「막혀서 못 물은 것」과 「자료에 없는 것」을 섞지 않는다 — 8/20 에 자가 거짓말을 한 자리다.
 *
 * 쓰는 법  node scripts/collect-star-daypillar.mjs
 *          node scripts/collect-star-daypillar.mjs --자가시험
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { 일주 } from './lib/일주.mjs';

const 뿌리 = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const 원자료낼곳 = path.join(뿌리, 'archive/raw/wikidata/korean-entertainers-birth.json');
const 낼곳 = path.join(뿌리, 'src/data/wikitip-star-daypillar.json');

/** 셀 직업 — 배우 · 가수 · 작곡가 · 모델. ⚠ 늘리면 분모가 바뀐다. 바꿀 때 지면 문구도 같이 바꾼다 */
export const 직업 = { Q33999: 'actor', Q177220: 'singer', Q753110: 'songwriter', Q639669: 'musician' };

const 머리말 = {
  'User-Agent': 'kculturewire.com research (contact: parkintaek2@gmail.com)',
  Accept: 'application/sparql-results+json',
};
const 쉼 = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * 막히면 되묻고, 끝내 못 물으면 **undefined** 를 돌려준다.
 * ⛔ `null`(자료에 없다)과 `undefined`(못 물었다)를 다르게 쓴다.
 */
async function 참을성있게(질의, 몇번 = 4) {
  const u = 'https://query.wikidata.org/sparql?format=json&query=' + encodeURIComponent(질의);
  for (let i = 0; i < 몇번; i++) {
    try {
      const r = await fetch(u, { headers: 머리말 });
      if (r.ok) return (await r.json()).results.bindings;
      if (r.status !== 429 && r.status < 500) return null;
    } catch { /* 그물이 끊긴 것 — 되묻는다 */ }
    await 쉼(2000 * (i + 1));
  }
  return undefined;
}

/**
 * 태어난 해 구간으로 잘라 묻는다 — 만 건을 한 번에 물으면 끊긴다.
 *
 * 🔴 2026-08-22 08:4x — 첫 판에는 구멍이 둘 있었다. 그룹 표를 짜다 같은 병을 잡고 여기도 고쳤다.
 *   ① `p:P569/psv:P569` 를 아무 진술이나 받았다 → **정밀도가 낮은 옛 진술**을 집어
 *      「달까지만 적혀 있다」로 세는 사람이 생긴다. `wikibase:BestRank` 만 받는다.
 *   ② `rdfs:label ... LANG = "en"` 을 **필수**로 걸었다 → 영문 이름표가 없는 사람이
 *      **조용히 빠진다.** 이름표가 없는 것과 사람이 없는 것은 다르다.
 *      ⇒ 영문 라벨 → 영문 별칭 → 한국어 라벨 순으로 받고, 그래도 없으면 Q번호를 쓴다.
 */
export const 질의만들기 = (부터, 까지) => `
SELECT ?p ?pLabel ?alias ?koLabel ?b ?prec ?sl WHERE {
  ?p wdt:P31 wd:Q5 ; wdt:P27 wd:Q884 ; wdt:P106 ?occ .
  VALUES ?occ { ${Object.keys(직업).map((q) => `wd:${q}`).join(' ')} }
  ?p p:P569 ?st . ?st a wikibase:BestRank ;
     psv:P569 [ wikibase:timeValue ?b ; wikibase:timePrecision ?prec ] .
  ?p wikibase:sitelinks ?sl .
  FILTER(YEAR(?b) >= ${부터} && YEAR(?b) <= ${까지})
  OPTIONAL { ?p skos:altLabel ?alias . FILTER(LANG(?alias) = "en") }
  OPTIONAL { ?p rdfs:label ?koLabel . FILTER(LANG(?koLabel) = "ko") }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
}`;

/* ── 세는 부분 — 그물 없이 시험할 수 있게 따로 뺐다 ─────────── */

/**
 * 사람 목록 → 일간·일지·오행 칸 세기. **줄마다 n 을 남긴다.**
 * @param {{name:string, born:string, sitelinks:number}[]} 사람들 날까지 있는 사람만
 */
export function 세기(사람들) {
  const 칸 = { 일간: {}, 일지: {}, 오행: {} };
  const 이름칸 = {};
  for (const p of 사람들) {
    const j = 일주(p.born);
    if (!j.일주) continue;
    for (const [축, 값] of [['일간', j.일간한자], ['일지', j.일지한자], ['오행', j.오행]]) {
      칸[축][값] = (칸[축][값] ?? 0) + 1;
    }
    (이름칸[j.일간한자] ??= []).push(p);
  }
  /* 칸마다 «가장 많이 링크된 이름» 셋 — 지면에 이름을 놓아야 사람이 찾아 들어온다(사장님 상시 지시) */
  const 보기이름 = {};
  for (const [k, v] of Object.entries(이름칸)) {
    보기이름[k] = v.sort((a, b) => b.sitelinks - a.sitelinks).slice(0, 3).map((p) => p.name);
  }
  return { 칸, 보기이름 };
}

/**
 * 고른 분포와 견준다. 자유도는 칸수−1.
 * ⛔ 「우연이 아니다」를 말하려면 문턱을 넘어야 한다. 넘지 않으면 **넘지 않았다고 적는다.**
 */
export function 카이제곱(칸) {
  const 값 = Object.values(칸);
  const n = 값.reduce((a, b) => a + b, 0);
  const 기대 = n / 값.length;
  const χ2 = 값.reduce((a, o) => a + (o - 기대) ** 2 / 기대, 0);
  return { n, 칸수: 값.length, 기대: +기대.toFixed(1), 카이제곱: +χ2.toFixed(2) };
}

/** 0.05 문턱 — 자유도별. ⚠ 표에서 옮겨 적은 값이다. 우리가 센 것이 아니다 */
export const 문턱 = { 4: 9.49, 9: 16.92, 11: 19.68 };

if (process.argv.includes('--자가시험')) {
  const 실패 = [];
  const 검 = (이름, 참) => { if (!참) 실패.push(이름); };

  const 사람 = [
    { name: 'IU', born: '1993-05-16', sitelinks: 90 },
    { name: 'Jungkook', born: '1997-09-01', sitelinks: 80 },
    { name: 'Karina', born: '2000-04-11', sitelinks: 30 },
  ];
  const { 칸, 보기이름 } = 세기(사람);
  검('아이유는 丁 칸에 든다', 칸.일간['丁'] === 1);
  검('정국은 丙 칸에 든다', 칸.일간['丙'] === 1);
  검('카리나는 己 칸에 든다', 칸.일간['己'] === 1);
  검('일지도 센다', 칸.일지['酉'] === 1 && 칸.일지['午'] === 1 && 칸.일지['亥'] === 1);
  검('칸마다 이름을 남긴다', 보기이름['丁'][0] === 'IU');
  검('날짜가 없는 사람은 안 센다', Object.values(세기([{ name: 'x', born: '', sitelinks: 0 }]).칸.일간).length === 0);

  const 고른것 = 카이제곱({ a: 25, b: 25, c: 25, d: 25 });
  검('고른 분포는 카이제곱 0', 고른것.카이제곱 === 0 && 고른것.n === 100);
  const 쏠린것 = 카이제곱({ a: 100, b: 0, c: 0, d: 0 });
  검('한 칸에 몰리면 커진다', 쏠린것.카이제곱 === 300);

  검('질의에 직업 넷이 다 들어간다', Object.keys(직업).every((q) => 질의만들기(1900, 2000).includes(q)));

  if (실패.length) { console.error('❌ 자가시험 실패\n' + 실패.map((s) => `   · ${s}`).join('\n')); process.exit(1); }
  console.log('✅ collect-star-daypillar 자가시험 통과 (9)');
  process.exit(0);
}

/* ── 캔다 ────────────────────────────────────────────────────── */
const 구간 = [[1900, 1959], [1960, 1969], [1970, 1979], [1980, 1984], [1985, 1989],
  [1990, 1994], [1995, 1999], [2000, 2004], [2005, 2029]];

const 사람들 = new Map();
let 못물은구간 = 0;
let 달까지만 = 0;

for (const [부터, 까지] of 구간) {
  const 줄 = await 참을성있게(질의만들기(부터, 까지));
  if (줄 === undefined) { 못물은구간++; console.log(`  ⚠ ${부터}~${까지} — 못 물었다(빼지도, 0으로 세지도 않는다)`); continue; }
  if (줄 === null) { 못물은구간++; console.log(`  ⚠ ${부터}~${까지} — 질의가 거절됐다`); continue; }
  let 이번 = 0;
  const 낮은정밀도 = new Set();
  for (const b of 줄) {
    const q = b.p.value.split('/').pop();
    const prec = Number(b.prec.value);
    /* 이름표 — 영문 라벨 → 영문 별칭 → 한국어 라벨 → Q번호. 이름표가 없다고 사람을 빼지 않는다 */
    const 이름 = (b.pLabel?.value && b.pLabel.value !== q ? b.pLabel.value : null)
      ?? b.alias?.value ?? b.koLabel?.value ?? q;
    if (prec < 11) { 낮은정밀도.add(q); continue; }
    if (사람들.has(q)) continue;
    사람들.set(q, { q, name: 이름, born: b.b.value.slice(0, 10), sitelinks: Number(b.sl.value) });
    이번++;
  }
  /* ⚠ 같은 사람이 낮은 진술과 높은 진술로 둘 다 왔으면 **높은 쪽이 이긴다** — 「못 잼」으로 안 센다 */
  for (const q of 낮은정밀도) if (!사람들.has(q)) 달까지만++;
  console.log(`  ${부터}~${까지}  ${이번}명 (누적 ${사람들.size})`);
  await 쉼(1500);
}

const 목록 = [...사람들.values()];
if (!목록.length) { console.error('❌ 한 명도 못 캤다 — 못 잰 것을 잰 척하지 않는다. 낸 파일 없음'); process.exit(1); }

fs.mkdirSync(path.dirname(원자료낼곳), { recursive: true });
fs.writeFileSync(원자료낼곳, JSON.stringify({ 잰때: new Date().toISOString(), 사람수: 목록.length, 사람: 목록 }, null, 1));

/* 널리 알려진 쪽만 따로 — 「많이 링크된 상위 10%」 */
const 정렬 = [...목록].sort((a, b) => b.sitelinks - a.sitelinks);
const 상위 = 정렬.slice(0, Math.max(1, Math.round(정렬.length * 0.1)));

const 전체 = 세기(목록);
const 상위셈 = 세기(상위);

const 낼것 = {
  generated: new Date().toISOString(),
  source: 'Wikidata (P31=Q5, P27=Q884, P106 in {actor, singer, songwriter, musician}), date of birth P569 with day precision, CC0',
  question: 'Does any day pillar show up more often than chance among Korean entertainers — and among the most-linked of them?',
  unit: 'people',
  measured: 목록.length,
  monthOnlyExcluded: 달까지만,
  unaskedRanges: 못물은구간,
  mostLinkedCut: 상위.length,
  mostLinkedThresholdSitelinks: 상위.length ? 상위[상위.length - 1].sitelinks : null,
  all: {
    dayStem: 전체.칸.일간, dayBranch: 전체.칸.일지, element: 전체.칸.오행,
    chiSquareDayStem: 카이제곱(전체.칸.일간), chiSquareDayBranch: 카이제곱(전체.칸.일지),
  },
  mostLinked: {
    dayStem: 상위셈.칸.일간, dayBranch: 상위셈.칸.일지, element: 상위셈.칸.오행,
    chiSquareDayStem: 카이제곱(상위셈.칸.일간), chiSquareDayBranch: 카이제곱(상위셈.칸.일지),
  },
  thresholds: 문턱,
  examplesByDayStem: 전체.보기이름,
  whatThisCannotSay: [
    'A day pillar is one of the four pillars. The hour pillar cannot be built here: public records carry birth dates and almost never birth hours.',
    'Counting who exists is not counting who succeeded. Sitelink counts are a proxy for how widely a person is written about, not for talent, income or chart position.',
    'People whose birth date is recorded only to the month or year were left out and counted separately, not folded in as zeroes.',
  ],
};
fs.writeFileSync(낼곳, JSON.stringify(낼것, null, 1));

console.log(`\n✅ ${목록.length}명 · 달까지만 적힌 사람 ${달까지만}명(따로 셈) · 못 물은 구간 ${못물은구간}개`);
console.log(`   일간 카이제곱 ${낼것.all.chiSquareDayStem.카이제곱} (문턱 ${문턱[9]}) · 일지 ${낼것.all.chiSquareDayBranch.카이제곱} (문턱 ${문턱[11]})`);
console.log(`   많이 링크된 ${상위.length}명 — 일간 ${낼것.mostLinked.chiSquareDayStem.카이제곱} · 일지 ${낼것.mostLinked.chiSquareDayBranch.카이제곱}`);
console.log(`   냈다 — ${path.relative(뿌리, 낼곳)}`);
