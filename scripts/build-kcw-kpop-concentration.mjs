#!/usr/bin/env node
/**
 * build-kcw-kpop-concentration.mjs — 케이팝 관심이 «얼마나 쏠려 있나»를 잰다.
 * ─────────────────────────────────────────────────────────────────────────────
 * [왜 이 축인가 — 2026-09-04]
 *   `archive/raw/star-pageviews/kpop-20260822.json`(566KB)은 저장소 어느 코드도
 *   이름으로 부르지 않던 자료였다(코드 1,240개를 훑어 셌다). 어제 배우 자료로 한 편을 냈고
 *   이것은 그보다 두 배 크다.
 *
 * [자료가 스스로 밝힌 것 — 짐작하지 않는다]
 *   출처   Wikimedia Pageviews API (en.wikipedia, all-access, user)  ← 봇 제외
 *   기간   2026-07-24 ~ 2026-08-22 (30일)
 *   명단   Wikidata 한국 국적 + 가수·래퍼·작곡가·음악가, 그리고 P495=한국인 음악 그룹
 *          (girl group·boy band 등 하위 갈래까지 P31/P279* 로 따라간다)
 *   2,372건 전원 잡힘 · 문서없음 0 · 부르기실패 0
 *   갈래   group 822 · person 1,550
 *
 * [무엇을 못 재나]
 *   ⬜ 그룹과 그 «멤버»를 잇는 칸이 이 자료에 없다. 멤버가 그룹을 앞서나는 못 잰다.
 *   ⬜ 명단은 «직업»으로 짜였다. 그래서 배우로 더 알려진 사람도 들어온다(예: So Ji-sub).
 *      그것을 빼지 않는다 — 빼려면 내가 「누가 진짜 가수냐」를 판정해야 한다.
 *   ⬜ 한국 안의 관심. 영문 위키백과만 센다.
 *   ⬜ 왜 쏠렸나. 활동·발매·소속사 규모 어느 것도 이 자료에 없다.
 *
 *   node scripts/build-kcw-kpop-concentration.mjs
 *   node scripts/build-kcw-kpop-concentration.mjs --자가시험
 */
import fs from 'node:fs';
import path from 'node:path';
/* 🔴 [2026-11-14] 영문 지면에 「오후」가 나갔다 — 잰 시각은 한 꼴로 적는다 */
import { 잰때문자 } from './lib/잰때.mjs';

const 뿌리 = path.resolve(
  path.dirname(new URL(import.meta.url).pathname).replace(/^\/([A-Za-z]:)/, '$1'), '..');

