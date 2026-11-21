#!/usr/bin/env node
/**
 * build-kcw-most-popular.mjs — **「가장 인기 있는」을 묻는 말에 세 답을 준다.**
 *   내는 것: `src/data/wikitip-most-popular.json` → `/most-popular`
 *
 * ── 왜 (2026-08-23) ───────────────────────────────────────────
 * 잰 수요 —  most popular korean drama       자동완성 1번째 · 제안 10줄
 *            best korean drama on netflix    1번째 · 10줄
 *            korean drama ranking            1번째 · 6줄
 *
 * ⛔ 그런데 우리는 「best」를 말할 자격이 없습니다. 취향을 판정하지 않는 것이 우리 강령입니다.
 * ⭐ 대신 말할 수 있는 것이 있습니다 — **「가장 인기 있는」을 재는 자가 여러 개이고,
 *   그 자들이 서로 다른 답을 냅니다.** 그것이 이 지면입니다. 답을 주는 대신 **자를 줍니다.**
 *
 * ── 🔴 재서 알아낸 것 (오늘 실측) ─────────────────────────────
 * 네 자로 상위 열을 뽑아 겹침을 셌습니다.
 * ```
 *  나라 수 × 한 주 최대   겹침 10/10   ← ⭐ 같은 자다. 이름만 둘이었다
 *  나라 수 × 주 수        겹침  1/10
 *  주 수  × 차트 자리     겹침  4/10
 *  나라 수 × 차트 자리    겹침  3/10
 *  네 자 상위 열에 다 든 것 — **Squid Game 하나**
 * ```
 * ⇒ 그래서 자를 **셋**으로 줄입니다(넓이 · 오래 · 총량). 넷째는 첫째와 같은 것이었습니다.
 *   ⛔ 같은 것을 두 이름으로 내놓으면 「우리가 네 가지를 본다」는 거짓 넉넉함이 됩니다.
 *
 * ── ⛔ 이 자가 지키는 것 ──────────────────────────────────────
 * ⛔ 「best」·「좋은 작품」을 안 씁니다. 「차트에 오래·널리 있었다」만 말합니다.
 * ⛔ 차트 자리를 **시청시간으로 부르지 않습니다.** 넷플릭스는 나라별 시청시간을 안 냅니다.
 * ⛔ 세 목록을 합쳐 하나의 「종합 순위」를 만들지 않습니다 — 그게 이 지면이 반대하는 짓입니다.
 * ⛔ 못 잰 칸을 
 *
 * 쓰는 법
 *   node scripts/build-kcw-most-popular.mjs --자가시험
 *   node scripts/build-kcw-most-popular.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
/* 🔴 [2026-09-03] UTC 로 날짜를 만들던 자리를 KST 로 고쳤다 —
   CLAUDE.md 🔴 「toISOString() 도 쓰지 않는다. 날짜를 만들면 새벽에 하루가 어긋난다」 */
import { 오늘 } from './_kst.mjs';

const 뿌리 = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const 자료길 = path.join(뿌리, 'src/data/wikitip-title-pages.json');
const 낼길 = path.join(뿌리, 'src/data/wikitip-most-popular.json');

/** 차트 자리 합. ⛔ 해마다의 칸이 없으면 null — 0 이 아니다 */
export function 자리합(작품) {
  const 해 = 작품?.byYear;
  if (!Array.isArray(해) || !해.length) return null;
  const 것 = 해.filter((y) => typeof y?.places === 'number');
  return 것.length ? 것.reduce((n, y) => n + y.places, 0) : null;
}

/** 한 자로 상위 N. ⛔ 그 자를 못 잰 작품은 아예 줄에서 뺀다 */
export function 상위(작품들, 재기, n = 10) {
  return (작품들 ?? [])
    .map((t) => ({ t, v: 재기(t) }))
    .filter((x) => typeof x.v === 'number')
    .sort((a, b) => b.v - a.v)
    .slice(0, n);
}

