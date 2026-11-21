#!/usr/bin/env node
/**
 * build-kcw-where-to-watch.mjs — **「where to watch korean drama」에 정직하게 답한다.**
 *   내는 것: `src/data/wikitip-where-to-watch.json` → `/where-to-watch`
 *
 * ── 왜 (2026-08-23 00:xx) ──────────────────────────────────────
 * 제가 잰 K컬처 후보 35개 중 **가장 센 말**이 이것입니다 —
 * ```
 *  where to watch korean drama    자동완성 1번째 · 그 말로 시작하는 제안 10줄
 *    …reddit / …online / …in hindi / …series / …in tamil / …dubbed in english
 *    …with english subtitles / …in english / …perfect crown
 *  netflix country availability   1번째 · 4줄 (…checker / …search / …list)
 * ```
 * 그런데 저는 이 말을 **미뤄 두고 있었습니다.** 넷플릭스가 나라별 «제공 여부»를 안 내기
 * 때문입니다. 재지 못하는 것에는 답할 수 없다고 보았습니다.
 *
 * ⭐ 그건 반만 맞았습니다. 우리가 **말할 수 있는 것이 하나 있습니다** —
 *   「어떤 작품이 어느 주에 어느 나라 주간 10위에 들었다」면 **그 주에 그 나라에서 볼 수 있었다.**
 *   차트에 든 것은 제공의 **바닥값**입니다. 이건 추론이 아니라 산수입니다.
 *   ⛔ 뒤집으면 안 됩니다 — 차트에 안 들었다고 없었다는 뜻이 아닙니다(10위 밖은 자료가 없습니다).
 *
 * ⭐ 그리고 이 정직한 되받기 자체가 우리 자리입니다. 이 말을 치는 사람은 「제공여부 검색기」를
 *   찾는데, 남들은 있는 척 답합니다. 우리는 **넷플릭스가 무엇을 안 내는지**를 먼저 적고,
 *   그다음에 낼 수 있는 것을 냅니다. 모토와-철학 ③ 「못 잰 것은 못 쟀다고 적는다」 그대로입니다.
 *
 * ── ⛔ 이 자가 지키는 것 ──────────────────────────────────────
 * ⛔ 「볼 수 있다」(현재)로 쓰지 않습니다. **「그 주에 볼 수 있었다」**(과거)입니다.
 *   자료의 마지막 주가 지나면 오늘 어떤지는 우리가 모릅니다.
 * ⛔ 나라 수를 「인기」로 부르지 않습니다. 차트 자리는 시청시간이 아닙니다.
 * ⛔ 못 잰 것을 0으로 안 씁니다.
 *
 * 쓰는 법
 *   node scripts/build-kcw-where-to-watch.mjs --자가시험
 *   node scripts/build-kcw-where-to-watch.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
/* 🔴 [2026-09-03] UTC 로 날짜를 만들던 자리를 KST 로 고쳤다 —
   CLAUDE.md 🔴 「toISOString() 도 쓰지 않는다. 날짜를 만들면 새벽에 하루가 어긋난다」 */
import { 오늘 } from './_kst.mjs';

const 뿌리 = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const 자료길 = path.join(뿌리, 'src/data/wikitip-title-pages.json');
const 낼길 = path.join(뿌리, 'src/data/wikitip-where-to-watch.json');

/**
 * 한 작품이 **어느 나라에서 볼 수 있었나**의 바닥값.
 * ⛔ 「지금 볼 수 있다」가 아니다 — 그 나라 차트에 든 주가 있었다는 뜻이다.
 * ⛔ 못 잰 칸이 있는 나라는 넣지 않는다. 
 */
export function 볼수있었던나라(작품) {
  return (작품?.byMarket ?? [])
    .filter((m) => m && m.name && m.first)
    .map((m) => ({ name: m.name, iso2: m.iso2 ?? null, first: m.first, last: m.last ?? m.first }))
    .sort((a, b) => a.name.localeCompare(b.name, 'en'));
}

/**
 * 사람이 이 말을 칠 때 찾는 것은 **「내 나라에서 되나」**다.
 * 그래서 나라 → 작품으로도 뒤집어 둔다. ⚠ 나라마다 다 싣지 않는다 — 오래 간 것부터 자른다.
 */
export function 나라별로뒤집기(작품들, 한나라최대 = 12) {
  const 표 = new Map();
  for (const t of 작품들 ?? []) {
    for (const m of 볼수있었던나라(t)) {
      if (!표.has(m.name)) 표.set(m.name, []);
      표.get(m.name).push({
        title: t.title, slug: t.slug, type: t.type, weeks: t.weeks ?? null, first: m.first, last: m.last,
      });
    }
  }
  for (const [k, v] of 표) {
    v.sort((a, b) => (b.weeks ?? 0) - (a.weeks ?? 0));
    표.set(k, v.slice(0, 한나라최대));
  }
  return 표;
}

