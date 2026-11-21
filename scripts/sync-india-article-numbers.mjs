#!/usr/bin/env node
/**
 * sync-india-article-numbers.mjs — **기사에 박힌 수를 자료에 맞춘다. 그리고 어긋나면 막는다.**
 *
 * ── 🔴 왜 만드나 (2026-09-26) ────────────────────────────────────────
 * 사장님: 「**아시아마켓츠 마무리했나?**」 · 「**아직 멀었는데 넋놓고 있니?**」
 *
 * 인도 자료를 9/23 → 9/26 으로 되살리고 `src/data/india-rating-moves.json` 을 다시
 * 지었는데, **손님이 읽는 기사는 옛 수를 그대로 말하고 있었다.**
 *
 * ```
 * 자료        22,747건 · 상향 2,735 · 하향 762
 * 기사 본문    22,295건 · 상향 2,629 · 하향 736      ← 손님이 보는 것
 * ```
 *
 * ⛔ 자료를 갱신해도 기사가 안 따라오면 **갱신한 것이 아니다.**
 *   강령 그대로다 — 「틀린 숫자 하나가 옳은 스물셋을 같이 의심받게 한다」.
 *
 * ⭐ 그래서 손으로 고치지 않는다. 손으로 고치면 다음 갱신에 또 어긋난다.
 *   **자료가 정본이고, 기사는 자료를 따라간다.** 어긋나면 검사가 그 자리에서 막는다.
 *
 * 쓰는 법
 *   node scripts/sync-india-article-numbers.mjs            무엇이 어긋났나만 본다
 *   node scripts/sync-india-article-numbers.mjs --적는다    기사를 자료에 맞춘다
 *   node scripts/sync-india-article-numbers.mjs --save      (영문 별칭 — 예약·.cmd 용)
 *   node scripts/sync-india-article-numbers.mjs --검사      어긋나면 종료코드 1 (npm test 용)
 *   node scripts/sync-india-article-numbers.mjs --자가시험
 */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const 여기 = path.dirname(fileURLToPath(import.meta.url));
const 뿌리 = path.resolve(여기, '..');
export const 기사길 = path.join(뿌리, 'content', 'articles',
  'india-credit-rating-actions-upgrades-outnumber-downgrades.md');
export const 자료길 = path.join(뿌리, 'src', 'data', 'india-rating-moves.json');
export const 원자료방 = path.join(뿌리, 'archive', 'raw', 'india-nse-credit-rating');

/** 천 단위 쉼표를 붙인다 — 기사가 쓰는 꼴 그대로 */
export function 쉼표(n) {
  /* ⛔ null·빈 글을 Number() 에 그냥 넘기면 «0» 이 된다 — 없는 수가 0 으로 둔갑한다.
     강령 — 「 못 잰 것은 못 쟀다고 적는다」 */
  if (n === null || n === undefined || n === '') return '';
  if (typeof n !== 'number' && typeof n !== 'string') return '';
  const v = Number(n);
  if (!Number.isFinite(v)) return '';
  return v.toLocaleString('en-US');
}

/**
 * 상향 : 하향 비율 — 기사 제목이 「3.6 to 1」이라고 말한다.
 * ⛔ 반올림해서 1.0 아래로 내려가면 제목이 거짓이 된다. 그때는 «막는다»(아래 어긋난것).
 */
export function 비율(상향, 하향) {
  const a = Number(상향); const b = Number(하향);
  if (!Number.isFinite(a) || !Number.isFinite(b) || b <= 0) return null;
  return Math.round((a / b) * 10) / 10;
}

/** 원자료에서 오늘 값을 다시 «센다». 남이 만든 표를 받아 쓰지 않는다 */
export function 세기(행들) {
  const 갈래 = {}; const 자리 = {};
  for (const r of 행들 ?? []) {
    const k = String(r?.action ?? r?.kind ?? '?');
    갈래[k] = (갈래[k] || 0) + 1;
    const s = String(r?.listing ?? '?');
    자리[s] = (자리[s] || 0) + 1;
  }
  return {
    전체: (행들 ?? []).length,
    상향: 갈래.upgrade || 0,
    하향: 갈래.downgrade || 0,
    새등급: 갈래.new || 0,
    그밖: 갈래.other || 0,
    못가름: 갈래.unknown || 0,
    주식: 자리.equities || 0,
    소형: 자리.sme || 0,
  };
}

