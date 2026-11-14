#!/usr/bin/env node
/**
 * build-kcw-school-pipeline.mjs — «어느 학교가 세계로 나간 한국 연예인을 냈나»를 «잰다».
 * ─────────────────────────────────────────────────────────────────────────────
 * [왜 이 축인가 — 2026-09-04]
 *   사장님: 「경쟁사(CEO스코어·CEO랭킹)는 «재무»를 한다. **우리는 사람을 한다**」
 *   그리고 「쥔 자료의 «안 쓰던 축»부터 찾아 낸다」.
 *
 *   `archive/raw/wikidata/korean-entertainers-school.json` (4,535건)은 지금까지 한 번도
 *   기사에 안 쓰였다. 그런데 그 파일에는 «이름이 없다» — 위키데이터 id(q)와 학교만 있다.
 *   이름과 «언어판 수»는 `korean-entertainers-birth.json`(9,249건)에 있다. 이어야 쓸 수 있다.
 *
 * [무엇으로 「세계로 나갔나」를 재나 — 대리 지표를 밝혀 둔다]
 *   `sitelinks` = 그 사람의 위키백과가 «몇 개 언어판»에 있나.
 *   ⚠ 이것은 인기가 아니다. **몇 개 언어 공동체가 그 사람에 대해 글을 썼나**다.
 *     한국어판에만 있으면 1, 영어·일본어·스페인어까지 있으면 4 다.
 *   ⛔ 「인기 순위」로 부르지 않는다. 우리 강령대로 «잰 것»만 그 이름으로 부른다.
 *
 * [못 재는 것을 먼저 적는다]
 *   ⬜ 학교 자료가 4,535건이고 출생 자료가 9,249건이다 — 겹치지 않는 사람은 학교를 모른다.
 *      「학교가 없다」가 아니라 «위키데이터에 안 적혀 있다»는 뜻이다.
 *   ⬜ 졸업·중퇴·재학을 가르지 않는다. 위키데이터의 educated_at 은 그것을 구분하지 않는다.
 *   ⬜ 한 사람이 학교를 여럿 가질 수 있다(중·고·대). 학교별로 각각 센다 — 겹쳐 센다.
 *
 *   node scripts/build-kcw-school-pipeline.mjs
 *   node scripts/build-kcw-school-pipeline.mjs --자가시험
 */
import fs from 'node:fs';
import path from 'node:path';
/* 🔴 [2026-11-14] 영문 지면에 「오후」가 나갔다 — 잰 시각은 한 꼴로 적는다 */
import { 잰때문자 } from './lib/잰때.mjs';

const 뿌리 = path.resolve(path.dirname(new URL(import.meta.url).pathname).replace(/^\/([A-Za-z]:)/, '$1'), '..');

/** 배열이 어디 들었든 꺼낸다 — 파일 꼴이 파일마다 달라서 짐작하지 않는다 */
export function 배열꺼내기(j) {
  if (Array.isArray(j)) return j;
  if (!j || typeof j !== 'object') return [];
  for (const k of ['rows', 'items', 'results', 'data']) if (Array.isArray(j[k])) return j[k];
  const 첫배열 = Object.values(j).find((v) => Array.isArray(v));
  return 첫배열 || [];
}

/**
 * 학교 이름을 다듬는다. ⛔ 서로 다른 학교를 같은 것으로 합치지 않는다.
 *
 * ⚠ 🔴 [2026-09-04] 자료의 `schools` 는 «글이 아니라 객체 배열»이다 —
 *   `{ q, name, slug }` 꼴이다. 처음에 글로 짐작해 짰더니 자가시험은 22개 다 통과하고
 *   «진짜 자료에서» 학교 이름이 전부 `[object Object]` 로 나와 학교가 «1곳»으로 뭉쳤다.
 *   ⛔ 그래서 이 함수가 객체도 받는다. 그리고 자가시험에 «진짜 꼴»을 넣었다 —
 *     내가 지어낸 꼴만 시험하면 이 사고가 또 난다.
 *   ⭐ 우리 규칙: 「진짜 자료를 통과시켜 보기 전에는 «됐다»고 하지 않는다」.
 */
