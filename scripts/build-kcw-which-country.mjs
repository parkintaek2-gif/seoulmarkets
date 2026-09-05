#!/usr/bin/env node
/**
 * build-kcw-which-country.mjs — **「<작품> netflix which country」에 답하는 자리.** (`/netflix-which-country`)
 *
 * ── 왜 (2026-08-29) ───────────────────────────────────────────
 * 🔴 **잰 수요** — Search Console 실측(2026-08-26 창)에서 「어느 나라 넷플릭스에 있나」를
 * 물어본 질의가 아홉 개, 노출 39회였다. 자리는 7~36위.
 * ```
 *   decision to leave netflix country                       12회  8위
 *   my roommate is a gumiho netflix which country            9회  9위
 *   my lovely liar netflix country                           5회  7위 · 클릭 1
 *   what countries can i watch behind your touch on netflix  5회 17위
 *   18 again netflix countries                               4회 12위
 *   reborn rich netflix country                              1회 27위
 * ```
 * ⚠ `/where-to-watch` 가 이미 이 자료를 쓰지만, 그 지면은 **자료 전체의 생김새**를 말한다.
 *   손님이 물은 것은 **「이 작품, 어느 나라」** 하나다. 물음 모양이 다르면 지면도 달라야 한다.
 *
 * ── ⛔ 이 자가 지키는 가장 중요한 것 ──────────────────────────
 * **차트에 올랐다 ≠ 그 나라에서 볼 수 있다.**
 * ```
 *   ✅ 우리가 말할 수 있는 것   「그 주에 그 나라에서 «볼 수 있었다»」 — 바닥값이다
 *   ⛔ 말할 수 없는 것        「지금 볼 수 있다」 · 「다른 나라엔 없다」
 * ```
 * 넷플릭스는 나라별 편성표를 «안 낸다». 차트에 없는 나라는 「없었다」가 아니라
 * **「10위 안에 못 들었다」**일 뿐이다. 이 둘을 섞으면 손님에게 틀린 나침반을 준다.
 *
 * ⛔ 못 찾은 작품을 찾은 척 하지 않는다 — 이름과 «왜 없는지»를 남긴다.
 * ⛔ 못 잰 칸을 0 으로 안 채운다.
 *
 * 쓰는 법
 *   node scripts/build-kcw-which-country.mjs --자가시험
 *   node scripts/build-kcw-which-country.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
/* 🔴 [2026-09-03] UTC 로 날짜를 만들던 자리를 KST 로 고쳤다 —
   CLAUDE.md 🔴 「toISOString() 도 쓰지 않는다. 날짜를 만들면 새벽에 하루가 어긋난다」 */
import { 오늘 } from './_kst.mjs';

const 뿌리 = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const 자료길 = path.join(뿌리, 'src/data/wikitip-title-pages.json');
const 질의길 = path.join(뿌리, 'src/data/gsc-kcw-2026-08-26.json');
const 모호길 = path.join(뿌리, 'src/data/wikitip-title-ambiguity.json');
const 낼길 = path.join(뿌리, 'src/data/kcw-which-country.json');

/** 이 질의가 「어느 나라」를 묻고 있나 */
export function 나라를묻나(q) {
  const s = String(q ?? '').toLowerCase();
  if (/tudum|\.tsv|netflix\.com/.test(s)) return false;
  if (/what country (made|is) /.test(s)) return false; /* 제작국을 묻는 것 — 다른 물음이다 */
  return /\bcountr(y|ies)\b/.test(s) && /netflix/.test(s);
}

/**
 * 질의에서 작품 이름만 남긴다.
 * ⚠ 「what countries can i watch X on netflix」처럼 앞뒤로 감싸는 꼴이 있다.
 */
export function 질의에서작품(q) {
  let s = String(q ?? '').toLowerCase();
  s = s.replace(/^what countries can i watch\s+/, '');
  s = s.replace(/^(what|which)\s+countr(y|ies)\s+(is|was|are|has|had)\s+/, '');
  s = s.replace(/\bon netflix\b/g, ' ');
  s = s.replace(/\bnetflix\s+(which\s+)?countr(y|ies)\b/g, ' ');
  s = s.replace(/\bnetflix\b/g, ' ');
  s = s.replace(/\bcountr(y|ies)\b/g, ' ');
  return s.replace(/\s+/g, ' ').trim();
}

