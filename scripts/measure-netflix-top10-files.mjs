#!/usr/bin/env node
/**
 * measure-netflix-top10-files.mjs — **넷플릭스가 내려 주는 Top 10 파일 두 개를 직접 재서 적는다.**
 *
 * ── 왜 ─────────────────────────────────────────────────────────
 * 2026-08-22 Search Console 실측: 우리에게 오는 검색어 76개 중 노출 185개가
 * **파일 주소 그 자체**였다 —
 *   "https://www.netflix.com/tudum/top10/data/all-weeks-countries.tsv"  31노출 · 순위 9.8
 *   "https://www.netflix.com/tudum/top10?week=2024-11-03"               36노출 · 순위 7.7
 * 순위 7~11 인데 **클릭 0**. 자리는 이미 있고, 우리 지면이 그 사람 물음에 답을 안 하고 있었다.
 * ⛔ 그 사람이 원하는 것은 기사가 아니다. **파일 안에 무엇이 들어 있느냐**다.
 *
 * ── 재는 것 (⛔ 짐작하지 않는다 · 파일을 받아서 센다) ─────────
 * ① 열 이름 · 줄 수 · 주 범위 · 나라 수 · 갈래
 * ② weekly_views 가 비어 있는 구간 — 파일이 중간에 **자를 바꿨다**
 * ③ 나라 파일의 제목이 세계 파일에 있느냐 — 없으면 **그 제목의 시청수는 어디에도 없다**
 *
 * ⚠ 파일을 우리가 다시 배포하지 않는다. 주소를 알려 주고, 우리가 가공한 표로 보낸다.
 *
 * 쓰는 법  node scripts/measure-netflix-top10-files.mjs --자가시험
 *          node scripts/measure-netflix-top10-files.mjs --잰다 [--쓴다]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { 오늘 as 케이에스티오늘 } from './_kst.mjs';   /* 🔴 [2026-09-06] UTC 날짜 병 — KST 새벽에 하루 앞서 찍혔다 */

const 뿌리 = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const 낼길 = path.join(뿌리, 'src/data/wikitip-netflix-files.json');
const 주소 = {
  countries: 'https://www.netflix.com/tudum/top10/data/all-weeks-countries.tsv',
  global: 'https://www.netflix.com/tudum/top10/data/all-weeks-global.tsv',
};

/** TSV 한 장을 줄 배열로. ⚠ 빈 줄을 버린다 — 파일 끝에 줄바꿈이 있다 */
export const 줄나누기 = (원문) => String(원문).split(/\r?\n/).filter((x) => x.length > 0);

/** 머리줄에서 열 이름을 뽑는다 */
export const 열이름 = (줄들) => (줄들[0] ?? '').split('\t');

/**
 * 한 파일의 얼굴. ⛔ 없는 열을  — 없으면 없다고 적는다.
 */
export function 파일재기(줄들) {
  const 열 = 열이름(줄들);
  const 자리 = (n) => 열.indexOf(n);
  const iw = 자리('week'), ic = 자리('category'), ii = 자리('country_iso2');
  const iv = 자리('weekly_views'), ih = 자리('weekly_hours_viewed'), ir = 자리('runtime');
  const 주 = new Map(), 나라 = new Set(), 갈래 = new Set();
  let views빈 = 0, hours빈 = 0, runtime빈 = 0;
  for (let k = 1; k < 줄들.length; k++) {
    const c = 줄들[k].split('\t');
    const w = iw >= 0 ? c[iw] : '';
    const 칸 = 주.get(w) ?? { 줄: 0, views빈: 0 };
    칸.줄++;
    if (ic >= 0) 갈래.add(c[ic]);
    if (ii >= 0) 나라.add(c[ii]);
    if (iv >= 0 && !c[iv]) { views빈++; 칸.views빈++; }
    if (ih >= 0 && !c[ih]) hours빈++;
    if (ir >= 0 && !c[ir]) runtime빈++;
    주.set(w, 칸);
  }
  const ws = [...주.keys()].sort();
  return {
    columns: 열,
    rows: 줄들.length - 1,
    weeks: ws.length,
    firstWeek: ws[0] ?? null,
    lastWeek: ws[ws.length - 1] ?? null,
    countries: ii >= 0 ? 나라.size : null,
    categories: [...갈래].sort(),
    hasViews: iv >= 0,
    hasHours: ih >= 0,
    emptyViews: iv >= 0 ? views빈 : null,
    emptyHours: ih >= 0 ? hours빈 : null,
    emptyRuntime: ir >= 0 ? runtime빈 : null,
    /** views 가 통째로 빈 마지막 주 / 다 찬 첫 주 — 자가 바뀐 자리 */
    lastWeekWithoutViews: iv >= 0 ? [...ws].reverse().find((w) => 주.get(w).views빈 === 주.get(w).줄) ?? null : null,
    firstWeekWithViews: iv >= 0 ? ws.find((w) => 주.get(w).views빈 === 0) ?? null : null,
    weeksWithoutAnyViews: iv >= 0 ? ws.filter((w) => 주.get(w).views빈 === 주.get(w).줄).length : null,
  };
}