if (process.argv.includes('--자가시험')) {
  const 실패 = [];
  const 검 = (이름, 참) => { if (!참) 실패.push(이름); };

  const t1 = {
    title: 'A', slug: 'a', type: 'TV', weeks: 9,
    byMarket: [
      { iso2: 'VN', name: 'Vietnam', first: '2024-01-07', last: '2024-02-04' },
      { iso2: 'ID', name: 'Indonesia', first: '2024-01-07', last: '2024-01-14' },
      { iso2: 'XX', name: null, first: '2024-01-07' },
      { iso2: 'YY', name: 'No week', first: null },
    ],
  };
  const r = 볼수있었던나라(t1);
  검('나라를 뽑는다', r.length === 2);
  검('⛔ 이름이 없는 줄은 버린다', !r.some((x) => x.name === null));
  검('⛔ 주가 없는 줄은 버린다 — 0 으로 안 채운다', !r.some((x) => x.name === 'No week'));
  검('이름 차례로 놓는다', r[0].name === 'Indonesia' && r[1].name === 'Vietnam');
  검('마지막 주가 없으면 첫 주로 둔다',
    볼수있었던나라({ byMarket: [{ name: 'X', first: '2024-01-07' }] })[0].last === '2024-01-07');
  검('⛔ 빈 값도 안 터진다', 볼수있었던나라(undefined).length === 0 && 볼수있었던나라({}).length === 0);

  const t2 = {
    title: 'B', slug: 'b', type: 'Films', weeks: 20,
    byMarket: [{ iso2: 'VN', name: 'Vietnam', first: '2023-05-07', last: '2023-06-04' }],
  };
  const 뒤 = 나라별로뒤집기([t1, t2]);
  검('나라별로 뒤집는다', 뒤.get('Vietnam').length === 2);
  검('오래 간 것이 앞에 온다', 뒤.get('Vietnam')[0].title === 'B');
  검('한 나라만 있는 곳도 남는다', 뒤.get('Indonesia').length === 1);
  검('나라마다 자른다', 나라별로뒤집기([t1, t2], 1).get('Vietnam').length === 1);
  검('⛔ 빈 입력도 안 터진다', 나라별로뒤집기(undefined).size === 0);

  if (실패.length) {
    console.error(`❌ 자가시험 실패\n${실패.map((s) => `   · ${s}`).join('\n')}`);
    process.exit(1);
  }
  console.log('✅ build-kcw-where-to-watch 자가시험 통과 (11)');
  process.exit(0);
}

const 원 = JSON.parse(fs.readFileSync(자료길, 'utf8'));
const 것들 = 원.titles.filter((t) => t.hasPage);

/* 가장 많은 나라에서 볼 수 있었던 것 — ⛔ 「가장 인기 있는」이라 부르지 않는다 */
const 넓은것 = 것들
  .map((t) => ({ t, 나라: 볼수있었던나라(t) }))
  .filter((x) => x.나라.length > 0)
  .sort((a, b) => b.나라.length - a.나라.length)
  .slice(0, 24)
  .map((x) => ({
    title: x.t.title,
    slug: x.t.slug,
    type: x.t.type,
    weeks: x.t.weeks,
    countries: x.나라.length,
    firstWeek: x.t.firstWeek,
    lastWeek: x.t.lastWeek,
    someCountries: x.나라.slice(0, 8).map((m) => m.name),
  }));

/**
 * 🔴 나라 주소를 이 자에서 «다시 만들지» 않는다. `wikitip-markets.json` 이 이미 들고 있다.
 *   /firms 에서 회사 슬러그를 두 곳에서 만들다 문 두 개를 잃은 것과 같은 덫이다.
 * ⚠ 이름이 그 파일에 없으면 slug 는 null 이다 — 억지로 만들지 않고 링크를 안 건다.
 */
const 나라주소 = (() => {
  try {
    const j = JSON.parse(fs.readFileSync(path.join(뿌리, 'src/data/wikitip-markets.json'), 'utf8'));
    return new Map((j.markets ?? []).map((m) => [String(m.name).trim(), m.slug]));
  } catch { return new Map(); }
})();

const 나라표 = 나라별로뒤집기(것들);
const 나라들 = [...나라표.entries()]
  .map(([name, titles]) => ({ name, slug: 나라주소.get(name) ?? null, titles }))
  .sort((a, b) => a.name.localeCompare(b.name, 'en'));

const 몸 = {
  generated: 오늘(),
  whatThisIs: 'A floor on where a Korean title could be watched. If a title held a place on a country’s '
    + 'weekly Netflix top 10 in a given week, it was available in that country that week. That is '
    + 'arithmetic, not an estimate.',
  whatThisIsNot: 'Not a list of what you can watch today, and not a completeness claim. Netflix publishes '
    + 'no availability data at all, and it publishes only the weekly top 10 — so a title absent from a '
    + 'country here may still have been available there without charting. Never read the absence as a no.',
  source: 원.source,
  weekFrom: 원.weekFrom,
  weekTo: 원.weekTo,
  weekCount: 원.weekCount,
  marketCount: 원.marketCount,
  titlesConsidered: 것들.length,
  countryCount: 나라들.length,
  countriesWithoutSlug: 나라들.filter((c) => !c.slug).length,
  perCountryShown: 12,
  widest: 넓은것,
  byCountry: 나라들,
};

fs.writeFileSync(낼길, `${JSON.stringify(몸, null, 1)}\n`);
console.log(`✅ 냈다 — ${path.relative(뿌리, 낼길)}`);
console.log(`   나라 ${나라들.length}곳 · 작품 ${것들.length}편에서 뽑았다`);
console.log(`   가장 넓었던 것: ${넓은것[0].title} — ${넓은것[0].countries}개국`);
console.log(`   작품 지면으로 나가는 링크 ${나라들.reduce((n, c) => n + c.titles.length, 0) + 넓은것.length}개`);
