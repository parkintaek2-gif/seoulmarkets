#!/usr/bin/env node
/**
 * build-kcw-work-vs-attention.mjs — «차트에 오른 작품이 많으면 더 읽히나»를 «잰다».
 * ─────────────────────────────────────────────────────────────────────────────
 * [왜 이 축인가 — 2026-09-04]
 *   `archive/raw/star-pageviews/actors-20260822.json`(232KB)과 `kpop-20260822.json`(566KB)은
 *   저장소 «어느 코드도 이름으로 부르지 않는» 자료였다(1,240개 코드 파일을 훑어 셌다).
 *   사장님: 「쥔 자료의 «안 쓰던 축»부터 찾아 낸다」.
 *
 * [자료가 스스로 밝힌 것 — 짐작하지 않는다]
 *   출처       Wikimedia Pageviews API (en.wikipedia, all-access, user)  ← 봇 제외
 *   기간       2026-07-24 ~ 2026-08-22 (30일)
 *   배우 명단   Wikidata P161(출연) × 넷플릭스 Top10 한국 작품 — 1,113명 전원 잡힘
 *   케이팝 명단 Wikidata 한국 국적 + 가수·래퍼·작곡가·음악가, 그리고 한국 음악 그룹 — 2,372건
 *   ⭐ 그래서 「작품수」는 «넷플릭스 Top10 에 오른 한국 작품 중 그 배우가 출연으로 적힌 편수»다.
 *     전체 출연작 수가 «아니다». 이것을 필모그래피로 읽으면 틀린다.
 *
 * [무엇을 못 재나]
 *   ⬜ 인과. 많이 읽혀서 더 캐스팅되는 것인지, 많이 나와서 더 읽히는 것인지 이 자료로는 못 가른다.
 *   ⬜ 한국 안의 관심. 영문 위키백과만 세므로 국내 독자는 안 들어온다.
 *   ⬜ 차트에 못 오른 작품. 명단 자체가 넷플릭스 Top10 에서 왔다.
 *
 *   node scripts/build-kcw-work-vs-attention.mjs
 *   node scripts/build-kcw-work-vs-attention.mjs --자가시험
 */
import fs from 'node:fs';
import path from 'node:path';
/* 🔴 [2026-11-14] 영문 지면에 「오후」가 나갔다 — 잰 시각은 한 꼴로 적는다 */
import { 잰때문자 } from './lib/잰때.mjs';

const 뿌리 = path.resolve(
  path.dirname(new URL(import.meta.url).pathname).replace(/^\/([A-Za-z]:)/, '$1'), '..');

export function 배열꺼내기(j) {
  if (Array.isArray(j)) return j;
  if (!j || typeof j !== 'object') return [];
  return Object.values(j).find((v) => Array.isArray(v)) || [];
}