/** 없는 값과 0 을 가른다. ⛔ 없는 것을 0 으로 채우지 않는다 */
export function 수로(v) {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export function 중간값(a) {
  const s = a.filter((n) => n !== null && Number.isFinite(n)).slice().sort((x, y) => x - y);
  return s.length ? s[Math.floor(s.length / 2)] : null;
}

/**
 * 큰 것부터 n개가 전체 합의 몇 %를 가져가나.
 * ⚠ n 을 올림으로 정한다 — 822개의 1% 는 8.22 개이고, 「8개」로 내리면 상위 1% 보다
 *   «적게» 세어 쏠림이 실제보다 작게 나온다. 올려서 조금 크게 세는 쪽을 고른다.
 *   그리고 그 «올림했다»는 사실을 기사에 적는다.
 */
export function 위쪽몫(값들, 비율) {
  const v = 값들.filter((n) => n !== null && Number.isFinite(n)).slice().sort((a, b) => b - a);
  if (!v.length) return null;
  const 합 = v.reduce((a, b) => a + b, 0);
  if (합 <= 0) return null;
  const n = Math.min(v.length, Math.max(1, Math.ceil(v.length * 비율)));
  return { 셈수: n, 몫: +(v.slice(0, n).reduce((a, b) => a + b, 0) / 합 * 100).toFixed(1) };
}

/** 아래쪽 절반이 가져가는 몫 */
export function 아래절반몫(값들) {
  const v = 값들.filter((n) => n !== null && Number.isFinite(n)).slice().sort((a, b) => b - a);
  if (!v.length) return null;
  const 합 = v.reduce((a, b) => a + b, 0);
  if (합 <= 0) return null;
  const 자름 = Math.ceil(v.length * 0.5);
  return { 셈수: v.length - 자름, 몫: +(v.slice(자름).reduce((a, b) => a + b, 0) / 합 * 100).toFixed(1) };
}

/** 한 갈래를 잰다 */
export function 갈래재기(이름, 항목들) {
  const 하루 = 항목들.map((x) => 수로(x?.하루평균));
  const 잰것 = 하루.filter((n) => n !== null);
  return {
    갈래: 이름,
    수: 항목들.length,
    /* ⬜ 열람수를 모르는 것은 따로 센다 */
    열람못잰수: 항목들.length - 잰것.length,
    중간하루: 중간값(하루),
    가장높은하루: 잰것.length ? Math.max(...잰것) : null,
    열미만: 잰것.filter((n) => n < 10).length,
    백넘음: 잰것.filter((n) => n >= 100).length,
    천넘음: 잰것.filter((n) => n >= 1000).length,
    만넘음: 잰것.filter((n) => n >= 10000).length,
    상위1퍼: 위쪽몫(하루, 0.01),
    상위5퍼: 위쪽몫(하루, 0.05),
    상위10퍼: 위쪽몫(하루, 0.10),
    아래절반: 아래절반몫(하루),
    맨위: 항목들.slice().sort((a, b) => (수로(b.하루평균) ?? -1) - (수로(a.하루평균) ?? -1)).slice(0, 6)
      .map((x) => ({ 이름: x.이름, 하루: 수로(x.하루평균) })),
  };
}

/* ─── 자가시험 ────────────────────────────────────────────────────────────── */

function 자가시험() {
  let 통과 = 0, 실패 = 0;
  const 봄 = (무엇, 실제, 기대) => {
    const ok = JSON.stringify(실제) === JSON.stringify(기대);
    if (ok) 통과 += 1; else { 실패 += 1; console.log('  🔴 ' + 무엇 + '  실제=' + JSON.stringify(실제) + '  기대=' + JSON.stringify(기대)); }
  };
  const 맞다 = (무엇, x) => 봄(무엇, !!x, true);

  봄('null 은 null', 수로(null), null);
  봄('0 은 0 (없는 것과 다르다)', 수로(0), 0);
  봄('빈 글자는 null', 수로(''), null);

  봄('중간값', 중간값([1, 2, 3]), 2);
  봄('중간값에 null 을 안 센다', 중간값([1, null, 3, 5]), 3);

  /* 위쪽 몫 — 손으로 검산할 수 있는 값으로 잰다 */
  봄('열 개 중 상위 10% 는 한 개', 위쪽몫([10, 9, 8, 7, 6, 5, 4, 3, 2, 1], 0.10), { 셈수: 1, 몫: 18.2 });
  봄('열 개 중 상위 50% 는 다섯 개', 위쪽몫([10, 9, 8, 7, 6, 5, 4, 3, 2, 1], 0.50), { 셈수: 5, 몫: 72.7 });
  봄('전부 같으면 상위 10% 가 10% 를 가져간다', 위쪽몫(Array(10).fill(5), 0.10), { 셈수: 1, 몫: 10 });
  /* ⚠ 올림 — 여기가 틀리면 쏠림이 «작게» 나온다 */
  봄('여덟 개의 1% 도 최소 한 개를 센다', 위쪽몫([8, 7, 6, 5, 4, 3, 2, 1], 0.01), { 셈수: 1, 몫: 22.2 });
  봄('비율이 1 을 넘어도 개수를 안 넘는다', 위쪽몫([2, 1], 2), { 셈수: 2, 몫: 100 });
  봄('빈 것은 null', 위쪽몫([], 0.1), null);
  봄('합이 0 이면 null (0 으로 나누지 않는다)', 위쪽몫([0, 0], 0.5), null);
  봄('null 만 있으면 null', 위쪽몫([null, null], 0.5), null);

  봄('아래 절반', 아래절반몫([10, 9, 8, 7, 6, 5, 4, 3, 2, 1]), { 셈수: 5, 몫: 27.3 });
  맞다('위 절반 + 아래 절반 = 100',
    Math.abs(위쪽몫([10, 9, 8, 7, 6, 5, 4, 3, 2, 1], 0.5).몫 + 아래절반몫([10, 9, 8, 7, 6, 5, 4, 3, 2, 1]).몫 - 100) < 0.05);
  봄('아래 절반도 빈 것은 null', 아래절반몫([]), null);

  const r = 갈래재기('시험', [
    { 이름: 'ㄱ', 하루평균: 1000 },
    { 이름: 'ㄴ', 하루평균: 100 },
    { 이름: 'ㄷ', 하루평균: 9 },
    { 이름: 'ㄹ', 하루평균: null },   /* 열람수를 모른다 */
  ]);
  봄('수', r.수, 4);
  봄('열람 못 잰 것을 따로 센다', r.열람못잰수, 1);
  봄('중간하루 (null 을 안 센다)', r.중간하루, 100);
  봄('가장 높은 하루', r.가장높은하루, 1000);
  봄('열 미만', r.열미만, 1);
  봄('백 넘음', r.백넘음, 2);
  봄('천 넘음', r.천넘음, 1);
  봄('만 넘음', r.만넘음, 0);
  봄('맨위 첫 이름', r.맨위[0].이름, 'ㄱ');
  맞다('열람수 없는 것을 0 으로 만들지 않았다', r.맨위.every((p) => p.하루 === null || p.하루 > 0));

  console.log('\n자가시험 ' + (통과 + 실패) + '개 중 ' + 통과 + '개 통과' + (실패 ? ' · 🔴 ' + 실패 + '개 실패' : ''));
  return 실패 === 0;
}

/* ─── 직접 돌릴 때 ────────────────────────────────────────────────────────── */

if (process.argv[1] && process.argv[1].endsWith('build-kcw-kpop-concentration.mjs')) {
  if (process.argv.includes('--자가시험')) process.exit(자가시험() ? 0 : 1);

  const 길 = path.join(뿌리, 'archive/raw/star-pageviews/kpop-20260822.json');
  const 원본 = JSON.parse(fs.readFileSync(길, 'utf8'));
  const 배열 = Array.isArray(원본) ? 원본 : Object.values(원본).find((v) => Array.isArray(v));

  const 갈래들 = [
    갈래재기('전체', 배열),
    갈래재기('그룹', 배열.filter((x) => x.갈래 === 'group')),
    갈래재기('사람', 배열.filter((x) => x.갈래 === 'person')),
  ];

  console.log('케이팝 ' + 배열.length + '건 · 기간 ' + 원본.기간 + ' (' + 원본.일수 + '일)');
  console.log('  출처 ' + 원본.출처);
  console.log('\n  갈래   수     중간  최고      10미만  100+  1000+  10000+  상위1%  상위5%  상위10%  아래절반');
  for (const g of 갈래들) {
    console.log('  ' + g.갈래.padEnd(6) + String(g.수).padStart(5) + String(g.중간하루).padStart(8)
      + String(g.가장높은하루.toLocaleString()).padStart(8)
      + String(g.열미만).padStart(8) + String(g.백넘음).padStart(7) + String(g.천넘음).padStart(7)
      + String(g.만넘음).padStart(8)
      + String(g.상위1퍼.몫 + '%').padStart(8) + String(g.상위5퍼.몫 + '%').padStart(8)
      + String(g.상위10퍼.몫 + '%').padStart(9) + String(g.아래절반.몫 + '%').padStart(10));
    console.log('        맨위: ' + g.맨위.map((p) => p.이름 + ' ' + p.하루.toLocaleString()).join(' · '));
  }

  const 낼곳 = path.join(뿌리, 'src/data/kcw-kpop-concentration.json');
  fs.writeFileSync(낼곳, JSON.stringify({
    무엇인가: '한국 가수·래퍼·작곡가·음악가와 한국 음악 그룹 2,372건의 영문 위키백과 30일 열람수가 얼마나 쏠려 있나',
    출처: 원본.출처, 기간: 원본.기간, 일수: 원본.일수, 명단출처: 원본.명단출처,
    잰때: 잰때문자(),
    셈방법: '상위 n% 의 n 은 «올림»이다. 822개의 1% 는 8.22 이고 8개로 내리면 쏠림이 실제보다 작게 나온다',
    못재는것: [
      '그룹과 그 멤버를 잇는 칸이 자료에 없다 — 멤버가 그룹을 앞서나는 못 잰다',
      '명단은 «직업»으로 짜였다. 배우로 더 알려진 사람도 들어온다 — 빼지 않았다',
      '한국 안의 관심 — 영문 위키백과만 센다',
      '왜 쏠렸나 — 활동·발매·소속사 규모가 이 자료에 없다',
    ],
    갈래들,
  }, null, 2) + '\n', 'utf8');
  console.log('\n✅ 냈다 — src/data/kcw-kpop-concentration.json');
}