export function 학교이름다듬기(s) {
  if (s && typeof s === 'object') {
    /* 이름이 없으면 slug 로, 그것도 없으면 못 쓴다 — q 만 남기면 사람이 못 읽는다 */
    const n = s.name ?? s.슬러그 ?? s.slug ?? null;
    if (n === null || n === undefined) return null;
    return 학교이름다듬기(n);
  }
  const t = String(s ?? '').trim().replace(/\s+/g, ' ');
  if (!t) return null;
  /* 위키데이터에 영문·한글이 섞여 온다. 뒤 괄호 주석만 뗀다 */
  return t.replace(/\s*\([^)]*\)\s*$/, '').trim() || null;
}

/**
 * 학교 자료와 출생 자료를 «이어» 학교별로 센다.
 * @returns {{학교들: object[], 이은수: number, 못이은수: number, 학교없는수: number}}
 */
export function 잇기(학교자료, 출생자료) {
  const 이름표 = new Map();
  for (const b of 출생자료) {
    if (!b || !b.q) continue;
    이름표.set(String(b.q), {
      이름: b.name ?? null,
      /* 🔴 [2026-09-04] 여기서 처음에 `Number.isFinite(Number(b.sitelinks))` 로 썼다가
         «자가시험이 잡았다» — Number(null) 은 0 이고 0 은 유한수라, 값이 없는 사람이
         「언어판 0개」로 «채워졌다». 우리 강령의 「못 잰 것을 0 으로 채우지 않는다」를
         내가 코드로 어긴 것이다.
         ⛔ 그래서 «없음»을 먼저 가른 뒤에 수로 바꾼다. 순서를 바꾸면 다시 0 이 된다. */
      언어판: (b.sitelinks === null || b.sitelinks === undefined || b.sitelinks === '')
        ? null
        : (Number.isFinite(Number(b.sitelinks)) ? Number(b.sitelinks) : null),
      태어난해: (() => { const m = String(b.born ?? '').match(/(\d{4})/); return m ? Number(m[1]) : null; })(),
    });
  }

  const 모음 = new Map();       /* 학교 → 사람들 */
  let 이은수 = 0, 못이은수 = 0, 학교없는수 = 0;

  for (const s of 학교자료) {
    if (!s || !s.q) continue;
    const 사람 = 이름표.get(String(s.q));
    if (!사람) { 못이은수 += 1; continue; }
    이은수 += 1;
    const 학교목록 = (Array.isArray(s.schools) ? s.schools : [s.schools])
      .map(학교이름다듬기).filter(Boolean);
    if (!학교목록.length) { 학교없는수 += 1; continue; }
    for (const 학교 of new Set(학교목록)) {        /* 같은 학교가 두 번 적혀도 한 번만 센다 */
      if (!모음.has(학교)) 모음.set(학교, []);
      모음.get(학교).push({ q: String(s.q), ...사람 });
    }
  }

  const 학교들 = [...모음.entries()].map(([학교, 사람들]) => {
    const 언어판있는사람 = 사람들.filter((p) => p.언어판 !== null);
    const 언어판들 = 언어판있는사람.map((p) => p.언어판).sort((a, b) => b - a);
    return {
      학교,
      사람수: 사람들.length,
      /* ⬜ 언어판을 모르는 사람은 0 으로 «채우지 않는다». 뺀 수를 따로 적는다 */
      언어판잰사람수: 언어판있는사람.length,
      언어판못잰사람수: 사람들.length - 언어판있는사람.length,
      언어판합: 언어판들.reduce((a, b) => a + b, 0),
      언어판중간값: 언어판들.length ? 언어판들[Math.floor(언어판들.length / 2)] : null,
      /* 「10개 언어판 이상」 = 여러 언어 공동체가 글을 쓴 사람 */
      열개이상: 언어판들.filter((n) => n >= 10).length,
      맨위: 사람들.slice().sort((a, b) => (b.언어판 ?? -1) - (a.언어판 ?? -1)).slice(0, 5)
        .map((p) => ({ 이름: p.이름, 언어판: p.언어판, 태어난해: p.태어난해 })),
    };
  });

  return { 학교들, 이은수, 못이은수, 학교없는수 };
}

/* ─── 자가시험 ────────────────────────────────────────────────────────────── */