/** 가장 새 원자료 파일을 찾는다 */
export function 가장새것(이름들) {
  const 것 = (이름들 ?? []).filter((n) => /^\d{8}\.json\.gz$/.test(String(n))).sort();
  return 것.length ? 것[것.length - 1] : null;
}

/**
 * 기사 안에서 «바꿀 자리»를 만든다.
 * ⛔ 숫자만 보고 찾지 않는다 — 같은 수가 딴 뜻으로 쓰인 자리를 덮어쓸 수 있다.
 *   기사가 실제로 쓰는 «문장 꼴»로 짚는다.
 */
export function 바꿀것들(수) {
  const 전 = 쉼표(수.전체);
  return [
    /* 머리글(dek)·본문에서 되풀이되는 「Across 22,295 rating actions」 꼴 */
    { 찾기: /(\d{1,3},\d{3}) (rating actions logged|rows cover|credit-rating actions logged)/g,
      바꾸기: (m, _n, 뒤) => `${전} ${뒤}` },
    /* 표와 문장의 상향·하향·새등급·그밖 */
    { 찾기: /(\d{1,3},\d{3}) were upgrades against (\d{1,3},?\d*) downgrades/g,
      바꾸기: () => `${쉼표(수.상향)} were upgrades against ${쉼표(수.하향)} downgrades` },
    { 찾기: /(\d{1,3},\d{3}) were upgrades and (\d{1,3},?\d*) were downgrades/g,
      바꾸기: () => `${쉼표(수.상향)} were upgrades and ${쉼표(수.하향)} were downgrades` },
    { 찾기: /\| Other \(reissue, withdrawal, outlook-only change\) \| [\d,]+ \|/g,
      바꾸기: () => `| Other (reissue, withdrawal, outlook-only change) | ${쉼표(수.그밖)} |` },
    { 찾기: /\| Upgrade \| [\d,]+ \|/g, 바꾸기: () => `| Upgrade | ${쉼표(수.상향)} |` },
    { 찾기: /\| New rating assigned \| [\d,]+ \|/g, 바꾸기: () => `| New rating assigned | ${쉼표(수.새등급)} |` },
    { 찾기: /\| Downgrade \| [\d,]+ \|/g, 바꾸기: () => `| Downgrade | ${쉼표(수.하향)} |` },
    { 찾기: /\| Unclassified \| [\d,]+ \|/g, 바꾸기: () => `| Unclassified | ${쉼표(수.못가름)} |` },
    { 찾기: /\| \*\*Total actions\*\* \| \*\*[\d,]+\*\* \|/g,
      바꾸기: () => `| **Total actions** | **${쉼표(수.전체)}** |` },
    /* 주식·SME 갈래 — 오늘 원자료에서 다시 센다 */
    { 찾기: /the equities segment \([\d,]+ actions\) and the SME segment \([\d,]+ actions\)/g,
      바꾸기: () => `the equities segment (${쉼표(수.주식)} actions) and the SME segment (${쉼표(수.소형)} actions)` },
    /* 비율 — 제목·본문 */
    { 찾기: /(\d\.\d) upgrades for every/g, 바꾸기: () => `${비율(수.상향, 수.하향)} upgrades for every` },
    { 찾기: /outnumbered downgrades (\d\.\d) to 1/g,
      바꾸기: () => `outnumbered downgrades ${비율(수.상향, 수.하향)} to 1` },
  ];
}

/** 기사 글을 자료에 맞춘다 */
export function 맞추기(글, 수) {
  let 새글 = String(글 ?? '');
  for (const { 찾기, 바꾸기 } of 바꿀것들(수)) 새글 = 새글.replace(찾기, 바꾸기);
  return 새글;
}

/**
 * 🔴 기사에 «자료에 없는 수»가 남아 있나 — 이것이 검사의 핵심이다.
 * 맞추고 나서도 옛 수가 남아 있으면 내가 못 짚은 자리가 있다는 뜻이다.
 */
