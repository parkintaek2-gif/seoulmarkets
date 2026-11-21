#!/usr/bin/env node
/**
 * build-kcw-downloads.mjs — **남이 «집어 가서 쓸 수 있는» 파일을 낸다.**
 *
 * ── 🔴 왜 이 자가 생겼나 ───────────────────────────────────────
 * 2026-08-25 밤, 사장님 「스스로 판단해라」를 받고 아웃리치를 내 몫으로 진행하다가
 * **먼저 고쳐야 할 것**을 찾았다 —
 * ```
 *   /data 지면(라이브)  「The same list is in `coverage.csv`」
 *   실제 파일           «없다» — /coverage.csv · /data/coverage.csv · /wikitip/coverage.csv 전부 404
 * ```
 * ⛔ **우리가 지키지 않은 약속이 손님 화면에 떠 있었다.** 자료를 준다고 적어 놓고 안 줬다.
 *   「못 잰 것은 못 쟀다고 적는다」를 지키는 집이 «있다고 적어 놓고 없는» 것을 두면 안 된다.
 *
 * ── 왜 «내려받을 파일»이 유입에 걸리나 ────────────────────────
 * 그날 잰 것 — 우리에게 오는 길이 **구글 검색 하나뿐**이고, 밖에서 우리를 걸어 준 곳이 0이다.
 * 뉴스레터·리서처가 우리를 걸어 주려면 **자기 글에 쓸 수 있는 것**이 있어야 한다.
 * 「우리 지면 좀 봐 주세요」로는 아무도 안 건다. **표 하나를 통째로 주면 그 표를 인용한다.**
 * ⭐ 그리고 인용은 우리가 만들 수 없는 것이다 — 자료를 열어 두는 것으로만 생긴다.
 *
 * ── ⛔ 이 자가 지키는 것 ──────────────────────────────────────
 * ⛔ **수를 손으로 적지 않는다.** 전부 우리가 이미 낸 자료에서 읽어 온다.
 * ⛔ 콤마와 따옴표가 든 값을 그대로 흘리지 않는다 — 한 줄이 어긋나면 표 전체가 어긋난다.
 * ⛔ 못 채운 칸을  **빈칸으로 두고 그 뜻을 머리글에 적는다.**
 * ⛔ 「이 자료로 무엇을 못 하는지」를 파일 «안»에 적는다. 파일만 떠돌아도 오해가 안 생기게.
 *
 * 쓰는 법  node scripts/build-kcw-downloads.mjs --자가시험
 *          node scripts/build-kcw-downloads.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
/* 🔴 [2026-09-03] UTC 로 날짜를 만들던 자리를 KST 로 고쳤다 —
   CLAUDE.md 🔴 「toISOString() 도 쓰지 않는다. 날짜를 만들면 새벽에 하루가 어긋난다」 */
import { 오늘 } from './_kst.mjs';

const 뿌리 = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/**
 * CSV 한 칸을 안전하게 만든다.
 * ⛔ 콤마·따옴표·줄바꿈이 든 값을 그냥 흘리면 **그 줄부터 표가 통째로 밀린다.**
 *   작품 이름에 콤마가 흔하다(`Money Heist: Korea - Joint Economic Area`).
 * ⚠ 빈 값은 «빈칸»으로 둔다 — 0 이나 'null' 로 채우지 않는다.
 */
