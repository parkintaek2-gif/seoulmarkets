#!/usr/bin/env node
/**
 * build-kcw-giveaway-csv.mjs — **값을 안 부르고 «주는» 표 한 장을 만든다.**
 *   내는 것: `archive/outreach/korean-titles-on-netflix.csv`
 *
 * ── 왜 (2026-08-23) ───────────────────────────────────────────
 * 2번 승인: 「값을 안 부르고 자료를 주는 메일 10통 … 문안·10곳 목록·세는 자 만들어 올려 주십시오」
 * 그 메일에 붙일 파일이다. 파는 물건이 아니라 **주는 물건**이다.
 *
 * ── ⛔ 이 자가 지키는 것 ──────────────────────────────────────
 * ⛔ 못 잰 칸을  **빈 칸으로 둔다.** 받는 사람이 0 과 빈칸을 갈라 봐야 한다.
 * ⛔ 「인기」·「점수」 같은 만든 값을 넣지 않는다. 센 것만 넣는다.
 * ⛔ 한글을 넣지 않는다 — 영문 상대에게 가는 파일이다. 역할은 영어로 옮긴다.
 * ⚠ 머리글 위에 **읽는 법 네 줄**을 주석으로 박는다. 표만 주면 「차트=제공」으로 읽힌다.
 *   그 오독은 우리가 만든 것이 된다.
 *
 * 쓰는 법
 *   node scripts/build-kcw-giveaway-csv.mjs --자가시험
 *   node scripts/build-kcw-giveaway-csv.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const 뿌리 = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const 자료길 = path.join(뿌리, 'src/data/wikitip-title-pages.json');
const 낼길 = path.join(뿌리, 'archive/outreach/korean-titles-on-netflix.csv');

/** CSV 한 칸. ⛔ null·undefined 는 **빈 칸**이다 — 0 이 아니다 */
export function 칸(값) {
  if (값 === null || 값 === undefined) return '';
  const s = String(값);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** 한글 역할을 영어로. ⛔ 모르는 것은 버린다 */
export const 역할옮기기 = (역할들) => {
  const 표 = { 제작: 'produced', 배급: 'distributed', 첫방송: 'first broadcast' };
  const out = [];
  for (const r of 역할들 ?? []) {
    const v = 표[String(r).trim()];
    if (v && !out.includes(v)) out.push(v);
  }
  return out;
};

/** 회사 칸 — 「이름 (역할)」을 세미콜론으로 잇는다. 없으면 빈 칸 */
export function 회사칸(회사들) {
  const 것 = (회사들 ?? []).map((f) => {
    const 이름 = String(f?.firm ?? '').trim();
    if (!이름) return null;
    const r = 역할옮기기(f.roles);
    return r.length ? `${이름} (${r.join(', ')})` : 이름;
  }).filter(Boolean);
  return 것.length ? 것.join('; ') : null;
}

export const 머리 = ['title', 'kind', 'countries', 'weeks', 'best_place',
  'first_week', 'last_week', 'companies', 'countries_list'];

export function 줄만들기(t) {
  return [
    t.title,
    t.type === 'TV' ? 'series' : 'film',
    typeof t.markets === 'number' ? t.markets : null,
    typeof t.weeks === 'number' ? t.weeks : null,
    typeof t.peak === 'number' ? t.peak : null,
    t.firstWeek ?? null,
    t.lastWeek ?? null,
    회사칸(t.firms),
    (t.byMarket ?? []).map((m) => m.name).filter(Boolean).join('; ') || null,
  ].map(칸).join(',');
}

if (process.argv.includes('--자가시험')) {
  const 실패 = [];
  const 검 = (이름, 참) => { if (!참) 실패.push(이름); };

  검('보통 값은 그대로', 칸('Squid Game') === 'Squid Game');
  검('쉼표가 있으면 감싼다', 칸('A, B') === '"A, B"');
  검('따옴표를 두 번으로', 칸('say "hi"') === '"say ""hi"""');
  검('⛔ null 은 빈 칸 — 0 이 아니다', 칸(null) === '' && 칸(undefined) === '');
  검('0 은 0 으로 남는다', 칸(0) === '0');

  검('역할을 옮긴다', 역할옮기기(['제작', '배급']).join(', ') === 'produced, distributed');
  검('⛔ 모르는 역할은 버린다', 역할옮기기(['제작', '???']).join() === 'produced');

  검('회사 칸을 만든다',
    회사칸([{ firm: 'tvN', roles: ['첫방송'] }]) === 'tvN (first broadcast)');
  검('회사 둘을 세미콜론으로',
    회사칸([{ firm: 'A', roles: ['제작'] }, { firm: 'B', roles: [] }]) === 'A (produced); B');
  검('⛔ 회사가 없으면 null — 빈 칸이 된다', 회사칸([]) === null && 회사칸(undefined) === null);
  검('⛔ 화면에 나갈 값에 한글이 없다',
    !/[가-힣]/.test(회사칸([{ firm: 'tvN', roles: ['제작', '배급', '첫방송'] }])));

  const 한줄 = 줄만들기({
    title: 'A, B', type: 'TV', markets: 3, weeks: 5, peak: 2,
    firstWeek: '2024-01-07', lastWeek: '2024-02-04',
    firms: [{ firm: 'tvN', roles: ['첫방송'] }],
    byMarket: [{ name: 'Vietnam' }, { name: 'Indonesia' }],
  });
  검('줄을 만든다', 한줄.startsWith('"A, B",series,3,5,2,2024-01-07,2024-02-04,'));
  검('나라 목록이 들어간다', 한줄.includes('Vietnam; Indonesia'));

  const 빈줄 = 줄만들기({ title: 'X', type: 'Films' });
  검('⛔ 못 잰 칸이 «0» 이 아니라 빈 칸이다', 빈줄 === 'X,film,,,,,,,');
  검('머리글이 칸 수와 맞다', 머리.length === 빈줄.split(',').length);

  if (실패.length) {
    console.error(`❌ 자가시험 실패\n${실패.map((s) => `   · ${s}`).join('\n')}`);
    process.exit(1);
  }
  console.log('✅ build-kcw-giveaway-csv 자가시험 통과 (15)');
  process.exit(0);
}

const 원 = JSON.parse(fs.readFileSync(자료길, 'utf8'));
const 것들 = 원.titles.filter((t) => t.hasPage);
const 크레딧없음 = 것들.filter((t) => !(t.firms ?? []).length).length;

/**
 * ⚠ 읽는 법을 파일 안에 박는다. 표만 주면 「차트에 들었다 = 볼 수 있다」로 읽히고,
 *   그 오독은 우리가 만든 것이 된다. 메일에도 같은 두 줄이 있다 — 두 곳에 있어야 남는다.
 */
const 머리말 = [
  '# Korean titles on Netflix weekly top 10 — by country and week',
  `# Source: Netflix Tudum weekly top 10 files, ${원.weekCount} weeks, ${원.marketCount} countries, ${원.weekFrom} to ${원.weekTo}.`,
  '#   Company credits from Wikidata (production company, original broadcaster, distributor).',
  '# HOW TO READ THIS, in four lines:',
  '#   1. Charting is not availability. Netflix publishes no availability data. A title on a',
  "#      country's weekly list was watchable there that week — that is a floor, and nothing more.",
  '#   2. Not charting is not absence. Only the top 10 is published, so a title watched widely',
  '#      without entering a top 10 does not appear here at all.',
  `#   3. ${크레딧없음} of the ${것들.length} rows have no company credit. That is a hole in Wikidata, not a`,
  '#      title without a maker. Empty cells are unmeasured, never zero.',
  '#   4. Netflix states no country of production, so which titles count as Korean is our inference.',
  '# Free to use with attribution to K Culture Wire (kculturewire.com). Tell us if a number looks wrong.',
];

const 줄들 = 것들
  .slice()
  .sort((a, b) => String(a.title).localeCompare(String(b.title), 'en'))
  .map(줄만들기);

fs.mkdirSync(path.dirname(낼길), { recursive: true });
fs.writeFileSync(낼길, `${[...머리말, 머리.join(','), ...줄들].join('\n')}\n`, 'utf8');

const 크기 = (fs.statSync(낼길).size / 1024).toFixed(0);
console.log(`✅ 냈다 — ${path.relative(뿌리, 낼길)} (${크기}KB)`);
console.log(`   작품 ${줄들.length}편 · 나라 ${원.marketCount} · 주 ${원.weekCount}`);
console.log(`   ⚠ 회사 크레딧이 없는 줄 ${크레딧없음}개 — 빈 칸으로 두고 그 수를 머리말에 적었다`);
console.log('   ⛔ 이 파일은 파는 것이 아니라 주는 것이다. 보내는 것은 사람 몫이다(2번 지시).');
