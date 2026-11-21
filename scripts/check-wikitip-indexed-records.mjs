#!/usr/bin/env node
/**
 * check-wikitip-indexed-records.mjs — **구글 색인 표본 기록을 지킨다.**
 * ────────────────────────────────────────────────────────────────────────────
 * [무엇을 지키나]
 *   K Culture Wire 지면이 구글에 «들어갔나»를 Search Console URL Inspection API 로
 *   물어본 표본 기록 셋이다. 지면이 읽지 않는다 — **재 본 것을 남긴 기록**이다.
 *
 *   ⭐ 우리 강령이 「못 잰 것은 못 쟀다고 적는다」이므로, 재 본 것은 **지운다고 없어지면 안 된다.**
 *      그래서 `check-wikitip-data.mjs` 가 요구하는 「지키는 검사」를 이 자로 둔다.
 *      (그 자는 만드는 스크립트도 지키는 검사도 없는 자료를 흠으로 부른다 — 그 말이 맞다.
 *       손으로 굳은 자료는 고쳐도 아무도 안 따라오기 때문이다.)
 *
 * [왜 지우지 않나]
 *   세 기록이 **날짜가 다른 표본**이라 색인이 어느 쪽으로 가는지를 보여 준다.
 *   그것이 이 기록의 값이고, 한 장만 남기면 그 값이 사라진다.
 *
 * [무엇을 잡나]
 *   ① 칸이 사라지거나 이름이 바뀌는 것 — 기록의 뜻이 조용히 달라진다
 *   ② 표본 수와 줄 수가 어긋나는 것 — 「40개를 물어봤다」면서 줄이 30이면 못 믿는다
 *   ③ 갈래별 합이 줄 수와 안 맞는 것
 *   ④ 모르는 판정말이 섞이는 것 — 0 으로 채우거나 새 말을 만들면 견줄 수 없게 된다
 *
 * [쓰는 법]
 *   node scripts/check-wikitip-indexed-records.mjs
 *   node scripts/check-wikitip-indexed-records.mjs --자가시험
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const 뿌리 = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const 자료방 = path.join(뿌리, 'src', 'data');

/**
 * 지키는 기록들.
 * ⚠ **이름을 여기에 적는다.** `check-wikitip-data.mjs` 는 파일 이름이 글로 나오는지를 보고
 *   「지키는 검사가 있다」로 센다. 글자를 조립해 쓰면 그 자가 못 찾는다.
 * ⭐ 새 표본을 뜨면 여기에 한 줄 더한다 — 그것이 「등록」이다.
 */
export const 기록들 = [
  'wikitip-indexed-20260825.json',
  'wikitip-indexed-20260827-40.json',
  'wikitip-indexed-20260828-실험20.json',
];

/** 있어야 하는 칸 */
export const 있어야하는칸 = ['generated', 'whatThisIs', 'whatThisIsNot', 'sitemapPages', 'sampled', 'byState', 'byKind', 'rows'];

/** 아는 판정말 — ⛔ 새 말을 만들면 앞 기록과 견줄 수 없다 */
export const 아는꼴 = new Set(['들어갔다', '발견만', '구글이모른다', '막혔다', '못물어봤다']);

/** 기록 한 장을 본다 — 흠 목록을 준다 */
export function 본다한장(이름, 기록) {
  const 흠 = [];
  if (!기록 || typeof 기록 !== 'object') return [`${이름} — 자료가 객체가 아니다`];

  for (const 칸 of 있어야하는칸) {
    if (!(칸 in 기록)) 흠.push(`${이름} — 「${칸}」 칸이 없다`);
  }
  for (const 칸 of ['byState', 'byKind', 'rows']) {
    if (칸 in 기록 && !Array.isArray(기록[칸])) 흠.push(`${이름} — 「${칸}」 이 배열이 아니다`);
  }

  const 줄 = Array.isArray(기록.rows) ? 기록.rows : null;
  if (줄) {
    if (Number.isFinite(기록.sampled) && 기록.sampled !== 줄.length) {
      흠.push(`${이름} — 「${기록.sampled}개를 물어봤다」인데 줄이 ${줄.length}개다`);
    }
    if (Array.isArray(기록.byState)) {
      const 합 = 기록.byState.reduce((a, x) => a + (Number(x?.pages) || 0), 0);
      if (합 !== 줄.length) 흠.push(`${이름} — 갈래별 합 ${합} 과 줄 수 ${줄.length} 가 다르다`);
    }
    for (const r of 줄) {
      if (!r?.주소) { 흠.push(`${이름} — 주소 없는 줄이 있다`); break; }
    }
    const 모르는 = [...new Set(줄.map((r) => r?.꼴).filter((k) => k && !아는꼴.has(k)))];
    if (모르는.length) 흠.push(`${이름} — 모르는 판정말: ${모르는.join(' · ')}`);
  }

  if (Number.isFinite(기록.sitemapPages) && 기록.sitemapPages <= 0) {
    흠.push(`${이름} — sitemapPages 가 ${기록.sitemapPages} 다. `);
  }
  return 흠;
}