export function 어긋난것(글, 수) {
  const 흠 = [];
  const 있어야 = new Set([수.전체, 수.상향, 수.하향, 수.새등급, 수.그밖, 수.못가름, 수.주식, 수.소형]
    .map((n) => 쉼표(n)));
  /* 기사에 나오는 «천 단위 수»를 다 뽑아, 자료에 없는 것이 있으면 흠이다 */
  for (const m of String(글 ?? '').matchAll(/\b\d{1,3},\d{3}\b/g)) {
    if (!있어야.has(m[0])) 흠.push(`기사에 「${m[0]}」이 있는데 자료에는 없는 수다`);
  }
  const r = 비율(수.상향, 수.하향);
  /* ⚠ 「X to 1」 꼴이 «있을 때만» 잰다 — 그 표현이 없는 글에 없다고 흠을 잡으면
     엉뚱한 곳에서 빨간불이 켜지고, 그 빨간불이 진짜 어긋남을 가린다. */
  const 비율쓴글 = /\d\.\d to 1/.test(String(글 ?? ''));
  if (r !== null && 비율쓴글 && !String(글 ?? '').includes(`${r} to 1`)) {
    흠.push(`제목의 비율이 자료와 다르다 — 자료는 ${r} to 1`);
  }
  if (r !== null && r < 1) 흠.push(`🔴 상향이 하향보다 적어졌다(${r}) — 제목을 통째로 다시 써야 한다`);
  return [...new Set(흠)];
}

function 읽기() {
  const 이름 = 가장새것(fs.readdirSync(원자료방));
  if (!이름) return { 탈: '원자료가 없다' };
  const j = JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(원자료방, 이름))));
  const 행 = Array.isArray(j) ? j : (j.rows || j.events || j.data || []);
  return { 이름, 수: 세기(행) };
}

function 자가시험() {
  let 통과 = 0; let 탈 = 0;
  const 검 = (이름, 참) => { if (참) { 통과++; console.log('✅', 이름); } else { 탈++; console.log('🔴', 이름); } };

  검('쉼표를 붙인다', 쉼표(22747) === '22,747');
  검('⛔ 수가 아니면 빈 글 — null 에도 안 터진다', 쉼표(null) === '' && 쉼표('가') === '');

  검('비율을 한 자리로 낸다 — 오늘 값', 비율(2735, 762) === 3.6);
  검('앞선 값도 3.6 이었다', 비율(2629, 736) === 3.6);
  검('⛔ 0 으로 나누지 않는다', 비율(10, 0) === null);
  검('⛔ null 에도 안 터진다', 비율(null, null) === null);

  const 행 = [
    { action: 'upgrade', listing: 'equities' }, { action: 'upgrade', listing: 'sme' },
    { action: 'downgrade', listing: 'equities' }, { action: 'new', listing: 'equities' },
    { action: 'other', listing: 'sme' }, { action: 'unknown', listing: 'equities' },
  ];
  const 수 = 세기(행);
  검('갈래를 센다', 수.상향 === 2 && 수.하향 === 1 && 수.새등급 === 1 && 수.그밖 === 1 && 수.못가름 === 1);
  검('자리를 센다', 수.주식 === 4 && 수.소형 === 2);
  검('전체를 센다', 수.전체 === 6);
  검('⛔ 빈 것·null 에도 안 터진다', 세기([]).전체 === 0 && 세기(null).전체 === 0);

  검('가장 새 원자료를 고른다',
    가장새것(['20260920.json.gz', '20260926.json.gz', '20260923.json.gz']) === '20260926.json.gz');
  검('⛔ 딴 파일을 집지 않는다', 가장새것(['_meta.json', 'readme.md']) === null);
  검('⛔ 빈 것·null 에도 안 터진다', 가장새것([]) === null && 가장새것(null) === null);

  /* 🔴 그날 실제로 어긋나 있던 글로 잰다 */
  const 옛글 = [
    'dek: "Across 22,295 rating actions logged for NSE-listed companies, 2,629 were upgrades against 736 downgrades."',
    '  - "22,295 rows cover both the equities segment (21,330 actions) and the SME segment (965 actions) of NSE"',
    'Among 22,295 credit-rating actions logged, 2,629 were upgrades and 736 were downgrades — a ratio of 3.6 upgrades for every',
    '| Other (reissue, withdrawal, outlook-only change) | 17,318 |',
    '| Upgrade | 2,629 |',
    '| New rating assigned | 1,610 |',
    '| Downgrade | 736 |',
    '| Unclassified | 2 |',
    '| **Total actions** | **22,295** |',
  ].join('\n');
  const 오늘 = { 전체: 22747, 상향: 2735, 하향: 762, 새등급: 1660, 그밖: 17588, 못가름: 2, 주식: 21740, 소형: 1007 };
  const 새글 = 맞추기(옛글, 오늘);

  검('🔴 전체 건수를 고친다', 새글.includes('22,747 rating actions') && !새글.includes('22,295'));
  검('🔴 상향·하향을 고친다', 새글.includes('2,735 were upgrades against 762 downgrades'));
  검('🔴 본문 꼴도 고친다', 새글.includes('2,735 were upgrades and 762 were downgrades'));
  검('🔴 표를 고친다', 새글.includes('| Upgrade | 2,735 |') && 새글.includes('| Downgrade | 762 |'));
  검('🔴 그밖·새등급도 고친다',
    새글.includes('| New rating assigned | 1,660 |') && 새글.includes('17,588'));
  검('🔴 합계를 고친다', 새글.includes('| **Total actions** | **22,747** |'));
  검('🔴 주식·SME 갈래도 오늘 값으로', 새글.includes('(21,740 actions)') && 새글.includes('(1,007 actions)'));
  검('비율은 그대로 3.6 이다', 새글.includes('3.6 upgrades for every'));
  검('⛔ 맞춘 글에는 어긋난 수가 없다', 어긋난것(새글, 오늘).length === 0);
  검('🔴 안 맞춘 옛글은 어긋남이 잡힌다', 어긋난것(옛글, 오늘).length > 0);
  검('🔴 상향이 하향보다 적어지면 제목을 다시 쓰라고 한다',
    어긋난것('1.0 to 1', { 전체: 1, 상향: 1, 하향: 2, 새등급: 0, 그밖: 0, 못가름: 0, 주식: 1, 소형: 0 })
      .some((x) => /제목을 통째로/.test(x)));
  검('⛔ 빈 글·null 에도 안 터진다',
    Array.isArray(어긋난것('', 오늘)) && Array.isArray(어긋난것(null, 오늘)));

  console.log(탈 ? `\n🔴 자가시험 ${탈}건 탈` : `\n✅ 자가시험 ${통과} 통과`);
  process.exit(탈 ? 1 : 0);
}