/** 견주려고 이름을 고른다 */
export function 이름고르기(s) {
  return String(s ?? '')
    .toLowerCase()
    .replace(/[‘’“”]/g, "'")
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/**
 * 나라 줄을 «자리 수»로 세운다.
 * ⛔ 못 잰 나라는 0 으로 놓고 꼴찌 시키지 않는다 — 줄에서 뺀다.
 */
export function 나라줄세우기(나라들, n = 40) {
  return (나라들 ?? [])
    .filter((m) => Number.isFinite(m.places))
    .sort((a, b) => b.places - a.places || (a.peak ?? 99) - (b.peak ?? 99)
      || String(a.name).localeCompare(String(b.name)))
    .slice(0, n);
}

/* ── 자가시험 ─────────────────────────────────────────────── */
if (process.argv.includes('--자가시험')) {
  const 실패 = [];
  const 검 = (이름, 참) => { if (!참) 실패.push(이름); };

  검('「어느 나라」 물음을 알아본다', 나라를묻나('decision to leave netflix country') === true);
  검('which country 도 알아본다', 나라를묻나('my roommate is a gumiho netflix which country') === true);
  검('감싼 꼴도 알아본다',
    나라를묻나('what countries can i watch behind your touch on netflix') === true);
  검('⛔ tudum 주소 문의는 이 물음이 아니다',
    나라를묻나('"https://www.netflix.com/tudum/top10/data/all-weeks-countries.tsv"') === false);
  검('⛔ 제작국 물음은 다른 물음이다', 나라를묻나('what country made solo leveling') === false);
  검('⛔ netflix 가 없으면 아니다', 나라를묻나('korean drama country') === false);
  검('⛔ 빈 것도 안 터진다', 나라를묻나(undefined) === false);

  검('뒤에 붙은 꼴을 뗀다', 질의에서작품('decision to leave netflix country') === 'decision to leave');
  검('which 가 낀 꼴도 뗀다',
    질의에서작품('my roommate is a gumiho netflix which country') === 'my roommate is a gumiho');
  검('앞뒤로 감싼 꼴도 뗀다',
    질의에서작품('what countries can i watch behind your touch on netflix') === 'behind your touch');
  검('복수형도 뗀다', 질의에서작품('18 again netflix countries') === '18 again');

  검('이름을 눌러 붙인다', 이름고르기('18 Again') === '18 again');
  검('& 를 and 로 읽는다', 이름고르기('Sky & Sea') === 'sky and sea');
  검('⛔ 빈 것도 안 터진다', 이름고르기(null) === '');

  const 나라들 = [{ name: 'A', places: 3, peak: 2 }, { name: 'B', places: 9, peak: 5 },
    { name: 'C', places: null, peak: 1 }];
  const 줄 = 나라줄세우기(나라들);
  검('자리 수로 세운다', 줄[0].name === 'B' && 줄[1].name === 'A');
  검('⛔ 못 잰 나라를 꼴찌로 놓지 않고 뺀다', 줄.length === 2);
  검('길이를 자른다', 나라줄세우기([{ name: 'x', places: 1 }, { name: 'y', places: 2 }], 1).length === 1);
  검('⛔ 빈 것도 안 터진다', 나라줄세우기(undefined).length === 0);

  if (실패.length) {
    console.error(`❌ 자가시험 실패 ${실패.length}\n${실패.map((s) => `   · ${s}`).join('\n')}`);
    process.exit(1);
  }
  console.log('✅ build-kcw-which-country 자가시험 통과 (18)');
  process.exit(0);
}

/* 🔴 우리 도구는 작품마다 「이름만으로 한국 작품이라 가릴 수 있나」를 이미 재 두었다.
 *   그런데 그 판정이 지면에는 안 실린다 — 손님은 974편이 다 한국 것인 줄 안다.
 *   ⛔ 판정을 숨기지 않는다. 「못 가른다」도 결과다. */
const 모호 = new Map();
try {
  for (const x of JSON.parse(fs.readFileSync(모호길, 'utf8')).perTitle ?? []) {
    모호.set(이름고르기(x.title), { verdict: x.verdict, countries: x.countries ?? [] });
  }
} catch { /* ⛔ 못 읽으면 판정 칸을 «비운다». 지어내지 않는다 */ }
export function 판정칸(제목) {
  const v = 모호.get(이름고르기(제목));
  if (!v) return { koreanVerdict: null, wikidataCountries: null };
  return { koreanVerdict: v.verdict, wikidataCountries: v.countries };
}

/* ── 짓는다 ───────────────────────────────────────────────── */
const 원 = JSON.parse(fs.readFileSync(자료길, 'utf8'));
const 작품들 = 원.titles ?? [];
if (작품들.length < 100) {
  console.error(`🔴 못 짓는다 — 작품이 ${작품들.length}편뿐이다.`);
  process.exit(1);
}

const 색인 = new Map();
for (const t of 작품들) {
  const k = 이름고르기(t.title);
  if (k && !색인.has(k)) 색인.set(k, t);
  for (const s of t.otherSpellings ?? []) {
    const k2 = 이름고르기(s);
    if (k2 && !색인.has(k2)) 색인.set(k2, t);
  }
}

const 질의 = JSON.parse(fs.readFileSync(질의길, 'utf8')).rows ?? [];
const 물음들 = 질의.filter((r) => 나라를묻나(r.key)).sort((a, b) => b.impressions - a.impressions);

const 물음 = 물음들.map((r) => {
  const 이름 = 질의에서작품(r.key);
  const t = 색인.get(이름고르기(이름)) ?? null;
  if (!t) {
    return {
      asked: r.key, name: 이름, impressions: r.impressions, position: r.position, found: false,
      whyNot: 'No chart row under this name in the weeks we hold. That does not mean the title '
        + 'is unavailable anywhere — only that it never entered a country weekly top 10.',
    };
  }
  const 나라줄 = 나라줄세우기(t.byMarket ?? []);
  return {
    asked: r.key, name: 이름, impressions: r.impressions, position: r.position, found: true,
    title: t.title, slug: t.slug, hasPage: !!t.hasPage, type: t.type,
    markets: t.markets, weeks: t.weeks, peak: t.peak, atOnce: t.atOnce,
    firstWeek: t.firstWeek, lastWeek: t.lastWeek,
    countries: 나라줄.map((m) => ({
      iso2: m.iso2, name: m.name, places: m.places, peak: m.peak, first: m.first, last: m.last,
    })),
    shownCountries: 나라줄.length,
    ...판정칸(t.title),
  };
});

/* 견줄 자리 — 「몇 나라가 보통인가」 */
const 나라수들 = 작품들.map((t) => t.markets).filter(Number.isFinite).sort((a, b) => a - b);
const 가운데 = 나라수들.length
  ? (나라수들.length % 2 ? 나라수들[(나라수들.length - 1) / 2]
    : (나라수들[나라수들.length / 2 - 1] + 나라수들[나라수들.length / 2]) / 2)
  : null;

const 낼것 = {
  generated: 오늘(),
  source: 원.source,
  weekFrom: 원.weekFrom,
  weekTo: 원.weekTo,
  weekCount: 원.weekCount,
  marketCount: 원.marketCount,
  titleCount: 작품들.length,
  medianCountries: 가운데,
  oneCountryOnly: 작품들.filter((t) => t.markets === 1).length,
  /* 🔴 [2026-09-06] 「190여 개국에 나간다」는 발표를 손님이 이 지면의 수와 견줄 수 있게 —
     ⛔ 견줄 수 있는 것이 아니라는 것을 보이려고 넣는다. 차트를 내는 나라가 94곳뿐이다.
     차트 뜻으로 «가장 넓게» 간 한국 작품이 몇 나라였나를 함께 낸다. */
  maxCountries: 작품들.reduce((a, t) => Math.max(a, t.markets ?? 0), 0),
  asked: 물음,
  askedFound: 물음.filter((x) => x.found).length,
  askedMissing: 물음.filter((x) => !x.found).length,

  /* 🔴 이 지면이 절대 헷갈리면 안 되는 것 */
  floorNotCatalogue: 'A country listed here is a country where the title demonstrably could be '
    + 'watched in that week, because it was in that week top 10. A country not listed is not a '
    + 'country where it was missing. Netflix publishes no per-country catalogue, so absence from '
    + 'a chart means only that the title did not place in the top ten there.',
  cannotAnswer: [
    'Whether the title is on Netflix in your country today. These are weekly charts going back '
      + 'years, and catalogues change every month.',
    'Whether it was available but simply outside the top ten. That is invisible in this data and '
      + 'is the most common case by far.',
    'Anything about other services. This is Netflix only.',
  ],
};

fs.writeFileSync(낼길, `${JSON.stringify(낼것, null, 2)}\n`);

console.log('■ /netflix-which-country 자료를 지었다');
console.log(`   물어본 작품 ${물음.length}개 중 ✅ 찾음 ${낼것.askedFound} · ⬜ 못 찾음 ${낼것.askedMissing}`);
for (const x of 물음) {
  console.log(x.found
    ? `   ✅ ${x.name} — ${x.markets}나라 (보일 것 ${x.shownCountries}) · 노출 ${x.impressions}회`
    : `   ⬜ ${x.name} — 우리 표에 줄이 없다 · 노출 ${x.impressions}회`);
}
console.log(`   가운데 작품은 ${가운데}나라 · 한 나라뿐 ${낼것.oneCountryOnly}편`);
console.log('   ⛔ 「차트에 올랐다」와 「그 나라에서 볼 수 있다」를 섞지 않는다');
console.log(`\n✔ ${path.relative(뿌리, 낼길)}`);