/** 제목 열쇠. ⚠ 시즌명까지 붙여야 시즌이 다른 것을 한 줄로 뭉개지 않는다 */
export const 제목열쇠 = (쇼, 시즌) => `${String(쇼 ?? '').trim()}|${String(시즌 ?? '').trim()}`.toLowerCase();

/**
 * 나라 파일에는 있고 세계 파일에는 없는 제목. **그 제목의 시청수는 넷플릭스 자료 어디에도 없다.**
 */
export function 붙지않는제목(나라줄들, 세계줄들, { 넓이 = 20, 보기수 = 10 } = {}) {
  const gh = 열이름(세계줄들); const gs = gh.indexOf('show_title'), gt = gh.indexOf('season_title');
  const 세계 = new Set();
  for (let k = 1; k < 세계줄들.length; k++) {
    const c = 세계줄들[k].split('\t');
    세계.add(제목열쇠(c[gs], c[gt]));
  }
  const ch = 열이름(나라줄들);
  const cs = ch.indexOf('show_title'), ct = ch.indexOf('season_title'), ci = ch.indexOf('country_iso2');
  const 나라별 = new Map(), 이름 = new Map();
  for (let k = 1; k < 나라줄들.length; k++) {
    const c = 나라줄들[k].split('\t');
    const key = 제목열쇠(c[cs], c[ct]);
    if (!나라별.has(key)) { 나라별.set(key, new Set()); 이름.set(key, String(c[cs] ?? '').trim()); }
    나라별.get(key).add(c[ci]);
  }
  const 없는것 = [...나라별.keys()].filter((k) => !세계.has(k));
  const 넓게없는것 = 없는것.filter((k) => 나라별.get(k).size >= 넓이);
  const 보기 = 넓게없는것
    .map((k) => ({ title: 이름.get(k), countries: 나라별.get(k).size }))
    .sort((a, b) => b.countries - a.countries || a.title.localeCompare(b.title))
    .slice(0, 보기수);
  return {
    countryTitles: 나라별.size,
    inGlobal: 나라별.size - 없는것.length,
    notInGlobal: 없는것.length,
    wideCut: 넓이,
    notInGlobalWide: 넓게없는것.length,
    examples: 보기,
  };
}