/** 두 목록이 얼마나 겹치나 — 같은 자에 두 이름을 붙이고 있는지 알려면 이게 필요하다 */
export function 겹침(가, 나) {
  const A = new Set((가 ?? []).map((x) => x.t.slug));
  return (나 ?? []).filter((x) => A.has(x.t.slug)).length;
}

if (process.argv.includes('--자가시험')) {
  const 실패 = [];
  const 검 = (이름, 참) => { if (!참) 실패.push(이름); };

  검('자리를 더한다', 자리합({ byYear: [{ year: 2024, places: 3 }, { year: 2025, places: 4 }] }) === 7);
  검('⛔ 해 칸이 없으면 null — 0 이 아니다', 자리합({ byYear: [] }) === null && 자리합({}) === null);
  검('⛔ 빈 칸만 있으면 null', 자리합({ byYear: [{ year: 2024, places: null }] }) === null);
  검('숫자 칸만 더한다', 자리합({ byYear: [{ places: 2 }, { places: null }, { places: 5 }] }) === 7);

  const 표본 = [
    { slug: 'a', title: 'A', markets: 50, weeks: 2 },
    { slug: 'b', title: 'B', markets: 3, weeks: 40 },
    { slug: 'c', title: 'C', markets: 20, weeks: 20 },
    { slug: 'd', title: 'D', weeks: 99 },              // 나라 수를 못 쟀다
  ];
  const 넓 = 상위(표본, (t) => t.markets, 3);
  검('큰 것이 앞에', 넓[0].slug === undefined ? 넓[0].t.slug === 'a' : true);
  검('⛔ 못 잰 작품은 그 자의 줄에서 빠진다', !넓.some((x) => x.t.slug === 'd'));
  검('셋만 준다', 넓.length === 3);

  const 오래 = 상위(표본, (t) => t.weeks, 3);
  검('다른 자는 다른 순서', 오래[0].t.slug === 'd');
  검('겹침을 센다', 겹침(넓, 오래) === 2);
  검('같은 목록끼리는 다 겹친다', 겹침(넓, 넓) === 3);
  검('⛔ 빈 값도 안 터진다', 겹침(undefined, undefined) === 0 && 상위(undefined, (t) => t.x).length === 0);

  if (실패.length) {
    console.error(`❌ 자가시험 실패\n${실패.map((s) => `   · ${s}`).join('\n')}`);
    process.exit(1);
  }
  console.log('✅ build-kcw-most-popular 자가시험 통과 (11)');
  process.exit(0);
}

const 원 = JSON.parse(fs.readFileSync(자료길, 'utf8'));
const 것들 = 원.titles.filter((t) => t.hasPage);
const 몇 = 20;

/**
 * 자 셋. ⛔ 「한 주 최대」는 넣지 않는다 — 「나라 수」와 상위 열이 10/10 겹쳤다.
 *   같은 것을 두 이름으로 내놓으면 우리가 네 가지를 본다는 거짓 넉넉함이 된다.
 *   ⚠ 그 겹침 수를 아래 `overlaps` 에 적어 둔다. 나중에 자료가 바뀌면 다시 갈릴 수 있다.
 */
const 자들 = [
  {
    key: 'reach',
    label: 'Reached the most countries',
    what: 'How many of the countries we hold ever put it in their weekly top 10.',
    unit: 'countries',
    재기: (t) => (typeof t.markets === 'number' ? t.markets : null),
  },
  {
    key: 'duration',
    label: 'Stayed the longest',
    what: 'How many weeks it held a place anywhere, added up.',
    unit: 'weeks',
    재기: (t) => (typeof t.weeks === 'number' ? t.weeks : null),
  },
  {
    key: 'places',
    label: 'Took the most chart places',
    what: 'Every country-week slot it occupied, added up — breadth and duration together.',
    unit: 'places',
    재기: 자리합,
  },
];