export function 칸(v) {
  if (v === null || v === undefined) return '';
  const s = String(v);
  if (s === '') return '';
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** 줄 하나. ⛔ 머리글과 칸 수가 다르면 표가 아니다 — 부르는 쪽에서 맞춘다 */
export function 줄(값들) {
  return (값들 ?? []).map(칸).join(',');
}

/** 표 전체. ⚠ 줄바꿈은 CRLF 다 — 엑셀이 LF 만 있는 파일을 한 줄로 읽는 일이 있다 */
export function 표(머리, 줄들) {
  return [줄(머리), ...(줄들 ?? []).map(줄)].join('\r\n') + '\r\n';
}

if (process.argv.includes('--자가시험')) {
  let 실패 = 0;
  const 검 = (무엇, 참) => { if (!참) { console.error('❌ ' + 무엇); 실패++; } else console.log('✅ ' + 무엇); };

  검('보통 값은 그대로', 칸('abc') === 'abc');
  /* 🔴 실제로 있는 이름이다 — 콤마를 안 막으면 이 줄부터 표가 밀린다 */
  검('⛔ 콤마가 든 값을 감싼다', 칸('Money Heist: Korea, part 2') === '"Money Heist: Korea, part 2"');
  검('⛔ 따옴표를 두 번으로 만든다', 칸('a"b') === '"a""b"');
  검('⛔ 줄바꿈이 든 값도 감싼다', 칸('a\nb').startsWith('"'));
  검('⛔ 빈 값은 «빈칸»이다 — 0 이 아니다', 칸(null) === '' && 칸(undefined) === '' && 칸('') === '');
  검('0 은 0 으로 남는다 — 빈칸과 다르다', 칸(0) === '0');
  검('false 도 글자로 남는다', 칸(false) === 'false');

  검('줄을 만든다', 줄(['a', 'b']) === 'a,b');
  검('빈 배열도 안 터진다', 줄([]) === '' && 줄(null) === '');

  const t = 표(['a', 'b'], [[1, 2], [3, 4]]);
  검('표에 머리글이 먼저 온다', t.startsWith('a,b'));
  검('표가 CRLF 로 끝난다', t.endsWith('\r\n'));
  검('표 줄 수가 맞다', t.trim().split('\r\n').length === 3);
  검('줄이 없어도 머리글은 나온다', 표(['a'], []).trim() === 'a');

  console.log(실패 ? `\n❌ ${실패}개 실패` : '\n✅ 전부 지나갔다');
  process.exit(실패 ? 1 : 0);
}

/* ── 실제로 짓는다 ─────────────────────────────────────────── */
const 내가불렸나 = path.resolve(process.argv[1] ?? '') === fileURLToPath(import.meta.url);

if (내가불렸나) {
  const 낼방 = path.join(뿌리, 'public/wikitip/data');
  fs.mkdirSync(낼방, { recursive: true });

  const 읽기 = (p) => {
    const f = path.join(뿌리, p);
    if (!fs.existsSync(f)) return null;
    return JSON.parse(fs.readFileSync(f, 'utf8'));
  };

  const 낸것 = [];
  const 적기 = (이름, 글) => {
    fs.writeFileSync(path.join(낼방, 이름), 글, 'utf8');
    낸것.push({ 이름, 바이트: Buffer.byteLength(글, 'utf8') });
  };

  /* ─── ① coverage.csv — /data 지면이 «있다고 적어 둔» 파일 ─────────────── */
  const 안보임 = 읽기('src/data/wikitip-kpop-invisible.json');
  const 빈칸 = [
    ['Hours watched, by country', 'Netflix publishes viewing hours for its global list only. Country lists carry rank and nothing else.', 'no', 'No source we can reach carries it.'],
    ['What sits below each weekly top 10', 'Unpublished, so we cannot even count what is missing.', 'no', 'Netflix would have to publish it.'],
    ['Cast completeness', 'Wikidata cast lists are short and skew to well-known names.', 'partly', 'Improves as Wikidata is edited. Every network figure we publish is a floor.'],
    ['Acts with no English Wikipedia article', 'They produce no row in our attention panel.', 'partly', 'Improves as articles are written. We counted the size of the hole.'],
    ['Export figures for 2025 and 2026', 'The survey runs about eighteen months behind.', 'later', 'Arrives on the survey schedule, not ours.'],
  ];
  if (안보임?.rows) {
    for (const r of 안보임.rows) {
      if (r.missing === null || r.missing === undefined) continue;
      빈칸.push([
        `Not measured: ${r.label}`,
        `${r.missing} of ${r.all} have no English article (${r.missingPc}%).`,
        'partly', 'Counted from Wikidata. Improves as articles are written.',
      ]);
    }
  }
  적기('coverage.csv', 표(
    ['gap', 'what_is_missing', 'can_it_ever_be_filled', 'note'],
    빈칸,
  ));

  /* ─── ② korean-titles-netflix-runs.csv — 인용될 만한 «알맹이» ──────────── */
  const 작품 = 읽기('src/data/wikitip-title-pages.json');
  if (작품?.titles) {
    const 줄들 = [];
    for (const t of 작품.titles) {
      for (const m of t.byMarket ?? []) {
        줄들.push([
          t.title, t.slug, t.type, m.iso2, m.name,
          m.places, m.peak, m.first, m.last,
        ]);
      }
    }
    적기('korean-titles-netflix-runs.csv', 표(
      ['title', 'slug', 'kind', 'country_iso2', 'country', 'chart_places', 'peak_rank', 'first_week', 'last_week'],
      줄들,
    ));
    /* 작품 한 줄 요약 — 나라별까지 안 필요한 사람을 위해 */
    적기('korean-titles-summary.csv', 표(
      ['title', 'slug', 'kind', 'countries', 'chart_places', 'weeks', 'peak_rank', 'first_week', 'last_week', 'has_page'],
      작품.titles.map((t) => [
        t.title, t.slug, t.type, t.markets, t.places, t.weeks, t.peak, t.firstWeek, t.lastWeek,
        t.hasPage ? 'yes' : 'no',
      ]),
    ));
  }

  /* ─── ③ korean-actors-netflix.csv — 오늘 낸 636장의 알맹이 ───────────── */
  const 사람 = 읽기('src/data/wikitip-people.json');
  if (사람?.people) {
    적기('korean-actors-netflix.csv', 표(
      ['name', 'slug', 'wikipedia_page', 'born', 'charting_titles', 'chart_places', 'countries'],
      사람.people.map((p) => [
        p.name, p.slug, p.wikiPage, p.born, p.titleCount, p.places, p.countries,
      ]),
    ));
  }

  /* ─── ④ README — 파일만 떠돌아도 오해가 안 생기게 ─────────────────────── */
  적기('README.txt', [
    'K Culture Wire — open data',
    'https://www.kculturewire.com/data',
    '',
    'WHAT THESE FILES ARE',
    '  Counts taken from Netflix\'s own published weekly country top 10s (Tudum), joined to',
    '  Wikidata for cast and birth dates. Every figure on our site comes from these same rows.',
    '',
    'WHAT A "CHART PLACE" IS',
    '  One country-week slot in a Netflix top 10. If a title was 4th in Japan in one week,',
    '  that is one chart place. It is a record of presence, never of how many people watched.',
    '',
    'WHAT THESE FILES CANNOT TELL YOU',
    '  - Hours watched. Netflix publishes hours for its global list only, never by country.',
    '  - Anything below the weekly top 10. It is unpublished, so the gap cannot even be sized.',
    '  - A complete cast. Wikidata cast lists are short and skew to better-known names, so every',
    '    person-level figure is a floor, not a count.',
    '  - Actors whose Korean citizenship Wikidata does not record. They drop out of our filter,',
    '    and so do non-Korean actors in co-productions. The hole runs both ways.',
    '  See coverage.csv for the full list, with a column saying whether each gap can ever be filled.',
    '',
    'EMPTY CELLS',
    '  An empty cell means we do not hold the value. It never means zero.',
    '',
    'USING THEM',
    '  Free to use, including commercially. Please cite as "K Culture Wire, kculturewire.com"',
    '  and link back so a reader can see how the number was built.',
    '  If a figure looks wrong, tell us and we will publish a correction with the old number',
    '  still visible: https://www.kculturewire.com/corrections',
    '',
    `Built ${오늘()}.`,
  ].join('\r\n') + '\r\n');

  console.log('■ 내려받을 파일을 냈다 — public/wikitip/data/');
  for (const x of 낸것) console.log(`  ${x.이름.padEnd(34)} ${(x.바이트 / 1024).toFixed(0)}KB`);
  console.log('\n⛔ 이것이 유입을 늘리는지는 «모른다». 인용은 우리가 만들 수 없다 —');
  console.log('   자료를 열어 두면 «생길 수 있는» 것뿐이다. 걸린 곳이 생기는지 재서 말한다.');
}