/** 값이 «없는» 것과 0 을 가른다. ⛔ 없는 것을 0 으로 채우지 않는다 */
export function 수로(v) {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export function 중간값(a) {
  const s = a.filter((n) => n !== null && Number.isFinite(n)).slice().sort((x, y) => x - y);
  return s.length ? s[Math.floor(s.length / 2)] : null;
}

/** 편수를 띠로 묶는다. 경계는 여기 한 곳에만 둔다 — 두 곳에 두면 어긋난다 */
export function 띠(편수) {
  const n = 수로(편수);
  if (n === null) return null;
  if (n <= 1) return '1';
  if (n <= 3) return '2-3';
  if (n <= 6) return '4-6';
  return '7+';
}

export const 띠순서 = ['1', '2-3', '4-6', '7+'];

/**
 * 편수 띠별로 열람수를 센다.
 * @returns {{띠들: object[], 편수없는수: number, 열람없는수: number}}
 */
export function 재기(배우들) {
  const 모음 = new Map(띠순서.map((k) => [k, []]));
  let 편수없는수 = 0, 열람없는수 = 0;
  for (const x of 배우들) {
    const k = 띠(x?.작품수);
    if (k === null) { 편수없는수 += 1; continue; }
    const 하루 = 수로(x?.하루평균);
    if (하루 === null) { 열람없는수 += 1; continue; }
    모음.get(k).push({ 이름: x.이름 ?? null, 하루, 편수: 수로(x.작품수), 상승배수: 수로(x.상승배수),
      최고조회: 수로(x.최고조회), 최고일: x.최고일 ?? null });
  }
  const 띠들 = 띠순서.map((k) => {
    const arr = 모음.get(k);
    const 하루들 = arr.map((p) => p.하루);
    return {
      띠: k,
      사람수: arr.length,
      중간하루: 중간값(하루들),
      가장높은하루: 하루들.length ? Math.max(...하루들) : null,
      만넘는사람: 하루들.filter((n) => n >= 10000).length,
      천넘는사람: 하루들.filter((n) => n >= 1000).length,
      맨위: arr.slice().sort((a, b) => b.하루 - a.하루).slice(0, 3)
        .map((p) => ({ 이름: p.이름, 하루: p.하루, 편수: p.편수 })),
    };
  });
  return { 띠들, 편수없는수, 열람없는수 };
}

/* ─── 자가시험 ────────────────────────────────────────────────────────────── */

function 자가시험() {
  let 통과 = 0, 실패 = 0;
  const 봄 = (무엇, 실제, 기대) => {
    const ok = JSON.stringify(실제) === JSON.stringify(기대);
    if (ok) 통과 += 1; else { 실패 += 1; console.log('  🔴 ' + 무엇 + '  실제=' + JSON.stringify(실제) + '  기대=' + JSON.stringify(기대)); }
  };
  const 맞다 = (무엇, x) => 봄(무엇, !!x, true);

  /* 🔴 어제 이 함정을 밟았다 — Number(null) 은 0 이고 0 은 유한수라, «없는 값»이
     「0」으로 채워졌다. 우리 강령의 「0 으로 채우지 않는다」를 코드로 어긴 것이다. */
  봄('null 은 null 로', 수로(null), null);
  봄('undefined 는 null 로', 수로(undefined), null);
  봄('빈 글자는 null 로', 수로(''), null);
  봄('0 은 0 으로 (없는 것과 다르다)', 수로(0), 0);
  봄('글자 수는 수로', 수로('12'), 12);
  봄('수 아닌 글자는 null', 수로('가'), null);

  봄('중간값 홀수', 중간값([3, 1, 2]), 2);
  봄('중간값에 null 을 안 센다', 중간값([1, null, 3, 5]), 3);
  봄('빈 것은 null', 중간값([]), null);
  봄('null 만 있으면 null', 중간값([null, null]), null);

  봄('1편', 띠(1), '1');
  봄('0편도 1 띠에', 띠(0), '1');
  봄('2편', 띠(2), '2-3');
  봄('3편', 띠(3), '2-3');
  봄('4편', 띠(4), '4-6');
  봄('6편', 띠(6), '4-6');
  봄('7편', 띠(7), '7+');
  봄('편수가 없으면 null', 띠(null), null);

  const r = 재기([
    { 이름: 'ㄱ', 작품수: 1, 하루평균: 10 },
    { 이름: 'ㄴ', 작품수: 1, 하루평균: 30 },
    { 이름: 'ㄷ', 작품수: 3, 하루평균: 20000 },
    { 이름: 'ㄹ', 작품수: 8, 하루평균: 500 },
    { 이름: 'ㅁ', 작품수: null, 하루평균: 999 },      /* 편수가 없다 */
    { 이름: 'ㅂ', 작품수: 2, 하루평균: null },         /* 열람수가 없다 */
  ]);
  봄('편수 없는 사람을 따로 센다', r.편수없는수, 1);
  봄('열람수 없는 사람을 따로 센다', r.열람없는수, 1);
  const b1 = r.띠들.find((x) => x.띠 === '1');
  봄('1 띠 사람수', b1.사람수, 2);
  봄('1 띠 중간값', b1.중간하루, 30);
  const b23 = r.띠들.find((x) => x.띠 === '2-3');
  봄('2-3 띠 사람수 (열람수 없는 사람은 안 센다)', b23.사람수, 1);
  봄('만 넘는 사람', b23.만넘는사람, 1);
  const b7 = r.띠들.find((x) => x.띠 === '7+');
  봄('7+ 띠 사람수', b7.사람수, 1);
  봄('7+ 띠에 만 넘는 사람 없음', b7.만넘는사람, 0);
  맞다('띠가 넷 다 나온다', r.띠들.length === 4);
  맞다('띠 순서가 고정이다', r.띠들.map((x) => x.띠).join(',') === '1,2-3,4-6,7+');
  봄('사람이 없는 띠는 중간값 null', r.띠들.find((x) => x.띠 === '4-6').중간하루, null);

  console.log('\n자가시험 ' + (통과 + 실패) + '개 중 ' + 통과 + '개 통과' + (실패 ? ' · 🔴 ' + 실패 + '개 실패' : ''));
  return 실패 === 0;
}

/* ─── 직접 돌릴 때 ────────────────────────────────────────────────────────── */

if (process.argv[1] && process.argv[1].endsWith('build-kcw-work-vs-attention.mjs')) {
  if (process.argv.includes('--자가시험')) process.exit(자가시험() ? 0 : 1);

  const 길 = path.join(뿌리, 'archive/raw/star-pageviews/actors-20260822.json');
  const 원본 = JSON.parse(fs.readFileSync(길, 'utf8'));
  const 배우들 = 배열꺼내기(원본);
  const r = 재기(배우들);

  console.log('배우 ' + 배우들.length + '명 · 기간 ' + 원본.기간 + ' (' + 원본.일수 + '일)');
  console.log('  출처 ' + 원본.출처);
  console.log('  명단 ' + 원본.명단출처);
  console.log('  편수를 모르는 사람 ' + r.편수없는수 + '명 · 열람수를 모르는 사람 ' + r.열람없는수 + '명');
  console.log('\n  띠      사람수   중간 하루열람   가장높은 하루   하루1천+   하루1만+');
  for (const b of r.띠들) {
    console.log('  ' + b.띠.padEnd(6) + String(b.사람수).padStart(6)
      + String(b.중간하루 ?? '⬜').padStart(14)
      + String((b.가장높은하루 ?? '⬜').toLocaleString()).padStart(15)
      + String(b.천넘는사람).padStart(11) + String(b.만넘는사람).padStart(11));
    console.log('         맨위: ' + b.맨위.map((p) => p.이름 + ' ' + p.하루.toLocaleString() + '/일(' + p.편수 + '편)').join(' · '));
  }

  const 낼곳 = path.join(뿌리, 'src/data/kcw-work-vs-attention.json');
  fs.writeFileSync(낼곳, JSON.stringify({
    무엇인가: '넷플릭스 Top10 한국 작품에 출연으로 적힌 배우 1,113명을 «차트 출연 편수»로 묶어 영문 위키백과 30일 열람수를 센 것',
    출처: 원본.출처, 기간: 원본.기간, 일수: 원본.일수, 명단출처: 원본.명단출처,
    잰때: 잰때문자(),
    못재는것: [
      '인과 — 많이 읽혀 캐스팅되는 것인지 많이 나와 읽히는 것인지 못 가른다',
      '한국 안의 관심 — 영문 위키백과만 센다',
      '차트에 못 오른 작품 — 명단 자체가 넷플릭스 Top10 에서 왔다',
      '「작품수」는 전체 필모그래피가 아니라 «차트에 오른 편수»다',
    ],
    셈: { 배우수: 배우들.length, 편수없는수: r.편수없는수, 열람없는수: r.열람없는수 },
    띠들: r.띠들,
  }, null, 2) + '\n', 'utf8');
  console.log('\n✅ 냈다 — src/data/kcw-work-vs-attention.json');
}