const 내가진입점 = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (내가진입점) {
  const 인자 = process.argv.slice(2);
  if (인자.includes('--자가시험') || 인자.includes('--selftest')) 자가시험();

  const r = 읽기();
  if (r.탈) { console.log('🔴', r.탈); process.exit(1); }
  const 글 = fs.readFileSync(기사길, 'utf8');
  const 흠 = 어긋난것(글, r.수);

  console.log(`■ 인도 기사 ↔ 자료 (${r.이름})`);
  console.log(`   자료 — 전체 ${쉼표(r.수.전체)} · 상향 ${쉼표(r.수.상향)} · 하향 ${쉼표(r.수.하향)}`
    + ` · 비율 ${비율(r.수.상향, r.수.하향)} to 1`);

  if (인자.includes('--검사') || 인자.includes('--check')) {
    if (!흠.length) { console.log('   ✅ 기사가 자료와 같은 말을 한다'); process.exit(0); }
    for (const x of 흠) console.log('   🔴', x);
    console.log('\n⛔ 기사가 옛 수를 말하고 있다 — node scripts/sync-india-article-numbers.mjs --적는다');
    process.exit(1);
  }

  if (!흠.length) { console.log('   ✅ 기사가 자료와 같은 말을 한다 — 고칠 것 없다'); process.exit(0); }
  for (const x of 흠) console.log('   🟡', x);

  if (!(인자.includes('--적는다') || 인자.includes('--save'))) {
    console.log('\n⬜ 재기만 했다. 고치려면 --적는다 (영문 별칭 --save)');
    process.exit(0);
  }
  const 새글 = 맞추기(글, r.수);
  const 남은흠 = 어긋난것(새글, r.수);
  if (남은흠.length) {
    /* ⛔ 반만 고친 기사를 내보내지 않는다 — 틀린 수가 섞인 기사가 제일 나쁘다 */
    console.log('\n🔴 고쳤는데도 어긋난 수가 남는다 — 적지 «않는다». 짚을 자리를 더 넣어야 한다:');
    for (const x of 남은흠) console.log('   ·', x);
    process.exit(1);
  }
  fs.writeFileSync(기사길, 새글, 'utf8');
  console.log(`\n✅ 기사를 자료에 맞췄다 — ${path.relative(뿌리, 기사길)}`);
}