if (process.argv.includes('--자가시험')) {
  const 실패 = [];
  /* ⚠ 2026-09-01 — 수를 «재서» 적는다. 손으로 적으면 검사가 빠져도 수가 안 움직인다 */
  let 센것 = 0;
  const 검 = (이름, 참) => { 센것 += 1; if (!참) 실패.push(이름); };
  const 세계 = 줄나누기([
    'week\tcategory\tweekly_rank\tshow_title\tseason_title\tweekly_hours_viewed\truntime\tweekly_views\tcumulative_weeks_in_top_10',
    '2021-07-04\tTV (English)\t1\tA\t\t100\t\t\t1',
    '2023-06-18\tTV (English)\t1\tA\t\t200\t1.5\t130\t2',
    '',
  ].join('\n'));
  const 나라 = 줄나누기([
    'country_name\tcountry_iso2\tweek\tcategory\tweekly_rank\tshow_title\tseason_title\tcumulative_weeks_in_top_10',
    'Korea\tKR\t2021-07-04\tTV\t1\tA\t\t1',
    'Japan\tJP\t2021-07-04\tTV\t1\tB\t\t1',
    'Korea\tKR\t2021-07-11\tTV\t2\tB\t\t2',
  ].join('\n'));

  검('빈 줄을 버린다', 줄나누기('a\n\nb\n').length === 2);
  const 나 = 파일재기(나라);
  검('나라 파일에 나라 수가 있다', 나.countries === 2);
  검('나라 파일에는 views 열이 없다', 나.hasViews === false && 나.emptyViews === null);
  검('⛔ 없는 열을 0 으로 안 채운다', 나.emptyViews !== 0);
  const 세 = 파일재기(세계);
  검('세계 파일에 나라 수는 없다(null)', 세.countries === null);
  검('views 빈 줄을 센다', 세.emptyViews === 1);
  검('자가 바뀐 자리를 찾는다', 세.lastWeekWithoutViews === '2021-07-04' && 세.firstWeekWithViews === '2023-06-18');
  검('주 범위', 세.firstWeek === '2021-07-04' && 세.lastWeek === '2023-06-18' && 세.weeks === 2);

  const j = 붙지않는제목(나라, 세계, { 넓이: 1, 보기수: 5 });
  검('제목 수를 센다', j.countryTitles === 2);
  검('세계 파일에 없는 제목을 찾는다', j.notInGlobal === 1 && j.examples[0].title === 'B');
  검('세계 파일에 있는 제목은 안 센다', j.inGlobal === 1);
  검('⭐ 시즌이 다르면 다른 제목이다', 제목열쇠('A', 'Season 2') !== 제목열쇠('A', 'Season 3'));
  검('대소문자는 같은 제목이다', 제목열쇠('Squid Game', '') === 제목열쇠('squid game', ''));

  if (실패.length) { console.error('❌ 자가시험 실패\n' + 실패.map((s) => `   · ${s}`).join('\n')); process.exit(1); }
  console.log(`✅ measure-netflix-top10-files 자가시험 통과 (${센것})`);
  process.exit(0);
}

if (!process.argv.includes('--잰다')) {
  console.error('⛔ --잰다 나 --자가시험 을 준다');
  process.exit(1);
}

async function 받기(url) {
  const r = await fetch(url, { headers: { 'user-agent': 'kculturewire-measure/1.0' } });
  if (!r.ok) throw new Error(`${url} → HTTP ${r.status}`);
  return 줄나누기(await r.text());
}

const 나라줄 = await 받기(주소.countries);
const 세계줄 = await 받기(주소.global);
console.log(`받았다 — 나라 ${나라줄.length - 1}줄 · 세계 ${세계줄.length - 1}줄`);

const 결과 = {
  measuredAt: 케이에스티오늘(),
  whatThisIs: 'The two public Netflix Top 10 files, measured column by column on the day shown: row counts, week coverage, and where the file stops carrying a number.',
  whatThisIsNot: 'Not a copy of the files and not a viewing estimate. Netflix publishes the files; we counted what is in them and what is missing from them.'
,
  files: [
    { name: 'all-weeks-countries.tsv', url: 주소.countries, ...파일재기(나라줄) },
    { name: 'all-weeks-global.tsv', url: 주소.global, ...파일재기(세계줄) },
  ],
  join: 붙지않는제목(나라줄, 세계줄),
};
console.log(JSON.stringify({ ...결과, files: 결과.files.map((f) => ({ name: f.name, rows: f.rows, weeks: f.weeks })) }, null, 1));

if (process.argv.includes('--쓴다')) {
  fs.writeFileSync(낼길, JSON.stringify(결과, null, 1));
  console.log(`\n적었다 → ${path.relative(뿌리, 낼길)}`);
} else {
  console.log('\n⚠ 아직 안 적었다. 적으려면 --쓴다');
}