export function 자가시험() {
  let 흠 = 0;
  let 잰수 = 0;
  const 본다 = (이름, 참) => {
    잰수 += 1;
    if (참) console.log(`  ✅ ${이름}`);
    else { console.log(`  🔴 ${이름}`); 흠 += 1; }
  };

  const 좋은것 = {
    generated: '2026-08-25',
    whatThisIs: '설명',
    whatThisIsNot: '아닌 것',
    sitemapPages: 2596,
    sampled: 2,
    byState: [{ state: '들어갔다', pages: 1 }, { state: '발견만', pages: 1 }],
    byKind: [{ kind: 'home', states: { 들어갔다: 1 } }],
    rows: [
      { 주소: 'https://x/', 갈래: 'home', 꼴: '들어갔다' },
      { 주소: 'https://x/a', 갈래: 'title', 꼴: '발견만' },
    ],
  };

  본다('깨끗한 기록은 흠이 없다', 본다한장('보기', 좋은것).length === 0);

  const 칸없음 = { ...좋은것 }; delete 칸없음.sampled;
  본다('칸이 사라지면 잡는다', 본다한장('보기', 칸없음).some((m) => /sampled/.test(m)));

  본다('표본 수와 줄 수가 어긋나면 잡는다',
    본다한장('보기', { ...좋은것, sampled: 40 }).some((m) => /물어봤다/.test(m)));

  본다('갈래별 합이 안 맞으면 잡는다',
    본다한장('보기', { ...좋은것, byState: [{ state: '들어갔다', pages: 5 }] }).some((m) => /갈래별 합/.test(m)));

  본다('모르는 판정말을 잡는다',
    본다한장('보기', { ...좋은것, rows: [{ 주소: 'https://x/', 꼴: '아마들어갔다' }, { 주소: 'https://x/a', 꼴: '발견만' }], sampled: 2, byState: [{ state: '들어갔다', pages: 2 }] })
      .some((m) => /모르는 판정말/.test(m)));

  본다('주소 없는 줄을 잡는다',
    본다한장('보기', { ...좋은것, rows: [{ 갈래: 'home', 꼴: '들어갔다' }, { 주소: 'https://x/a', 꼴: '발견만' }] })
      .some((m) => /주소 없는/.test(m)));

  본다('0 으로 채운 sitemapPages 를 잡는다',
    본다한장('보기', { ...좋은것, sitemapPages: 0 }).some((m) => /0 으로 채우지/.test(m)));

  본다('배열이 아니면 잡는다',
    본다한장('보기', { ...좋은것, rows: {} }).some((m) => /배열이 아니다/.test(m)));

  본다('객체가 아니면 바로 잡는다', 본다한장('보기', null).length === 1);
  본다('지키는 기록이 비어 있지 않다', 기록들.length > 0);
  본다('기록 이름이 다 .json 이다', 기록들.every((f) => f.endsWith('.json')));

  /* ⭐ 실물로도 한 번 재 본다 */
  const 있는것 = 기록들.filter((f) => fs.existsSync(path.join(자료방, f)));
  if (있는것.length) {
    본다(`실물 ${있는것.length}장이 다 지난다`,
      있는것.every((f) => 본다한장(f, JSON.parse(fs.readFileSync(path.join(자료방, f), 'utf8'))).length === 0));
  } else {
    console.log('  ⬜ 실물 기록이 없어 **못 쟀다**');
  }

  console.log(흠 ? `\n🔴 자가시험 ${흠}개 흠` : `\n✅ 자가시험 ${잰수}가지 다 지났다`);
  return 흠;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  if (process.argv.includes('--자가시험')) process.exit(자가시험() ? 1 : 0);

  const 흠 = [];
  console.log('구글 색인 표본 기록 — 지키는 것 ' + 기록들.length + '장\n');
  for (const f of 기록들) {
    const 길 = path.join(자료방, f);
    if (!fs.existsSync(길)) { 흠.push(`${f} — 없어졌다. 재 본 기록은 지우지 않는다`); continue; }
    let j;
    try { j = JSON.parse(fs.readFileSync(길, 'utf8')); } catch { 흠.push(`${f} — JSON 이 깨졌다`); continue; }
    const 이번 = 본다한장(f, j);
    흠.push(...이번);
    /* ⭐ 지나가는 김에 «색인이 어느 쪽으로 가나»를 낸다 — 기록의 값이 여기에 있다 */
    const 들어감 = (j.byState ?? []).find((x) => x.state === '들어갔다')?.pages ?? 0;
    const 몫 = j.rows?.length ? Math.round((들어감 / j.rows.length) * 1000) / 10 : null;
    console.log(`  ${이번.length ? '🔴' : '✅'} ${f}  표본 ${j.rows?.length ?? '?'}개 중 들어간 것 ${들어감}개${몫 === null ? '' : ` (${몫}%)`}`);
  }

  if (흠.length) {
    console.error(`\n⛔ ${흠.length}건`);
    for (const m of 흠) console.error(`   · ${m}`);
    process.exit(1);
  }
  console.log('\n✅ 기록이 다 제자리에 있고 앞뒤가 맞다.');
}
