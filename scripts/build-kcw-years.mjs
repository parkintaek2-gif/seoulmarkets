#!/usr/bin/env node
/**
 * build-kcw-years.mjs — **연도 축.** `src/data/wikitip-years.json` → `/year/<연도>`
 *
 * ── 왜 (2026-08-23) ───────────────────────────────────────────
 * ① 제가 잰 말에 **연도가 거의 전부 붙어 있었습니다.** 따로 열 개를 재니 —
 * ```
 *  korean drama 2026 · korean drama 2025 · best korean drama 2026 · top 10 korean drama 2026
 *  korean series 2026 · new korean drama 2026 · korean drama 2024   … 자동완성 1번째 · 10줄
 *  kdrama 2026 list 8줄 · korean drama netflix 2025 5줄 · netflix korean movies 2026 4줄
 * ```
 *   **열 개가 전부 1번째**입니다. 이만큼 고른 신호가 나온 축이 없었습니다.
 * ② 그리고 이 축은 **모든 작품에 있습니다.** 배우·회사 자료가 둘 다 없는 작품 50장은
 *   지금 걷는 축(배우·제작사)으로는 닿을 길이 없는데, 그 50장 전부가 연도를 갖고 있습니다.
 *   ⇒ 유입(잰 말)과 색인·체류(들어오는 길)를 **한 축으로** 엽니다.
 *
 * ── ⛔ 이 자가 지키는 것 ──────────────────────────────────────
 * 🔴 **두 해가 반토막입니다.** 자료가 2021-07-04 에 시작하고 2026-07-26 에 끝납니다.
 *   그래서 2021 은 반 년이고 2026 도 반 년입니다. ⛔ 105편(2021) 대 184편(2022) 을
 *   나란히 놓으면 **없던 성장으로 읽힙니다.** 그 두 해에 「반 년만 담겼다」를 못박습니다.
 *   ⚠ 이것이 우리가 「없던 하락」 기사에서 겪은 것과 같은 흠이다 — 자료 창이 바뀐 것을
 *     세상이 바뀐 것으로 읽는 일.
 * ⛔ 작품을 순위로 세우지 않습니다. 그 해에 **차트 자리를 많이 가진 순**으로 놓되,
 *   그것을 「그 해 최고」라 부르지 않습니다. 차트 자리는 시청시간이 아닙니다.
 * ⛔ 못 잰 칸을 
 *
 * 쓰는 법
 *   node scripts/build-kcw-years.mjs --자가시험
 *   node scripts/build-kcw-years.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
/* 🔴 [2026-09-03] UTC 로 날짜를 만들던 자리를 KST 로 고쳤다 —
   CLAUDE.md 🔴 「toISOString() 도 쓰지 않는다. 날짜를 만들면 새벽에 하루가 어긋난다」 */
import { 오늘 } from './_kst.mjs';

const 뿌리 = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const 자료길 = path.join(뿌리, 'src/data/wikitip-title-pages.json');
const 낼길 = path.join(뿌리, 'src/data/wikitip-years.json');

/** 그 해에 담긴 주가 몇인가 — 반토막 해를 알아보려면 이것이 필요하다 */
export function 그해의주수(연도, 처음주, 마지막주) {
  const y = Number(연도);
  const a = new Date(`${y}-01-01T00:00:00Z`);
  const b = new Date(`${y}-12-31T00:00:00Z`);
  const 시작 = new Date(처음주 > `${y}-01-01` ? 처음주 : a.toISOString().slice(0, 10));
  const 끝 = new Date(마지막주 < `${y}-12-31` ? 마지막주 : b.toISOString().slice(0, 10));
  if (끝 < 시작) return 0;
  return Math.floor((끝 - 시작) / (7 * 86400000)) + 1;
}

/** 반토막인가 — 그 해에 담긴 주가 마흔 주도 안 되면 온 해가 아니다 */
export const 반토막인가 = (주수) => (typeof 주수 === 'number' ? 주수 < 40 : null);

/** 해마다 작품을 모은다. ⛔ 연도 칸이 없는 작품은 넣지 않는다 — 0 으로 안 채운다 */
export function 해로모으기(작품들) {
  const 표 = new Map();
  for (const t of 작품들 ?? []) {
    for (const y of t.byYear ?? []) {
      if (typeof y?.year !== 'number' || typeof y?.places !== 'number') continue;
      if (!표.has(y.year)) 표.set(y.year, []);
      표.get(y.year).push({
        title: t.title,
        slug: t.slug,
        type: t.type,
        places: y.places,
        markets: typeof t.markets === 'number' ? t.markets : null,
        weeks: typeof t.weeks === 'number' ? t.weeks : null,
      });
    }
  }
  for (const [k, v] of 표) 표.set(k, v.sort((a, b) => b.places - a.places));
  return 표;
}

