#!/usr/bin/env node
/**
 * **큰 한국 작품이 들어오면 그 시장의 다른 한국 작품이 밀려나나.** (`/crowding` · 기사 74편째)
 *
 * ── 왜 ─────────────────────────────────────────────────────────
 *   2026-08-09, `/hard-markets` 에 이렇게 적었다 —
 *   「한국 작품을 드물게 트는 시장은 **한국 칸이 하나**라 큰 작품이 그 칸을 가져가는 것이 당연하다」
 *   ⛔ **안 재고 적었다.** 그럴듯한 설명이었을 뿐이다. 그래서 잰다.
 *
 * ── 어떻게 ────────────────────────────────────────────────────
 *   한 시장·한 차트(Films 또는 TV)에서 한국 작품이 **1~3위로 새로 들어온 주**를 찾는다.
 *   그 편을 뺀 **다른 한국 작품 수**가 앞 4주 → 뒤 4주에 어떻게 되나.
 *   대조군: 같은 자리에 **남의 작품**이 1~3위로 새로 들어온 주.
 *
 * ── 🔴 교란 ───────────────────────────────────────────────────
 *   겉보기로는 -0.395 대 -0.014, 스물여덟 배다. **믿으면 안 된다.**
 *   출발점이 1.92 대 0.56 이다 — 한국 작품이 1위로 들어오는 시장은 원래 한국 작품이 많고,
 *   **높은 데서 시작하면 그냥 내려온다.**
 *   ⭐ 그래서 출발점 띠로 묶어 같은 자리끼리 견주고, 한국 쪽 출발점 분포에 대조군을 맞춘다.
 *
 * ── ⛔ 이 자료가 지키는 것 ───────────────────────────────────
 * ⛔ 겉보기 수와 맞춘 뒤의 수를 **둘 다** 낸다. 맞춘 것만 내면 왜 맞췄는지 안 보인다.
 * ⛔ 출발점 0인 띠에서 **효과가 없다**는 것을 감추지 않는다 — 그 띠가 이 주장의 반례다.
 * ⛔ 시장을 줄세우지 않는다.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { 지금 } from './_kst.mjs';

const 표 = 'archive/raw/netflix-top10/countries.ndjson';
const 판정 = 'src/data/wikitip-title-ambiguity.json';
const 결과 = 'src/data/wikitip-crowding.json';
const 앞뒤 = 4;                 /* 앞 4주 · 뒤 4주 */
const 큰자리 = 3;               /* 1~3위를 「큰 것」으로 본다 */

/** 출발점 띠. 0 을 따로 두는 것이 요점이다 — 거기서 효과가 사라진다. */
export const 띠 = [
  { name: '0', lo: 0, hi: 0.5 },
  { name: '1', lo: 0.5, hi: 1.5 },
  { name: '2', lo: 1.5, hi: 2.5 },
  { name: '3', lo: 2.5, hi: 4 },
  { name: '4 or more', lo: 4, hi: Infinity },
];

/** 짝 [앞, 뒤] 들의 평균 변화. 빈 것은 null — **0 이 아니다.** */
export function 평균변화(짝) {
  if (!짝.length) return null;
  return 짝.reduce((s, [a, b]) => s + (b - a), 0) / 짝.length;
}

export function 평균앞(짝) {
  if (!짝.length) return null;
  return 짝.reduce((s, [a]) => s + a, 0) / 짝.length;
}

export function 띠고르기(짝, b) {
  return 짝.filter(([앞]) => 앞 >= b.lo && 앞 < b.hi);
}

/**
 * 출발점 분포를 **한국 쪽에 맞춘** 대조군 값.
 * 「같은 자리에서 시작했으면 남의 작품이 들어왔어도 얼마나 내려갔을까」
 * ⛔ 한쪽 띠가 비면 그 띠는 **안 센다.** 없는 것을 
 */