function 자가시험() {
  let 통과 = 0, 실패 = 0;
  const 봄 = (무엇, 실제, 기대) => {
    const ok = JSON.stringify(실제) === JSON.stringify(기대);
    if (ok) 통과 += 1; else { 실패 += 1; console.log('  🔴 ' + 무엇 + '  실제=' + JSON.stringify(실제) + '  기대=' + JSON.stringify(기대)); }
  };
  const 맞다 = (무엇, x) => 봄(무엇, !!x, true);

  봄('배열이면 그대로', 배열꺼내기([1, 2]), [1, 2]);
  봄('rows 안에 있으면 꺼낸다', 배열꺼내기({ rows: [1] }), [1]);
  봄('아무 배열이라도 꺼낸다', 배열꺼내기({ 뭐: [3] }), [3]);
  봄('배열이 없으면 빈 것', 배열꺼내기({ a: 1 }), []);
  봄('null 이면 빈 것', 배열꺼내기(null), []);

  봄('빈 학교 이름은 null', 학교이름다듬기('  '), null);
  봄('공백을 하나로', 학교이름다듬기('Seoul   Arts  High'), 'Seoul Arts High');
  봄('뒤 괄호를 뗀다', 학교이름다듬기('Hanyang University (Seoul)'), 'Hanyang University');
  봄('가운데 괄호는 남긴다', 학교이름다듬기('A (B) C'), 'A (B) C');

  /* 🔴 진짜 자료의 꼴 — 이것을 안 넣었다가 학교가 «1곳»으로 뭉쳤다.
     자가시험은 22개 다 통과했는데 진짜 자료에서 [object Object] 가 나왔다.
     ⛔ 내가 지어낸 꼴만 시험하면 같은 사고가 또 난다. 저장소의 실제 한 줄을 그대로 쓴다. */
  봄('객체에서 name 을 꺼낸다',
    학교이름다듬기({ q: 'Q40006', name: 'Hanyang University', slug: 'hanyang-university' }),
    'Hanyang University');
  봄('name 이 없으면 slug 로', 학교이름다듬기({ q: 'Q1', slug: 'daea-high-school' }), 'daea-high-school');
  봄('둘 다 없으면 null', 학교이름다듬기({ q: 'Q1' }), null);
  맞다('객체를 글로 굳히지 않는다',
    학교이름다듬기({ name: 'X' }) !== '[object Object]');

  /* 이어짐 */
  const 학교 = [
    { q: 'Q1', schools: ['A High'] },
    { q: 'Q2', schools: ['A High', 'B Univ'] },
    { q: 'Q3', schools: ['A High', 'A High'] },   /* 같은 학교가 두 번 */
    { q: 'Q9', schools: ['C Univ'] },             /* 출생 자료에 없다 */
    { q: 'Q4', schools: [] },                     /* 학교가 비어 있다 */
  ];
  const 출생 = [
    { q: 'Q1', name: '가', born: '1990-01-01', sitelinks: 12 },
    { q: 'Q2', name: '나', born: '1995', sitelinks: 3 },
    { q: 'Q3', name: '다', born: '2000-05', sitelinks: null },
    { q: 'Q4', name: '라', born: '', sitelinks: 7 },
  ];
  const r = 잇기(학교, 출생);
  봄('이은 수', r.이은수, 4);
  봄('못 이은 수', r.못이은수, 1);
  봄('학교가 빈 사람 수', r.학교없는수, 1);

  const A = r.학교들.find((x) => x.학교 === 'A High');
  봄('A High 사람 수', A.사람수, 3);
  봄('같은 학교 두 번 적힌 것을 한 번만 센다', A.사람수, 3);
  봄('언어판을 잰 사람 수', A.언어판잰사람수, 2);
  봄('언어판을 못 잰 사람 수', A.언어판못잰사람수, 1);
  봄('언어판 합에 null 을 0 으로 안 넣는다', A.언어판합, 15);
  봄('열개 이상은 하나', A.열개이상, 1);
  봄('맨 위는 언어판 큰 사람', A.맨위[0].이름, '가');

  const B = r.학교들.find((x) => x.학교 === 'B Univ');
  봄('B Univ 사람 수', B.사람수, 1);
  맞다('출생 자료에 없는 학교는 안 나온다', !r.학교들.some((x) => x.학교 === 'C Univ'));

  /* 태어난 해 */
  봄('born 에서 해를 뽑는다', A.맨위[0].태어난해, 1990);

  console.log('\n자가시험 ' + (통과 + 실패) + '개 중 ' + 통과 + '개 통과' + (실패 ? ' · 🔴 ' + 실패 + '개 실패' : ''));
  return 실패 === 0;
}