if (process.argv.includes('--자가시험')) {
  const 실패 = [];
  const 검 = (이름, 참) => { if (!참) 실패.push(이름); };

  /* 🔴 실제 자료 창이다 — 2021 은 7월 시작, 2026 은 7월 끝 */
  검('온 해는 쉰두 주 안팎', 그해의주수(2023, '2021-07-04', '2026-07-26') >= 52);
  검('⭐ 첫 해는 반토막', 반토막인가(그해의주수(2021, '2021-07-04', '2026-07-26')) === true);
  검('⭐ 마지막 해도 반토막', 반토막인가(그해의주수(2026, '2021-07-04', '2026-07-26')) === true);
  검('가운데 해는 반토막이 아니다', 반토막인가(그해의주수(2024, '2021-07-04', '2026-07-26')) === false);
  검('자료 밖의 해는 0주', 그해의주수(2019, '2021-07-04', '2026-07-26') === 0);
  검('⛔ 수가 아니면 null', 반토막인가(null) === null);

  const 표본 = [
    { title: 'A', slug: 'a', type: 'TV', markets: 3, weeks: 5, byYear: [{ year: 2024, places: 30 }, { year: 2025, places: 4 }] },
    { title: 'B', slug: 'b', type: 'Films', markets: 40, weeks: 2, byYear: [{ year: 2024, places: 90 }] },
    { title: 'C', slug: 'c', type: 'TV', markets: 1, weeks: 9, byYear: [] },
    { title: 'D', slug: 'd', type: 'TV', byYear: [{ year: 2024, places: null }] },
  ];
  const 표 = 해로모으기(표본);
  검('두 해를 찾는다', 표.size === 2);
  검('2024 에 둘', 표.get(2024).length === 2);
  검('자리가 많은 것이 앞에', 표.get(2024)[0].title === 'B');
  검('한 작품이 두 해에 걸린다', 표.get(2025).length === 1 && 표.get(2025)[0].title === 'A');
  검('⛔ 연도 칸이 없는 작품은 안 넣는다', !표.get(2024).some((x) => x.title === 'C'));
  검('⛔ 자리가 빈 줄은 안 넣는다 — 0 으로 안 채운다', !표.get(2024).some((x) => x.title === 'D'));
  검('⛔ 못 잰 나라·주는 null 로 남는다',
    해로모으기([{ title: 'E', slug: 'e', type: 'TV', byYear: [{ year: 2022, places: 1 }] }])
      .get(2022)[0].markets === null);
  검('⛔ 빈 입력도 안 터진다', 해로모으기(undefined).size === 0 && 해로모으기([]).size === 0);

  if (실패.length) {
    console.error(`❌ 자가시험 실패\n${실패.map((s) => `   · ${s}`).join('\n')}`);
    process.exit(1);
  }
  console.log('✅ build-kcw-years 자가시험 통과 (14)');
  process.exit(0);
}

const 원 = JSON.parse(fs.readFileSync(자료길, 'utf8'));
const 것들 = 원.titles.filter((t) => t.hasPage);
const 표 = 해로모으기(것들);

const 해들 = [...표.keys()].sort((a, b) => b - a).map((y) => {
  const a = 표.get(y);
  const 주수 = 그해의주수(y, 원.weekFrom, 원.weekTo);
  const tv = a.filter((x) => x.type === 'TV');
  return {
    year: y,
    weeksInData: 주수,
    partialYear: 반토막인가(주수),
    titles: a.length,
    series: tv.length,
    films: a.length - tv.length,
    places: a.reduce((n, x) => n + x.places, 0),
    /* ⛔ 「그 해 최고」라 부르지 않는다. 차트 자리가 많은 순일 뿐이다 */
    rows: a,
  };
});

const 몸 = {
  generated: 오늘(),
  whatThisIs: 'Korean titles grouped by the calendar year in which they held places on a Netflix weekly '
    + 'top 10, with how many places each held that year. Every title we publish has a year, which is why '
    + 'this axis reaches titles that have no cast or company data at all.',
  whatThisIsNot: 'Not a ranking of years and not a trend. Our data starts in July 2021 and ends in July '
    + '2026, so the first and last years hold only about half a year each — comparing their totals against '
    + 'a full year would show a rise and a fall that are properties of the window, not of the industry. '
    + 'A chart place is also not a viewing figure.',
  source: 원.source,
  weekFrom: 원.weekFrom,
  weekTo: 원.weekTo,
  weekCount: 원.weekCount,
  marketCount: 원.marketCount,
  titlesConsidered: 것들.length,
  yearCount: 해들.length,
  partialYears: 해들.filter((y) => y.partialYear).map((y) => y.year),
  years: 해들,
};

fs.writeFileSync(낼길, `${JSON.stringify(몸, null, 1)}\n`);
console.log(`✅ 냈다 — ${path.relative(뿌리, 낼길)}`);
for (const y of 해들) {
  console.log(`   ${y.year}  작품 ${String(y.titles).padStart(3)}편 (TV ${y.series} / 영화 ${y.films})`
    + ` · 자리 ${String(y.places).padStart(4)} · 담긴 주 ${y.weeksInData}${y.partialYear ? '  ⚠ 반토막' : ''}`);
}
console.log(`   작품 지면으로 나가는 링크 ${해들.reduce((n, y) => n + y.rows.length, 0)}개`);