export function 맞춘대조(한, 남) {
  let 합 = 0; let 셈 = 0;
  for (const b of 띠) {
    const A = 띠고르기(한, b);
    const B = 띠고르기(남, b);
    if (!A.length || !B.length) continue;
    합 += A.length * 평균변화(B);
    셈 += A.length;
  }
  return 셈 ? 합 / 셈 : null;
}

const 내가실행됐다 = process.argv[1]
  && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);

if (내가실행됐다 && process.argv.includes('--selftest')) {
  let 통 = 0; let 실 = 0;
  const 재본다 = (이름, 실제, 바람) => {
    if (JSON.stringify(실제) === JSON.stringify(바람)) 통 += 1;
    else { 실 += 1; console.error(`  ⛔ ${이름}\n     받은 것: ${JSON.stringify(실제)}`); }
  };
  재본다('평균변화', 평균변화([[2, 1], [3, 1]]), -1.5);
  재본다('평균변화 — 빈 것은 null(0 이 아니다)', 평균변화([]), null);
  재본다('평균앞', 평균앞([[2, 1], [4, 1]]), 3);
  재본다('띠고르기 — 0 띠', 띠고르기([[0, 1], [1, 2]], 띠[0]).length, 1);
  재본다('띠고르기 — 4 이상', 띠고르기([[4, 1], [9, 2], [3, 1]], 띠[4]).length, 2);
  재본다('띠가 다섯', 띠.length, 5);
  /* ⭐ 이 자의 요점 — 출발점이 같으면 대조군도 같이 내려간다 */
  재본다('맞춘대조 — 같은 띠끼리 견준다',
    맞춘대조([[2, 1]], [[2, 1.5], [0, 0.5]]), -0.5);
  재본다('맞춘대조 — 대조군에 그 띠가 없으면 안 센다',
    맞춘대조([[9, 8]], [[0, 0.5]]), null);
  재본다('맞춘대조 — 둘 다 비면 null', 맞춘대조([], []), null);
  console.log(`밀어냄 짓는 자 — 자가시험 ${통} 통과 · ${실} 실패`);
  process.exit(실 ? 1 : 0);
}