const 결과 = 자들.map((m) => ({
  key: m.key,
  label: m.label,
  what: m.what,
  unit: m.unit,
  measuredTitles: 것들.filter((t) => typeof m.재기(t) === 'number').length,
  rows: 상위(것들, m.재기, 몇).map(({ t, v }) => ({
    title: t.title,
    slug: t.slug,
    type: t.type,
    value: v,
    markets: typeof t.markets === 'number' ? t.markets : null,
    weeks: typeof t.weeks === 'number' ? t.weeks : null,
    peak: typeof t.peak === 'number' ? t.peak : null,
  })),
}));

/* 겹침을 재서 적는다 — 자가 셋인 까닭의 증거다 */
const 열개 = 자들.map((m) => ({ key: m.key, 줄: 상위(것들, m.재기, 10) }));
const 겹침표 = [];
for (let a = 0; a < 열개.length; a += 1) {
  for (let b = a + 1; b < 열개.length; b += 1) {
    겹침표.push({ a: 열개[a].key, b: 열개[b].key, sharedOfTen: 겹침(열개[a].줄, 열개[b].줄) });
  }
}
/* 버린 넷째 자도 재서 적는다 — 왜 버렸는지의 증거를 남긴다 */
const 한주최대 = 상위(것들, (t) => (typeof t.atOnce === 'number' ? t.atOnce : null), 10);
const 넓이열 = 열개.find((x) => x.key === 'reach').줄;

const 모두든것 = 열개[0].줄
  .filter((x) => 열개.every((m) => m.줄.some((y) => y.t.slug === x.t.slug)))
  .map((x) => ({ title: x.t.title, slug: x.t.slug }));

const 몸 = {
  generated: 오늘(),
  whatThisIs: 'Three different ways of asking which Korean title did best on Netflix, each one counted '
    + 'from the same weekly files. They are shown side by side rather than merged, because merging them '
    + 'would hide the fact that they disagree.',
  whatThisIsNot: 'Not a judgement of quality — we do not rank Korean titles by how good they are, and a '
    + 'chart place is not a viewing figure. Netflix publishes no hours or viewers by country, so nothing '
    + 'here measures how many people watched.',
  source: 원.source,
  weekFrom: 원.weekFrom,
  weekTo: 원.weekTo,
  weekCount: 원.weekCount,
  marketCount: 원.marketCount,
  titlesConsidered: 것들.length,
  shownPerMeasure: 몇,
  measures: 결과,
  overlaps: 겹침표,
  droppedMeasure: {
    label: 'Widest in a single week',
    sharedOfTenWithReach: 겹침(넓이열, 한주최대),
    why: 'Its top ten matched the reach top ten, so it is the same measure wearing a second name. '
      + 'Showing both would suggest we look at four things when we look at three.',
  },
  inEveryList: 모두든것,
  titlesAtPeakOne: 것들.filter((t) => t.peak === 1).length,
};

fs.writeFileSync(낼길, `${JSON.stringify(몸, null, 1)}\n`);
console.log(`✅ 냈다 — ${path.relative(뿌리, 낼길)}`);
for (const m of 결과) console.log(`   ${m.label.padEnd(30)} 1위 ${m.rows[0].title} (${m.rows[0].value} ${m.unit})`);
console.log(`   겹침: ${겹침표.map((o) => `${o.a}×${o.b} ${o.sharedOfTen}/10`).join(' · ')}`);
console.log(`   버린 자(한 주 최대)는 넓이와 ${몸.droppedMeasure.sharedOfTenWithReach}/10 겹쳤다`);
console.log(`   세 목록에 다 든 것: ${모두든것.length ? 모두든것.map((x) => x.title).join(', ') : '없다'}`);
console.log(`   ⚠ 최고 순위 1위인 작품이 ${몸.titlesAtPeakOne}편 — 동률이 많아 순위는 자로 못 쓴다`);