/* ─── 직접 돌릴 때 ────────────────────────────────────────────────────────── */

if (process.argv[1] && process.argv[1].endsWith('build-kcw-school-pipeline.mjs')) {
  if (process.argv.includes('--자가시험')) process.exit(자가시험() ? 0 : 1);

  const 학교길 = path.join(뿌리, 'archive/raw/wikidata/korean-entertainers-school.json');
  const 출생길 = path.join(뿌리, 'archive/raw/wikidata/korean-entertainers-birth.json');
  const 학교자료 = 배열꺼내기(JSON.parse(fs.readFileSync(학교길, 'utf8')));
  const 출생자료 = 배열꺼내기(JSON.parse(fs.readFileSync(출생길, 'utf8')));

  const r = 잇기(학교자료, 출생자료);
  console.log('학교 자료 ' + 학교자료.length + '건 · 출생 자료 ' + 출생자료.length + '건');
  console.log('  이었다 ' + r.이은수 + '명 (' + (r.이은수 / 학교자료.length * 100).toFixed(1) + '%)'
    + ' · 못 이었다 ' + r.못이은수 + '명 · 학교 칸이 빈 사람 ' + r.학교없는수 + '명');
  console.log('  학교 ' + r.학교들.length + '곳');

  const 상위 = r.학교들.slice().sort((a, b) => b.사람수 - a.사람수).slice(0, 20);
  console.log('\n── 사람 수로 상위 20곳 ──');
  for (const s of 상위) {
    console.log('  ' + String(s.사람수).padStart(4) + '명  ' + s.학교.slice(0, 46).padEnd(48)
      + ' 10개언어판+ ' + String(s.열개이상).padStart(3)
      + ' · 중간값 ' + String(s.언어판중간값 ?? '⬜').padStart(3)
      + ' · 언어판못잰 ' + s.언어판못잰사람수);
  }

  const 세계 = r.학교들.slice().filter((s) => s.사람수 >= 10).sort((a, b) => b.열개이상 - a.열개이상).slice(0, 20);
  console.log('\n── 10개 언어판 이상 인물을 많이 낸 곳 (10명 이상 학교만) ──');
  for (const s of 세계) {
    console.log('  ' + String(s.열개이상).padStart(4) + '명  ' + s.학교.slice(0, 46).padEnd(48)
      + ' 전체 ' + String(s.사람수).padStart(4) + '명 · 비율 ' + (s.열개이상 / s.사람수 * 100).toFixed(1) + '%');
  }

  const 낼곳 = path.join(뿌리, 'src/data/kcw-school-pipeline.json');
  fs.writeFileSync(낼곳, JSON.stringify({
    무엇인가: '한국 연예인의 학교(위키데이터 educated_at)를 이름·언어판 수와 이어 학교별로 센 것',
    잰때: 잰때문자(),
    못재는것: [
      '학교 자료 4,535건과 출생 자료를 이었다 — 겹치지 않는 사람은 학교를 모른다(없는 것이 아니다)',
      '졸업·중퇴·재학을 가르지 않는다 — 위키데이터 educated_at 이 구분하지 않는다',
      '한 사람이 여러 학교를 가질 수 있어 학교별로 겹쳐 센다',
      'sitelinks 는 인기가 아니라 «몇 개 언어 공동체가 글을 썼나»다',
    ],
    셈: { 학교자료: 학교자료.length, 출생자료: 출생자료.length,
      이은수: r.이은수, 못이은수: r.못이은수, 학교칸이빈수: r.학교없는수, 학교수: r.학교들.length },
    학교들: r.학교들.sort((a, b) => b.사람수 - a.사람수),
  }, null, 2) + '\n', 'utf8');
  console.log('\n✅ 냈다 — src/data/kcw-school-pipeline.json');
}