if (내가실행됐다) {
  for (const p of [표, 판정]) {
    if (!fs.existsSync(p)) { console.error(`⛔ 없다 — ${p}`); process.exit(1); }
  }
  const 판 = JSON.parse(fs.readFileSync(판정, 'utf8'));
  const 한국제목 = new Set(판.perTitle.map((x) => x.title));

  /** (시장|구분|주) → [{제목, 순위, 한국}] */
  const 칸 = new Map();
  let 읽은줄 = 0;
  for (const 줄 of fs.readFileSync(표, 'utf8').split('\n')) {
    if (!줄.trim()) continue;
    let j; try { j = JSON.parse(줄); } catch { continue; }
    if (j.국가 === 'Russia') continue;
    읽은줄 += 1;
    const k = `${j.국가}|${j.구분}|${j.주}`;
    if (!칸.has(k)) 칸.set(k, []);
    칸.get(k).push({ 제목: j.제목, 순위: j.순위, 한국: 한국제목.has(j.제목) });
  }
  const 줄기 = new Map();
  for (const k of 칸.keys()) {
    const [국, 구, 주] = k.split('|');
    const g = `${국}|${구}`;
    if (!줄기.has(g)) 줄기.set(g, []);
    줄기.get(g).push(주);
  }
  for (const v of 줄기.values()) v.sort();

  const 있나 = (국, 구, 주, 제목) => (칸.get(`${국}|${구}|${주}`) ?? []).some((r) => r.제목 === 제목);

  const 재기 = (한국쪽) => {
    const 짝 = [];
    for (const [g, 주들] of 줄기) {
      const [국, 구] = g.split('|');
      for (let i = 앞뒤; i < 주들.length - (앞뒤 - 1); i += 1) {
        const 주 = 주들[i]; const 전주 = 주들[i - 1];
        const 들어온것 = (칸.get(`${국}|${구}|${주}`) ?? [])
          .filter((r) => r.순위 <= 큰자리 && r.한국 === 한국쪽 && !있나(국, 구, 전주, r.제목));
        if (!들어온것.length) continue;
        const 그편 = new Set(들어온것.map((r) => r.제목));
        const 나머지 = (w) => (칸.get(`${국}|${구}|${w}`) ?? [])
          .filter((r) => r.한국 && !그편.has(r.제목)).length;
        const 앞 = [1, 2, 3, 4].map((n) => 나머지(주들[i - n])).reduce((a, b) => a + b, 0) / 앞뒤;
        const 뒤 = [0, 1, 2, 3].map((n) => 나머지(주들[i + n])).reduce((a, b) => a + b, 0) / 앞뒤;
        짝.push([앞, 뒤]);
      }
    }
    return 짝;
  };

  const 한 = 재기(true);
  const 남 = 재기(false);
  const 실제 = 평균변화(한);
  const 기대 = 맞춘대조(한, 남);
  const 안맞춘차이 = 실제 - 평균변화(남);
  const 남는몫 = 실제 - 기대;

  /* 🔴 이 기사의 뼈대 — 맞춘 뒤에도 남는 것이 있어야 「밀어낸다」를 쓸 수 있다.
     ⛔ 그런데 **없어도 그대로 낸다.** 그때는 기사가 다른 글이 될 뿐이다. */
  const 설명된몫 = +(100 * (1 - 남는몫 / 안맞춘차이)).toFixed(0);

  const 띠표 = 띠.map((b) => {
    const A = 띠고르기(한, b);
    const B = 띠고르기(남, b);
    return {
      band: b.name,
      koreanArrivals: A.length,
      koreanChange: A.length ? +평균변화(A).toFixed(3) : null,
      otherArrivals: B.length,
      otherChange: B.length ? +평균변화(B).toFixed(3) : null,
      gap: (A.length && B.length) ? +(평균변화(A) - 평균변화(B)).toFixed(3) : null,
    };
  });

  const out = {
    generated: 지금(),
    source: 'Netflix Top 10 (Tudum) per-country weekly lists, Films and TV counted as separate charts',
    question: 'When a Korean title arrives at the top of a market, do the other Korean titles there lose their places?',
    unit: 'Titles. The count is of *other* Korean titles on that chart, with the arriving title removed.',
    whyItWasAsked: 'We published the sentence "there is one Korean slot and the biggest title takes '
      + 'it" as an explanation on /hard-markets without measuring it.',
    rowsRead: 읽은줄,
    windowWeeks: 앞뒤,
    topRanks: 큰자리,
    koreanArrivals: 한.length,
    otherArrivals: 남.length,
    koreanBefore: +평균앞(한).toFixed(3),
    otherBefore: +평균앞(남).toFixed(3),
    koreanChange: +실제.toFixed(3),
    otherChange: +평균변화(남).toFixed(3),
    rawGap: +안맞춘차이.toFixed(3),
    matchedControl: +기대.toFixed(3),
    excess: +남는몫.toFixed(3),
    explainedByStartingLevelPc: 설명된몫,
    bands: 띠표,
    whyMatching: 'A Korean title reaches the top three most often in markets that already carry '
      + 'several Korean titles, and a chart that starts high falls whatever arrives. The control is '
      + 'weighted to the same starting levels as the Korean cases.',
    cannotAnswer: 'It shows places, not why they moved. A title leaving after a hit arrives may be '
      + 'ending its own run rather than being displaced, and nothing in a rank table separates the two.',
  };
  fs.writeFileSync(결과, `${JSON.stringify(out, null, 2)}\n`);
  console.log(`한국 ${out.koreanArrivals}건 · 남 ${out.otherArrivals}건`);
  console.log(`겉보기 차이 ${out.rawGap} → 맞춘 뒤 남는 몫 ${out.excess} (${out.explainedByStartingLevelPc}% 는 출발점)`);
  for (const b of 띠표) console.log(`  ${b.band.padEnd(10)} 한국 ${b.koreanChange} · 남 ${b.otherChange} · 차이 ${b.gap}`);
}
